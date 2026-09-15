import "server-only";
import { callNestApi } from "@/lib/api/nest-client";
import { networkErrorBody, parseNestErrorBody } from "@/lib/api/error";
import type { ApiErrorBody, Client, Page } from "@/lib/api/types";

const DEFAULT_LIMIT = 20;

export type ClientsResult = { status: "ok"; page: Page<Client> } | { status: "error"; error: ApiErrorBody };
export type ClientResult = { status: "ok"; client: Client } | { status: "error"; error: ApiErrorBody };

/**
 * Server-only reads for the clients list/detail pages, calling NestJS directly (the same
 * `/clients` route the `/api/clients` BFF proxy also allowlists for client-side mutations —
 * see `client-actions.ts`). A Server Component never needs the extra hop through its own HTTP
 * layer. Both functions preserve NestJS's `meta`/error body untouched.
 */
export async function listClients(accessToken: string, params: { page?: number; limit?: number } = {}): Promise<ClientsResult> {
  const path = "/clients";
  try {
    const upstream = await callNestApi<Page<Client>>({
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

export async function getClient(accessToken: string, id: string): Promise<ClientResult> {
  const path = `/clients/${id}`;
  try {
    const upstream = await callNestApi<Client>({ method: "GET", path, accessToken });
    if (upstream.status >= 400) return { status: "error", error: parseNestErrorBody(upstream.status, upstream.body, path) };
    return { status: "ok", client: upstream.body };
  } catch {
    return { status: "error", error: networkErrorBody(path) };
  }
}
