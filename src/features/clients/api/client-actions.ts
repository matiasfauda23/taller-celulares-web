"use client";
import type { ApiErrorBody, Client, CreateClientInput, UpdateClientInput } from "@/lib/api/types";

export type ClientMutationResult = { status: "ok"; client: Client } | { status: "error"; error: ApiErrorBody };

const FALLBACK_ERROR = (status: number, path: string): ApiErrorBody => ({
  statusCode: status,
  code: "UNKNOWN_ERROR",
  message: "Unexpected error",
  path,
});

async function parseClientResponse(response: Response, path: string): Promise<ClientMutationResult> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  if (!response.ok) {
    return { status: "error", error: (body as ApiErrorBody | undefined) ?? FALLBACK_ERROR(response.status, path) };
  }
  return { status: "ok", client: body as Client };
}

/**
 * Client-side mutations, going through the same `/api/clients` BFF route the server-only
 * reads in `clients.ts` target on NestJS's side — this is the browser half, so it goes through
 * the BFF's session/CSRF/allowlist checks via a same-origin fetch instead of an internal call.
 */
export async function createClient(input: CreateClientInput): Promise<ClientMutationResult> {
  const response = await fetch("/api/clients", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseClientResponse(response, "/api/clients");
}

export async function updateClient(id: string, input: UpdateClientInput): Promise<ClientMutationResult> {
  const path = `/api/clients/${id}`;
  const response = await fetch(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseClientResponse(response, path);
}

export async function archiveClient(id: string): Promise<ClientMutationResult> {
  const path = `/api/clients/${id}`;
  const response = await fetch(path, { method: "DELETE" });
  return parseClientResponse(response, path);
}
