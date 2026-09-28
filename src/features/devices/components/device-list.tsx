import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArchiveDeviceButton } from "@/features/devices/components/archive-device-button";
import type { Device, Page } from "@/lib/api/types";

interface DeviceListProps {
  page: Page<Device>;
}

export function DeviceList({ page }: DeviceListProps) {
  const { data, meta } = page;

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No active devices yet.</p>;
  }

  const hasPrev = meta.page > 1;
  const hasNext = meta.page * meta.limit < meta.total;

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {data.map((device) => (
          <li key={device.id}>
            <Card>
              <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <Link href={`/devices/${device.id}`} className="font-medium hover:underline">
                    {device.brand} {device.model}
                  </Link>
                  <p className="text-sm text-muted-foreground">{device.serialNumber ?? "No serial number"}</p>
                </div>
                <ArchiveDeviceButton deviceId={device.id} deviceName={`${device.brand} ${device.model}`} />
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <nav aria-label="Pagination" className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Page {meta.page} of {Math.max(1, Math.ceil(meta.total / meta.limit))} ({meta.total} total)
        </span>
        <div className="flex gap-2">
          {hasPrev ? (
            <Link href={`/devices?page=${meta.page - 1}`} className="rounded-lg border border-input px-3 py-1.5 hover:bg-muted">
              Previous
            </Link>
          ) : (
            <span className="rounded-lg border border-input px-3 py-1.5 text-muted-foreground opacity-50">Previous</span>
          )}
          {hasNext ? (
            <Link href={`/devices?page=${meta.page + 1}`} className="rounded-lg border border-input px-3 py-1.5 hover:bg-muted">
              Next
            </Link>
          ) : (
            <span className="rounded-lg border border-input px-3 py-1.5 text-muted-foreground opacity-50">Next</span>
          )}
        </div>
      </nav>
    </div>
  );
}