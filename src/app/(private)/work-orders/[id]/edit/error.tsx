"use client";

import { ErrorState } from "@/components/shared/error-state";
import Link from "next/link";

export default function WorkOrderEditError({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col gap-6 p-4">
      <ErrorState
        message="No se pudo cargar la orden para editar. Intenta de nuevo."
        onRetry={reset}
      />
      <Link href="/work-orders" className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted w-fit">
        Volver a la lista
      </Link>
    </div>
  );
}