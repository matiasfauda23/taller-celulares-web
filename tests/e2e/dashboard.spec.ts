import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const NEST_API_URL = "http://localhost:3000";

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

async function registerDirectlyAgainstNest(): Promise<{ email: string; password: string; tokens: AuthTokens }> {
  const email = `dashboard-verify-${randomUUID()}@example.com`;
  const password = "correct horse battery";
  const response = await fetch(`${NEST_API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ownerName: "Dashboard Tester",
      email,
      password,
      workshopName: "Taller Dashboard",
      workshopAddress: "Av Siempre Viva 999",
    }),
  });
  const body = (await response.json()) as { tokens: AuthTokens };
  return { email, password, tokens: body.tokens };
}

async function nestApi<T>(tokens: AuthTokens, method: string, path: string, body?: unknown): Promise<T> {
  const send = (accessToken: string) =>
    fetch(`${NEST_API_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response = await send(tokens.accessToken);
  // NestJS issues 25-second access tokens in this verification environment; seeding below
  // makes more calls than that window allows, so renew on expiry rather than assert on a 401 body.
  if (response.status === 401) {
    const refreshed = await fetch(`${NEST_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (refreshed.ok) {
      const rotated = (await refreshed.json()) as { tokens: AuthTokens };
      tokens.accessToken = rotated.tokens.accessToken;
      tokens.refreshToken = rotated.tokens.refreshToken;
      response = await send(tokens.accessToken);
    }
  }
  return response.json() as Promise<T>;
}

test("shows real counts and the reception-order list for a freshly seeded workshop", async ({ page }) => {
  const { email, password, tokens } = await registerDirectlyAgainstNest();

  // Seed two active clients, one device on the first client, and two work orders on that
  // device — all through the real, documented NestJS endpoints, never a dashboard-specific one.
  const clientA = await nestApi<{ id: string }>(tokens, "POST", "/clients", {
    firstName: "Ana",
    lastName: "Gomez",
    phone: "555-0100",
    address: "Calle Falsa 123",
  });
  await nestApi<{ id: string }>(tokens, "POST", "/clients", {
    firstName: "Luis",
    lastName: "Diaz",
    phone: "555-0101",
    address: "Calle Falsa 456",
  });
  const device = await nestApi<{ id: string }>(tokens, "POST", "/devices", {
    clientId: clientA.id,
    brand: "Acme",
    model: "Phone X",
    physicalCondition: "Cracked screen",
  });

  const orderReady = await nestApi<{ id: string; number: string }>(tokens, "POST", "/work-orders", {
    deviceId: device.id,
    reportedIssue: "Screen does not turn on",
  });
  await nestApi(tokens, "PATCH", `/work-orders/${orderReady.id}`, { diagnosis: "Cracked panel" });
  await nestApi(tokens, "PATCH", `/work-orders/${orderReady.id}/status`, { status: "DIAGNOSING" });
  await nestApi(tokens, "PATCH", `/work-orders/${orderReady.id}`, { workPerformed: "Replaced screen panel" });
  await nestApi(tokens, "PATCH", `/work-orders/${orderReady.id}/status`, { status: "REPAIRING" });
  await nestApi(tokens, "PATCH", `/work-orders/${orderReady.id}/status`, { status: "READY" });

  const orderReceived = await nestApi<{ id: string; number: string }>(tokens, "POST", "/work-orders", {
    deviceId: device.id,
    reportedIssue: "Battery drains too fast",
  });

  // Now authenticate through the real BFF/UI, the way an actual user would.
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await expect(page.getByText("Active clients")).toBeVisible();
  await expect(page.getByText("2", { exact: true }).first()).toBeVisible();

  const main = page.locator("body");
  await expect(main).toContainText("Active devices");
  await expect(main).toContainText("Work orders");
  await expect(main).toContainText("Ready for pickup");

  await expect(page.getByText("Orders by reception date")).toBeVisible();
  await expect(page.getByText(orderReady.number)).toBeVisible();
  await expect(page.getByText(orderReceived.number)).toBeVisible();

  await expect(page.getByRole("link", { name: "View clients" })).toHaveAttribute("href", "/clients");
  await expect(page.getByRole("link", { name: "View devices" })).toHaveAttribute("href", "/devices");
  await expect(page.getByRole("link", { name: "View work orders" })).toHaveAttribute("href", "/work-orders");
  await expect(page.getByRole("link", { name: "New work order" })).toHaveAttribute("href", "/work-orders/new");
});

test("redirects an unauthenticated visitor away from the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
