import "server-only";

/**
 * What the BFF keeps server-side per session. The browser only ever holds the opaque
 * cookie ID that indexes this record; tokens never leave this store.
 */
export interface SessionRecord {
  accountId: string;
  workshopId: string;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  /** Bumped on every successful refresh; used for optimistic concurrency in `replace`. */
  version: number;
}

/**
 * Provider-neutral session storage. `redis-store.ts` is the only implementation today, but
 * nothing above this interface may import ioredis directly.
 */
export interface SessionStore {
  get(sessionId: string): Promise<SessionRecord | null>;
  create(sessionId: string, record: SessionRecord, ttlSeconds: number): Promise<void>;
  /**
   * Replaces the record only if its current version matches `expectedVersion`, refreshing
   * the TTL in the same operation. Returns false (no write) on a version mismatch or a
   * missing record, so concurrent refreshes can detect they lost the race.
   */
  replace(sessionId: string, record: SessionRecord, ttlSeconds: number, expectedVersion: number): Promise<boolean>;
  delete(sessionId: string): Promise<void>;
  /** Single-owner lock for coordinating refresh across concurrent requests. */
  acquireLock(sessionId: string, ttlMs: number): Promise<string | null>;
  renewLock(sessionId: string, token: string, ttlMs: number): Promise<boolean>;
  releaseLock(sessionId: string, token: string): Promise<void>;
}
