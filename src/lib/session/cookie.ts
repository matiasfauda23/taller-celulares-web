import "server-only";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "workshop_session";

/** A random opaque ID, not a JWT and not derived from any token: nothing to decode. */
export function generateSessionId(): string {
  return randomBytes(32).toString("base64url");
}

export async function setSessionCookie(sessionId: string, maxAgeSeconds: number): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSeconds,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

export async function readSessionCookie(): Promise<string | null> {
  const store = await cookies();
  return store.get(SESSION_COOKIE_NAME)?.value ?? null;
}
