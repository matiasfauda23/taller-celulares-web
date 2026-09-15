import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/nest-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/nest-client")>();
  return { ...actual, callNestApi: vi.fn() };
});
vi.mock("@/lib/session/session", () => ({
  startSession: vi.fn(),
  getFreshSession: vi.fn(),
  getActiveSession: vi.fn(),
  endSession: vi.fn(),
  getDefaultSessionStore: vi.fn(() => ({})),
}));
vi.mock("@/lib/session/refresh", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/session/refresh")>();
  return { ...actual, refreshSession: vi.fn() };
});

const { callNestApi } = await import("@/lib/api/nest-client");
const { endSession, getActiveSession, getFreshSession, startSession } = await import("@/lib/session/session");
const { refreshSession } = await import("@/lib/session/refresh");
const { POST: login } = await import("@/app/api/session/login/route");
const { POST: register } = await import("@/app/api/session/register/route");
const { POST: refresh } = await import("@/app/api/session/refresh/route");
const { POST: logout } = await import("@/app/api/session/logout/route");

const APP_ORIGIN = "http://localhost:3101";

function request(url: string, body?: unknown, headers: Record<string, string> = {}): Request {
  return new Request(url, {
    method: "POST",
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
  vi.mocked(startSession).mockReset();
  vi.mocked(getFreshSession).mockReset();
  vi.mocked(getActiveSession).mockReset();
  vi.mocked(endSession).mockReset();
  vi.mocked(refreshSession).mockReset();
});

describe("POST /api/session/login", () => {
  it("starts a session and returns only the public profile, never the tokens", async () => {
    vi.mocked(callNestApi).mockResolvedValue({
      status: 200,
      body: {
        account: { id: "account-1", ownerName: "Ana Perez", email: "ana@example.com" },
        workshop: { id: "workshop-1", name: "Taller Central", address: "Av 123" },
        tokens: { accessToken: "secret-access", refreshToken: "secret-refresh", accessExpiresIn: 900, refreshExpiresIn: 604_800 },
      },
    });

    const response = await login(request(`${APP_ORIGIN}/api/session/login`, { email: "ana@example.com", password: "x" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      account: { id: "account-1", ownerName: "Ana Perez", email: "ana@example.com" },
      workshop: { id: "workshop-1", name: "Taller Central", address: "Av 123" },
    });
    expect(JSON.stringify(body)).not.toContain("secret-access");
    expect(JSON.stringify(body)).not.toContain("secret-refresh");
    expect(startSession).toHaveBeenCalledWith({
      accountId: "account-1",
      workshopId: "workshop-1",
      tokens: { accessToken: "secret-access", refreshToken: "secret-refresh", accessExpiresIn: 900, refreshExpiresIn: 604_800 },
    });
  });

  it("passes through NestJS's INVALID_CREDENTIALS without starting a session", async () => {
    vi.mocked(callNestApi).mockResolvedValue({
      status: 401,
      body: { statusCode: 401, code: "INVALID_CREDENTIALS", message: "Invalid credentials", path: "/auth/login" },
    });

    const response = await login(request(`${APP_ORIGIN}/api/session/login`, { email: "ana@example.com", password: "wrong" }));
    expect(response.status).toBe(401);
    expect((await response.json()).code).toBe("INVALID_CREDENTIALS");
    expect(startSession).not.toHaveBeenCalled();
  });

  it("rejects a cross-origin login attempt without calling NestJS", async () => {
    const response = await login(request(`${APP_ORIGIN}/api/session/login`, { email: "a@b.com", password: "x" }, { origin: "https://attacker.example" }));
    expect(response.status).toBe(401);
    expect(callNestApi).not.toHaveBeenCalled();
  });

  it("only forwards the email and password fields to NestJS", async () => {
    vi.mocked(callNestApi).mockResolvedValue({
      status: 200,
      body: {
        account: { id: "a", ownerName: "A", email: "a@b.com" },
        workshop: { id: "w", name: "W", address: "X" },
        tokens: { accessToken: "t", refreshToken: "r", accessExpiresIn: 1, refreshExpiresIn: 1 },
      },
    });
    await login(request(`${APP_ORIGIN}/api/session/login`, { email: "a@b.com", password: "x", isAdmin: true }));
    expect(callNestApi).toHaveBeenCalledWith(
      expect.objectContaining({ method: "POST", path: "/auth/login", body: { email: "a@b.com", password: "x" } }),
    );
  });
});

describe("POST /api/session/register", () => {
  it("only forwards register DTO fields to NestJS", async () => {
    vi.mocked(callNestApi).mockResolvedValue({
      status: 201,
      body: {
        account: { id: "a", ownerName: "A", email: "a@b.com" },
        workshop: { id: "w", name: "W", address: "X" },
        tokens: { accessToken: "t", refreshToken: "r", accessExpiresIn: 1, refreshExpiresIn: 1 },
      },
    });

    await register(
      request(`${APP_ORIGIN}/api/session/register`, {
        ownerName: "Ana",
        email: "a@b.com",
        password: "correct horse battery",
        workshopName: "W",
        workshopAddress: "Addr",
        extraField: "should not be forwarded",
      }),
    );

    expect(callNestApi).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        path: "/auth/register",
        body: { ownerName: "Ana", email: "a@b.com", password: "correct horse battery", workshopName: "W", workshopAddress: "Addr" },
      }),
    );
    expect(startSession).toHaveBeenCalledTimes(1);
  });

  it("passes through NestJS's EMAIL_ALREADY_REGISTERED conflict without starting a session", async () => {
    vi.mocked(callNestApi).mockResolvedValue({
      status: 409,
      body: { statusCode: 409, code: "EMAIL_ALREADY_REGISTERED", message: "Email is already registered", path: "/auth/register" },
    });

    const response = await register(
      request(`${APP_ORIGIN}/api/session/register`, {
        ownerName: "Ana",
        email: "a@b.com",
        password: "correct horse battery",
        workshopName: "W",
        workshopAddress: "Addr",
      }),
    );

    expect(response.status).toBe(409);
    expect(startSession).not.toHaveBeenCalled();
  });
});

