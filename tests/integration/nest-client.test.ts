import http, { type IncomingHttpHeaders, type Server } from "node:http";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NestEndpointNotAllowedError, callNestApi } from "@/lib/api/nest-client";

let server: Server;
let lastRequest: { method?: string; url?: string; headers?: IncomingHttpHeaders } | null = null;

beforeAll(async () => {
  server = http.createServer((req, res) => {
    lastRequest = { method: req.method, url: req.url, headers: req.headers };
    if (req.url?.startsWith("/auth/me")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ account: { id: "account-1" } }));
      return;
    }
    if (req.url?.startsWith("/clients")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end("not valid json {");
      return;
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ statusCode: 404, code: "NOT_FOUND", message: "Resource not found", path: req.url }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  process.env.NEST_API_URL = `http://127.0.0.1:${port}`;
  process.env.REDIS_URL = "redis://localhost:6379";
  process.env.APP_ORIGIN = "http://localhost:3101";
  process.env.SESSION_COOKIE_SECRET = "x".repeat(32);
  vi.stubEnv("NODE_ENV", "test");
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
  lastRequest = null;
});

describe("nest-client transport", () => {
  it("attaches the Bearer token and requests no-store caching for an allowed endpoint", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const result = await callNestApi({ method: "GET", path: "/auth/me", accessToken: "token-123" });

    expect(result.status).toBe(200);
    expect(lastRequest?.headers?.authorization).toBe("Bearer token-123");
    const init = fetchSpy.mock.calls[0]?.[1];
    expect(init?.cache).toBe("no-store");

    fetchSpy.mockRestore();
  });

  it("rejects a path outside the allowlist without contacting NestJS", async () => {
    await expect(callNestApi({ method: "GET", path: "/accounts" })).rejects.toBeInstanceOf(
      NestEndpointNotAllowedError,
    );
    expect(lastRequest).toBeNull();
  });

  it("rejects a disallowed method on an otherwise allowed path", async () => {
    await expect(callNestApi({ method: "DELETE", path: "/auth/me" })).rejects.toBeInstanceOf(
      NestEndpointNotAllowedError,
    );
    expect(lastRequest).toBeNull();
  });

  it("returns an empty body instead of throwing when the response is not valid JSON", async () => {
    const result = await callNestApi({ method: "GET", path: "/clients" });
    expect(result.status).toBe(200);
    expect(result.body).toBeUndefined();
  });
});
