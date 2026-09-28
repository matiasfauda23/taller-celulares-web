import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";

const NEST_API_URL = "http://localhost:3000";

const credentials = {
  ownerName: "Clients Tester",
  email: `clients-verify-${randomUUID()}@example.com`,
  password: "correct horse battery",
  workshopName: "Taller Clients",
  workshopAddress: "Av Siempre Viva 321",
};

let accessToken = "";
let refreshToken = "";

async function nestApi<T>(method: string, path: string, body?: unknown): Promise<T> {
  const send = (token: string) =>
    fetch(`${NEST_API_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

  let response = await send(accessToken);
  // NestJS issues 25-second access tokens in this verification environment, so a serial file
  // outlives the one minted in beforeAll. Renew it instead of failing later assertions with a
  // confusing "property archivedAt is undefined" caused by a 401 body.
  if (response.status === 401 && refreshToken) {
    const refreshed = await fetch(`${NEST_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (refreshed.ok) {
      const rotated = (await refreshed.json()) as { tokens: { accessToken: string; refreshToken: string } };
      accessToken = rotated.tokens.accessToken;
      refreshToken = rotated.tokens.refreshToken;
      response = await send(accessToken);
    }
  }
  return response.json() as Promise<T>;
}

// NestJS throttles login attempts per email (5/15min) — every test below logs in at most
// once, and the whole file stays well under that budget across a full run.
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Contraseña").fill(credentials.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const response = await fetch(`${NEST_API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const body = (await response.json()) as { tokens: { accessToken: string; refreshToken: string } };
  accessToken = body.tokens.accessToken;
  refreshToken = body.tokens.refreshToken;
});

test("redirects an unauthenticated visitor away from the clients pages", async ({ page }) => {
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/login$/);
});

test("shows an empty state, then create, edit and a real 404 all work end to end", async ({ page }) => {
  await login(page);

  await page.goto("/clients");
  await expect(page.getByText("No hay clientes activos aún.")).toBeVisible();

  await page.goto("/clients/new");
  await page.getByLabel("Nombre").fill("Ana");
  await page.getByLabel("Apellido").fill("Gomez");
  await page.getByLabel("Teléfono").fill("555-0100");
  await page.getByLabel("Dirección").fill("Calle Falsa 123");
  await page.getByRole("button", { name: "Crear cliente" }).click();

  await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Ana Gomez" })).toBeVisible();
  await expect(page.getByText("555-0100")).toBeVisible();

  await page.getByRole("link", { name: "Editar" }).click();
  await page.getByLabel("Apellido").fill("Gomez Fernandez");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByRole("heading", { name: "Ana Gomez Fernandez" })).toBeVisible();

  await page.goto("/clients/00000000-0000-0000-0000-000000000000");
  await expect(page.getByText("No se encontró el cliente.")).toBeVisible();
});

test("cancels an archive without sending a request, then confirms it with the dialog", async ({ page }) => {
  const client = await nestApi<{ id: string }>("POST", "/clients", {
    firstName: "Marta",
    lastName: "Ruiz",
    phone: "555-0300",
    address: "Calle Falsa 789",
  });

  await login(page);
  await page.goto(`/clients/${client.id}`);

  await page.getByRole("button", { name: "Archivar" }).click();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // Still active: Edit/Archive controls remain, and NestJS confirms no archivedAt was set.
  await expect(page.getByRole("link", { name: "Editar" })).toBeVisible();
  const stillActive = await nestApi<{ archivedAt: string | null }>("GET", `/clients/${client.id}`);
  expect(stillActive.archivedAt).toBeNull();

  await page.getByRole("button", { name: "Archivar" }).click();
  await page.getByRole("button", { name: "Confirmar archivado" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await expect(page.getByText("Archivado")).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar" })).toHaveCount(0);

  const archived = await nestApi<{ archivedAt: string | null }>("GET", `/clients/${client.id}`);
  expect(archived.archivedAt).not.toBeNull();
});

test("shows NestJS's 409 and keeps the client active when it owns an unfinished work order", async ({ page }) => {
  const client = await nestApi<{ id: string }>("POST", "/clients", {
    firstName: "Carla",
    lastName: "Nunez",
    phone: "555-0400",
    address: "Calle Falsa 111",
  });
  const device = await nestApi<{ id: string }>("POST", "/devices", {
    clientId: client.id,
    brand: "Acme",
    model: "Phone Z",
    physicalCondition: "Fine",
  });
  await nestApi("POST", "/work-orders", { deviceId: device.id, reportedIssue: "Won't charge" });

  await login(page);
  await page.goto(`/clients/${client.id}`);
  await page.getByRole("button", { name: "Archivar" }).click();
  await page.getByRole("button", { name: "Confirmar archivado" }).click();

  await expect(page.getByRole("dialog")).toBeVisible(); // stays open, no optimistic close
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();

  await page.getByRole("button", { name: "Cancelar" }).click();
  const stillActive = await nestApi<{ archivedAt: string | null }>("GET", `/clients/${client.id}`);
  expect(stillActive.archivedAt).toBeNull();
});

test("paginates using the backend's real paging instead of downloading every page", async ({ page }) => {
  await Promise.all(
    Array.from({ length: 21 }, (_, index) =>
      nestApi("POST", "/clients", {
        firstName: `Bulk${index}`,
        lastName: "Client",
        phone: `555-9${String(index).padStart(3, "0")}`,
        address: "Calle Falsa 1",
      }),
    ),
  );

  await login(page);
  await page.goto("/clients");

  const total = await nestApi<{ meta: { total: number } }>("GET", "/clients?page=1&limit=1").then((r) => r.meta.total);
  expect(total).toBeGreaterThan(20);

  await expect(page.getByText(`${total} total`, { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Anterior" })).toHaveCount(0);
  const nextLink = page.getByRole("link", { name: "Siguiente" });
  await expect(nextLink).toBeVisible();

  await nextLink.click();
  await expect(page).toHaveURL(/\/clients\?page=2$/);
  await expect(page.getByRole("link", { name: "Anterior" })).toBeVisible();
});
