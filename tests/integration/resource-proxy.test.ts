import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/session/session", () => ({ getFreshSession: vi.fn() }));
vi.mock("@/lib/api/nest-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/nest-client")>();
  return { ...actual, callNestApi: vi.fn() };
});

const { createResourceHandler } = await import("@/lib/api/resource-proxy");
const { callNestApi } = await import("@/lib/api/nest-client");
const { getFreshSession } = await import("@/lib/session/session");

const APP_ORIGIN = "http://localhost:3101";
const CLIENT_ID = "11111111-1111-1111-1111-111111111111";

function activeOutcome(overrides: { accessToken?: string } = {}) {
  return {
    status: "active" as const,
    session: {
      sessionId: "session-1",
      record: {
        accountId: "account-1",
        workshopId: "workshop-1",
        accessToken: overrides.accessToken ?? "secret-access-token",
        refreshToken: "secret-refresh-token",
        accessExpiresAt: Date.now() + 900_000,
        refreshExpiresAt: Date.now() + 604_800_000,
        version: 1,
      },
    },
  };
}

function request(method: string, url: string, body?: unknown, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json", origin: APP_ORIGIN, ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

beforeEach(() => {
  process.env.NEST_API_URL = "http://internal-nest.example:4000";
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.APP_ORIGIN = APP_ORIGIN;
  process.env.SESSION_COOKIE_SECRET = "x".repeat(32);
  vi.stubEnv("NODE_ENV", "test");
  vi.mocked(callNestApi).mockReset();
  vi.mocked(getFreshSession).mockReset();
});

describe("resource proxy allowlists", () => {
  it("rejects a non-UUID item segment without calling NestJS", async () => {
    vi.mocked(getFreshSession).mockResolvedValue(activeOutcome());
    const handle = createResourceHandler("clients");
    const response = await handle(request("GET", `${APP_ORIGIN}/api/clients/not-a-uuid`), ["not-a-uuid"]);
    expect(response.status).toBe(404);
    expect(callNestApi).not.toHaveBeenCalled();
  });

  it("rejects a disallowed method/segment combination (status is only valid for work-orders)", async () => {
    vi.mocked(getFreshSession).mockResolvedValue(activeOutcome());
    const handle = createResourceHandler("clients");
    const response = await handle(
      request("PATCH", `${APP_ORIGIN}/api/clients/${CLIENT_ID}/status`, { status: "READY" }),
      [CLIENT_ID, "status"],
    );
    expect(response.status).toBe(404);
    expect(callNestApi).not.toHaveBeenCalled();
  });

  it("strips fields outside the update allowlist before forwarding", async () => {
    vi.mocked(getFreshSession).mockResolvedValue(activeOutcome());
    vi.mocked(callNestApi).mockResolvedValue({ status: 200, body: { id: CLIENT_ID } });
    const handle = createResourceHandler("clients");
    await handle(
      request("PATCH", `${APP_ORIGIN}/api/clients/${CLIENT_ID}`, { firstName: "Ana", workshopId: "should-be-stripped" }),
      [CLIENT_ID],
    );
    expect(callNestApi).toHaveBeenCalledWith(
      expect.objectContaining({ method: "PATCH", path: `/clients/${CLIENT_ID}`, body: { firstName: "Ana" } }),
    );
  });

  it("only forwards allowlisted query parameters", async () => {
    vi.mocked(getFreshSession).mockResolvedValue(activeOutcome());
    vi.mocked(callNestApi).mockResolvedValue({ status: 200, body: { data: [], meta: { page: 1, limit: 20, total: 0 } } });
    const handle = createResourceHandler("work-orders");
    await handle(request("GET", `${APP_ORIGIN}/api/work-orders?page=1&limit=5&status=READY&evil=1`), []);
    expect(callNestApi).toHaveBeenCalledWith(
      expect.objectContaining({ query: { page: "1", limit: "5", status: "READY" } }),
    );
  });
});

describe("resource proxy session handling", () => {
  it("returns 401 without calling NestJS when there is no active session", async () => {
    vi.mocked(getFreshSession).mockResolvedValue({ status: "unauthenticated" });
    const handle = createResourceHandler("devices");
    const response = await handle(request("GET", `${APP_ORIGIN}/api/devices`), []);
    expect(response.status).toBe(401);
    expect(callNestApi).not.toHaveBeenCalled();
  });

  it("returns 401 without calling NestJS when the session store is unavailable", async () => {
    vi.mocked(getFreshSession).mockRejectedValue(new Error("redis unreachable"));
    const handle = createResourceHandler("devices");
    const response = await handle(request("GET", `${APP_ORIGIN}/api/devices`), []);
    expect(response.status).toBe(401);
    expect(callNestApi).not.toHaveBeenCalled();
  });

  it("returns a recoverable 502 without ending the session when NestJS is unreachable for a refresh", async () => {
    vi.mocked(getFreshSession).mockResolvedValue({ status: "unavailable", message: "NestJS is unreachable" });
    const handle = createResourceHandler("devices");
    const response = await handle(request("GET", `${APP_ORIGIN}/api/devices`), []);
    expect(response.status).toBe(502);
    expect(callNestApi).not.toHaveBeenCalled();
  });
});

describe("resource proxy passthrough, secrecy and caching", () => {
  it("passes through a NestJS 404 body unchanged", async () => {
    vi.mocked(getFreshSession).mockResolvedValue(activeOutcome());
    vi.mocked(callNestApi).mockResolvedValue({
      status: 404,
      body: { statusCode: 404, code: "NOT_FOUND", message: "Resource not found", path: `/devices/${CLIENT_ID}` },
    });
    const handle = createResourceHandler("devices");
    const response = await handle(request("GET", `${APP_ORIGIN}/api/devices/${CLIENT_ID}`), [CLIENT_ID]);
    expect(response.status).toBe(404);
    expect((await response.json()).code).toBe("NOT_FOUND");
  });

  it("passes through a NestJS 409 conflict body unchanged", async () => {
    vi.mocked(getFreshSession).mockResolvedValue(activeOutcome());
    vi.mocked(callNestApi).mockResolvedValue({
      status: 409,
      body: { statusCode: 409, code: "CONFLICT", message: "Request conflicts with current state", path: `/clients/${CLIENT_ID}` },
    });
    const handle = createResourceHandler("clients");
    const response = await handle(request("DELETE", `${APP_ORIGIN}/api/clients/${CLIENT_ID}`), [CLIENT_ID]);
    expect(response.status).toBe(409);
  });

  it("never discloses the access token or the internal NestJS URL in the response", async () => {
    vi.mocked(getFreshSession).mockResolvedValue(activeOutcome({ accessToken: "super-secret-token" }));
    vi.mocked(callNestApi).mockResolvedValue({ status: 200, body: { data: [], meta: { page: 1, limit: 20, total: 0 } } });
    const handle = createResourceHandler("clients");
    const response = await handle(request("GET", `${APP_ORIGIN}/api/clients`), []);
    const text = await response.text();
    expect(text).not.toContain("super-secret-token");
    expect(text).not.toContain("internal-nest.example");
  });

  it("marks private responses as no-store", async () => {
    vi.mocked(getFreshSession).mockResolvedValue(activeOutcome());
    vi.mocked(callNestApi).mockResolvedValue({ status: 200, body: { data: [], meta: { page: 1, limit: 20, total: 0 } } });
    const handle = createResourceHandler("clients");
    const response = await handle(request("GET", `${APP_ORIGIN}/api/clients`), []);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});

describe("resource proxy work-order status route", () => {
  it("rejects an invalid status value before calling NestJS", async () => {
    vi.mocked(getFreshSession).mockResolvedValue(activeOutcome());
    const handle = createResourceHandler("work-orders");
    const response = await handle(
      request("PATCH", `${APP_ORIGIN}/api/work-orders/${CLIENT_ID}/status`, { status: "NOT_A_STATUS" }),
      [CLIENT_ID, "status"],
    );
    expect(response.status).toBe(400);
    expect(callNestApi).not.toHaveBeenCalled();
  });

  it("forwards a valid status transition to the dedicated NestJS route", async () => {
    vi.mocked(getFreshSession).mockResolvedValue(activeOutcome());
    vi.mocked(callNestApi).mockResolvedValue({ status: 200, body: { status: "READY" } });
    const handle = createResourceHandler("work-orders");
    const response = await handle(
      request("PATCH", `${APP_ORIGIN}/api/work-orders/${CLIENT_ID}/status`, { status: "READY" }),
      [CLIENT_ID, "status"],
    );
    expect(response.status).toBe(200);
    expect(callNestApi).toHaveBeenCalledWith(
      expect.objectContaining({ method: "PATCH", path: `/work-orders/${CLIENT_ID}/status`, body: { status: "READY" } }),
    );
  });
});
