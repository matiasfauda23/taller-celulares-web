import { listDevices } from "@/features/devices/api/devices";
import { getSessionForRender } from "@/lib/session/session";
import { WorkOrderFormCreateClient, WorkOrderFormEditClient } from "./work-order-form.client";
import type { WorkOrderFormValues, WorkOrderUpdateFormValues } from "@/features/work-orders/schemas/work-order";

interface WorkOrderFormProps {
  mode: "create" | "edit";
  workOrderId?: string;
  defaultValues?: WorkOrderFormValues | WorkOrderUpdateFormValues;
}

async function getDeviceOptions(accessToken: string) {
  const result = await listDevices(accessToken, { page: 1, limit: 100 });
  if (result.status === "error") return [];
  return result.page.data;
}

export async function WorkOrderFormWrapper({ mode, workOrderId, defaultValues }: WorkOrderFormProps) {
  const session = await getSessionForRender();
  const deviceOptions = session ? await getDeviceOptions(session.record.accessToken) : [];

  if (mode === "create") {
    // For create, defaultValues should be WorkOrderFormValues (or we provide empty deviceId)
    const createDefaults: WorkOrderFormValues = {
      deviceId: "",
      reportedIssue: "",
      diagnosis: "",
      workPerformed: "",
      estimatedBudget: undefined,
      finalPrice: undefined,
      receivedAt: undefined,
      estimatedAt: undefined,
      notes: "",
      ...(defaultValues as Partial<WorkOrderFormValues>),
    };
    return (
      <WorkOrderFormCreateClient
        mode={mode}
        defaultValues={createDefaults}
        deviceOptions={deviceOptions}
      />
    );
  } else {
    if (!workOrderId) {
      throw new Error("workOrderId is required for edit mode");
    }
    return (
      <WorkOrderFormEditClient
        mode={mode}
        workOrderId={workOrderId}
        defaultValues={defaultValues as WorkOrderUpdateFormValues | undefined}
      />
    );
  }
}