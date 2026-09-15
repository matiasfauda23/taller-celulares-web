import { NextResponse } from "next/server";
import { networkErrorBody } from "@/lib/api/error";
import { assertSameOriginRequest, CsrfError } from "@/lib/security/csrf";
import { getFreshSession } from "@/lib/session/session";

function errorResponse(statusCode: number, code: string, message: string, path: string): NextResponse {
  return NextResponse.json({ statusCode, code, message, path }, { status: statusCode, headers: { "Cache-Control": "no-store" } });
}

/**
 * An explicit "make sure my session is fresh" call: a no-op success if the access token still
 * has headroom, a transparent rotation if it is at/near expiry, 401 if NestJS has rejected the
 * refresh token (session ended), or 502 if NestJS could not be reached (session left intact).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const path = "/api/session/refresh";

  try {
    assertSameOriginRequest(request);
  } catch (error) {
    if (error instanceof CsrfError) return errorResponse(401, "AUTHENTICATION_REQUIRED", "Authentication required", path);
    throw error;
  }

  let outcome;
  try {
    outcome = await getFreshSession();
  } catch {
    return errorResponse(401, "AUTHENTICATION_REQUIRED", "Authentication required", path);
  }

  if (outcome.status === "unauthenticated") {
    return errorResponse(401, "AUTHENTICATION_REQUIRED", "Authentication required", path);
  }
  if (outcome.status === "unavailable") {
    return NextResponse.json(networkErrorBody(path), { status: 502, headers: { "Cache-Control": "no-store" } });
  }

  return new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
