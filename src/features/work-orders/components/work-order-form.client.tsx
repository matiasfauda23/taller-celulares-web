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
import { ApiErrorAlert } from "@/components/shared/api-error-alert";
import { getFieldError } from "@/lib/api/present-error";
import type { ApiErrorBody } from "@/lib/api/types";

export function WorkOrderFormCreateClient({ mode, defaultValues, deviceOptions }: { mode: "create"; defaultValues?: WorkOrderFormValues; deviceOptions: { id: string; brand: string; model: string; serialNumber: string | null }[] }) {
  const router = useRouter();
  const [apiError, setApiError] = useState<ApiErrorBody | null>(null);
  const {
    register,
    handleSubmit,
    setError,
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
    setApiError(null);
    const input = toWorkOrderInput(values);
    const result = await createWorkOrder(input);

    if (result.status === "error") {
      setApiError(result.error);

      if (result.error.details) {
        for (const detail of result.error.details) {
          setError(detail.field as keyof WorkOrderFormValues, { type: "server", message: detail.message });
        }
      }
      return;
    }

    router.push(`/work-orders/${result.workOrder.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <ApiErrorAlert error={apiError} />
      <FieldGroup>
        <Field data-invalid={Boolean(errors.deviceId)}>
          <FieldLabel htmlFor="work-order-device-id">Dispositivo</FieldLabel>
          <select id="work-order-device-id" aria-invalid={Boolean(errors.deviceId)} {...register("deviceId")}>
            <option value="">Selecciona un dispositivo</option>
            {deviceOptions.map((device) => (
              <option key={device.id} value={device.id}>
                {device.brand} {device.model} {device.serialNumber ? `(${device.serialNumber})` : ""}
              </option>
            ))}
          </select>
          <FieldError errors={[errors.deviceId, getFieldError(apiError, "deviceId")]} />
        </Field>
        <Field data-invalid={Boolean(errors.reportedIssue)}>
          <FieldLabel htmlFor="work-order-reported-issue">Falla reportada</FieldLabel>
          <Input id="work-order-reported-issue" aria-invalid={Boolean(errors.reportedIssue)} {...register("reportedIssue")} />
          <FieldError errors={[errors.reportedIssue, getFieldError(apiError, "reportedIssue")]} />
        </Field>
        <Field data-invalid={Boolean(errors.diagnosis)}>
          <FieldLabel htmlFor="work-order-diagnosis">Diagnóstico (opcional)</FieldLabel>
          <Input id="work-order-diagnosis" aria-invalid={Boolean(errors.diagnosis)} {...register("diagnosis")} />
          <FieldError errors={[errors.diagnosis, getFieldError(apiError, "diagnosis")]} />
        </Field>
        <Field data-invalid={Boolean(errors.workPerformed)}>
          <FieldLabel htmlFor="work-order-work-performed">Trabajo realizado (opcional)</FieldLabel>
          <Input id="work-order-work-performed" aria-invalid={Boolean(errors.workPerformed)} {...register("workPerformed")} />
          <FieldError errors={[errors.workPerformed, getFieldError(apiError, "workPerformed")]} />
        </Field>
        <Field data-invalid={Boolean(errors.estimatedBudget)}>
          <FieldLabel htmlFor="work-order-estimated-budget">Presupuesto estimado (ARS, opcional)</FieldLabel>
          <Input id="work-order-estimated-budget" type="number" step="0.01" min="0" aria-invalid={Boolean(errors.estimatedBudget)} {...register("estimatedBudget")} />
          <FieldError errors={[errors.estimatedBudget, getFieldError(apiError, "estimatedBudget")]} />
        </Field>
        <Field data-invalid={Boolean(errors.finalPrice)}>
          <FieldLabel htmlFor="work-order-final-price">Precio final (ARS, opcional)</FieldLabel>
          <Input id="work-order-final-price" type="number" step="0.01" min="0" aria-invalid={Boolean(errors.finalPrice)} {...register("finalPrice")} />
          <FieldError errors={[errors.finalPrice, getFieldError(apiError, "finalPrice")]} />
        </Field>
        <Field data-invalid={Boolean(errors.estimatedAt)}>
          <FieldLabel htmlFor="work-order-estimated-at">Fecha estimada (opcional)</FieldLabel>
          <Input id="work-order-estimated-at" type="datetime-local" aria-invalid={Boolean(errors.estimatedAt)} {...register("estimatedAt")} />
          <FieldError errors={[errors.estimatedAt, getFieldError(apiError, "estimatedAt")]} />
        </Field>
        <Field data-invalid={Boolean(errors.notes)}>
          <FieldLabel htmlFor="work-order-notes">Notas (opcional)</FieldLabel>
          <Input id="work-order-notes" aria-invalid={Boolean(errors.notes)} {...register("notes")} />
          <FieldError errors={[errors.notes, getFieldError(apiError, "notes")]} />
        </Field>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : mode === "create" ? "Crear orden" : "Guardar cambios"}
        </Button>
      </FieldGroup>
    </form>
  );
}

export function WorkOrderFormEditClient({ mode, workOrderId, defaultValues }: { mode: "edit"; workOrderId: string; defaultValues?: WorkOrderUpdateFormValues }) {
  const router = useRouter();
  const [apiError, setApiError] = useState<ApiErrorBody | null>(null);
  const {
    register,
    handleSubmit,
    setError,
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
    setApiError(null);
    const input = toWorkOrderUpdateInput(values);
    const result = await updateWorkOrder(workOrderId, input);

    if (result.status === "error") {
      setApiError(result.error);

      if (result.error.details) {
        for (const detail of result.error.details) {
          setError(detail.field as keyof WorkOrderUpdateFormValues, { type: "server", message: detail.message });
        }
      }
      return;
    }

    router.push(`/work-orders/${result.workOrder.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <ApiErrorAlert error={apiError} />
      <FieldGroup>
        <Field data-invalid={Boolean(errors.reportedIssue)}>
          <FieldLabel htmlFor="work-order-reported-issue">Falla reportada</FieldLabel>
          <Input id="work-order-reported-issue" aria-invalid={Boolean(errors.reportedIssue)} {...register("reportedIssue")} />
          <FieldError errors={[errors.reportedIssue, getFieldError(apiError, "reportedIssue")]} />
        </Field>
        <Field data-invalid={Boolean(errors.diagnosis)}>
          <FieldLabel htmlFor="work-order-diagnosis">Diagnóstico (opcional)</FieldLabel>
          <Input id="work-order-diagnosis" aria-invalid={Boolean(errors.diagnosis)} {...register("diagnosis")} />
          <FieldError errors={[errors.diagnosis, getFieldError(apiError, "diagnosis")]} />
        </Field>
        <Field data-invalid={Boolean(errors.workPerformed)}>
          <FieldLabel htmlFor="work-order-work-performed">Trabajo realizado (opcional)</FieldLabel>
          <Input id="work-order-work-performed" aria-invalid={Boolean(errors.workPerformed)} {...register("workPerformed")} />
          <FieldError errors={[errors.workPerformed, getFieldError(apiError, "workPerformed")]} />
        </Field>
        <Field data-invalid={Boolean(errors.estimatedBudget)}>
          <FieldLabel htmlFor="work-order-estimated-budget">Presupuesto estimado (ARS, opcional)</FieldLabel>
          <Input id="work-order-estimated-budget" type="number" step="0.01" min="0" aria-invalid={Boolean(errors.estimatedBudget)} {...register("estimatedBudget")} />
          <FieldError errors={[errors.estimatedBudget, getFieldError(apiError, "estimatedBudget")]} />
        </Field>
        <Field data-invalid={Boolean(errors.finalPrice)}>
          <FieldLabel htmlFor="work-order-final-price">Precio final (ARS, opcional)</FieldLabel>
          <Input id="work-order-final-price" type="number" step="0.01" min="0" aria-invalid={Boolean(errors.finalPrice)} {...register("finalPrice")} />
          <FieldError errors={[errors.finalPrice, getFieldError(apiError, "finalPrice")]} />
        </Field>
        <Field data-invalid={Boolean(errors.estimatedAt)}>
          <FieldLabel htmlFor="work-order-estimated-at">Fecha estimada (opcional)</FieldLabel>
          <Input id="work-order-estimated-at" type="datetime-local" aria-invalid={Boolean(errors.estimatedAt)} {...register("estimatedAt")} />
          <FieldError errors={[errors.estimatedAt, getFieldError(apiError, "estimatedAt")]} />
        </Field>
        <Field data-invalid={Boolean(errors.notes)}>
          <FieldLabel htmlFor="work-order-notes">Notas (opcional)</FieldLabel>
          <Input id="work-order-notes" aria-invalid={Boolean(errors.notes)} {...register("notes")} />
          <FieldError errors={[errors.notes, getFieldError(apiError, "notes")]} />
        </Field>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : "Guardar cambios"}
        </Button>
      </FieldGroup>
    </form>
  );
}