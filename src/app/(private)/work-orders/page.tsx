import Link from "next/link";
import { redirect } from "next/navigation";
import { listWorkOrders } from "@/features/work-orders/api/work-orders";
import { WorkOrderList } from "@/features/work-orders/components/work-order-list";
import { getSessionForRender } from "@/lib/session/session";
import type { WorkOrderStatus } from "@/lib/api/types";

interface WorkOrdersPageProps {
  searchParams: Promise<{ page?: string; status?: string; clientId?: string; deviceId?: string; from?: string; to?: string }>;
}

export default async function WorkOrdersPage({ searchParams }: WorkOrdersPageProps) {
  const session = await getSessionForRender();
  if (!session) redirect("/login");

  const { page: pageParam, status, clientId, deviceId, from, to } = await searchParams;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const result = await listWorkOrders(session.record.accessToken, {
    page,
    status: status as WorkOrderStatus | undefined,
    clientId,
    deviceId,
    from,
    to,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-base leading-snug font-medium">Órdenes de trabajo</h1>
        <Link href="/work-orders/new" className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
          Nueva orden
        </Link>
      </div>

      {result.status === "error" ? (
        <p role="alert" className="text-sm text-destructive">
          No se pudieron cargar las órdenes: {result.error.message}
        </p>
      ) : (
        <WorkOrderList page={result.page} />
      )}
    </div>
  );
}