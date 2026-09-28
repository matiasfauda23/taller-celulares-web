"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createDevice, updateDevice } from "@/features/devices/api/device-actions";
import { deviceSchema, toDeviceInput, type DeviceFormValues } from "@/features/devices/schemas/device";
import { ApiErrorAlert } from "@/components/shared/api-error-alert";
import { getFieldError } from "@/lib/api/present-error";
import type { ApiErrorBody } from "@/lib/api/types";

interface DeviceFormClientProps {
  mode: "create" | "edit";
  deviceId?: string;
  defaultValues?: import("@/features/devices/schemas/device").DeviceFormValues;
  clientOptions: { id: string; firstName: string; lastName: string }[];
}

export function DeviceFormClient({ mode, deviceId, defaultValues, clientOptions }: DeviceFormClientProps) {
  const router = useRouter();
  const [apiError, setApiError] = useState<ApiErrorBody | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<import("@/features/devices/schemas/device").DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: defaultValues ?? { clientId: "", brand: "", model: "", serialNumber: "", color: "", physicalCondition: "" },
  });

  async function onSubmit(values: import("@/features/devices/schemas/device").DeviceFormValues) {
    setApiError(null);
    const input = toDeviceInput(values);
    const result = mode === "create" ? await createDevice(input) : await updateDevice(deviceId as string, input);

    if (result.status === "error") {
      setApiError(result.error);

      if (result.error.details) {
        for (const detail of result.error.details) {
          setError(detail.field as keyof import("@/features/devices/schemas/device").DeviceFormValues, { type: "server", message: detail.message });
        }
      }
      return;
    }

    router.push(`/devices/${result.device.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <ApiErrorAlert error={apiError} />
      <FieldGroup>
        <Field data-invalid={Boolean(errors.clientId)}>
          <FieldLabel htmlFor="device-client-id">Cliente</FieldLabel>
          <select id="device-client-id" aria-invalid={Boolean(errors.clientId)} {...register("clientId")}>
            <option value="">Selecciona un cliente</option>
            {clientOptions.map((client) => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName}
              </option>
            ))}
          </select>
          <FieldError errors={[errors.clientId, getFieldError(apiError, "clientId")]} />
        </Field>
        <Field data-invalid={Boolean(errors.brand)}>
          <FieldLabel htmlFor="device-brand">Marca</FieldLabel>
          <Input id="device-brand" aria-invalid={Boolean(errors.brand)} {...register("brand")} />
          <FieldError errors={[errors.brand, getFieldError(apiError, "brand")]} />
        </Field>
        <Field data-invalid={Boolean(errors.model)}>
          <FieldLabel htmlFor="device-model">Modelo</FieldLabel>
          <Input id="device-model" aria-invalid={Boolean(errors.model)} {...register("model")} />
          <FieldError errors={[errors.model, getFieldError(apiError, "model")]} />
        </Field>
        <Field data-invalid={Boolean(errors.serialNumber)}>
          <FieldLabel htmlFor="device-serial-number">Número de serie (opcional)</FieldLabel>
          <Input id="device-serial-number" aria-invalid={Boolean(errors.serialNumber)} {...register("serialNumber")} />
          <FieldError errors={[errors.serialNumber, getFieldError(apiError, "serialNumber")]} />
        </Field>
        <Field data-invalid={Boolean(errors.color)}>
          <FieldLabel htmlFor="device-color">Color (opcional)</FieldLabel>
          <Input id="device-color" aria-invalid={Boolean(errors.color)} {...register("color")} />
          <FieldError errors={[errors.color, getFieldError(apiError, "color")]} />
        </Field>
        <Field data-invalid={Boolean(errors.physicalCondition)}>
          <FieldLabel htmlFor="device-physical-condition">Condición física</FieldLabel>
          <Input id="device-physical-condition" aria-invalid={Boolean(errors.physicalCondition)} {...register("physicalCondition")} />
          <FieldError errors={[errors.physicalCondition, getFieldError(apiError, "physicalCondition")]} />
        </Field>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : mode === "create" ? "Crear dispositivo" : "Guardar cambios"}
        </Button>
      </FieldGroup>
    </form>
  );
}