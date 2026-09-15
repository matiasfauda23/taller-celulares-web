import "server-only";
import { callNestApi } from "@/lib/api/nest-client";
import { parseNestErrorBody } from "@/lib/api/error";
import type { AuthTokens } from "@/lib/api/types";
import type { SessionRecord, SessionStore } from "./store";

const LOCK_TTL_MS = 5000;
const LOCK_RENEW_INTERVAL_MS = 2000;
const LOCK_WAIT_TIMEOUT_MS = 8000;
const LOCK_POLL_INTERVAL_MS = 200;

/** NestJS rejected the refresh token outright: the session is over, send the user to login. */
export class RefreshInvalidError extends Error {
  constructor() {
    super("The refresh token was rejected by NestJS");
    this.name = "RefreshInvalidError";
  }
}

/**
 * NestJS was never conclusively reached (network/5xx/429/unexpected error). The refresh token
 * already on file was never confirmed as used, so it may still be valid — this is recoverable,
 * and the session must be left untouched.
 */
export class RefreshNetworkError extends Error {
  constructor(message = "Could not reach NestJS to refresh the session") {
    super(message);
    this.name = "RefreshNetworkError";
  }
}

/**
 * NestJS rotated the token, but this process could not confirm/persist the outcome (lost the
 * refresh lock mid-flight, or the Redis write failed/lost the race). The old refresh token is
 * now invalid at NestJS — it must never be reused — and the new one may not be durably stored.
 * Per the residual limit in plan.md, the only safe action is to end the session.
 */
export class RefreshUncertainError extends Error {}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildNextRecord(current: SessionRecord, tokens: AuthTokens): SessionRecord {
  const now = Date.now();
  return {
    ...current,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accessExpiresAt: now + tokens.accessExpiresIn * 1000,
    refreshExpiresAt: now + tokens.refreshExpiresIn * 1000,
    version: current.version + 1,
  };
}

async function waitForConcurrentRefresh(
  sessionId: string,
  previousVersion: number,
  sessionStore: SessionStore,
): Promise<SessionRecord> {
  const deadline = Date.now() + LOCK_WAIT_TIMEOUT_MS;
  while (Date.now() < deadline) {
    await sleep(LOCK_POLL_INTERVAL_MS);
    const current = await sessionStore.get(sessionId);
    if (!current) throw new RefreshInvalidError();
    if (current.version !== previousVersion && current.accessExpiresAt > Date.now()) return current;
  }
  throw new RefreshUncertainError("Timed out waiting for a concurrent refresh to finish");
}

/**
 * Rotates the refresh token for a session at most once per caller, coordinating concurrent
 * callers through a single-owner Redis lock instead of racing NestJS with the same refresh
 * token — NestJS revokes the whole session on reuse of an already-rotated refresh token.
 * A caller that cannot acquire the lock waits for the holder's result rather than retrying on
 * its own.
 */
export async function refreshSession(
  sessionId: string,
  current: SessionRecord,
  sessionStore: SessionStore,
): Promise<SessionRecord> {
  const lockToken = await sessionStore.acquireLock(sessionId, LOCK_TTL_MS);
  if (!lockToken) return waitForConcurrentRefresh(sessionId, current.version, sessionStore);

  let lockLost = false;
  const renewal = setInterval(() => {
    sessionStore
      .renewLock(sessionId, lockToken, LOCK_TTL_MS)
      .then((renewed) => {
        if (!renewed) lockLost = true;
      })
      .catch(() => {
        lockLost = true;
      });
  }, LOCK_RENEW_INTERVAL_MS);

  try {
    let upstream;
    try {
      upstream = await callNestApi<{ tokens: AuthTokens }>({
        method: "POST",
        path: "/auth/refresh",
        body: { refreshToken: current.refreshToken },
      });
    } catch (networkFailure) {
      throw new RefreshNetworkError(networkFailure instanceof Error ? networkFailure.message : undefined);
    }

    if (upstream.status >= 400) {
      const error = parseNestErrorBody(upstream.status, upstream.body, "/auth/refresh");
      if (error.code === "INVALID_REFRESH_TOKEN") throw new RefreshInvalidError();
      throw new RefreshNetworkError(error.message);
    }

    // NestJS has now rotated the token: every failure from here on is "uncertain", not
    // "recoverable" — the old refresh token is already invalid at NestJS.
    if (lockLost) throw new RefreshUncertainError("Lost the refresh lock while NestJS was rotating the token");

    const next = buildNextRecord(current, upstream.body.tokens);
    let replaced: boolean;
    try {
      replaced = await sessionStore.replace(sessionId, next, upstream.body.tokens.refreshExpiresIn, current.version);
    } catch {
      throw new RefreshUncertainError("Could not persist the rotated refresh token");
    }
    if (!replaced) throw new RefreshUncertainError("A concurrent write invalidated this refresh");

    return next;
  } finally {
    clearInterval(renewal);
    await sessionStore.releaseLock(sessionId, lockToken).catch(() => {});
  }
}
