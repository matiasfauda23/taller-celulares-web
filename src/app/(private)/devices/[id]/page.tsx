import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArchiveDeviceButton } from "@/features/devices/components/archive-device-button";
import { DeviceFormWrapper } from "@/features/devices/components/device-form";
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
    if (result.error.statusCode === 404) {
      redirect("/devices");
    }
    return (
      <div className="flex flex-col gap-6">
        <p role="alert" className="text-sm text-destructive">
          Could not load device: {result.error.message}
        </p>
      </div>
    );
  }

  const device = result.device;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-base leading-snug font-medium">{device.brand} {device.model}</h1>
          <p className="text-sm text-muted-foreground">{device.serialNumber ?? "No serial number"}</p>
        </div>
        <ArchiveDeviceButton deviceId={device.id} deviceName={`${device.brand} ${device.model}`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Device details</CardTitle>
          <CardDescription>Physical condition and metadata</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Client ID</dt>
              <dd className="font-mono">{device.clientId}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Color</dt>
              <dd>{device.color ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Physical condition</dt>
              <dd>{device.physicalCondition}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Created</dt>
              <dd>{new Date(device.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Updated</dt>
              <dd>{new Date(device.updatedAt).toLocaleString()}</dd>
            </div>
            {device.archivedAt ? (
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Archived</dt>
                <dd className="text-destructive">{new Date(device.archivedAt).toLocaleString()}</dd>
              </div>
            ) : null}
          </dl>

          <div className="flex gap-3 pt-2 border-t">
            <a href={`/devices/${device.id}/edit`} className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
              Edit device
            </a>
            <a href="/devices" className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
              Back to list
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}