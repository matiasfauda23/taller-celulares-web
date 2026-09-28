import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArchiveWorkOrderButton } from "@/features/work-orders/components/archive-work-order-button";
import type { Page, WorkOrder, WorkOrderStatus } from "@/lib/api/types";

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  RECEIVED: "Recibido",
  DIAGNOSING: "Diagnosticando",
  WAITING_PARTS: "Esperando repuestos",
  REPAIRING: "Reparando",
  READY: "Listo",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

const STATUS_VARIANTS: Record<WorkOrderStatus, "default" | "secondary" | "destructive" | "outline"> = {
  RECEIVED: "default",
  DIAGNOSING: "secondary",
  WAITING_PARTS: "secondary",
  REPAIRING: "default",
  READY: "default",
  DELIVERED: "outline",
  CANCELLED: "destructive",
};

interface WorkOrderListProps {
  page: Page<WorkOrder>;
}

export function WorkOrderList({ page }: WorkOrderListProps) {
  const { data, meta } = page;

  if (data.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay órdenes activas aún.</p>;
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
                N° Orden
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Estado
              </th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                Falla
              </th>
              <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {data.map((workOrder) => (
              <tr key={workOrder.id} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                <td className="p-4 align-middle">
                  <Link href={`/work-orders/${workOrder.id}`} className="font-medium hover:underline">
                    {workOrder.number}
                  </Link>
                </td>
                <td className="p-4 align-middle">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      STATUS_VARIANTS[workOrder.status] === "default"
                        ? "bg-primary/10 text-primary"
                        : STATUS_VARIANTS[workOrder.status] === "secondary"
                        ? "bg-secondary/10 text-secondary"
                        : STATUS_VARIANTS[workOrder.status] === "destructive"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {STATUS_LABELS[workOrder.status]}
                  </span>
                </td>
                <td className="p-4 align-middle text-muted-foreground max-w-xs truncate">
                  {workOrder.reportedIssue}
                </td>
                <td className="p-4 align-middle text-right">
                  <ArchiveWorkOrderButton workOrderId={workOrder.id} workOrderNumber={workOrder.number} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards view - Mobile */}
      <div className="responsive-cards">
        <ul className="flex flex-col gap-3">
          {data.map((workOrder) => (
            <li key={workOrder.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
                    <Link href={`/work-orders/${workOrder.id}`} className="font-medium hover:underline">
                      {workOrder.number}
                    </Link>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        STATUS_VARIANTS[workOrder.status] === "default"
                          ? "bg-primary/10 text-primary"
                          : STATUS_VARIANTS[workOrder.status] === "secondary"
                          ? "bg-secondary/10 text-secondary"
                          : STATUS_VARIANTS[workOrder.status] === "destructive"
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {STATUS_LABELS[workOrder.status]}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground max-w-xs truncate">{workOrder.reportedIssue}</span>
                    <ArchiveWorkOrderButton workOrderId={workOrder.id} workOrderNumber={workOrder.number} />
                  </div>
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
            <Link href={`/work-orders?page=${meta.page - 1}`} className="rounded-lg border border-input px-3 py-1.5 hover:bg-muted">
              Anterior
            </Link>
          ) : (
            <span className="rounded-lg border border-input px-3 py-1.5 text-muted-foreground opacity-50">Anterior</span>
          )}
          {hasNext ? (
            <Link href={`/work-orders?page=${meta.page + 1}`} className="rounded-lg border border-input px-3 py-1.5 hover:bg-muted">
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