describe("POST /api/session/refresh", () => {
  it("returns 204 without a body when the session is already fresh or was just rotated", async () => {
    vi.mocked(getFreshSession).mockResolvedValue({
      status: "active",
      session: { sessionId: "s1", record: { accountId: "a", workshopId: "w", accessToken: "t", refreshToken: "r", accessExpiresAt: 0, refreshExpiresAt: 0, version: 1 } },
    });
    const response = await refresh(request(`${APP_ORIGIN}/api/session/refresh`));
    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
  });

  it("returns 401 when there is no session or the refresh token is invalid", async () => {
    vi.mocked(getFreshSession).mockResolvedValue({ status: "unauthenticated" });
    const response = await refresh(request(`${APP_ORIGIN}/api/session/refresh`));
    expect(response.status).toBe(401);
  });

  it("returns a recoverable 502 without ending the session when NestJS is unreachable", async () => {
    vi.mocked(getFreshSession).mockResolvedValue({ status: "unavailable", message: "down" });
    const response = await refresh(request(`${APP_ORIGIN}/api/session/refresh`));
    expect(response.status).toBe(502);
  });
});

describe("POST /api/session/logout", () => {
  it("clears the session locally even when there was none to begin with", async () => {
    vi.mocked(getActiveSession).mockResolvedValue(null);
    const response = await logout(request(`${APP_ORIGIN}/api/session/logout`));
    expect(response.status).toBe(204);
    expect(endSession).toHaveBeenCalledWith(null, expect.anything());
    expect(callNestApi).not.toHaveBeenCalled();
  });

  it("calls NestJS logout with a still-valid access token and always ends the local session", async () => {
    const session = {
      sessionId: "s1",
      record: { accountId: "a", workshopId: "w", accessToken: "still-valid", refreshToken: "r", accessExpiresAt: Date.now() + 60_000, refreshExpiresAt: Date.now() + 604_800_000, version: 1 },
    };
    vi.mocked(getActiveSession).mockResolvedValue(session);
    vi.mocked(callNestApi).mockResolvedValue({ status: 204, body: undefined });

    const response = await logout(request(`${APP_ORIGIN}/api/session/logout`));

    expect(response.status).toBe(204);
    expect(callNestApi).toHaveBeenCalledWith(expect.objectContaining({ path: "/auth/logout", accessToken: "still-valid" }));
    expect(endSession).toHaveBeenCalledWith(session, expect.anything());
    expect(refreshSession).not.toHaveBeenCalled();
  });

  it("refreshes an expired access token before calling NestJS logout, when that is safe", async () => {
    const session = {
      sessionId: "s1",
      record: { accountId: "a", workshopId: "w", accessToken: "expired", refreshToken: "r", accessExpiresAt: Date.now() - 1, refreshExpiresAt: Date.now() + 604_800_000, version: 1 },
    };
    vi.mocked(getActiveSession).mockResolvedValue(session);
    vi.mocked(refreshSession).mockResolvedValue({ ...session.record, accessToken: "rotated" });
    vi.mocked(callNestApi).mockResolvedValue({ status: 204, body: undefined });

    await logout(request(`${APP_ORIGIN}/api/session/logout`));

    expect(callNestApi).toHaveBeenCalledWith(expect.objectContaining({ accessToken: "rotated" }));
  });

  it("still ends the local session and never claims remote revocation when NestJS logout fails", async () => {
    const session = {
      sessionId: "s1",
      record: { accountId: "a", workshopId: "w", accessToken: "still-valid", refreshToken: "r", accessExpiresAt: Date.now() + 60_000, refreshExpiresAt: Date.now() + 604_800_000, version: 1 },
    };
    vi.mocked(getActiveSession).mockResolvedValue(session);
    vi.mocked(callNestApi).mockRejectedValue(new Error("network down"));

    const response = await logout(request(`${APP_ORIGIN}/api/session/logout`));

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(endSession).toHaveBeenCalledWith(session, expect.anything());
  });

  it("skips the remote call and still ends the session when the refresh needed for logout fails", async () => {
    const session = {
      sessionId: "s1",
      record: { accountId: "a", workshopId: "w", accessToken: "expired", refreshToken: "r", accessExpiresAt: Date.now() - 1, refreshExpiresAt: Date.now() + 604_800_000, version: 1 },
    };
    vi.mocked(getActiveSession).mockResolvedValue(session);
    vi.mocked(refreshSession).mockRejectedValue(new Error("invalid refresh token"));

    const response = await logout(request(`${APP_ORIGIN}/api/session/logout`));

    expect(response.status).toBe(204);
    expect(callNestApi).not.toHaveBeenCalled();
    expect(endSession).toHaveBeenCalledWith(session, expect.anything());
  });

  it("rejects a cross-origin logout without touching the session", async () => {
    const response = await logout(request(`${APP_ORIGIN}/api/session/logout`, undefined, { origin: "https://attacker.example" }));
    expect(response.status).toBe(401);
    expect(getActiveSession).not.toHaveBeenCalled();
    expect(endSession).not.toHaveBeenCalled();
  });
});
