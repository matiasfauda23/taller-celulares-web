import Link from "next/link";
import { redirect } from "next/navigation";
import { listDevices } from "@/features/devices/api/devices";
import { DeviceList } from "@/features/devices/components/device-list";
import { getSessionForRender } from "@/lib/session/session";

interface DevicesPageProps {
  searchParams: Promise<{ page?: string }>;
}

export default async function DevicesPage({ searchParams }: DevicesPageProps) {
  const session = await getSessionForRender();
  if (!session) redirect("/login");

  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const result = await listDevices(session.record.accessToken, { page });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-base leading-snug font-medium">Dispositivos</h1>
        <Link href="/devices/new" className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
          Nuevo dispositivo
        </Link>
      </div>

      {result.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          No se pudieron cargar los dispositivos: {result.error.message}
        </p>
      ) : (
        <DeviceList page={result.page} />
      )}
    </div>
  );
}