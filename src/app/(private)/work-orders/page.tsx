import Link from "next/link";
import { redirect } from "next/navigation";
import { listClients } from "@/features/clients/api/clients";
import { listDevices } from "@/features/devices/api/devices";
import { listWorkOrders } from "@/features/work-orders/api/work-orders";
import { WorkOrderFilters } from "@/features/work-orders/components/work-order-filters";
import { WorkOrderList } from "@/features/work-orders/components/work-order-list";
import { getSessionForRender } from "@/lib/session/session";
import type { WorkOrderStatus } from "@/lib/api/types";

const FILTER_OPTION_LIMIT = 100;

interface WorkOrdersPageProps {
  searchParams: Promise<{ page?: string; status?: string; clientId?: string; deviceId?: string; from?: string; to?: string }>;
}

const WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  "RECEIVED",
  "DIAGNOSING",
  "WAITING_PARTS",
  "REPAIRING",
  "READY",
  "DELIVERED",
  "CANCELLED",
];

/** An empty filter value means "no filter"; an unknown status is ignored instead of 400-ing NestJS. */
function normalizeStatus(value: string | undefined): WorkOrderStatus | undefined {
  if (!value) return undefined;
  return WORK_ORDER_STATUSES.includes(value as WorkOrderStatus) ? (value as WorkOrderStatus) : undefined;
}

function normalize(value: string | undefined): string | undefined {
  return value ? value : undefined;
}

export default async function WorkOrdersPage({ searchParams }: WorkOrdersPageProps) {
  const session = await getSessionForRender();
  if (!session) redirect("/login");

  const { page: pageParam, status, clientId, deviceId, from, to } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const statusFilter = normalizeStatus(status);

  const [result, clientsResult, devicesResult] = await Promise.all([
    listWorkOrders(session.record.accessToken, {
      page,
      status: statusFilter,
      clientId: normalize(clientId),
      deviceId: normalize(deviceId),
      from: normalize(from),
      to: normalize(to),
    }),
    listClients(session.record.accessToken, { page: 1, limit: FILTER_OPTION_LIMIT }),
    listDevices(session.record.accessToken, { page: 1, limit: FILTER_OPTION_LIMIT }),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-base leading-snug font-medium">Órdenes de trabajo</h1>
        <Link href="/work-orders/new" className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
          Nueva orden
        </Link>
      </div>

      <WorkOrderFilters
        values={{ status: statusFilter, clientId, deviceId, from, to }}
        clients={clientsResult.status === "ok" ? clientsResult.page.data : []}
        devices={devicesResult.status === "ok" ? devicesResult.page.data : []}
      />

      {result.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          No se pudieron cargar las órdenes: {result.error.message}
        </p>
      ) : (
        <WorkOrderList
          page={result.page}
          filters={new URLSearchParams(
            Object.entries({
              status: statusFilter,
              clientId: normalize(clientId),
              deviceId: normalize(deviceId),
              from: normalize(from),
              to: normalize(to),
            }).filter((entry): entry is [string, string] => Boolean(entry[1])),
          )}
        />
      )}
    </div>
  );
}
