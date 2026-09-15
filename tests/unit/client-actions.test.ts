import { beforeEach, describe, expect, it, vi } from "vitest";
import { archiveClient, createClient, updateClient } from "@/features/clients/api/client-actions";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn());
});

describe("createClient", () => {
  it("POSTs exactly the given input to the shared BFF route", async () => {
    const client = { id: "1", firstName: "Ana" };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(201, client));

    const result = await createClient({ firstName: "Ana", lastName: "Perez", phone: "555", address: "Addr" });

    expect(fetch).toHaveBeenCalledWith(
      "/api/clients",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ firstName: "Ana", lastName: "Perez", phone: "555", address: "Addr" }),
      }),
    );
    expect(result).toEqual({ status: "ok", client });
  });

  it("returns NestJS's validation error body unchanged", async () => {
    const error = { statusCode: 400, code: "VALIDATION_ERROR", message: "Request validation failed", path: "/api/clients" };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(400, error));

    const result = await createClient({ firstName: "", lastName: "", phone: "", address: "" });
    expect(result).toEqual({ status: "error", error });
  });
});

describe("updateClient", () => {
  it("PATCHes the resource-specific BFF route", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { id: "1" }));
    await updateClient("1", { lastName: "New" });
    expect(fetch).toHaveBeenCalledWith("/api/clients/1", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ lastName: "New" }) }));
  });

  it("surfaces a 409 conflict on an archived client without hiding it", async () => {
    const error = { statusCode: 409, code: "CONFLICT", message: "Request conflicts with current state", path: "/api/clients/1" };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(409, error));
    const result = await updateClient("1", { lastName: "New" });
    expect(result).toEqual({ status: "error", error });
  });
});

describe("archiveClient", () => {
  it("sends DELETE to the resource-specific BFF route", async () => {
    vi.mocked(fetch).mockResolvedValue(jsonResponse(200, { id: "1", archivedAt: "2026-01-01T00:00:00.000Z" }));
    const result = await archiveClient("1");
    expect(fetch).toHaveBeenCalledWith("/api/clients/1", expect.objectContaining({ method: "DELETE" }));
    expect(result.status).toBe("ok");
  });

  it("surfaces a 409 when NestJS refuses to archive a client with active work orders", async () => {
    const error = { statusCode: 409, code: "CONFLICT", message: "Request conflicts with current state", path: "/api/clients/1" };
    vi.mocked(fetch).mockResolvedValue(jsonResponse(409, error));
    const result = await archiveClient("1");
    expect(result).toEqual({ status: "error", error });
  });

  it("falls back to a generic error when the response body isn't JSON", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("not json", { status: 500 }));
    const result = await archiveClient("1");
    expect(result.status).toBe("error");
  });
});
