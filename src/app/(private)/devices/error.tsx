"use client";

import { ErrorState } from "@/components/shared/error-state";

export default function DevicesError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 p-4">
      <ErrorState
        message="No se pudo cargar la lista de dispositivos. Intenta de nuevo."
        onRetry={reset}
      />
    </div>
  );
}