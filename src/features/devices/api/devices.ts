import "server-only";
import { callNestApi } from "@/lib/api/nest-client";
import { networkErrorBody, parseNestErrorBody } from "@/lib/api/error";
import type { ApiErrorBody, Device, Page } from "@/lib/api/types";

const DEFAULT_LIMIT = 20;

export type DevicesResult = { status: "ok"; page: Page<Device> } | { status: "error"; error: ApiErrorBody };
export type DeviceResult = { status: "ok"; device: Device } | { status: "error"; error: ApiErrorBody };

/**
 * Server-only reads for the devices list/detail pages, calling NestJS directly.
 */
export async function listDevices(accessToken: string, params: { page?: number; limit?: number } = {}): Promise<DevicesResult> {
  const path = "/devices";
  try {
    const upstream = await callNestApi<Page<Device>>({
      method: "GET",
      path,
      query: { page: params.page ?? 1, limit: params.limit ?? DEFAULT_LIMIT },
      accessToken,
    });
    if (upstream.status >= 400) return { status: "error", error: parseNestErrorBody(upstream.status, upstream.body, path) };
    return { status: "ok", page: upstream.body };
  } catch {
    return { status: "error", error: networkErrorBody(path) };
  }
}

export async function getDevice(accessToken: string, id: string): Promise<DeviceResult> {
  const path = `/devices/${id}`;
  try {
    const upstream = await callNestApi<Device>({ method: "GET", path, accessToken });
    if (upstream.status >= 400) return { status: "error", error: parseNestErrorBody(upstream.status, upstream.body, path) };
    return { status: "ok", device: upstream.body };
  } catch {
    return { status: "error", error: networkErrorBody(path) };
  }
}