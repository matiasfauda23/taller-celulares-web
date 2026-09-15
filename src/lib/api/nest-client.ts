import "server-only";
import { getServerEnv } from "@/lib/config/server-env";

export type NestMethod = "GET" | "POST" | "PATCH" | "DELETE";

interface AllowedEndpoint {
  method: NestMethod;
  pattern: RegExp;
}

const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";

// Mirrors specs/002-frontend-management/contracts/ui-api.md exactly; nothing outside this
// list is reachable, regardless of what a caller passes in.
const ALLOWED_ENDPOINTS: AllowedEndpoint[] = [
  { method: "POST", pattern: /^\/auth\/register$/ },
  { method: "POST", pattern: /^\/auth\/login$/ },
  { method: "POST", pattern: /^\/auth\/refresh$/ },
  { method: "POST", pattern: /^\/auth\/logout$/ },
  { method: "GET", pattern: /^\/auth\/me$/ },
  { method: "GET", pattern: /^\/clients$/ },
  { method: "POST", pattern: /^\/clients$/ },
  { method: "GET", pattern: new RegExp(`^/clients/${UUID}$`) },
  { method: "PATCH", pattern: new RegExp(`^/clients/${UUID}$`) },
  { method: "DELETE", pattern: new RegExp(`^/clients/${UUID}$`) },
  { method: "GET", pattern: /^\/devices$/ },
  { method: "POST", pattern: /^\/devices$/ },
  { method: "GET", pattern: new RegExp(`^/devices/${UUID}$`) },
  { method: "PATCH", pattern: new RegExp(`^/devices/${UUID}$`) },
  { method: "DELETE", pattern: new RegExp(`^/devices/${UUID}$`) },
  { method: "GET", pattern: /^\/work-orders$/ },
  { method: "POST", pattern: /^\/work-orders$/ },
  { method: "GET", pattern: new RegExp(`^/work-orders/${UUID}$`) },
  { method: "PATCH", pattern: new RegExp(`^/work-orders/${UUID}$`) },
  { method: "PATCH", pattern: new RegExp(`^/work-orders/${UUID}/status$`) },
  { method: "DELETE", pattern: new RegExp(`^/work-orders/${UUID}$`) },
];

export class NestEndpointNotAllowedError extends Error {
  constructor(method: string, path: string) {
    super(`Endpoint not allowed: ${method} ${path}`);
    this.name = "NestEndpointNotAllowedError";
  }
}

export interface NestRequest {
  method: NestMethod;
  path: string;
  query?: Record<string, string | number | undefined>;
  accessToken?: string;
  body?: unknown;
}

export interface NestResponse<T = unknown> {
  status: number;
  body: T;
}

function isAllowed(method: NestMethod, path: string): boolean {
  return ALLOWED_ENDPOINTS.some((endpoint) => endpoint.method === method && endpoint.pattern.test(path));
}

function buildUrl(baseUrl: URL, path: string, query?: NestRequest["query"]): URL {
  const base = baseUrl.toString().replace(/\/+$/, "");
  const url = new URL(`${base}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }
  return url;
}

/**
 * The only way this frontend talks to taller-celulares-api: a fixed base URL, an explicit
 * endpoint allowlist and `cache: "no-store"`. Callers never supply an arbitrary URL, and a
 * token is only ever attached here, never handed to a client component.
 */
export async function callNestApi<T = unknown>(request: NestRequest): Promise<NestResponse<T>> {
  if (!request.path.startsWith("/") || !isAllowed(request.method, request.path)) {
    throw new NestEndpointNotAllowedError(request.method, request.path);
  }

  const { nestApiUrl } = getServerEnv();
  const url = buildUrl(nestApiUrl, request.path, request.query);

  const headers: Record<string, string> = { Accept: "application/json" };
  if (request.accessToken) headers.Authorization = `Bearer ${request.accessToken}`;
  if (request.body !== undefined) headers["Content-Type"] = "application/json";

  const response = await fetch(url, {
    method: request.method,
    headers,
    body: request.body !== undefined ? JSON.stringify(request.body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  let body: unknown;
  if (text.length > 0) {
    try {
      body = JSON.parse(text);
    } catch {
      body = undefined;
    }
  }

  return { status: response.status, body: body as T };
}
