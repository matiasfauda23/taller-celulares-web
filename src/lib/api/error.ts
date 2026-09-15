import type { ApiErrorBody, ApiValidationErrorDetail } from "./types";

const FALLBACK_MESSAGES: Record<number, { code: string; message: string }> = {
  400: { code: "VALIDATION_ERROR", message: "Request validation failed" },
  401: { code: "AUTHENTICATION_REQUIRED", message: "Authentication required" },
  403: { code: "FORBIDDEN", message: "Access denied" },
  404: { code: "NOT_FOUND", message: "Resource not found" },
  409: { code: "CONFLICT", message: "Request conflicts with current state" },
  429: { code: "RATE_LIMITED", message: "Too many requests" },
};

const INTERNAL_ERROR_FALLBACK = { code: "INTERNAL_ERROR", message: "Internal server error" };

function isValidationDetails(value: unknown): value is ApiValidationErrorDetail[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as { field?: unknown }).field === "string" &&
        typeof (item as { message?: unknown }).message === "string",
    )
  );
}

function isApiErrorShape(value: unknown): value is ApiErrorBody {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<ApiErrorBody>;
  return (
    typeof candidate.statusCode === "number" &&
    typeof candidate.code === "string" &&
    typeof candidate.message === "string" &&
    typeof candidate.path === "string" &&
    (candidate.details === undefined || isValidationDetails(candidate.details))
  );
}

/**
 * Normalizes a NestJS error body into the shared `ApiErrorBody` shape. A body that doesn't
 * match (wrong shape, or a `statusCode` that disagrees with the actual HTTP status) is never
 * trusted as-is; a safe fallback message for that status code is used instead.
 */
export function parseNestErrorBody(statusCode: number, body: unknown, path: string): ApiErrorBody {
  if (isApiErrorShape(body) && body.statusCode === statusCode) return body;
  const fallback = FALLBACK_MESSAGES[statusCode] ?? INTERNAL_ERROR_FALLBACK;
  return { statusCode, ...fallback, path };
}

/** For a failed `fetch` (network error) — NestJS was never reached, so there is no body to parse. */
export function networkErrorBody(path: string): ApiErrorBody {
  return { statusCode: 502, code: "UPSTREAM_UNAVAILABLE", message: "The upstream service is unavailable", path };
}
