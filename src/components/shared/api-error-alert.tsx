"use client";

import type { ApiErrorBody } from "@/lib/api/types";

interface ApiErrorAlertProps {
  error: ApiErrorBody | null;
}

export function ApiErrorAlert({ error }: ApiErrorAlertProps) {
  if (!error) return null;

  return (
    <div role="alert" className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
      <p className="font-medium">{error.message}</p>
      {error.details && error.details.length > 0 && (
        <ul className="mt-2 list-disc list-inside space-y-1">
          {error.details.map((detail, index) => (
            <li key={index}>
              <strong>{detail.field}:</strong> {detail.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}