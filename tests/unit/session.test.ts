import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SessionRecord, SessionStore } from "@/lib/session/store";

const readSessionCookie = vi.fn<() => Promise<string | null>>();
const setSessionCookie = vi.fn<(id: string, maxAgeSeconds: number) => Promise<void>>();
const clearSessionCookie = vi.fn<() => Promise<void>>();
const generateSessionId = vi.fn<() => string>();

vi.mock("@/lib/session/cookie", () => ({
  readSessionCookie: () => readSessionCookie(),
  setSessionCookie: (id: string, maxAgeSeconds: number) => setSessionCookie(id, maxAgeSeconds),
  clearSessionCookie: () => clearSessionCookie(),
  generateSessionId: () => generateSessionId(),
}));

const refreshSession = vi.fn();
vi.mock("@/lib/session/refresh", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session/refresh")>();
  return { ...actual, refreshSession: (...args: Parameters<typeof actual.refreshSession>) => refreshSession(...args) };
});

const {
  SessionRequiredError,
  endSession,
  getActiveSession,
  getFreshSession,
  getSessionForRender,
  requireActiveSession,
  startSession,
} = await import("@/lib/session/session");
const { RefreshInvalidError, RefreshNetworkError, RefreshUncertainError } = await import("@/lib/session/refresh");

class FakeStore implements SessionStore {
  createCalls: Array<{ sessionId: string; record: SessionRecord; ttlSeconds: number }> = [];
  deleteCalls: string[] = [];

  constructor(
    private readonly records = new Map<string, SessionRecord>(),
    private readonly failure?: Error,
  ) {}

