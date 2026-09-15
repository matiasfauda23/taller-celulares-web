import "server-only";
import { NextResponse } from "next/server";
import { assertSameOriginRequest, CsrfError } from "@/lib/security/csrf";
import { getFreshSession } from "@/lib/session/session";
import { NestEndpointNotAllowedError, callNestApi, type NestMethod } from "./nest-client";
import { networkErrorBody, parseNestErrorBody } from "./error";

export type ResourceName = "clients" | "devices" | "work-orders";

const UUID_PATTERN = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const WORK_ORDER_STATUS_VALUES = new Set([
  "RECEIVED",
  "DIAGNOSING",
  "WAITING_PARTS",
  "REPAIRING",
  "READY",
  "DELIVERED",
  "CANCELLED",
]);

const ALLOWED_QUERY_KEYS: Record<ResourceName, ReadonlySet<string>> = {
  clients: new Set(["page", "limit"]),
  devices: new Set(["page", "limit"]),
  "work-orders": new Set(["page", "limit", "status", "clientId", "deviceId", "from", "to"]),
};

// Mirrors CreateClientDto/UpdateClientDto, CreateDeviceDto/UpdateDeviceDto and
// CreateWorkOrderDto/UpdateWorkOrderDto in taller-celulares-api: only fields the DTO accepts
// are forwarded. NestJS's own ValidationPipe (whitelist + forbidNonWhitelisted) is still the
// authority on what is actually valid; this only keeps unrelated fields from being sent.
const BODY_FIELD_ALLOWLIST: Record<ResourceName, { create: ReadonlySet<string>; update: ReadonlySet<string> }> = {
  clients: {
    create: new Set(["firstName", "lastName", "phone", "email", "address", "notes"]),
    update: new Set(["firstName", "lastName", "phone", "email", "address", "notes"]),
  },
  devices: {
    create: new Set(["clientId", "brand", "model", "serialNumber", "color", "physicalCondition"]),
    update: new Set(["clientId", "brand", "model", "serialNumber", "color", "physicalCondition"]),
  },
  "work-orders": {
    create: new Set([
      "deviceId",
      "reportedIssue",
      "diagnosis",
      "workPerformed",
      "estimatedBudget",
      "finalPrice",
      "receivedAt",
      "estimatedAt",
      "notes",
    ]),
    // Status goes through the dedicated .../status route; deviceId and receivedAt are fixed
    // at creation time, matching UpdateWorkOrderDto's OmitType in the backend.
    update: new Set(["reportedIssue", "diagnosis", "workPerformed", "estimatedBudget", "finalPrice", "estimatedAt", "notes"]),
  },
};

function jsonError(statusCode: number, code: string, message: string, path: string): NextResponse {
  return NextResponse.json({ statusCode, code, message, path }, { status: statusCode, headers: { "Cache-Control": "no-store" } });
}

interface Target {
  nestPath: string;
  isStatusRoute: boolean;
  isCollection: boolean;
}

function resolveTarget(resource: ResourceName, segments: string[]): Target | null {
  if (segments.length === 0) return { nestPath: `/${resource}`, isStatusRoute: false, isCollection: true };
  if (segments.length === 1 && UUID_PATTERN.test(segments[0])) {
    return { nestPath: `/${resource}/${segments[0]}`, isStatusRoute: false, isCollection: false };
  }
  if (resource === "work-orders" && segments.length === 2 && UUID_PATTERN.test(segments[0]) && segments[1] === "status") {
    return { nestPath: `/${resource}/${segments[0]}/status`, isStatusRoute: true, isCollection: false };
  }
  return null;
}

function resolveMethod(httpMethod: string, target: Target): NestMethod | null {
  switch (httpMethod) {
    case "GET":
      return target.isStatusRoute ? null : "GET";
    case "POST":
      return target.isCollection ? "POST" : null;
    case "PATCH":
      return target.isCollection ? null : "PATCH";
    case "DELETE":
      return !target.isCollection && !target.isStatusRoute ? "DELETE" : null;
    default:
      return null;
  }
}

