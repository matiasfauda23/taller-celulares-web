import { NextResponse } from "next/server";
import { callNestApi } from "@/lib/api/nest-client";
import { assertSameOriginRequest, CsrfError } from "@/lib/security/csrf";
import { refreshSession } from "@/lib/session/refresh";
import { endSession, getActiveSession, getDefaultSessionStore } from "@/lib/session/session";

function errorResponse(statusCode: number, code: string, message: string, path: string): NextResponse {
  return NextResponse.json({ statusCode, code, message, path }, { status: statusCode, headers: { "Cache-Control": "no-store" } });
}

/**
 * Always ends the local session (Redis entry deleted, cookie cleared) regardless of whether
 * NestJS could be told about it. Only attempts the remote `POST /auth/logout` call — refreshing
 * first if the access token has already expired and doing so is safe — as a best-effort signal;
 * a failure there is logged without secrets and never reported as a successful revocation.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const path = "/api/session/logout";

  try {
    assertSameOriginRequest(request);
  } catch (error) {
    if (error instanceof CsrfError) return errorResponse(401, "AUTHENTICATION_REQUIRED", "Authentication required", path);
    throw error;
  }

  const store = getDefaultSessionStore();
  let session;
  try {
    session = await getActiveSession(store);
  } catch {
    // Redis unreachable: nothing left to revoke server-side that we could confirm anyway.
    session = null;
  }

  if (session) {
    let accessToken = session.record.accessExpiresAt > Date.now() ? session.record.accessToken : null;

    if (!accessToken) {
      try {
        const refreshed = await refreshSession(session.sessionId, session.record, store);
        accessToken = refreshed.accessToken;
      } catch {
        accessToken = null; // Could not safely obtain a valid access token; skip the remote call.
      }
    }

    if (accessToken) {
      try {
        await callNestApi({ method: "POST", path: "/auth/logout", accessToken });
      } catch (error) {
        console.error("logout: NestJS revocation call failed", error instanceof Error ? error.message : error);
      }
    }
  }

  await endSession(session, store);
  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
