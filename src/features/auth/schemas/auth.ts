import { z } from "zod";

const email = z.string().trim().toLowerCase().max(254, "El email debe tener como máximo 254 caracteres").email("Ingresa un email válido");

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "La contraseña es requerida"),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  ownerName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(100, "El nombre debe tener como máximo 100 caracteres"),
  email,
  password: z.string().min(12, "La contraseña debe tener al menos 12 caracteres").max(128, "La contraseña debe tener como máximo 128 caracteres"),
  workshopName: z.string().trim().min(2, "El nombre del taller debe tener al menos 2 caracteres").max(120, "El nombre del taller debe tener como máximo 120 caracteres"),
  workshopAddress: z.string().trim().min(5, "La dirección del taller debe tener al menos 5 caracteres").max(200, "La dirección del taller debe tener como máximo 200 caracteres"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;