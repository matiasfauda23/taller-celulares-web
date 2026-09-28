import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { WorkOrderFormWrapper } from "@/features/work-orders/components/work-order-form";
import { getWorkOrder } from "@/features/work-orders/api/work-orders";
import { getSessionForRender } from "@/lib/session/session";

interface EditWorkOrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditWorkOrderPage({ params }: EditWorkOrderPageProps) {
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
      <h1 className="text-base leading-snug font-medium">Edit work order</h1>
      <Card>
        <CardContent className="pt-4">
          <WorkOrderFormWrapper
            mode="edit"
            workOrderId={workOrder.id}
            defaultValues={{
              reportedIssue: workOrder.reportedIssue,
              diagnosis: workOrder.diagnosis ?? "",
              workPerformed: workOrder.workPerformed ?? "",
              estimatedBudget: workOrder.estimatedBudget !== null ? Number(workOrder.estimatedBudget) : undefined,
              finalPrice: workOrder.finalPrice !== null ? Number(workOrder.finalPrice) : undefined,
              estimatedAt: workOrder.estimatedAt ?? "",
              notes: workOrder.notes ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}