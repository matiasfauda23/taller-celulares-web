import type { ApiErrorBody } from "@/lib/api/types";

export function presentError(error: ApiErrorBody | null): string {
  if (!error) return "Unknown error";

  if (error.details && error.details.length > 0) {
    return error.details.map((d) => `${d.field}: ${d.message}`).join("; ");
  }

  return error.message;
}

export function isValidationError(error: ApiErrorBody | null): boolean {
  return error?.code === "VALIDATION_ERROR" && Boolean(error.details?.length);
}

export function getFieldError(error: ApiErrorBody | null, field: string): { message?: string } | undefined {
  const detail = error?.details?.find((d) => d.field === field);
  return detail ? { message: detail.message } : undefined;
}