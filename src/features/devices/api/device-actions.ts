"use client";
import type { ApiErrorBody, Device, CreateDeviceInput, UpdateDeviceInput } from "@/lib/api/types";

export type DeviceMutationResult = { status: "ok"; device: Device } | { status: "error"; error: ApiErrorBody };

const FALLBACK_ERROR = (status: number, path: string): ApiErrorBody => ({
  statusCode: status,
  code: "UNKNOWN_ERROR",
  message: "Unexpected error",
  path,
});

async function parseDeviceResponse(response: Response, path: string): Promise<DeviceMutationResult> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    return { status: "error", error: (body as ApiErrorBody | undefined) ?? FALLBACK_ERROR(response.status, path) };
  }
  return { status: "ok", device: body as Device };
}

export async function createDevice(input: CreateDeviceInput): Promise<DeviceMutationResult> {
  const response = await fetch("/api/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseDeviceResponse(response, "/api/devices");
}

export async function updateDevice(id: string, input: UpdateDeviceInput): Promise<DeviceMutationResult> {
  const path = `/api/devices/${id}`;
  const response = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseDeviceResponse(response, path);
}

export async function archiveDevice(id: string): Promise<DeviceMutationResult> {
  const path = `/api/devices/${id}`;
  const response = await fetch(path, { method: "DELETE" });
  return parseDeviceResponse(response, path);
}