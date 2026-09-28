import { expect, test } from "@playwright/test";
import {
  login,
  pickOption,
  registerNest,
  seedClient,
  seedClientWithDevice,
  uniqueCredentials,
  type NestSession,
} from "./helpers/nest";

const credentials = uniqueCredentials("Devices");

let nest: NestSession;

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  nest = await registerNest(credentials);
});

test("redirects an unauthenticated visitor away from the devices pages", async ({ page }) => {
  await page.goto("/devices");
  await expect(page).toHaveURL(/\/login$/);
});

test("shows an empty state, then creates a device for a real client and edits it", async ({ page }) => {
  const clientId = await seedClient(nest, {
    firstName: "Diego",
    lastName: "Probe",
    phone: "555-1100",
    address: "Calle Dispositivo 1",
  });

  await login(page, credentials);
  await page.goto("/devices");
  await expect(page.getByText("No hay dispositivos activos aún.")).toBeVisible();

  await page.getByRole("link", { name: "Nuevo dispositivo" }).click();
  await pickOption(page.getByLabel("Cliente"), clientId);
  await page.getByLabel("Marca").fill("Acme");
  await page.getByLabel("Modelo").fill("Phone X");
  await page.getByLabel("Número de serie (opcional)").fill("SN-9001");
  await page.getByLabel("Color (opcional)").fill("Negro");
  await page.getByLabel("Condición física").fill("Screen cracked");
  await page.getByRole("button", { name: "Crear dispositivo" }).click();

  await expect(page).toHaveURL(/\/devices\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Acme Phone X" })).toBeVisible();
  await expect(page.getByText("SN-9001")).toBeVisible();

  await page.getByRole("link", { name: "Editar dispositivo" }).click();
  await page.getByLabel("Modelo").fill("Phone X Pro");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByRole("heading", { name: "Acme Phone X Pro" })).toBeVisible();
});

test("shows a visible 404 for a device that does not exist", async ({ page }) => {
  await login(page, credentials);
  await page.goto("/devices/00000000-0000-0000-0000-000000000000");

  await expect(page.getByText("No se encontró el dispositivo.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Volver a la lista" })).toBeVisible();
});

test("cancels an archive without sending a request, then confirms it with the dialog", async ({ page }) => {
  const { deviceId } = await seedClientWithDevice(
    nest,
    { firstName: "Marta", lastName: "Dispositivo", phone: "555-1200", address: "Calle Dispositivo 2" },
    { brand: "Nokia", model: "3310", physicalCondition: "Fine" },
  );

  await login(page, credentials);
  await page.goto(`/devices/${deviceId}`);

  await page.getByRole("button", { name: "Archivar" }).click();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  const stillActive = await nest.call<{ archivedAt: string | null }>("GET", `/devices/${deviceId}`);
  expect(stillActive.archivedAt).toBeNull();

  await page.getByRole("button", { name: "Archivar" }).click();
  await page.getByRole("button", { name: "Confirmar archivado" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await expect(page.getByText("Archivado")).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar dispositivo" })).toHaveCount(0);

  const archived = await nest.call<{ archivedAt: string | null }>("GET", `/devices/${deviceId}`);
  expect(archived.archivedAt).not.toBeNull();
});

test("shows NestJS's 409 and keeps the device active while it owns an unfinished work order", async ({ page }) => {
  const { deviceId } = await seedClientWithDevice(
    nest,
    { firstName: "Carla", lastName: "Dispositivo", phone: "555-1300", address: "Calle Dispositivo 3" },
    { brand: "Acme", model: "Blocked", physicalCondition: "Fine" },
  );
  await nest.call("POST", "/work-orders", { deviceId, reportedIssue: "No enciende" });

  await login(page, credentials);
  await page.goto(`/devices/${deviceId}`);
  await page.getByRole("button", { name: "Archivar" }).click();
  await page.getByRole("button", { name: "Confirmar archivado" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();

  await page.getByRole("button", { name: "Cancelar" }).click();
  const stillActive = await nest.call<{ archivedAt: string | null }>("GET", `/devices/${deviceId}`);
  expect(stillActive.archivedAt).toBeNull();
});

test("refuses to attach a device to an archived client, exactly as NestJS does", async () => {
  const { clientId } = await seedClientWithDevice(
    nest,
    { firstName: "Ivan", lastName: "Archivado", phone: "555-1400", address: "Calle Dispositivo 4" },
    { brand: "Seed", model: "Seed", physicalCondition: "Fine" },
  );
  await nest.call("DELETE", `/clients/${clientId}`);

  const response = await fetch("http://localhost:3000/devices", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${nest.accessToken}` },
    body: JSON.stringify({ clientId, brand: "Huerfano", model: "Sin dueno", physicalCondition: "Fine" }),
  });

  expect(response.status).toBe(404);
});

test("paginates using the backend's real paging instead of downloading every page", async ({ page }) => {
  const { clientId } = await seedClientWithDevice(
    nest,
    { firstName: "Bulk", lastName: "Propietario", phone: "555-1500", address: "Calle Dispositivo 5" },
    { brand: "Seed", model: "Seed", physicalCondition: "Fine" },
  );
  await Promise.all(
    Array.from({ length: 21 }, (_, index) =>
      nest.call("POST", "/devices", {
        clientId,
        brand: `Marca${index}`,
        model: `Modelo${index}`,
        physicalCondition: "Fine",
      }),
    ),
  );

  await login(page, credentials);
  await page.goto("/devices");

  const total = await nest.call<{ meta: { total: number } }>("GET", "/devices?page=1&limit=1").then((r) => r.meta.total);
  expect(total).toBeGreaterThan(20);

  await expect(page.getByText(`${total} total`, { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Anterior" })).toHaveCount(0);
  const nextLink = page.getByRole("link", { name: "Siguiente" });
  await expect(nextLink).toBeVisible();

  await nextLink.click();
  await expect(page).toHaveURL(/\/devices\?page=2$/);
  await expect(page.getByRole("link", { name: "Anterior" })).toBeVisible();
});
