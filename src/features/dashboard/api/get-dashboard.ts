import "server-only";
import { callNestApi } from "@/lib/api/nest-client";
import { networkErrorBody, parseNestErrorBody } from "@/lib/api/error";
import type { ApiErrorBody, Page, WorkOrder } from "@/lib/api/types";

export type DashboardMetric = { status: "ok"; total: number } | { status: "error"; error: ApiErrorBody };

export type RecentOrders = { status: "ok"; data: WorkOrder[] } | { status: "error"; error: ApiErrorBody };

export interface DashboardData {
  activeClients: DashboardMetric;
  activeDevices: DashboardMetric;
  totalWorkOrders: DashboardMetric;
  readyWorkOrders: DashboardMetric;
  /** The backend's own order: `receivedAt` descending, `id` ascending. Never re-sorted here. */
  recentOrders: RecentOrders;
}

async function fetchTotal(
  accessToken: string,
  path: "/clients" | "/devices" | "/work-orders",
  query: Record<string, string | number>,
): Promise<DashboardMetric> {
  try {
    const upstream = await callNestApi<Page<unknown>>({ method: "GET", path, query, accessToken });
    if (upstream.status >= 400) {
      return { status: "error", error: parseNestErrorBody(upstream.status, upstream.body, path) };
    }
    return { status: "ok", total: upstream.body.meta.total };
  } catch {
    return { status: "error", error: networkErrorBody(path) };
  }
}

async function fetchWorkOrdersSummary(accessToken: string): Promise<{ total: DashboardMetric; recent: RecentOrders }> {
  const path = "/work-orders";
  try {
    // A single `limit=5` read serves both the total count and the reception-order section —
    // no separate call, and no client-side re-sorting of what the backend already orders.
    const upstream = await callNestApi<Page<WorkOrder>>({
      method: "GET",
      path,
      query: { page: 1, limit: 5 },
      accessToken,
    });
    if (upstream.status >= 400) {
      const error = parseNestErrorBody(upstream.status, upstream.body, path);
      return { total: { status: "error", error }, recent: { status: "error", error } };
    }
    return {
      total: { status: "ok", total: upstream.body.meta.total },
      recent: { status: "ok", data: upstream.body.data },
    };
  } catch {
    const error = networkErrorBody(path);
    return { total: { status: "error", error }, recent: { status: "error", error } };
  }
}

/**
 * Builds every dashboard indicator from the same list endpoints the rest of the app uses —
 * there is no dashboard-specific endpoint in taller-celulares-api, and none should be invented.
 * Each metric resolves independently (never throws), so one failing call never turns another,
 * healthy metric into a false "0"; the four reads run in parallel since none depends on another
 * and this is read-only, no-store data.
 */
export async function getDashboardData(accessToken: string): Promise<DashboardData> {
  const [activeClients, activeDevices, workOrdersSummary, readyWorkOrders] = await Promise.all([
    fetchTotal(accessToken, "/clients", { page: 1, limit: 1 }),
    fetchTotal(accessToken, "/devices", { page: 1, limit: 1 }),
    fetchWorkOrdersSummary(accessToken),
    fetchTotal(accessToken, "/work-orders", { page: 1, limit: 1, status: "READY" }),
  ]);

  return {
    activeClients,
    activeDevices,
    totalWorkOrders: workOrdersSummary.total,
    readyWorkOrders,
    recentOrders: workOrdersSummary.recent,
  };
}
