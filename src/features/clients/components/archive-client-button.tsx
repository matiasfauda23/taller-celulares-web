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
      title={`¿Archivar a ${clientName}?`}
      description="Este cliente dejará de aparecer en la lista de clientes activos. No se puede deshacer desde aquí."
      onConfirm={async () => {
        const result = await archiveClient(clientId);
        return result.status === "ok" ? { status: "ok" } : { status: "error", message: result.error.message };
      }}
    />
  );
}
