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
      title={`Archive ${workOrderNumber}?`}
      description="This work order will no longer appear in the active list. This cannot be undone from here."
      onConfirm={async () => {
        const result = await archiveWorkOrder(workOrderId);
        return result.status === "ok" ? { status: "ok" } : { status: "error", message: result.error.message };
      }}
    />
  );
}