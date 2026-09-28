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
import { listClients } from "@/features/clients/api/clients";
import { getSessionForRender } from "@/lib/session/session";

interface DeviceFormProps {
  mode: "create" | "edit";
  deviceId?: string;
  defaultValues?: DeviceFormValues;
}

async function getClientOptions(accessToken: string) {
  const result = await listClients(accessToken, { page: 1, limit: 100 });
  if (result.status === "error") return [];
  return result.page.data;
}

export async function DeviceFormWrapper({ mode, deviceId, defaultValues }: DeviceFormProps) {
  const session = await getSessionForRender();
  const clientOptions = session ? await getClientOptions(session.record.accessToken) : [];

  return (
    <DeviceFormClient
      mode={mode}
      deviceId={deviceId}
      defaultValues={defaultValues}
      clientOptions={clientOptions}
    />
  );
}

function DeviceFormClient({ mode, deviceId, defaultValues, clientOptions }: DeviceFormProps & { clientOptions: { id: string; firstName: string; lastName: string }[] }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<DeviceFormValues>({
    resolver: zodResolver(deviceSchema),
    defaultValues: defaultValues ?? { clientId: "", brand: "", model: "", serialNumber: "", color: "", physicalCondition: "" },
  });

  const selectedClientId = watch("clientId");

  async function onSubmit(values: DeviceFormValues) {
    setFormError(null);
    const input = toDeviceInput(values);
    const result = mode === "create" ? await createDevice(input) : await updateDevice(deviceId as string, input);

    if (result.status === "error") {
      setFormError(result.error.message);
      return;
    }

    router.push(`/devices/${result.device.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.clientId)}>
          <FieldLabel htmlFor="device-client-id">Client</FieldLabel>
          <select id="device-client-id" aria-invalid={Boolean(errors.clientId)} {...register("clientId")}>
            <option value="">Select a client</option>
            {clientOptions.map((client) => (
              <option key={client.id} value={client.id}>
                {client.firstName} {client.lastName}
              </option>
            ))}
          </select>
          <FieldError errors={[errors.clientId]} />
        </Field>
        <Field data-invalid={Boolean(errors.brand)}>
          <FieldLabel htmlFor="device-brand">Brand</FieldLabel>
          <Input id="device-brand" aria-invalid={Boolean(errors.brand)} {...register("brand")} />
          <FieldError errors={[errors.brand]} />
        </Field>
        <Field data-invalid={Boolean(errors.model)}>
          <FieldLabel htmlFor="device-model">Model</FieldLabel>
          <Input id="device-model" aria-invalid={Boolean(errors.model)} {...register("model")} />
          <FieldError errors={[errors.model]} />
        </Field>
        <Field data-invalid={Boolean(errors.serialNumber)}>
          <FieldLabel htmlFor="device-serial-number">Serial number (optional)</FieldLabel>
          <Input id="device-serial-number" aria-invalid={Boolean(errors.serialNumber)} {...register("serialNumber")} />
          <FieldError errors={[errors.serialNumber]} />
        </Field>
        <Field data-invalid={Boolean(errors.color)}>
          <FieldLabel htmlFor="device-color">Color (optional)</FieldLabel>
          <Input id="device-color" aria-invalid={Boolean(errors.color)} {...register("color")} />
          <FieldError errors={[errors.color]} />
        </Field>
        <Field data-invalid={Boolean(errors.physicalCondition)}>
          <FieldLabel htmlFor="device-physical-condition">Physical condition</FieldLabel>
          <Input id="device-physical-condition" aria-invalid={Boolean(errors.physicalCondition)} {...register("physicalCondition")} />
          <FieldError errors={[errors.physicalCondition]} />
        </Field>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "create" ? "Create device" : "Save changes"}
        </Button>
      </FieldGroup>
    </form>
  );
}