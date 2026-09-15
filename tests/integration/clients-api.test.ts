import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/nest-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/nest-client")>();
  return { ...actual, callNestApi: vi.fn() };
});

const { callNestApi } = await import("@/lib/api/nest-client");
const { getClient, listClients } = await import("@/features/clients/api/clients");

beforeEach(() => {
  vi.mocked(callNestApi).mockReset();
});

describe("listClients", () => {
  it("defaults to page=1 and limit=20, preserving meta from NestJS", async () => {
    const meta = { page: 1, limit: 20, total: 3 };
    vi.mocked(callNestApi).mockResolvedValue({ status: 200, body: { data: [{ id: "1" }], meta } });

    const result = await listClients("token");

    expect(callNestApi).toHaveBeenCalledWith(
      expect.objectContaining({ method: "GET", path: "/clients", query: { page: 1, limit: 20 }, accessToken: "token" }),
    );
    expect(result).toEqual({ status: "ok", page: { data: [{ id: "1" }], meta } });
  });

  it("forwards an explicit page and limit", async () => {
    vi.mocked(callNestApi).mockResolvedValue({ status: 200, body: { data: [], meta: { page: 2, limit: 20, total: 0 } } });
    await listClients("token", { page: 2 });
    expect(callNestApi).toHaveBeenCalledWith(expect.objectContaining({ query: { page: 2, limit: 20 } }));
  });

  it("returns NestJS's error body unchanged on failure", async () => {
    vi.mocked(callNestApi).mockResolvedValue({
      status: 401,
      body: { statusCode: 401, code: "AUTHENTICATION_REQUIRED", message: "Authentication required", path: "/clients" },
    });
    const result = await listClients("token");
    expect(result).toEqual({
      status: "error",
      error: { statusCode: 401, code: "AUTHENTICATION_REQUIRED", message: "Authentication required", path: "/clients" },
    });
  });

  it("reports a network failure as an error", async () => {
    vi.mocked(callNestApi).mockRejectedValue(new Error("fetch failed"));
    const result = await listClients("token");
    expect(result.status).toBe("error");
  });
});

describe("getClient", () => {
  it("reads a single client by ID", async () => {
    const client = { id: "abc", firstName: "Ana" };
    vi.mocked(callNestApi).mockResolvedValue({ status: 200, body: client });
    const result = await getClient("token", "abc");
    expect(callNestApi).toHaveBeenCalledWith(expect.objectContaining({ method: "GET", path: "/clients/abc", accessToken: "token" }));
    expect(result).toEqual({ status: "ok", client });
  });

  it("surfaces a 404 without hiding it", async () => {
    vi.mocked(callNestApi).mockResolvedValue({
      status: 404,
      body: { statusCode: 404, code: "NOT_FOUND", message: "Resource not found", path: "/clients/missing" },
    });
    const result = await getClient("token", "missing");
    expect(result).toEqual({
      status: "error",
      error: { statusCode: 404, code: "NOT_FOUND", message: "Resource not found", path: "/clients/missing" },
    });
  });
});
