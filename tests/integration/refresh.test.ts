import type { Redis as RedisClient } from "ioredis";
import RedisMock from "ioredis-mock";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NestResponse } from "@/lib/api/nest-client";
import { RedisSessionStore } from "@/lib/session/redis-store";
import type { SessionRecord } from "@/lib/session/store";

vi.mock("@/lib/api/nest-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/nest-client")>();
  return { ...actual, callNestApi: vi.fn() };
});

const { callNestApi } = await import("@/lib/api/nest-client");
const { RefreshInvalidError, RefreshNetworkError, RefreshUncertainError, refreshSession } = await import(
  "@/lib/session/refresh"
);

function makeRecord(overrides: Partial<SessionRecord> = {}): SessionRecord {
  return {
    accountId: "account-1",
    workshopId: "workshop-1",
    accessToken: "old-access",
    refreshToken: "old-refresh",
    accessExpiresAt: Date.now() - 1,
    refreshExpiresAt: Date.now() + 604_800_000,
    version: 1,
    ...overrides,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function freshStore(): RedisSessionStore {
  return new RedisSessionStore(new RedisMock() as unknown as RedisClient);
}

beforeEach(() => {
  vi.mocked(callNestApi).mockReset();
});

describe("refreshSession", () => {
  it("rotates the token and persists the new record", async () => {
    const store = freshStore();
    const record = makeRecord();
    await store.create("session-a", record, 604_800);

    vi.mocked(callNestApi).mockResolvedValue({
      status: 200,
      body: { tokens: { accessToken: "new-access", refreshToken: "new-refresh", accessExpiresIn: 900, refreshExpiresIn: 604_800 } },
    });

    const next = await refreshSession("session-a", record, store);

    expect(next.accessToken).toBe("new-access");
    expect(next.refreshToken).toBe("new-refresh");
    expect(next.version).toBe(2);
    expect(next.accessExpiresAt).toBeGreaterThan(Date.now());
    await expect(store.get("session-a")).resolves.toEqual(next);
  });

  it("lets two concurrent callers share a single NestJS call and converge on the same rotated record", async () => {
    const store = freshStore();
    const record = makeRecord();
    await store.create("session-b", record, 604_800);

    let resolveNest!: (value: NestResponse) => void;
    vi.mocked(callNestApi).mockImplementation(
      () =>
        new Promise<NestResponse>((resolve) => {
          resolveNest = resolve;
        }),
    );

    const first = refreshSession("session-b", record, store);
    // Let the first caller acquire the lock and reach the (pending) NestJS call before the
    // second one starts, so it observes the lock as already held.
    await sleep(20);
    const second = refreshSession("session-b", record, store);
    await sleep(20);

    resolveNest({
      status: 200,
      body: { tokens: { accessToken: "shared-access", refreshToken: "shared-refresh", accessExpiresIn: 900, refreshExpiresIn: 604_800 } },
    });

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(callNestApi).toHaveBeenCalledTimes(1);
    expect(firstResult.accessToken).toBe("shared-access");
    expect(secondResult.accessToken).toBe("shared-access");
  });

  it("throws RefreshInvalidError and leaves the record untouched when NestJS rejects the refresh token", async () => {
    const store = freshStore();
    const record = makeRecord();
    await store.create("session-c", record, 604_800);

    vi.mocked(callNestApi).mockResolvedValue({
      status: 401,
      body: { statusCode: 401, code: "INVALID_REFRESH_TOKEN", message: "Invalid refresh token", path: "/auth/refresh" },
    });

    await expect(refreshSession("session-c", record, store)).rejects.toBeInstanceOf(RefreshInvalidError);
    await expect(store.get("session-c")).resolves.toEqual(record);
  });

  it("throws RefreshNetworkError and leaves the record untouched when NestJS is unreachable", async () => {
    const store = freshStore();
    const record = makeRecord();
    await store.create("session-d", record, 604_800);

    vi.mocked(callNestApi).mockRejectedValue(new Error("fetch failed"));

    await expect(refreshSession("session-d", record, store)).rejects.toBeInstanceOf(RefreshNetworkError);
    await expect(store.get("session-d")).resolves.toEqual(record);
  });

  it("throws RefreshUncertainError when NestJS rotates the token but the store write loses the race", async () => {
    const store = freshStore();
    const record = makeRecord();
    await store.create("session-e", record, 604_800);

    vi.mocked(callNestApi).mockImplementation(async () => {
      // Simulate another writer bumping the version between our lock acquisition and our own
      // replace: NestJS still reports success for our (now-stale) rotation.
      await store.replace("session-e", makeRecord({ version: 2, accessToken: "someone-else" }), 604_800, 1);
      return {
        status: 200,
        body: { tokens: { accessToken: "new-access", refreshToken: "new-refresh", accessExpiresIn: 900, refreshExpiresIn: 604_800 } },
      };
    });

    await expect(refreshSession("session-e", record, store)).rejects.toBeInstanceOf(RefreshUncertainError);
  });

  it(
    "throws RefreshUncertainError when a concurrent caller times out waiting for the lock holder",
    async () => {
      const store = freshStore();
      const record = makeRecord();
      await store.create("session-f", record, 604_800);

      // Hold the lock ourselves and never release it or update the record, simulating a lock
      // holder that never finishes within the wait window.
      const lockToken = await store.acquireLock("session-f", 60_000);
      expect(lockToken).not.toBeNull();

      await expect(refreshSession("session-f", record, store)).rejects.toBeInstanceOf(RefreshUncertainError);
      expect(callNestApi).not.toHaveBeenCalled();
    },
    12_000,
  );
});