function filterQuery(resource: ResourceName, url: URL): Record<string, string> {
  const allowed = ALLOWED_QUERY_KEYS[resource];
  const query: Record<string, string> = {};
  for (const [key, value] of url.searchParams.entries()) {
    if (allowed.has(key)) query[key] = value;
  }
  return query;
}

function filterBody(resource: ResourceName, operation: "create" | "update", value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const allowed = BODY_FIELD_ALLOWLIST[resource][operation];
  const result: Record<string, unknown> = {};
  for (const [key, fieldValue] of Object.entries(value as Record<string, unknown>)) {
    if (allowed.has(key)) result[key] = fieldValue;
  }
  return result;
}

async function readJsonBody(request: Request): Promise<{ ok: true; value: unknown } | { ok: false }> {
  const text = await request.text();
  if (text.length === 0) return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

/**
 * Builds the request handler shared by a resource's plain `route.ts` (the collection, e.g.
 * `/api/clients`) and its `[...path]/route.ts` (item and sub-routes, e.g. `/api/clients/:id`).
 * Every call re-validates the method/segment/query/body allowlist and rechecks the session —
 * nothing here trusts a decision made on a previous request.
 */
export function createResourceHandler(resource: ResourceName) {
  return async function handleResourceRequest(request: Request, segments: string[]): Promise<NextResponse> {
    const path = `/api/${resource}${segments.length ? `/${segments.join("/")}` : ""}`;

    const target = resolveTarget(resource, segments);
    if (!target) return jsonError(404, "NOT_FOUND", "Resource not found", path);

    const method = resolveMethod(request.method.toUpperCase(), target);
    if (!method) return jsonError(404, "NOT_FOUND", "Resource not found", path);

    if (method !== "GET") {
      try {
        assertSameOriginRequest(request);
      } catch (error) {
        if (error instanceof CsrfError) return jsonError(401, "AUTHENTICATION_REQUIRED", "Authentication required", path);
        throw error;
      }
    }

    let outcome;
    try {
      outcome = await getFreshSession();
    } catch {
      return jsonError(401, "AUTHENTICATION_REQUIRED", "Authentication required", path);
    }
    if (outcome.status === "unauthenticated") {
      return jsonError(401, "AUTHENTICATION_REQUIRED", "Authentication required", path);
    }
    if (outcome.status === "unavailable") {
      return NextResponse.json(networkErrorBody(path), { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    const session = outcome.session;

    const query = method === "GET" ? filterQuery(resource, new URL(request.url)) : undefined;

    let body: unknown;
    if (method === "POST" || method === "PATCH") {
      const parsed = await readJsonBody(request);
      if (!parsed.ok) return jsonError(400, "VALIDATION_ERROR", "Request validation failed", path);

      if (target.isStatusRoute) {
        const candidate = parsed.value as { status?: unknown } | undefined;
        if (!candidate || typeof candidate.status !== "string" || !WORK_ORDER_STATUS_VALUES.has(candidate.status)) {
          return jsonError(400, "VALIDATION_ERROR", "status must be one of the known work-order states", path);
        }
        body = { status: candidate.status };
      } else {
        body = filterBody(resource, method === "POST" ? "create" : "update", parsed.value);
      }
    }

    try {
      const upstream = await callNestApi({ method, path: target.nestPath, query, body, accessToken: session.record.accessToken });
      const responseBody =
        upstream.status >= 400 ? parseNestErrorBody(upstream.status, upstream.body, path) : upstream.body;
      return NextResponse.json(responseBody, { status: upstream.status, headers: { "Cache-Control": "no-store" } });
    } catch (error) {
      if (error instanceof NestEndpointNotAllowedError) return jsonError(404, "NOT_FOUND", "Resource not found", path);
      return NextResponse.json(networkErrorBody(path), { status: 502, headers: { "Cache-Control": "no-store" } });
    }
  };
}
