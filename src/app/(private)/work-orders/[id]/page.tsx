import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArchiveWorkOrderButton } from "@/features/work-orders/components/archive-work-order-button";
import { StatusAction } from "@/features/work-orders/components/status-action";
import { WorkOrderFormWrapper } from "@/features/work-orders/components/work-order-form";
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
    if (result.error.statusCode === 404) {
      redirect("/work-orders");
    }
    return (
      <div className="flex flex-col gap-6">
        <p role="alert" className="text-sm text-destructive">
          Could not load work order: {result.error.message}
        </p>
      </div>
    );
  }

  const workOrder = result.workOrder;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-base leading-snug font-medium">{workOrder.number}</h1>
          <p className="text-sm text-muted-foreground">Device: {workOrder.deviceId}</p>
        </div>
        <div className="flex gap-3">
          <ArchiveWorkOrderButton workOrderId={workOrder.id} workOrderNumber={workOrder.number} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Work order details</CardTitle>
            <CardDescription>Status, pricing, and timeline</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 pt-4">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd>
                  <StatusAction workOrderId={workOrder.id} currentStatus={workOrder.status} />
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Reported issue</dt>
                <dd>{workOrder.reportedIssue}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Diagnosis</dt>
                <dd>{workOrder.diagnosis ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Work performed</dt>
                <dd>{workOrder.workPerformed ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Estimated budget (ARS)</dt>
                <dd>{workOrder.estimatedBudget ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Final price (ARS)</dt>
                <dd>{workOrder.finalPrice ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Received at</dt>
                <dd>{new Date(workOrder.receivedAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Estimated date</dt>
                <dd>{workOrder.estimatedAt ? new Date(workOrder.estimatedAt).toLocaleString() : "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Delivered at</dt>
                <dd>{workOrder.deliveredAt ? new Date(workOrder.deliveredAt).toLocaleString() : "—"}</dd>
              </div>
              {workOrder.notes ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Notes</dt>
                  <dd>{workOrder.notes}</dd>
                </div>
              ) : null}
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd>{new Date(workOrder.createdAt).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Updated</dt>
                <dd>{new Date(workOrder.updatedAt).toLocaleString()}</dd>
              </div>
              {workOrder.archivedAt ? (
                <div className="sm:col-span-2">
                  <dt className="text-muted-foreground">Archived</dt>
                  <dd className="text-destructive">{new Date(workOrder.archivedAt).toLocaleString()}</dd>
                </div>
              ) : null}
            </dl>

            <div className="flex gap-3 pt-2 border-t">
              <a href={`/work-orders/${workOrder.id}/edit`} className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
                Edit work order
              </a>
              <a href="/work-orders" className="rounded-lg border border-input px-3 py-1.5 text-sm hover:bg-muted">
                Back to list
              </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}