  async get(sessionId: string): Promise<SessionRecord | null> {
    if (this.failure) throw this.failure;
    return this.records.get(sessionId) ?? null;
  }
  async create(sessionId: string, record: SessionRecord, ttlSeconds: number): Promise<void> {
    this.createCalls.push({ sessionId, record, ttlSeconds });
    this.records.set(sessionId, record);
  }
  async replace(): Promise<boolean> {
    return true;
  }
  async delete(sessionId: string): Promise<void> {
    this.deleteCalls.push(sessionId);
    this.records.delete(sessionId);
  }
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

beforeEach(() => {
  readSessionCookie.mockReset();
  setSessionCookie.mockReset();
  clearSessionCookie.mockReset();
  generateSessionId.mockReset();
  refreshSession.mockReset();
});

describe("getActiveSession", () => {
  it("returns null when there is no session cookie", async () => {
    readSessionCookie.mockResolvedValue(null);
    await expect(getActiveSession(new FakeStore())).resolves.toBeNull();
  });

  it("returns null when the cookie has no matching store entry (evicted or never existed)", async () => {
    readSessionCookie.mockResolvedValue("missing-session");
    await expect(getActiveSession(new FakeStore())).resolves.toBeNull();
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

describe("startSession", () => {
  it("creates a Redis record TTL-bounded by the refresh token and a cookie holding only the opaque ID", async () => {
    generateSessionId.mockReturnValue("new-session-id");
    const store = new FakeStore();

    await startSession(
      {
        accountId: "account-9",
        workshopId: "workshop-9",
        tokens: { accessToken: "access-xyz", refreshToken: "refresh-xyz", accessExpiresIn: 900, refreshExpiresIn: 604_800 },
      },
      store,
    );

    expect(store.createCalls).toHaveLength(1);
    const call = store.createCalls[0];
    expect(call.sessionId).toBe("new-session-id");
    expect(call.ttlSeconds).toBe(604_800);
    expect(call.record).toMatchObject({
      accountId: "account-9",
      workshopId: "workshop-9",
      accessToken: "access-xyz",
      refreshToken: "refresh-xyz",
      version: 1,
    });
    expect(setSessionCookie).toHaveBeenCalledWith("new-session-id", 604_800);
  });
});

describe("endSession", () => {
  it("deletes the store record and clears the cookie for an active session", async () => {
    const store = new FakeStore();
    await endSession({ sessionId: "session-1", record: makeRecord() }, store);
    expect(store.deleteCalls).toEqual(["session-1"]);
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });

  it("still clears the cookie when there is no session to delete", async () => {
    const store = new FakeStore();
    await endSession(null, store);
    expect(store.deleteCalls).toEqual([]);
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });

  it("still clears the cookie even if deleting the Redis record fails", async () => {
    class ThrowingDeleteStore extends FakeStore {
      async delete(): Promise<void> {
        throw new Error("redis unreachable");
      }
    }
    await endSession({ sessionId: "session-1", record: makeRecord() }, new ThrowingDeleteStore());
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });
});

describe("getFreshSession", () => {
  it("returns unauthenticated when there is no session at all", async () => {
    readSessionCookie.mockResolvedValue(null);
    await expect(getFreshSession(new FakeStore())).resolves.toEqual({ status: "unauthenticated" });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("returns the session as-is without refreshing when the access token is not near expiry", async () => {
    readSessionCookie.mockResolvedValue("valid-session");
    const record = makeRecord({ accessExpiresAt: Date.now() + 900_000 });
    const store = new FakeStore(new Map([["valid-session", record]]));
    await expect(getFreshSession(store)).resolves.toEqual({ status: "active", session: { sessionId: "valid-session", record } });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("refreshes and returns the rotated session when the access token is at/near expiry", async () => {
    readSessionCookie.mockResolvedValue("valid-session");
    const record = makeRecord({ accessExpiresAt: Date.now() - 1 });
    const store = new FakeStore(new Map([["valid-session", record]]));
    const rotated = makeRecord({ accessToken: "rotated-access", version: 2 });
    refreshSession.mockResolvedValue(rotated);

    await expect(getFreshSession(store)).resolves.toEqual({ status: "active", session: { sessionId: "valid-session", record: rotated } });
    expect(refreshSession).toHaveBeenCalledWith("valid-session", record, store);
  });

  it("ends the session and reports unauthenticated when NestJS rejects the refresh token", async () => {
    readSessionCookie.mockResolvedValue("valid-session");
    const record = makeRecord({ accessExpiresAt: Date.now() - 1 });
    const store = new FakeStore(new Map([["valid-session", record]]));
    refreshSession.mockRejectedValue(new RefreshInvalidError());

    await expect(getFreshSession(store)).resolves.toEqual({ status: "unauthenticated" });
    expect(store.deleteCalls).toEqual(["valid-session"]);
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });

  it("ends the session and reports unauthenticated on an uncertain refresh outcome", async () => {
    readSessionCookie.mockResolvedValue("valid-session");
    const record = makeRecord({ accessExpiresAt: Date.now() - 1 });
    const store = new FakeStore(new Map([["valid-session", record]]));
    refreshSession.mockRejectedValue(new RefreshUncertainError("lost the lock"));

    await expect(getFreshSession(store)).resolves.toEqual({ status: "unauthenticated" });
    expect(store.deleteCalls).toEqual(["valid-session"]);
    expect(clearSessionCookie).toHaveBeenCalledTimes(1);
  });

  it("keeps the session intact and reports unavailable when NestJS cannot be reached", async () => {
    readSessionCookie.mockResolvedValue("valid-session");
    const record = makeRecord({ accessExpiresAt: Date.now() - 1 });
    const store = new FakeStore(new Map([["valid-session", record]]));
    refreshSession.mockRejectedValue(new RefreshNetworkError("network down"));

    await expect(getFreshSession(store)).resolves.toEqual({ status: "unavailable", message: "network down" });
    expect(store.deleteCalls).toEqual([]);
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });
});

describe("getSessionForRender", () => {
  it("returns null when there is no session, without ever touching cookies", async () => {
    readSessionCookie.mockResolvedValue(null);
    await expect(getSessionForRender(new FakeStore())).resolves.toBeNull();
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });

  it("returns the session as-is without refreshing when the access token is not near expiry", async () => {
    readSessionCookie.mockResolvedValue("valid-session");
    const record = makeRecord({ accessExpiresAt: Date.now() + 900_000 });
    const store = new FakeStore(new Map([["valid-session", record]]));
    await expect(getSessionForRender(store)).resolves.toEqual({ sessionId: "valid-session", record });
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("returns the rotated session when a proactive refresh succeeds", async () => {
    readSessionCookie.mockResolvedValue("valid-session");
    const record = makeRecord({ accessExpiresAt: Date.now() - 1 });
    const store = new FakeStore(new Map([["valid-session", record]]));
    const rotated = makeRecord({ accessToken: "rotated-access", version: 2 });
    refreshSession.mockResolvedValue(rotated);

    await expect(getSessionForRender(store)).resolves.toEqual({ sessionId: "valid-session", record: rotated });
  });

  it("never ends the session on a failed refresh — a render can't write cookies — and falls back to the stale record", async () => {
    readSessionCookie.mockResolvedValue("valid-session");
    const record = makeRecord({ accessExpiresAt: Date.now() - 1 });
    const store = new FakeStore(new Map([["valid-session", record]]));
    refreshSession.mockRejectedValue(new RefreshInvalidError());

    await expect(getSessionForRender(store)).resolves.toEqual({ sessionId: "valid-session", record });
    expect(store.deleteCalls).toEqual([]);
    expect(clearSessionCookie).not.toHaveBeenCalled();
  });
});
