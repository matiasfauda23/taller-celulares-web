import { Card, CardContent } from "@/components/ui/card";
import { WorkOrderFormWrapper } from "@/features/work-orders/components/work-order-form";

export default function NewWorkOrderPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-base leading-snug font-medium">New work order</h1>
      <Card>
        <CardContent className="pt-4">
          <WorkOrderFormWrapper mode="create" />
        </CardContent>
      </Card>
    </div>
  );
}