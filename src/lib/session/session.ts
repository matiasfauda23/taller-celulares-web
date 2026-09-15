import "server-only";
import { readSessionCookie } from "./cookie";
import { RedisSessionStore } from "./redis-store";
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
