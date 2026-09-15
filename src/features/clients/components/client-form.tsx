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

interface ClientFormProps {
  mode: "create" | "edit";
  clientId?: string;
  defaultValues?: ClientFormValues;
}

export function ClientForm({ mode, clientId, defaultValues }: ClientFormProps) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(clientSchema),
    defaultValues: defaultValues ?? { firstName: "", lastName: "", phone: "", email: "", address: "", notes: "" },
  });

  async function onSubmit(values: ClientFormValues) {
    setFormError(null);
    const input = toClientInput(values);
    const result = mode === "create" ? await createClient(input) : await updateClient(clientId as string, input);

    if (result.status === "error") {
      setFormError(result.error.message);
      return;
    }

    router.push(`/clients/${result.client.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.firstName)}>
          <FieldLabel htmlFor="client-first-name">First name</FieldLabel>
          <Input id="client-first-name" aria-invalid={Boolean(errors.firstName)} {...register("firstName")} />
          <FieldError errors={[errors.firstName]} />
        </Field>
        <Field data-invalid={Boolean(errors.lastName)}>
          <FieldLabel htmlFor="client-last-name">Last name</FieldLabel>
          <Input id="client-last-name" aria-invalid={Boolean(errors.lastName)} {...register("lastName")} />
          <FieldError errors={[errors.lastName]} />
        </Field>
        <Field data-invalid={Boolean(errors.phone)}>
          <FieldLabel htmlFor="client-phone">Phone</FieldLabel>
          <Input id="client-phone" aria-invalid={Boolean(errors.phone)} {...register("phone")} />
          <FieldError errors={[errors.phone]} />
        </Field>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="client-email">Email</FieldLabel>
          <Input id="client-email" type="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={Boolean(errors.address)}>
          <FieldLabel htmlFor="client-address">Address</FieldLabel>
          <Input id="client-address" aria-invalid={Boolean(errors.address)} {...register("address")} />
          <FieldError errors={[errors.address]} />
        </Field>
        <Field data-invalid={Boolean(errors.notes)}>
          <FieldLabel htmlFor="client-notes">Notes</FieldLabel>
          <Input id="client-notes" aria-invalid={Boolean(errors.notes)} {...register("notes")} />
          <FieldError errors={[errors.notes]} />
        </Field>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : mode === "create" ? "Create client" : "Save changes"}
        </Button>
      </FieldGroup>
    </form>
  );
}
