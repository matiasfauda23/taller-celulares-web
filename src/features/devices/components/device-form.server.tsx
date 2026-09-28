import { listClients } from "@/features/clients/api/clients";
import { getSessionForRender } from "@/lib/session/session";
import { DeviceFormClient } from "./device-form.client";

interface DeviceFormProps {
  mode: "create" | "edit";
  deviceId?: string;
  defaultValues?: import("@/features/devices/schemas/device").DeviceFormValues;
}

async function getClientOptions(accessToken: string) {
  const result = await listClients(accessToken, { page: 1, limit: 100 });
  if (result.status === "error") return [];
  return result.page.data;
}

export async function DeviceFormWrapper({ mode, deviceId, defaultValues }: DeviceFormProps) {
  const session = await getSessionForRender();
  const clientOptions = session ? await getClientOptions(session.record.accessToken) : [];

  return (
    <DeviceFormClient
      mode={mode}
      deviceId={deviceId}
      defaultValues={defaultValues}
      clientOptions={clientOptions}
    />
  );
}