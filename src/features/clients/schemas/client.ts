import { z } from "zod";
import type { CreateClientInput } from "@/lib/api/types";

export const clientSchema = z.object({
  firstName: z.string().trim().min(1, "El nombre es requerido").max(100, "El nombre debe tener como máximo 100 caracteres"),
  lastName: z.string().trim().min(1, "El apellido es requerido").max(100, "El apellido debe tener como máximo 100 caracteres"),
  phone: z.string().trim().min(1, "El teléfono es requerido").max(40, "El teléfono debe tener como máximo 40 caracteres"),
  email: z
    .union([z.literal(""), z.string().trim().max(254, "El email debe tener como máximo 254 caracteres").email("Ingresa un email válido")])
    .optional(),
  address: z.string().trim().min(1, "La dirección es requerida").max(200, "La dirección debe tener como máximo 200 caracteres"),
  notes: z.string().trim().max(1000, "Las notas deben tener como máximo 1000 caracteres").optional(),
});

export type ClientFormValues = z.infer<typeof clientSchema>;

export function toClientInput(values: ClientFormValues): CreateClientInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    phone: values.phone,
    address: values.address,
    ...(values.email ? { email: values.email } : {}),
    ...(values.notes ? { notes: values.notes } : {}),
  };
}