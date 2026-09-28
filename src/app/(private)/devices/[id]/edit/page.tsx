import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { DeviceFormWrapper } from "@/features/devices/components/device-form.server";
import { getDevice } from "@/features/devices/api/devices";
import { getSessionForRender } from "@/lib/session/session";

interface EditDevicePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditDevicePage({ params }: EditDevicePageProps) {
  const session = await getSessionForRender();
  if (!session) redirect("/login");

  const { id } = await params;
  const result = await getDevice(session.record.accessToken, id);

  if (result.status === "error") {
    if (result.error.statusCode === 404) {
      redirect("/devices");
    }
    return (
      <div className="flex flex-col gap-6">
        <p role="alert" className="text-sm text-destructive">
          No se pudo cargar el dispositivo: {result.error.message}
        </p>
      </div>
    );
  }

  const device = result.device;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-base leading-snug font-medium">Editar dispositivo</h1>
      <Card>
        <CardContent className="pt-4">
          <DeviceFormWrapper mode="edit" deviceId={device.id} defaultValues={{
            clientId: device.clientId,
            brand: device.brand,
            model: device.model,
            serialNumber: device.serialNumber ?? "",
            color: device.color ?? "",
            physicalCondition: device.physicalCondition,
          }} />
        </CardContent>
      </Card>
    </div>
  );
}