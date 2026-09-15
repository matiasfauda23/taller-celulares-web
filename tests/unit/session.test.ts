import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRecord, SessionStore } from "@/lib/session/store";

const readSessionCookie = vi.fn<() => Promise<string | null>>();

vi.mock("@/lib/session/cookie", () => ({
  readSessionCookie: () => readSessionCookie(),
}));

const { SessionRequiredError, getActiveSession, requireActiveSession } = await import("@/lib/session/session");

class FakeStore implements SessionStore {
  constructor(
    private readonly records = new Map<string, SessionRecord>(),
    private readonly failure?: Error,
  ) {}

  async get(sessionId: string): Promise<SessionRecord | null> {
    if (this.failure) throw this.failure;
    return this.records.get(sessionId) ?? null;
  }
  async create(): Promise<void> {}
  async replace(): Promise<boolean> {
    return true;
  }
  async delete(): Promise<void> {}
  async acquireLock(): Promise<string | null> {
    return null;
  }
  async renewLock(): Promise<boolean> {
    return false;
  }
  async releaseLock(): Promise<void> {}
}

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

describe("getActiveSession", () => {
  beforeEach(() => {
    readSessionCookie.mockReset();
  });

  it("returns null when there is no session cookie", async () => {
    readSessionCookie.mockResolvedValue(null);
    const store = new FakeStore();
    await expect(getActiveSession(store)).resolves.toBeNull();
  });

  it("returns null when the cookie has no matching store entry (evicted or never existed)", async () => {
    readSessionCookie.mockResolvedValue("missing-session");
    const store = new FakeStore();
    await expect(getActiveSession(store)).resolves.toBeNull();
  });

  it("returns null for a record past its refresh expiry, even if still present in the store", async () => {
    readSessionCookie.mockResolvedValue("expired-session");
    const store = new FakeStore(new Map([["expired-session", makeRecord({ refreshExpiresAt: Date.now() - 1000 })]]));
    await expect(getActiveSession(store)).resolves.toBeNull();
  });

  it("returns the session ID and record for a valid session", async () => {
    readSessionCookie.mockResolvedValue("valid-session");
    const record = makeRecord();
    const store = new FakeStore(new Map([["valid-session", record]]));
    await expect(getActiveSession(store)).resolves.toEqual({ sessionId: "valid-session", record });
  });

  it("fails closed by rejecting when the store is unavailable, instead of resolving to null", async () => {
    readSessionCookie.mockResolvedValue("any-session");
    const store = new FakeStore(new Map(), new Error("redis unreachable"));
    await expect(getActiveSession(store)).rejects.toThrow("redis unreachable");
  });
});

describe("requireActiveSession", () => {
  beforeEach(() => {
    readSessionCookie.mockReset();
  });

  it("throws SessionRequiredError when there is no active session", async () => {
    readSessionCookie.mockResolvedValue(null);
    await expect(requireActiveSession(new FakeStore())).rejects.toBeInstanceOf(SessionRequiredError);
  });

  it("resolves with the active session when one exists", async () => {
    readSessionCookie.mockResolvedValue("valid-session");
    const record = makeRecord();
    const store = new FakeStore(new Map([["valid-session", record]]));
    await expect(requireActiveSession(store)).resolves.toEqual({ sessionId: "valid-session", record });
  });
});
