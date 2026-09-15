"use client";

import { ArchiveDialog } from "@/components/shared/archive-dialog";
import { archiveClient } from "@/features/clients/api/client-actions";

interface ArchiveClientButtonProps {
  clientId: string;
  clientName: string;
}

export function ArchiveClientButton({ clientId, clientName }: ArchiveClientButtonProps) {
  return (
    <ArchiveDialog
      title={`Archive ${clientName}?`}
      description="This client will no longer appear in the active list. This cannot be undone from here."
      onConfirm={async () => {
        const result = await archiveClient(clientId);
        return result.status === "ok" ? { status: "ok" } : { status: "error", message: result.error.message };
      }}
    />
  );
}
