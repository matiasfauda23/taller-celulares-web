import "server-only";
import type { AuthTokens } from "@/lib/api/types";
import { clearSessionCookie, generateSessionId, readSessionCookie, setSessionCookie } from "./cookie";
import { RedisSessionStore } from "./redis-store";
import { RefreshInvalidError, RefreshUncertainError, refreshSession } from "./refresh";
import type { SessionRecord, SessionStore } from "./store";

export class SessionRequiredError extends Error {
  constructor() {
    super("A valid session is required");
    this.name = "SessionRequiredError";
  }
}

export interface ActiveSession {
  sessionId: string;
  record: SessionRecord;
}

let defaultStore: SessionStore | undefined;

function store(): SessionStore {
  if (!defaultStore) defaultStore = new RedisSessionStore();
  return defaultStore;
}

/** Exposed so BFF routes that need direct store access (e.g. logout's pre-refresh) reuse the same instance. */
export function getDefaultSessionStore(): SessionStore {
  return store();
}

/** Refresh proactively once the access token is within this many ms of expiring. */
const REFRESH_SKEW_MS = 5000;

/**
 * Looks up the session for the current request: no cookie, no store entry, or an entry past
 * its refresh expiry all resolve to `null`. A Redis failure is not caught here — it rejects,
 * so callers never mistake "the store is unreachable" for "there is no session".
 */
export async function getActiveSession(sessionStore: SessionStore = store()): Promise<ActiveSession | null> {
  const sessionId = await readSessionCookie();
  if (!sessionId) return null;

  const record = await sessionStore.get(sessionId);
  if (!record) return null;
  if (record.refreshExpiresAt <= Date.now()) return null;

  return { sessionId, record };
}

export async function requireActiveSession(sessionStore?: SessionStore): Promise<ActiveSession> {
  const session = await getActiveSession(sessionStore);
  if (!session) throw new SessionRequiredError();
  return session;
}

export interface NewSessionInput {
  accountId: string;
  workshopId: string;
  tokens: AuthTokens;
}

/**
 * Starts a brand-new session after a successful login or register: a fresh opaque ID (never
 * reused, which is also how the session ID rotates on every authentication), tokens held only
 * in Redis with a TTL bounded by the refresh token's own lifetime, and a cookie carrying
 * nothing but that ID.
 */
export async function startSession(input: NewSessionInput, sessionStore: SessionStore = store()): Promise<void> {
  const sessionId = generateSessionId();
  const now = Date.now();
  const record: SessionRecord = {
    accountId: input.accountId,
    workshopId: input.workshopId,
    accessToken: input.tokens.accessToken,
    refreshToken: input.tokens.refreshToken,
    accessExpiresAt: now + input.tokens.accessExpiresIn * 1000,
    refreshExpiresAt: now + input.tokens.refreshExpiresIn * 1000,
    version: 1,
  };
  await sessionStore.create(sessionId, record, input.tokens.refreshExpiresIn);
  await setSessionCookie(sessionId, input.tokens.refreshExpiresIn);
}

/**
 * Ends a session unconditionally: the cookie is always cleared, and the Redis entry is
 * best-effort deleted (a failure here does not stop the cookie from being cleared — the
 * browser must lose its session even if Redis is briefly unreachable).
 */
export async function endSession(session: ActiveSession | null, sessionStore: SessionStore = store()): Promise<void> {
  if (session) await sessionStore.delete(session.sessionId).catch(() => {});
  await clearSessionCookie();
}

export type FreshSessionOutcome =
  | { status: "active"; session: ActiveSession }
  | { status: "unauthenticated" }
  | { status: "unavailable"; message: string };

/**
 * Like `getActiveSession`, but refreshes the access token first when it is at or near expiry.
 * NestJS's own authority on the refresh token decides the outcome: `unauthenticated` covers
 * both "there never was a session" and "NestJS rejected the refresh token" (both end in the
 * same place — send the user to login) and, per the residual limit in plan.md, also an
 * uncertain refresh outcome, since the old refresh token is unusable either way at that point.
 * `unavailable` is the one outcome that must NOT end the session: NestJS was unreachable, so
 * the existing refresh token was never confirmed as spent.
 */
export async function getFreshSession(sessionStore: SessionStore = store()): Promise<FreshSessionOutcome> {
  const session = await getActiveSession(sessionStore);
  if (!session) return { status: "unauthenticated" };

  if (session.record.accessExpiresAt - Date.now() > REFRESH_SKEW_MS) {
    return { status: "active", session };
  }

  try {
    const record = await refreshSession(session.sessionId, session.record, sessionStore);
    return { status: "active", session: { sessionId: session.sessionId, record } };
  } catch (error) {
    if (error instanceof RefreshInvalidError || error instanceof RefreshUncertainError) {
      await endSession(session, sessionStore);
      return { status: "unauthenticated" };
    }
    return { status: "unavailable", message: error instanceof Error ? error.message : "Refresh failed" };
  }
}

/**
 * The Server Component equivalent of `getFreshSession`: Next.js only allows writing cookies
 * from a Route Handler or Server Action, never while rendering a page or layout, so this can
 * never call `endSession`. It still attempts the same proactive refresh (which only touches
 * Redis) when the access token is at/near expiry, but on any failure — invalid, uncertain, or
 * NestJS being unreachable — it falls back to the existing (possibly stale) record instead of
 * ending the session. The next actual BFF operation, running as a real Route Handler through
 * `getFreshSession`, is what enforces and ends an invalid session; this function only decides
 * whether the page renders at all.
 */
export async function getSessionForRender(sessionStore: SessionStore = store()): Promise<ActiveSession | null> {
  const session = await getActiveSession(sessionStore);
  if (!session) return null;

  if (session.record.accessExpiresAt - Date.now() > REFRESH_SKEW_MS) return session;

  try {
    const record = await refreshSession(session.sessionId, session.record, sessionStore);
    return { sessionId: session.sessionId, record };
  } catch {
    return session;
  }
}
