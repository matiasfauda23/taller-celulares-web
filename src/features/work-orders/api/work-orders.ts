import "server-only";
import { callNestApi } from "@/lib/api/nest-client";
import { networkErrorBody, parseNestErrorBody } from "@/lib/api/error";
import type { ApiErrorBody, Page, WorkOrder, WorkOrderQuery } from "@/lib/api/types";

const DEFAULT_LIMIT = 20;

export type WorkOrdersResult = { status: "ok"; page: Page<WorkOrder> } | { status: "error"; error: ApiErrorBody };
export type WorkOrderResult = { status: "ok"; workOrder: WorkOrder } | { status: "error"; error: ApiErrorBody };

export async function listWorkOrders(accessToken: string, params: WorkOrderQuery = {}): Promise<WorkOrdersResult> {
  const path = "/work-orders";
  try {
    const query: Record<string, string> = {
      page: String(params.page ?? 1),
      limit: String(params.limit ?? DEFAULT_LIMIT),
    };
    if (params.status) query.status = params.status;
    if (params.clientId) query.clientId = params.clientId;
    if (params.deviceId) query.deviceId = params.deviceId;
    if (params.from) query.from = params.from;
    if (params.to) query.to = params.to;

    const upstream = await callNestApi<Page<WorkOrder>>({
      method: "GET",
      path,
      query,
      accessToken,
    });
    if (upstream.status >= 400) return { status: "error", error: parseNestErrorBody(upstream.status, upstream.body, path) };
    return { status: "ok", page: upstream.body };
  } catch {
    return { status: "error", error: networkErrorBody(path) };
  }
}

export async function getWorkOrder(accessToken: string, id: string): Promise<WorkOrderResult> {
  const path = `/work-orders/${id}`;
  try {
    const upstream = await callNestApi<WorkOrder>({ method: "GET", path, accessToken });
    if (upstream.status >= 400) return { status: "error", error: parseNestErrorBody(upstream.status, upstream.body, path) };
    return { status: "ok", workOrder: upstream.body };
  } catch {
    return { status: "error", error: networkErrorBody(path) };
  }
}