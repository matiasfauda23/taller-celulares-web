import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const NEST_API_URL = "http://localhost:3000";

interface AuthTokens {
  accessToken: string;
}

async function registerDirectlyAgainstNest(): Promise<{ email: string; password: string; accessToken: string }> {
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
  return { email, password, accessToken: body.tokens.accessToken };
}

async function nestApi<T>(accessToken: string, method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${NEST_API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return response.json() as Promise<T>;
}

test("shows real counts and the reception-order list for a freshly seeded workshop", async ({ page }) => {
  const { email, password, accessToken } = await registerDirectlyAgainstNest();

  // Seed two active clients, one device on the first client, and two work orders on that
  // device — all through the real, documented NestJS endpoints, never a dashboard-specific one.
  const clientA = await nestApi<{ id: string }>(accessToken, "POST", "/clients", {
    firstName: "Ana",
    lastName: "Gomez",
    phone: "555-0100",
    address: "Calle Falsa 123",
  });
  await nestApi<{ id: string }>(accessToken, "POST", "/clients", {
    firstName: "Luis",
    lastName: "Diaz",
    phone: "555-0101",
    address: "Calle Falsa 456",
  });
  const device = await nestApi<{ id: string }>(accessToken, "POST", "/devices", {
    clientId: clientA.id,
    brand: "Acme",
    model: "Phone X",
    physicalCondition: "Cracked screen",
  });

  const orderReady = await nestApi<{ id: string; number: string }>(accessToken, "POST", "/work-orders", {
    deviceId: device.id,
    reportedIssue: "Screen does not turn on",
  });
  await nestApi(accessToken, "PATCH", `/work-orders/${orderReady.id}`, { diagnosis: "Cracked panel" });
  await nestApi(accessToken, "PATCH", `/work-orders/${orderReady.id}/status`, { status: "DIAGNOSING" });
  await nestApi(accessToken, "PATCH", `/work-orders/${orderReady.id}`, { workPerformed: "Replaced screen panel" });
  await nestApi(accessToken, "PATCH", `/work-orders/${orderReady.id}/status`, { status: "REPAIRING" });
  await nestApi(accessToken, "PATCH", `/work-orders/${orderReady.id}/status`, { status: "READY" });

  const orderReceived = await nestApi<{ id: string; number: string }>(accessToken, "POST", "/work-orders", {
    deviceId: device.id,
    reportedIssue: "Battery drains too fast",
  });

  // Now authenticate through the real BFF/UI, the way an actual user would.
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
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
