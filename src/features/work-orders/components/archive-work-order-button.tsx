"use client";

import { ArchiveDialog } from "@/components/shared/archive-dialog";
import { archiveWorkOrder } from "@/features/work-orders/api/work-order-actions";

interface ArchiveWorkOrderButtonProps {
  workOrderId: string;
  workOrderNumber: string;
}

export function ArchiveWorkOrderButton({ workOrderId, workOrderNumber }: ArchiveWorkOrderButtonProps) {
  return (
    <ArchiveDialog
      title={`¿Archivar ${workOrderNumber}?`}
      description="Esta orden dejará de aparecer en la lista de órdenes activas. No se puede deshacer desde aquí."
      onConfirm={async () => {
        const result = await archiveWorkOrder(workOrderId);
        return result.status === "ok" ? { status: "ok" } : { status: "error", message: result.error.message };
      }}
    />
  );
}