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
      title={`Archive ${deviceName}?`}
      description="This device will no longer appear in the active list. This cannot be undone from here."
      onConfirm={async () => {
        const result = await archiveDevice(deviceId);
        return result.status === "ok" ? { status: "ok" } : { status: "error", message: result.error.message };
      }}
    />
  );
}