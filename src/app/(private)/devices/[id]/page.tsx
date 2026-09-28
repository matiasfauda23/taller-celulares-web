import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArchiveDeviceButton } from "@/features/devices/components/archive-device-button";
import { getDevice } from "@/features/devices/api/devices";
import { getSessionForRender } from "@/lib/session/session";

interface DevicePageProps {
  params: Promise<{ id: string }>;
}

export default async function DevicePage({ params }: DevicePageProps) {
  const session = await getSessionForRender();
  if (!session) redirect("/login");

  const { id } = await params;
  const result = await getDevice(session.record.accessToken, id);

  if (result.status === "error") {
    return (
      <div className="flex flex-col gap-6">
        <p role="alert" className="text-sm text-destructive">
          {result.error.statusCode === 404
            ? "No se encontró el dispositivo."
            : `No se pudo cargar el dispositivo: ${result.error.message}`}
        </p>
        <Link href="/devices" className="w-fit rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
          Volver a la lista
        </Link>
      </div>
    );
  }

  const device = result.device;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base leading-snug font-medium">{device.brand} {device.model}</h1>
          <p className="text-sm text-muted-foreground">{device.serialNumber ?? "Sin número de serie"}</p>
        </div>
        {device.archivedAt ? null : (
          <ArchiveDeviceButton deviceId={device.id} deviceName={`${device.brand} ${device.model}`} />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalle del dispositivo</CardTitle>
          <CardDescription>Condición física y metadatos</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">ID del cliente</dt>
              <dd className="font-mono">{device.clientId}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Color</dt>
              <dd>{device.color ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Condición física</dt>
              <dd>{device.physicalCondition}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Creado</dt>
              <dd>{new Date(device.createdAt).toLocaleString("es-AR")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Actualizado</dt>
              <dd>{new Date(device.updatedAt).toLocaleString("es-AR")}</dd>
            </div>
            {device.archivedAt ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Archivado</dt>
                <dd className="text-destructive">{new Date(device.archivedAt).toLocaleString("es-AR")}</dd>
              </div>
            ) : null}
          </dl>

          <div className="flex gap-3 pt-2 border-t">
            {device.archivedAt ? null : (
              <Link href={`/devices/${device.id}/edit`} className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
                Editar dispositivo
              </Link>
            )}
            <Link href="/devices" className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
              Volver a la lista
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}