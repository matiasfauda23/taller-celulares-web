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
    return <p className="text-sm text-muted-foreground">No hay dispositivos activos aún.</p>;
  }

  const hasPrev = meta.page > 1;
  const hasNext = meta.page * meta.limit < meta.total;

  return (
    <div className="flex flex-col gap-4">
      {/* Table view - Desktop */}
      <div className="responsive-table overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Dispositivo
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                N° Serie
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Color
              </th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {data.map((device) => (
              <tr key={device.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <td className="p-4 align-middle">
                  <Link href={`/devices/${device.id}`} className="font-medium hover:underline">
                    {device.brand} {device.model}
                  </Link>
                </td>
                <td className="p-4 align-middle text-muted-foreground">
                  {device.serialNumber ?? "—"}
                </td>
                <td className="p-4 align-middle text-muted-foreground">
                  {device.color ?? "—"}
                </td>
                <td className="p-4 align-middle text-right">
                  <ArchiveDeviceButton deviceId={device.id} deviceName={`${device.brand} ${device.model}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards view - Mobile */}
      <div className="responsive-cards">
        <ul className="flex flex-col gap-3">
          {data.map((device) => (
            <li key={device.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Link href={`/devices/${device.id}`} className="font-medium hover:underline">
                      {device.brand} {device.model}
                    </Link>
                    <p className="text-sm text-muted-foreground">{device.serialNumber ?? "Sin número de serie"}</p>
                    {device.color && <p className="text-sm text-muted-foreground">{device.color}</p>}
                  </div>
                  <ArchiveDeviceButton deviceId={device.id} deviceName={`${device.brand} ${device.model}`} />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </div>

      <nav aria-label="Paginación" className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Página {meta.page} de {Math.max(1, Math.ceil(meta.total / meta.limit))} ({meta.total} total)
        </span>
        <div className="flex gap-2">
          {hasPrev ? (
            <Link href={`/devices?page=${meta.page - 1}`} className="rounded-lg border border-input px-3 py-1.5 hover:bg-muted">
              Anterior
            </Link>
          ) : (
            <span className="rounded-lg border border-input px-3 py-1.5 text-muted-foreground opacity-50">Anterior</span>
          )}
          {hasNext ? (
            <Link href={`/devices?page=${meta.page + 1}`} className="rounded-lg border border-input px-3 py-1.5 hover:bg-muted">
              Siguiente
            </Link>
          ) : (
            <span className="rounded-lg border border-input px-3 py-1.5 text-muted-foreground opacity-50">Siguiente</span>
          )}
        </div>
      </nav>
    </div>
  );
}