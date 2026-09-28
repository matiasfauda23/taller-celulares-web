import { z } from "zod";
import type { CreateDeviceInput } from "@/lib/api/types";

export const deviceSchema = z.object({
  clientId: z.string().uuid("Selecciona un cliente válido"),
  brand: z.string().trim().min(1, "La marca es requerida").max(100, "La marca debe tener como máximo 100 caracteres"),
  model: z.string().trim().min(1, "El modelo es requerido").max(100, "El modelo debe tener como máximo 100 caracteres"),
  serialNumber: z.string().trim().max(100, "El número de serie debe tener como máximo 100 caracteres").optional(),
  color: z.string().trim().max(60, "El color debe tener como máximo 60 caracteres").optional(),
  physicalCondition: z.string().trim().min(1, "La condición física es requerida").max(1000, "La condición física debe tener como máximo 1000 caracteres"),
});

export type DeviceFormValues = z.infer<typeof deviceSchema>;

export function toDeviceInput(values: DeviceFormValues): CreateDeviceInput {
  return {
    clientId: values.clientId,
    brand: values.brand,
    model: values.model,
    physicalCondition: values.physicalCondition,
    ...(values.serialNumber ? { serialNumber: values.serialNumber } : {}),
    ...(values.color ? { color: values.color } : {}),
  };
}