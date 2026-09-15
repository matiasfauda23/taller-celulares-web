import "server-only";
import { NextResponse } from "next/server";
import { callNestApi } from "@/lib/api/nest-client";
import { networkErrorBody, parseNestErrorBody } from "@/lib/api/error";
import type { AuthResponse } from "@/lib/api/types";
import { assertSameOriginRequest, CsrfError } from "@/lib/security/csrf";
import { startSession } from "./session";

function pickFields(value: unknown, fields: readonly string[]): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const result: Record<string, unknown> = {};
  for (const field of fields) {
    if (field in (value as Record<string, unknown>)) result[field] = (value as Record<string, unknown>)[field];
  }
  return result;
}

function errorResponse(statusCode: number, code: string, message: string, path: string): NextResponse {
  return NextResponse.json({ statusCode, code, message, path }, { status: statusCode, headers: { "Cache-Control": "no-store" } });
}

interface AuthMutationConfig {
  /** The BFF path, used only for error bodies (e.g. "/api/session/register"). */
  path: string;
  nestPath: "/auth/register" | "/auth/login";
  fields: readonly string[];
}

/**
 * Shared shape for POST /auth/register and POST /auth/login: same-origin check, a fixed
 * field allowlist, NestJS's status/body passed straight through on error, and — on success —
 * a brand-new BFF session. Tokens never leave `startSession`; the response carries only the
 * public account/workshop profile.
 */
export function createAuthMutationHandler({ path, nestPath, fields }: AuthMutationConfig) {
  return async function handleAuthMutation(request: Request): Promise<NextResponse> {
    try {
      assertSameOriginRequest(request);
    } catch (error) {
      if (error instanceof CsrfError) return errorResponse(401, "AUTHENTICATION_REQUIRED", "Authentication required", path);
      throw error;
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse(400, "VALIDATION_ERROR", "Request validation failed", path);
    }

    try {
      const upstream = await callNestApi<AuthResponse>({ method: "POST", path: nestPath, body: pickFields(body, fields) });

      if (upstream.status >= 400) {
        return NextResponse.json(parseNestErrorBody(upstream.status, upstream.body, path), {
          status: upstream.status,
          headers: { "Cache-Control": "no-store" },
        });
      }

      await startSession({
        accountId: upstream.body.account.id,
        workshopId: upstream.body.workshop.id,
        tokens: upstream.body.tokens,
      });

      return NextResponse.json(
        { account: upstream.body.account, workshop: upstream.body.workshop },
        { status: upstream.status, headers: { "Cache-Control": "no-store" } },
      );
    } catch {
      return NextResponse.json(networkErrorBody(path), { status: 502, headers: { "Cache-Control": "no-store" } });
    }
  };
}
