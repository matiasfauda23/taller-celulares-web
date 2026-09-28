"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient, updateClient } from "@/features/clients/api/client-actions";
import { clientSchema, toClientInput, type ClientFormValues } from "@/features/clients/schemas/client";
import { ApiErrorAlert } from "@/components/shared/api-error-alert";
import { getFieldError } from "@/lib/api/present-error";
import type { ApiErrorBody } from "@/lib/api/types";

interface ClientFormProps {
  mode: "create" | "edit";
  clientId?: string;
  defaultValues?: ClientFormValues;
}

export function ClientForm({ mode, clientId, defaultValues }: ClientFormProps) {
  const router = useRouter();
  const [apiError, setApiError] = useState<ApiErrorBody | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: defaultValues ?? { firstName: "", lastName: "", phone: "", email: "", address: "", notes: "" },
  });

  async function onSubmit(values: ClientFormValues) {
    setApiError(null);
    const input = toClientInput(values);
    const result = mode === "create" ? await createClient(input) : await updateClient(clientId as string, input);

    if (result.status === "error") {
      setApiError(result.error);

      if (result.error.details) {
        for (const detail of result.error.details) {
          setError(detail.field as keyof ClientFormValues, { type: "server", message: detail.message });
        }
      }
      return;
    }

    router.push(`/clients/${result.client.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <ApiErrorAlert error={apiError} />
      <FieldGroup>
        <Field data-invalid={Boolean(errors.firstName)}>
          <FieldLabel htmlFor="client-first-name">Nombre</FieldLabel>
          <Input id="client-first-name" aria-invalid={Boolean(errors.firstName)} {...register("firstName")} />
          <FieldError errors={[errors.firstName, getFieldError(apiError, "firstName")]} />
        </Field>
        <Field data-invalid={Boolean(errors.lastName)}>
          <FieldLabel htmlFor="client-last-name">Apellido</FieldLabel>
          <Input id="client-last-name" aria-invalid={Boolean(errors.lastName)} {...register("lastName")} />
          <FieldError errors={[errors.lastName, getFieldError(apiError, "lastName")]} />
        </Field>
        <Field data-invalid={Boolean(errors.phone)}>
          <FieldLabel htmlFor="client-phone">Teléfono</FieldLabel>
          <Input id="client-phone" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
          <FieldError errors={[errors.phone, getFieldError(apiError, "phone")]} />
        </Field>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="client-email">Email</FieldLabel>
          <Input id="client-email" type="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
          <FieldError errors={[errors.email, getFieldError(apiError, "email")]} />
        </Field>
        <Field data-invalid={Boolean(errors.address)}>
          <FieldLabel htmlFor="client-address">Dirección</FieldLabel>
          <Input id="client-address" aria-invalid={Boolean(errors.address)} {...register("address")} />
          <FieldError errors={[errors.address, getFieldError(apiError, "address")]} />
        </Field>
        <Field data-invalid={Boolean(errors.notes)}>
          <FieldLabel htmlFor="client-notes">Notas</FieldLabel>
          <Input id="client-notes" aria-invalid={Boolean(errors.notes)} {...register("notes")} />
          <FieldError errors={[errors.notes, getFieldError(apiError, "notes")]} />
        </Field>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Guardando..." : mode === "create" ? "Crear cliente" : "Guardar cambios"}
        </Button>
      </FieldGroup>
    </form>
  );
}

export function ClientFormWrapper({ mode, clientId, defaultValues }: ClientFormProps) {
  return <ClientForm mode={mode} clientId={clientId} defaultValues={defaultValues} />;
}