import { z } from "zod";
import type { CreateWorkOrderInput, UpdateWorkOrderInput, UpdateWorkOrderStatusInput } from "@/lib/api/types";

// Accepts datetime-local format (YYYY-MM-DDTHH:MM) and converts to ISO
const datetimeLocalSchema = z.string().optional().refine(
  (val) => !val || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val),
  { message: "Formato de fecha inválido (use YYYY-MM-DDTHH:MM)" }
).transform((val) => {
  if (!val) return undefined;
  // Convert datetime-local to ISO with seconds and local timezone
  const date = new Date(val);
  return date.toISOString();
});

export const workOrderSchema = z.object({
  deviceId: z.string().uuid("Selecciona un dispositivo válido"),
  reportedIssue: z.string().trim().min(1, "La falla reportada es requerida").max(2000, "La falla reportada debe tener como máximo 2000 caracteres"),
  diagnosis: z.string().trim().max(2000, "El diagnóstico debe tener como máximo 2000 caracteres").optional(),
  workPerformed: z.string().trim().max(2000, "El trabajo realizado debe tener como máximo 2000 caracteres").optional(),
  estimatedBudget: z.coerce.number().min(0, "El presupuesto estimado debe ser >= 0").max(99999999.99, "El presupuesto estimado es demasiado grande").optional().nullable(),
  finalPrice: z.coerce.number().min(0, "El precio final debe ser >= 0").max(99999999.99, "El precio final es demasiado grande").optional().nullable(),
  receivedAt: datetimeLocalSchema,
  estimatedAt: datetimeLocalSchema,
  notes: z.string().trim().max(2000, "Las notas deben tener como máximo 2000 caracteres").optional(),
});

// The form holds the schema *input* (raw `datetime-local` strings), while submission receives the
// schema *output* (ISO strings produced by the transform). Keeping both types distinct is what lets
// zodResolver type-check against useForm's field values.
export type WorkOrderFormValues = z.input<typeof workOrderSchema>;
export type WorkOrderFormParsed = z.output<typeof workOrderSchema>;

export function toWorkOrderInput(values: WorkOrderFormParsed): CreateWorkOrderInput {
  return {
    deviceId: values.deviceId,
    reportedIssue: values.reportedIssue,
    ...(values.diagnosis ? { diagnosis: values.diagnosis } : {}),
    ...(values.workPerformed ? { workPerformed: values.workPerformed } : {}),
    ...(values.estimatedBudget !== undefined && values.estimatedBudget !== null ? { estimatedBudget: values.estimatedBudget } : {}),
    ...(values.finalPrice !== undefined && values.finalPrice !== null ? { finalPrice: values.finalPrice } : {}),
    ...(values.receivedAt ? { receivedAt: values.receivedAt } : {}),
    ...(values.estimatedAt ? { estimatedAt: values.estimatedAt } : {}),
    ...(values.notes ? { notes: values.notes } : {}),
  };
}

export const workOrderUpdateSchema = z.object({
  reportedIssue: z.string().trim().min(1, "La falla reportada es requerida").max(2000, "La falla reportada debe tener como máximo 2000 caracteres").optional(),
  diagnosis: z.string().trim().max(2000, "El diagnóstico debe tener como máximo 2000 caracteres").optional(),
  workPerformed: z.string().trim().max(2000, "El trabajo realizado debe tener como máximo 2000 caracteres").optional(),
  estimatedBudget: z.coerce.number().min(0, "El presupuesto estimado debe ser >= 0").max(99999999.99, "El presupuesto estimado es demasiado grande").optional().nullable(),
  finalPrice: z.coerce.number().min(0, "El precio final debe ser >= 0").max(99999999.99, "El precio final es demasiado grande").optional().nullable(),
  estimatedAt: datetimeLocalSchema,
  notes: z.string().trim().max(2000, "Las notas deben tener como máximo 2000 caracteres").optional(),
});

export type WorkOrderUpdateFormValues = z.input<typeof workOrderUpdateSchema>;
export type WorkOrderUpdateFormParsed = z.output<typeof workOrderUpdateSchema>;

export function toWorkOrderUpdateInput(values: WorkOrderUpdateFormParsed): UpdateWorkOrderInput {
  return {
    ...(values.reportedIssue !== undefined ? { reportedIssue: values.reportedIssue } : {}),
    ...(values.diagnosis ? { diagnosis: values.diagnosis } : {}),
    ...(values.workPerformed ? { workPerformed: values.workPerformed } : {}),
    ...(values.estimatedBudget !== undefined && values.estimatedBudget !== null ? { estimatedBudget: values.estimatedBudget } : {}),
    ...(values.finalPrice !== undefined && values.finalPrice !== null ? { finalPrice: values.finalPrice } : {}),
    ...(values.estimatedAt ? { estimatedAt: values.estimatedAt } : {}),
    ...(values.notes ? { notes: values.notes } : {}),
  };
}

export const workOrderStatusSchema = z.object({
  status: z.enum(["RECEIVED", "DIAGNOSING", "WAITING_PARTS", "REPAIRING", "READY", "DELIVERED", "CANCELLED"]),
});

export type WorkOrderStatusFormValues = z.infer<typeof workOrderStatusSchema>;

export function toWorkOrderStatusInput(values: WorkOrderStatusFormValues): UpdateWorkOrderStatusInput {
  return { status: values.status };
}