"use client";
import type { ApiErrorBody, WorkOrder, CreateWorkOrderInput, UpdateWorkOrderInput, UpdateWorkOrderStatusInput } from "@/lib/api/types";

export type WorkOrderMutationResult = { status: "ok"; workOrder: WorkOrder } | { status: "error"; error: ApiErrorBody };

const FALLBACK_ERROR = (status: number, path: string): ApiErrorBody => ({
  statusCode: status,
  code: "UNKNOWN_ERROR",
  message: "Unexpected error",
  path,
});

async function parseWorkOrderResponse(response: Response, path: string): Promise<WorkOrderMutationResult> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    return { status: "error", error: (body as ApiErrorBody | undefined) ?? FALLBACK_ERROR(response.status, path) };
  }
  return { status: "ok", workOrder: body as WorkOrder };
}

export async function createWorkOrder(input: CreateWorkOrderInput): Promise<WorkOrderMutationResult> {
  const response = await fetch("/api/work-orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseWorkOrderResponse(response, "/api/work-orders");
}

export async function updateWorkOrder(id: string, input: UpdateWorkOrderInput): Promise<WorkOrderMutationResult> {
  const path = `/api/work-orders/${id}`;
  const response = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseWorkOrderResponse(response, path);
}

export async function updateWorkOrderStatus(id: string, input: UpdateWorkOrderStatusInput): Promise<WorkOrderMutationResult> {
  const path = `/api/work-orders/${id}/status`;
  const response = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseWorkOrderResponse(response, path);
}

export async function archiveWorkOrder(id: string): Promise<WorkOrderMutationResult> {
  const path = `/api/work-orders/${id}`;
  const response = await fetch(path, { method: "DELETE" });
  return parseWorkOrderResponse(response, path);
}