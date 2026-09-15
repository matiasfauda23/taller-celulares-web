import { beforeEach, describe, expect, it, vi } from "vitest";
import { CsrfError, assertSameOriginRequest } from "@/lib/security/csrf";

function request(method: string, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost:3101/api/clients", { method, headers });
}

describe("assertSameOriginRequest", () => {
  beforeEach(() => {
    process.env.NEST_API_URL = "http://localhost:3000";
    process.env.REDIS_URL = "redis://localhost:6379";
    process.env.APP_ORIGIN = "http://localhost:3101";
    process.env.SESSION_COOKIE_SECRET = "x".repeat(32);
    vi.stubEnv("NODE_ENV", "test");
  });

  it("does not check GET requests at all, even with no Origin header", () => {
    expect(() => assertSameOriginRequest(request("GET"))).not.toThrow();
  });

  it("accepts a state-changing request whose Origin matches APP_ORIGIN", () => {
    expect(() => assertSameOriginRequest(request("POST", { origin: "http://localhost:3101" }))).not.toThrow();
    expect(() => assertSameOriginRequest(request("PATCH", { origin: "http://localhost:3101" }))).not.toThrow();
    expect(() => assertSameOriginRequest(request("DELETE", { origin: "http://localhost:3101" }))).not.toThrow();
  });

  it("rejects a state-changing request missing the Origin header (missing proof)", () => {
    expect(() => assertSameOriginRequest(request("POST"))).toThrow(CsrfError);
  });

  it("rejects a state-changing request from a different origin", () => {
    expect(() => assertSameOriginRequest(request("POST", { origin: "https://attacker.example" }))).toThrow(CsrfError);
  });

  it("rejects a malformed Origin header", () => {
    expect(() => assertSameOriginRequest(request("POST", { origin: "not-a-url" }))).toThrow(CsrfError);
  });
});
