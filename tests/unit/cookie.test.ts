import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const backingStore = new Map<string, { value: string }>();
const setCalls: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => backingStore.get(name),
    set: (name: string, value: string, options: Record<string, unknown>) => {
      backingStore.set(name, { value });
      setCalls.push({ name, value, options });
    },
    delete: (name: string) => backingStore.delete(name),
  }),
}));

const { SESSION_COOKIE_NAME, clearSessionCookie, generateSessionId, readSessionCookie, setSessionCookie } =
  await import("@/lib/session/cookie");

describe("session cookie", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    backingStore.clear();
    setCalls.length = 0;
  });

  afterEach(() => {
    vi.stubEnv("NODE_ENV", originalNodeEnv ?? "test");
  });

  it("generates opaque, non-JWT session IDs that differ on every call", () => {
    const first = generateSessionId();
    const second = generateSessionId();
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThanOrEqual(32);
    expect(first).not.toContain(".");
  });

  it("sets an HttpOnly, SameSite=Lax cookie holding only the opaque session ID", async () => {
    vi.stubEnv("NODE_ENV", "development");
    await setSessionCookie("opaque-id-123", 3600);

    expect(setCalls).toHaveLength(1);
    const call = setCalls[0];
    expect(call.name).toBe(SESSION_COOKIE_NAME);
    expect(call.value).toBe("opaque-id-123");
    expect(call.options).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/", maxAge: 3600, secure: false });
    expect(call.value).not.toMatch(/^ey/);
  });

  it("marks the cookie Secure in production but not in development", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await setSessionCookie("id", 60);
    expect(setCalls[0].options.secure).toBe(true);
  });

  it("reads back the stored session ID, or null when absent", async () => {
    await expect(readSessionCookie()).resolves.toBeNull();
    await setSessionCookie("round-trip-id", 60);
    await expect(readSessionCookie()).resolves.toBe("round-trip-id");
  });

  it("clears the cookie on logout", async () => {
    await setSessionCookie("to-be-cleared", 60);
    await clearSessionCookie();
    await expect(readSessionCookie()).resolves.toBeNull();
  });
});
