"use client";

import { ArchiveDialog } from "@/components/shared/archive-dialog";
import { archiveDevice } from "@/features/devices/api/device-actions";

interface ArchiveDeviceButtonProps {
  deviceId: string;
  deviceName: string;
}

export function ArchiveDeviceButton({ deviceId, deviceName }: ArchiveDeviceButtonProps) {
  return (
    <ArchiveDialog
      title={`¿Archivar ${deviceName}?`}
      description="Este dispositivo dejará de aparecer en la lista de dispositivos activos. No se puede deshacer desde aquí."
      onConfirm={async () => {
        const result = await archiveDevice(deviceId);
        return result.status === "ok" ? { status: "ok" } : { status: "error", message: result.error.message };
      }}
    />
  );
}