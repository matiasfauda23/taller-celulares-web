import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { Redis } from "ioredis";

// Run against the real taller-celulares-api and a real Redis (see .env.local); NestJS issues
// a 5-second access token in this verification environment specifically so the refresh-on-
// expiry path below can be observed without mocking anything.
const credentials = {
  ownerName: "Ana Perez",
  email: `verify-${randomUUID()}@example.com`,
  password: "correct horse battery",
  workshopName: "Taller E2E",
  workshopAddress: "Av Siempre Viva 123",
};

test("redirects an unauthenticated visitor away from a protected route", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
});

test("registers against the real API, stores no tokens in the browser, survives a reload, refreshes an expired access token, and logs out", async ({
  page,
  context,
}) => {
  await page.goto("/register");
  await page.getByLabel("Owner name").fill(credentials.ownerName);
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByLabel("Workshop name").fill(credentials.workshopName);
  await page.getByLabel("Workshop address").fill(credentials.workshopAddress);
  await page.getByRole("button", { name: "Create account" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "Session active" })).toBeVisible();

  const cookies = await context.cookies();
  const sessionCookie = cookies.find((cookie) => cookie.name === "workshop_session");
  expect(sessionCookie, "the BFF must set its opaque session cookie").toBeTruthy();
  expect(sessionCookie?.httpOnly).toBe(true);
  expect(sessionCookie?.sameSite).toBe("Lax");
  // Opaque ID, not a JWT: no dot-separated segments.
  expect(sessionCookie?.value).not.toContain(".");

  expect(await page.evaluate(() => document.cookie)).not.toContain("workshop_session");
  expect(await page.evaluate(() => window.localStorage.length)).toBe(0);
  expect(await page.evaluate(() => window.sessionStorage.length)).toBe(0);

  const html = await page.content();
  expect(html).not.toMatch(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/); // no JWT-looking string anywhere in the page

  await page.reload();
  await expect(page.getByRole("heading", { name: "Session active" })).toBeVisible();

  // Outlive the 5-second access token configured for this verification run, then navigate
  // again: getFreshSession() must refresh transparently instead of forcing a re-login.
  await page.waitForTimeout(6000);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Session active" })).toBeVisible();
  await expect(page).toHaveURL(/\/account$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
});

test("logs back in against the real API with the already-registered credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "Session active" })).toBeVisible();
});

test("shows a recoverable error and stays on the login page for invalid credentials", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(`nobody-${randomUUID()}@example.com`);
  await page.getByLabel("Password").fill("wrong-password-value");
  await page.getByRole("button", { name: "Sign in" }).click();

  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/login$/);
});

test("ends the session when NestJS rejects an already-rotated refresh token", async ({ page, context }) => {
  // Re-authenticate as the account from the earlier test (no new registration needed) to get
  // a fresh, real, Redis-backed BFF session.
  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/account$/);

  const cookies = await context.cookies();
  const sessionCookie = cookies.find((cookie) => cookie.name === "workshop_session");
  expect(sessionCookie).toBeTruthy();

  const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  try {
    const key = `session:${sessionCookie!.value}`;
    const refreshToken = await redis.hget(key, "refreshToken");
    expect(refreshToken).toBeTruthy();

    // Rotate the refresh token directly against the real NestJS API, bypassing the BFF, so
    // the token our own Redis record still holds becomes stale from NestJS's point of view —
    // exactly the "someone already used this refresh token" case NestJS revokes on reuse.
    const externalRefresh = await fetch("http://localhost:3000/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    expect(externalRefresh.status).toBe(200);

    // Force the BFF to treat the access token as expired so it attempts a refresh with the
    // now-stale token on the next call.
    await redis.hset(key, "accessExpiresAt", String(Date.now() - 1));

    const response = await page.request.post("/api/session/refresh", {
      headers: { origin: "http://127.0.0.1:3101" },
    });
    expect(response.status()).toBe(401);
    expect(await redis.exists(key)).toBe(0);
  } finally {
    await redis.quit();
  }

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login$/);
});
