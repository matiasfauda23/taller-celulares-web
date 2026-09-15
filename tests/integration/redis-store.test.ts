import type { Redis as RedisClient } from "ioredis";
import { Redis as RealRedis } from "ioredis";
import RedisMock from "ioredis-mock";
import { afterAll, describe, expect, it } from "vitest";
import { RedisSessionStore } from "@/lib/session/redis-store";
import type { SessionRecord } from "@/lib/session/store";

function makeRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    accountId: "account-1",
    workshopId: "workshop-1",
    accessToken: "access-token",
    refreshToken: "refresh-token",
    accessExpiresAt: Date.now() + 900_000,
    refreshExpiresAt: Date.now() + 604_800_000,
    version: 1,
    ...overrides,
  };
}

describe("RedisSessionStore against an in-memory Redis double", () => {
  const mock = new RedisMock() as unknown as RedisClient;
  const store = new RedisSessionStore(mock);

  it("creates and reads back a session record", async () => {
    const record = makeRecord();
    await store.create("session-a", record, 60);
    await expect(store.get("session-a")).resolves.toEqual(record);
  });

  it("replaces atomically only when the version matches, and keeps the old record on a stale write", async () => {
    const record = makeRecord({ version: 1 });
    await store.create("session-b", record, 60);

    const updated = makeRecord({ version: 2, accessToken: "rotated-access" });
    await expect(store.replace("session-b", updated, 60, 1)).resolves.toBe(true);
    await expect(store.get("session-b")).resolves.toEqual(updated);

    const stale = makeRecord({ version: 3, accessToken: "must-not-apply" });
    await expect(store.replace("session-b", stale, 60, 1)).resolves.toBe(false);
    await expect(store.get("session-b")).resolves.toEqual(updated);
  });

  it("returns null for a deleted or unknown session", async () => {
    await store.create("session-c", makeRecord(), 60);
    await store.delete("session-c");
    await expect(store.get("session-c")).resolves.toBeNull();
    await expect(store.get("never-created")).resolves.toBeNull();
  });

  it("coordinates refresh through a single-owner lock", async () => {
    const owner = await store.acquireLock("session-d", 5000);
    expect(owner).not.toBeNull();

    await expect(store.acquireLock("session-d", 5000)).resolves.toBeNull();
    await expect(store.renewLock("session-d", "wrong-token", 5000)).resolves.toBe(false);
    await expect(store.renewLock("session-d", owner as string, 5000)).resolves.toBe(true);

    await store.releaseLock("session-d", "wrong-token");
    await expect(store.acquireLock("session-d", 5000)).resolves.toBeNull();

    await store.releaseLock("session-d", owner as string);
    await expect(store.acquireLock("session-d", 5000)).resolves.not.toBeNull();
  });
});

describe("RedisSessionStore fails closed when Redis is unavailable", () => {
  const unreachable = new RealRedis({
    host: "127.0.0.1",
    port: 1,
    lazyConnect: true,
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
    connectTimeout: 300,
    retryStrategy: () => null,
  });
  unreachable.on("error", () => {});
  const store = new RedisSessionStore(unreachable);

  afterAll(() => {
    unreachable.disconnect();
  });

  it("rejects every operation instead of assuming a valid or writable session", async () => {
    await expect(store.get("any-session")).rejects.toThrow();
    await expect(store.create("any-session", makeRecord(), 60)).rejects.toThrow();
    await expect(store.replace("any-session", makeRecord(), 60, 1)).rejects.toThrow();
    await expect(store.delete("any-session")).rejects.toThrow();
    await expect(store.acquireLock("any-session", 1000)).rejects.toThrow();
  });
});
