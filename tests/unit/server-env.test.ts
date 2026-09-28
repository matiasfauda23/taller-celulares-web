import { describe, expect, it } from "vitest";
import { validateServerEnv } from "@/lib/config/server-env";

const valid = { NODE_ENV: "development", NEST_API_URL: "http://localhost:3000", REDIS_URL: "redis://localhost:6379", APP_ORIGIN: "http://localhost:3001", SESSION_COOKIE_SECRET: "x".repeat(32) } as const;

describe("server environment", () => {
  it("accepts provider-neutral Redis URLs and server-only values", () => {
    expect(validateServerEnv(valid).redisUrl.protocol).toBe("redis:");
    expect(validateServerEnv({ ...valid, REDIS_URL: "rediss://redis.example:6380" }).redisUrl.protocol).toBe("rediss:");
  });
  it("rejects missing settings and insecure production origin", () => {
    expect(() => validateServerEnv({ ...valid, REDIS_URL: undefined })).toThrow("REDIS_URL");
    expect(() => validateServerEnv({ ...valid, NODE_ENV: "production" })).toThrow("HTTPS");
  });
  it("allows a plain-HTTP production origin only behind the explicit verification flag", () => {
    expect(validateServerEnv({ ...valid, NODE_ENV: "production", APP_ALLOW_INSECURE_ORIGIN: "true" }).appOrigin.protocol).toBe("http:");
    expect(() => validateServerEnv({ ...valid, NODE_ENV: "production", APP_ALLOW_INSECURE_ORIGIN: "false" })).toThrow("HTTPS");
    expect(() => validateServerEnv({ ...valid, NODE_ENV: "production", APP_ALLOW_INSECURE_ORIGIN: "yes" })).toThrow("HTTPS");
  });
});
