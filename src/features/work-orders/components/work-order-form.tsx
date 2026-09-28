"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createWorkOrder, updateWorkOrder } from "@/features/work-orders/api/work-order-actions";
import {
  workOrderSchema,
  toWorkOrderInput,
  workOrderUpdateSchema,
  toWorkOrderUpdateInput,
  type WorkOrderFormValues,
  type WorkOrderUpdateFormValues,
} from "@/features/work-orders/schemas/work-order";
import { listDevices } from "@/features/devices/api/devices";
import { getSessionForRender } from "@/lib/session/session";

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
    return (
      <WorkOrderFormCreateClient
        mode={mode}
        workOrderId={workOrderId}
        defaultValues={defaultValues}
        deviceOptions={deviceOptions}
      />
    );
  } else {
    return (
      <WorkOrderFormEditClient
        mode={mode}
        workOrderId={workOrderId}
        defaultValues={defaultValues}
      />
    );
  }
}

function WorkOrderFormCreateClient({ mode, workOrderId, defaultValues, deviceOptions }: WorkOrderFormProps & { deviceOptions: { id: string; brand: string; model: string; serialNumber: string | null }[] }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WorkOrderFormValues>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: defaultValues ?? {
      deviceId: "",
      reportedIssue: "",
      diagnosis: "",
      workPerformed: "",
      estimatedBudget: undefined,
      finalPrice: undefined,
      receivedAt: undefined,
      estimatedAt: undefined,
      notes: "",
    },
  });

  async function onSubmit(values: WorkOrderFormValues) {
    setFormError(null);
    const input = toWorkOrderInput(values);
    const result = await createWorkOrder(input);

    if (result.status === "error") {
      setFormError(result.error.message);
      return;
    }

    router.push(`/work-orders/${result.workOrder.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.deviceId)}>
          <FieldLabel htmlFor="work-order-device-id">Device</FieldLabel>
          <select id="work-order-device-id" aria-invalid={Boolean(errors.deviceId)} {...register("deviceId")}>
            <option value="">Select a device</option>
            {deviceOptions.map((device) => (
              <option key={device.id} value={device.id}>
                {device.brand} {device.model} {device.serialNumber ? `(${device.serialNumber})` : ""}
              </option>
            ))}
          </select>
          <FieldError errors={[errors.deviceId]} />
        </Field>
        <Field data-invalid={Boolean(errors.reportedIssue)}>
          <FieldLabel htmlFor="work-order-reported-issue">Reported issue</FieldLabel>
          <Input id="work-order-reported-issue" aria-invalid={Boolean(errors.reportedIssue)} {...register("reportedIssue")} />
          <FieldError errors={[errors.reportedIssue]} />
        </Field>
        <Field data-invalid={Boolean(errors.diagnosis)}>
          <FieldLabel htmlFor="work-order-diagnosis">Diagnosis (optional)</FieldLabel>
          <Input id="work-order-diagnosis" aria-invalid={Boolean(errors.diagnosis)} {...register("diagnosis")} />
          <FieldError errors={[errors.diagnosis]} />
        </Field>
        <Field data-invalid={Boolean(errors.workPerformed)}>
          <FieldLabel htmlFor="work-order-work-performed">Work performed (optional)</FieldLabel>
          <Input id="work-order-work-performed" aria-invalid={Boolean(errors.workPerformed)} {...register("workPerformed")} />
          <FieldError errors={[errors.workPerformed]} />
        </Field>
        <Field data-invalid={Boolean(errors.estimatedBudget)}>
          <FieldLabel htmlFor="work-order-estimated-budget">Estimated budget (ARS, optional)</FieldLabel>
          <Input id="work-order-estimated-budget" type="number" step="0.01" min="0" aria-invalid={Boolean(errors.estimatedBudget)} {...register("estimatedBudget")} />
          <FieldError errors={[errors.estimatedBudget]} />
        </Field>
        <Field data-invalid={Boolean(errors.finalPrice)}>
          <FieldLabel htmlFor="work-order-final-price">Final price (ARS, optional)</FieldLabel>
          <Input id="work-order-final-price" type="number" step="0.01" min="0" aria-invalid={Boolean(errors.finalPrice)} {...register("finalPrice")} />
          <FieldError errors={[errors.finalPrice]} />
        </Field>
        <Field data-invalid={Boolean(errors.estimatedAt)}>
          <FieldLabel htmlFor="work-order-estimated-at">Estimated date (optional)</FieldLabel>
          <Input id="work-order-estimated-at" type="datetime-local" aria-invalid={Boolean(errors.estimatedAt)} {...register("estimatedAt")} />
          <FieldError errors={[errors.estimatedAt]} />
        </Field>
        <Field data-invalid={Boolean(errors.notes)}>
          <FieldLabel htmlFor="work-order-notes">Notes (optional)</FieldLabel>
          <Input id="work-order-notes" aria-invalid={Boolean(errors.notes)} {...register("notes")} />
          <FieldError errors={[errors.notes]} />
        </Field>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "create" ? "Create work order" : "Save changes"}
        </Button>
      </FieldGroup>
    </form>
  );
}

function WorkOrderFormEditClient({ mode, workOrderId, defaultValues }: WorkOrderFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<WorkOrderUpdateFormValues>({
    resolver: zodResolver(workOrderUpdateSchema),
    defaultValues: defaultValues ?? {
      reportedIssue: "",
      diagnosis: "",
      workPerformed: "",
      estimatedBudget: undefined,
      finalPrice: undefined,
      estimatedAt: undefined,
      notes: "",
    },
  });

  async function onSubmit(values: WorkOrderUpdateFormValues) {
    setFormError(null);
    const input = toWorkOrderUpdateInput(values);
    const result = await updateWorkOrder(workOrderId as string, input);

    if (result.status === "error") {
      setFormError(result.error.message);
      return;
    }

    router.push(`/work-orders/${result.workOrder.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.reportedIssue)}>
          <FieldLabel htmlFor="work-order-reported-issue">Reported issue</FieldLabel>
          <Input id="work-order-reported-issue" aria-invalid={Boolean(errors.reportedIssue)} {...register("reportedIssue")} />
          <FieldError errors={[errors.reportedIssue]} />
        </Field>
        <Field data-invalid={Boolean(errors.diagnosis)}>
          <FieldLabel htmlFor="work-order-diagnosis">Diagnosis (optional)</FieldLabel>
          <Input id="work-order-diagnosis" aria-invalid={Boolean(errors.diagnosis)} {...register("diagnosis")} />
          <FieldError errors={[errors.diagnosis]} />
        </Field>
        <Field data-invalid={Boolean(errors.workPerformed)}>
          <FieldLabel htmlFor="work-order-work-performed">Work performed (optional)</FieldLabel>
          <Input id="work-order-work-performed" aria-invalid={Boolean(errors.workPerformed)} {...register("workPerformed")} />
          <FieldError errors={[errors.workPerformed]} />
        </Field>
        <Field data-invalid={Boolean(errors.estimatedBudget)}>
          <FieldLabel htmlFor="work-order-estimated-budget">Estimated budget (ARS, optional)</FieldLabel>
          <Input id="work-order-estimated-budget" type="number" step="0.01" min="0" aria-invalid={Boolean(errors.estimatedBudget)} {...register("estimatedBudget")} />
          <FieldError errors={[errors.estimatedBudget]} />
        </Field>
        <Field data-invalid={Boolean(errors.finalPrice)}>
          <FieldLabel htmlFor="work-order-final-price">Final price (ARS, optional)</FieldLabel>
          <Input id="work-order-final-price" type="number" step="0.01" min="0" aria-invalid={Boolean(errors.finalPrice)} {...register("finalPrice")} />
          <FieldError errors={[errors.finalPrice]} />
        </Field>
        <Field data-invalid={Boolean(errors.estimatedAt)}>
          <FieldLabel htmlFor="work-order-estimated-at">Estimated date (optional)</FieldLabel>
          <Input id="work-order-estimated-at" type="datetime-local" aria-invalid={Boolean(errors.estimatedAt)} {...register("estimatedAt")} />
          <FieldError errors={[errors.estimatedAt]} />
        </Field>
        <Field data-invalid={Boolean(errors.notes)}>
          <FieldLabel htmlFor="work-order-notes">Notes (optional)</FieldLabel>
          <Input id="work-order-notes" aria-invalid={Boolean(errors.notes)} {...register("notes")} />
          <FieldError errors={[errors.notes]} />
        </Field>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "create" ? "Create work order" : "Save changes"}
        </Button>
      </FieldGroup>
    </form>
  );
}