import { describe, expect, it } from "vitest";
import { networkErrorBody, parseNestErrorBody } from "@/lib/api/error";

describe("parseNestErrorBody", () => {
  it("passes through a well-formed 400 with field details", () => {
    const body = {
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: "Request validation failed",
      path: "/clients",
      details: [{ field: "phone", message: "phone must be longer than or equal to 1 characters" }],
    };
    expect(parseNestErrorBody(400, body, "/api/clients")).toEqual(body);
  });

  it("passes through a controlled auth code such as INVALID_CREDENTIALS", () => {
    const body = { statusCode: 401, code: "INVALID_CREDENTIALS", message: "Invalid credentials", path: "/auth/login" };
    expect(parseNestErrorBody(401, body, "/api/session/login")).toEqual(body);
  });

  it("falls back to a safe 404 body when the response is malformed", () => {
    expect(parseNestErrorBody(404, { unexpected: "shape" }, "/api/clients/x")).toEqual({
      statusCode: 404,
      code: "NOT_FOUND",
      message: "Resource not found",
      path: "/api/clients/x",
    });
  });

  it("falls back for 409 conflicts", () => {
    expect(parseNestErrorBody(409, undefined, "/api/clients/x")).toEqual({
      statusCode: 409,
      code: "CONFLICT",
      message: "Request conflicts with current state",
      path: "/api/clients/x",
    });
  });

  it("falls back for 429 rate limiting", () => {
    expect(parseNestErrorBody(429, null, "/api/session/login")).toEqual({
      statusCode: 429,
      code: "RATE_LIMITED",
      message: "Too many requests",
      path: "/api/session/login",
    });
  });

  it("falls back to a generic internal error for an unmatched 5xx", () => {
    expect(parseNestErrorBody(500, "<html>oops</html>", "/api/work-orders")).toEqual({
      statusCode: 500,
      code: "INTERNAL_ERROR",
      message: "Internal server error",
      path: "/api/work-orders",
    });
  });

  it("does not trust a body whose statusCode disagrees with the real HTTP status", () => {
    const spoofed = { statusCode: 200, code: "OK", message: "fine", path: "/api/clients" };
    expect(parseNestErrorBody(401, spoofed, "/api/clients")).toEqual({
      statusCode: 401,
      code: "AUTHENTICATION_REQUIRED",
      message: "Authentication required",
      path: "/api/clients",
    });
  });
});

describe("networkErrorBody", () => {
  it("produces a safe, non-2xx body when NestJS could not be reached at all", () => {
    expect(networkErrorBody("/api/devices")).toEqual({
      statusCode: 502,
      code: "UPSTREAM_UNAVAILABLE",
      message: "The upstream service is unavailable",
      path: "/api/devices",
    });
  });
});
