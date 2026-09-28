import { z } from "zod";
import type { CreateWorkOrderInput, UpdateWorkOrderInput, UpdateWorkOrderStatusInput } from "@/lib/api/types";

export const workOrderSchema = z.object({
  deviceId: z.string().uuid("Select a valid device"),
  reportedIssue: z.string().trim().min(1, "Reported issue is required").max(2000, "Reported issue must be at most 2000 characters"),
  diagnosis: z.string().trim().max(2000, "Diagnosis must be at most 2000 characters").optional(),
  workPerformed: z.string().trim().max(2000, "Work performed must be at most 2000 characters").optional(),
  estimatedBudget: z.coerce.number().min(0, "Estimated budget must be >= 0").max(99999999.99, "Estimated budget too large").optional(),
  finalPrice: z.coerce.number().min(0, "Final price must be >= 0").max(99999999.99, "Final price too large").optional(),
  receivedAt: z.string().datetime().optional(),
  estimatedAt: z.string().datetime().optional(),
  notes: z.string().trim().max(2000, "Notes must be at most 2000 characters").optional(),
});

export type WorkOrderFormValues = z.infer<typeof workOrderSchema>;

export function toWorkOrderInput(values: WorkOrderFormValues): CreateWorkOrderInput {
  return {
    deviceId: values.deviceId,
    reportedIssue: values.reportedIssue,
    ...(values.diagnosis ? { diagnosis: values.diagnosis } : {}),
    ...(values.workPerformed ? { workPerformed: values.workPerformed } : {}),
    ...(values.estimatedBudget !== undefined ? { estimatedBudget: values.estimatedBudget } : {}),
    ...(values.finalPrice !== undefined ? { finalPrice: values.finalPrice } : {}),
    ...(values.receivedAt ? { receivedAt: values.receivedAt } : {}),
    ...(values.estimatedAt ? { estimatedAt: values.estimatedAt } : {}),
    ...(values.notes ? { notes: values.notes } : {}),
  };
}

export const workOrderUpdateSchema = z.object({
  reportedIssue: z.string().trim().min(1, "Reported issue is required").max(2000, "Reported issue must be at most 2000 characters").optional(),
  diagnosis: z.string().trim().max(2000, "Diagnosis must be at most 2000 characters").optional(),
  workPerformed: z.string().trim().max(2000, "Work performed must be at most 2000 characters").optional(),
  estimatedBudget: z.coerce.number().min(0, "Estimated budget must be >= 0").max(99999999.99, "Estimated budget too large").optional(),
  finalPrice: z.coerce.number().min(0, "Final price must be >= 0").max(99999999.99, "Final price too large").optional(),
  estimatedAt: z.string().datetime().optional(),
  notes: z.string().trim().max(2000, "Notes must be at most 2000 characters").optional(),
});

export type WorkOrderUpdateFormValues = z.infer<typeof workOrderUpdateSchema>;

export function toWorkOrderUpdateInput(values: WorkOrderUpdateFormValues): UpdateWorkOrderInput {
  return {
    ...(values.reportedIssue !== undefined ? { reportedIssue: values.reportedIssue } : {}),
    ...(values.diagnosis ? { diagnosis: values.diagnosis } : {}),
    ...(values.workPerformed ? { workPerformed: values.workPerformed } : {}),
    ...(values.estimatedBudget !== undefined ? { estimatedBudget: values.estimatedBudget } : {}),
    ...(values.finalPrice !== undefined ? { finalPrice: values.finalPrice } : {}),
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