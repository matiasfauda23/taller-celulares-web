import { expect, test } from "@playwright/test";
import { login, registerNest, seedClient, uniqueCredentials, type NestSession } from "./helpers/nest";

const credentials = uniqueCredentials("States");

let nest: NestSession;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  nest = await registerNest(credentials);
});

test("shows the list skeleton while the devices request is in flight", async ({ page }) => {
  await login(page, credentials);

  await page.route("**/api/devices*", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.continue();
  });

  await page.getByRole("link", { name: "Dispositivos", exact: true }).click();

  // loading.tsx renders pulse blocks; the real table only replaces them once the request settles.
  await expect(page.locator(".animate-pulse").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: "Dispositivos" })).toBeVisible();
  await expect(page.locator(".animate-pulse")).toHaveCount(0);
});

test("renders a recoverable error and keeps the session when a mutation fails", async ({ page }) => {
  const clientId = await seedClient(nest, {
    firstName: "Error",
    lastName: "Recuperable",
    phone: "555-3200",
    address: "Calle Estados 4",
  });

  await login(page, credentials);
  await page.goto(`/clients/${clientId}`);

  // The archive goes through the BFF, so this is the one NestJS call a failed request can be
  // injected into from the browser. The list pages fetch server-side and cannot be intercepted.
  await page.route(`**/api/clients/${clientId}`, (route) =>
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ statusCode: 500, code: "INTERNAL_ERROR", message: "Fallo de red", path: `/clients/${clientId}` }),
    }),
  );

  await page.getByRole("button", { name: "Archivar" }).click();
  await page.getByRole("button", { name: "Confirmar archivado" }).click();

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toBeVisible();

  await page.getByRole("button", { name: "Cancelar" }).click();

  const stillActive = await nest.call<{ archivedAt: string | null }>("GET", `/clients/${clientId}`);
  expect(stillActive.archivedAt).toBeNull();

  // A failed mutation must not end the session: the page still works without signing in again.
  await page.unroute(`**/api/clients/${clientId}`);
  await page.getByRole("link", { name: "Clientes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Clientes" })).toBeVisible();
});

test("blocks a duplicate submit so a double click creates a single record", async ({ page }) => {
  const before = await nest.call<{ meta: { total: number } }>("GET", "/clients?page=1&limit=1").then((r) => r.meta.total);

  await login(page, credentials);
  await page.goto("/clients/new");

  // Hold the first request open so the button's isSubmitting state is observable.
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let posts = 0;
  await page.route("**/api/clients", async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    posts += 1;
    await held;
    await route.continue();
  });

  await page.getByLabel("Nombre").fill("Duplicado");
  await page.getByLabel("Apellido").fill("Unico");
  await page.getByLabel("Teléfono").fill("555-9900");
  await page.getByLabel("Dirección").fill("Calle Estados 1");

  // Matched by regex, not by name: the button swaps its label to "Guardando..." while submitting,
  // so a name-based locator stops matching mid-assertion.
  const submit = page.getByRole("button", { name: /Crear cliente|Guardando/ });
  await expect(submit).toBeEnabled();
  await submit.dblclick();

  await expect(submit).toBeDisabled();
  release();
  await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}$/);

  const after = await nest.call<{ meta: { total: number } }>("GET", "/clients?page=1&limit=1").then((r) => r.meta.total);
  expect(after - before).toBe(1);
  expect(posts).toBe(1);
});

test("opens and dismisses the archive dialog with the keyboard alone", async ({ page }) => {
  const clientId = await seedClient(nest, {
    firstName: "Teclado",
    lastName: "Accesible",
    phone: "555-3000",
    address: "Calle Estados 2",
  });

  await login(page, credentials);
  await page.goto(`/clients/${clientId}`);

  const archiveButton = page.getByRole("button", { name: "Archivar" });
  await archiveButton.focus();
  await expect(archiveButton).toBeFocused();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();

  const stillActive = await nest.call<{ archivedAt: string | null }>("GET", `/clients/${clientId}`);
  expect(stillActive.archivedAt).toBeNull();
});

test("swaps the table for cards across the responsive breakpoint", async ({ page }) => {
  const clientId = await seedClient(nest, {
    firstName: "Responsive",
    lastName: "Tarjeta",
    phone: "555-3100",
    address: "Calle Estados 3",
  });
  await nest.call("POST", "/devices", {
    clientId,
    brand: "Acme",
    model: "Responsive",
    physicalCondition: "Fine",
  });

  await login(page, credentials);

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/devices");
  await expect(page.locator(".responsive-table")).toBeVisible();
  await expect(page.locator(".responsive-cards")).toBeHidden();
  await expect(page.getByRole("columnheader", { name: "Dispositivo" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".responsive-cards")).toBeVisible();
  await expect(page.locator(".responsive-table")).toBeHidden();
  await expect(page.getByRole("button", { name: "Archivar" }).first()).toBeVisible();
});

test("keeps the mobile navigation usable with the menu closed", async ({ page }) => {
  await login(page, credentials);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");

  const toggle = page.getByRole("button", { name: "Abrir menú" });
  await expect(toggle).toBeVisible();
  await toggle.click();

  await expect(page.getByRole("button", { name: "Cerrar menú" })).toBeVisible();
  await page.getByRole("link", { name: "Órdenes", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Órdenes de trabajo" })).toBeVisible();
});
