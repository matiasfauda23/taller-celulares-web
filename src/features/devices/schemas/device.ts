import { z } from "zod";
import type { CreateDeviceInput } from "@/lib/api/types";

export const deviceSchema = z.object({
  clientId: z.string().uuid("Select a valid client"),
  brand: z.string().trim().min(1, "Brand is required").max(100, "Brand must be at most 100 characters"),
  model: z.string().trim().min(1, "Model is required").max(100, "Model must be at most 100 characters"),
  serialNumber: z.string().trim().max(100, "Serial number must be at most 100 characters").optional(),
  color: z.string().trim().max(60, "Color must be at most 60 characters").optional(),
  physicalCondition: z.string().trim().min(1, "Physical condition is required").max(1000, "Physical condition must be at most 1000 characters"),
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