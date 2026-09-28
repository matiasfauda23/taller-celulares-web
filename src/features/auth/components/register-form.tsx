"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { registerSchema, type RegisterFormValues } from "@/features/auth/schemas/auth";

export function RegisterForm() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { ownerName: "", email: "", password: "", workshopName: "", workshopAddress: "" },
  });

  async function onSubmit(values: RegisterFormValues) {
    setFormError(null);
    const response = await fetch("/api/session/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
      credentials: "include",
    });

    if (!response.ok) {
      const body: { message?: string } | null = await response.json().catch(() => null);
      setFormError(body?.message ?? "No se pudo crear la cuenta. Intenta de nuevo.");
      return;
    }

    // router.push alone: a refresh() issued right after cancels the in-flight navigation.
    await router.push("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field data-invalid={Boolean(errors.ownerName)}>
          <FieldLabel htmlFor="register-owner-name">Tu nombre</FieldLabel>
          <Input id="register-owner-name" autoComplete="name" aria-invalid={Boolean(errors.ownerName)} {...register("ownerName")} />
          <FieldError errors={[errors.ownerName]} />
        </Field>
        <Field data-invalid={Boolean(errors.email)}>
          <FieldLabel htmlFor="register-email">Email</FieldLabel>
          <Input id="register-email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} {...register("email")} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field data-invalid={Boolean(errors.password)}>
          <FieldLabel htmlFor="register-password">Contraseña</FieldLabel>
          <Input
            id="register-password"
            type="password"
            autoComplete="new-password"
            aria-invalid={Boolean(errors.password)}
            {...register("password")}
          />
          <FieldError errors={[errors.password]} />
        </Field>
        <Field data-invalid={Boolean(errors.workshopName)}>
          <FieldLabel htmlFor="register-workshop-name">Nombre del taller</FieldLabel>
          <Input id="register-workshop-name" aria-invalid={Boolean(errors.workshopName)} {...register("workshopName")} />
          <FieldError errors={[errors.workshopName]} />
        </Field>
        <Field data-invalid={Boolean(errors.workshopAddress)}>
          <FieldLabel htmlFor="register-workshop-address">Dirección del taller</FieldLabel>
          <Input id="register-workshop-address" aria-invalid={Boolean(errors.workshopAddress)} {...register("workshopAddress")} />
          <FieldError errors={[errors.workshopAddress]} />
        </Field>
        {formError ? (
          <p role="alert" className="text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creando cuenta..." : "Crear cuenta"}
        </Button>
      </FieldGroup>
    </form>
  );
}