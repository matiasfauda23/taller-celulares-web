import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArchiveWorkOrderButton } from "@/features/work-orders/components/archive-work-order-button";
import { StatusAction } from "@/features/work-orders/components/status-action";
import { getWorkOrder } from "@/features/work-orders/api/work-orders";
import { getSessionForRender } from "@/lib/session/session";

interface WorkOrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function WorkOrderPage({ params }: WorkOrderPageProps) {
  const session = await getSessionForRender();
  if (!session) redirect("/login");

  const { id } = await params;
  const result = await getWorkOrder(session.record.accessToken, id);

  if (result.status === "error") {
    return (
      <div className="flex flex-col gap-6">
        <p role="alert" className="text-sm text-destructive">
          {result.error.statusCode === 404
            ? "No se encontró la orden."
            : `No se pudo cargar la orden: ${result.error.message}`}
        </p>
        <Link href="/work-orders" className="w-fit rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
          Volver a la lista
        </Link>
      </div>
    );
  }

  const workOrder = result.workOrder;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base leading-snug font-medium">{workOrder.number}</h1>
          <p className="text-sm text-muted-foreground">Dispositivo: {workOrder.deviceId}</p>
        </div>
        <div className="flex gap-3">
          {workOrder.archivedAt ? null : (
            <ArchiveWorkOrderButton workOrderId={workOrder.id} workOrderNumber={workOrder.number} />
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Detalle de la orden</CardTitle>
            <CardDescription>Estado, precios y cronología</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Estado</dt>
                <dd>
                  <StatusAction workOrderId={workOrder.id} currentStatus={workOrder.status} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Falla reportada</dt>
                <dd>{workOrder.reportedIssue}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Diagnóstico</dt>
                <dd>{workOrder.diagnosis ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Trabajo realizado</dt>
                <dd>{workOrder.workPerformed ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Presupuesto estimado (ARS)</dt>
                <dd>{workOrder.estimatedBudget ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Precio final (ARS)</dt>
                <dd>{workOrder.finalPrice ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Recibido el</dt>
                <dd>{new Date(workOrder.receivedAt).toLocaleString("es-AR")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Fecha estimada</dt>
                <dd>{workOrder.estimatedAt ? new Date(workOrder.estimatedAt).toLocaleString("es-AR") : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Entregado el</dt>
                <dd>{workOrder.deliveredAt ? new Date(workOrder.deliveredAt).toLocaleString("es-AR") : "—"}</dd>
              </div>
              {workOrder.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Notas</dt>
                  <dd>{workOrder.notes}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted-foreground">Creado</dt>
                <dd>{new Date(workOrder.createdAt).toLocaleString("es-AR")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Actualizado</dt>
                <dd>{new Date(workOrder.updatedAt).toLocaleString("es-AR")}</dd>
              </div>
              {workOrder.archivedAt ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Archivado</dt>
                  <dd className="text-destructive">{new Date(workOrder.archivedAt).toLocaleString("es-AR")}</dd>
                </div>
              ) : null}
            </dl>

            <div className="flex gap-3 pt-2 border-t">
              {workOrder.archivedAt ? null : (
                <Link href={`/work-orders/${workOrder.id}/edit`} className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
                  Editar orden
                </Link>
              )}
              <Link href="/work-orders" className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
                Volver a la lista
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}