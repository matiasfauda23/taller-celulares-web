import { expect, test, type Page } from "@playwright/test";
import {
  deliverWorkOrder,
  login,
  mapWithConcurrency,
  pickOption,
  registerNest,
  seedClient,
  seedClientWithDevice,
  seedWorkOrder,
  uniqueCredentials,
  type NestSession,
} from "./helpers/nest";

const credentials = uniqueCredentials("WorkOrders");

let nest: NestSession;

test.describe.configure({ mode: "serial" });

/** Waits for the list to finish rendering, then returns the order numbers it shows. */
async function visibleOrderNumbers(page: Page): Promise<string[]> {
  const rows = page.getByRole("link", { name: /^ORD-\d{6}$/ });
  // The page streams while it loads orders, clients and devices in parallel, so the URL changes
  // well before the list exists. Reading immediately would see an empty page.
  await expect(rows.first()).toBeVisible({ timeout: 15_000 });
  return (await rows.allInnerTexts()).map((text) => text.trim());
}

test.beforeAll(async () => {
  nest = await registerNest(credentials);
});

test("redirects an unauthenticated visitor away from the work orders pages", async ({ page }) => {
  await page.goto("/work-orders");
  await expect(page).toHaveURL(/\/login$/);
});

test("shows an empty state, then creates an order through the form and edits it", async ({ page }) => {
  const { deviceId } = await seedClientWithDevice(
    nest,
    { firstName: "Diego", lastName: "Orden", phone: "555-2100", address: "Calle Orden 1" },
    { brand: "Acme", model: "Phone X", physicalCondition: "Screen cracked" },
  );

  await login(page, credentials);
  await page.goto("/work-orders");
  await expect(page.getByText("No hay órdenes activas aún.")).toBeVisible();

  await page.getByRole("link", { name: "Nueva orden" }).click();
  await pickOption(page.getByLabel("Dispositivo"), deviceId);
  await page.getByLabel("Falla reportada").fill("La pantalla no enciende");
  await page.getByRole("button", { name: "Crear orden" }).click();

  await expect(page).toHaveURL(/\/work-orders\/[0-9a-f-]{36}$/);
  const number = await page.getByRole("heading", { level: 1 }).innerText();
  expect(number).toMatch(/^ORD-\d{6}$/);
  await expect(page.getByText("La pantalla no enciende")).toBeVisible();

  await page.getByRole("link", { name: "Editar orden" }).click();
  await page.getByLabel("Diagnóstico (opcional)").fill("Panel roto");
  await page.getByRole("button", { name: "Guardar cambios" }).click();

  await expect(page.getByText("Panel roto")).toBeVisible();
});

test("keeps the amounts as the decimal strings NestJS returns", async ({ page }) => {
  const { deviceId } = await seedClientWithDevice(
    nest,
    { firstName: "Marta", lastName: "Decimales", phone: "555-2200", address: "Calle Orden 2" },
    { brand: "Acme", model: "Decimals", physicalCondition: "Fine" },
  );
  const order = await nest.call<{ id: string }>("POST", "/work-orders", {
    deviceId,
    reportedIssue: "Cambio de pantalla",
    estimatedBudget: 1500.5,
    finalPrice: 2000.75,
  });

  await login(page, credentials);
  await page.goto(`/work-orders/${order.id}`);

  await expect(page.getByText("1500.5")).toBeVisible();
  await expect(page.getByText("2000.75")).toBeVisible();
});

test("moves an order through the lifecycle with the status control", async ({ page }) => {
  const { deviceId } = await seedClientWithDevice(
    nest,
    { firstName: "Carla", lastName: "Estado", phone: "555-2300", address: "Calle Orden 3" },
    { brand: "Acme", model: "Status", physicalCondition: "Fine" },
  );
  const order = await nest.call<{ id: string }>("POST", "/work-orders", {
    deviceId,
    reportedIssue: "No carga",
  });

  await login(page, credentials);
  await page.goto(`/work-orders/${order.id}`);

  const statusSelect = page.getByRole("combobox");
  await expect(statusSelect).toHaveText("Recibido");

  await statusSelect.click();
  await page.getByRole("option", { name: "Diagnosticando" }).click();

  await expect(page.getByRole("combobox")).toHaveText("Diagnosticando");
  const updated = await nest.call<{ status: string }>("GET", `/work-orders/${order.id}`);
  expect(updated.status).toBe("DIAGNOSING");
});

test("shows a visible 404 for an order that does not exist", async ({ page }) => {
  await login(page, credentials);
  await page.goto("/work-orders/00000000-0000-0000-0000-000000000000");

  await expect(page.getByText("No se encontró la orden.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Volver a la lista" })).toBeVisible();
});

test("refuses to archive an order that is not final and keeps it unchanged", async ({ page }) => {
  const { deviceId } = await seedClientWithDevice(
    nest,
    { firstName: "Ivan", lastName: "NoArchivable", phone: "555-2400", address: "Calle Orden 4" },
    { brand: "Acme", model: "NoArchive", physicalCondition: "Fine" },
  );
  const order = await nest.call<{ id: string }>("POST", "/work-orders", {
    deviceId,
    reportedIssue: "Botón roto",
  });

  await login(page, credentials);
  await page.goto(`/work-orders/${order.id}`);
  await page.getByRole("button", { name: "Archivar" }).click();
  await page.getByRole("button", { name: "Confirmar archivado" }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();

  await page.getByRole("button", { name: "Cancelar" }).click();
  const unchanged = await nest.call<{ archivedAt: string | null; status: string }>("GET", `/work-orders/${order.id}`);
  expect(unchanged.archivedAt).toBeNull();
  expect(unchanged.status).toBe("RECEIVED");
});

test("archives a delivered order after confirmation", async ({ page }) => {
  const { deviceId } = await seedClientWithDevice(
    nest,
    { firstName: "Laura", lastName: "Archivable", phone: "555-2500", address: "Calle Orden 5" },
    { brand: "Acme", model: "Archive", physicalCondition: "Fine" },
  );
  const order = await seedWorkOrder(nest, deviceId, "Cambio de bateria");
  await deliverWorkOrder(nest, order.id);

  await login(page, credentials);
  await page.goto(`/work-orders/${order.id}`);
  await page.getByRole("button", { name: "Archivar" }).click();
  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  const stillThere = await nest.call<{ archivedAt: string | null }>("GET", `/work-orders/${order.id}`);
  expect(stillThere.archivedAt).toBeNull();

  await page.getByRole("button", { name: "Archivar" }).click();
  await page.getByRole("button", { name: "Confirmar archivado" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await expect(page.getByText("Archivado")).toBeVisible();
  await expect(page.getByRole("link", { name: "Editar orden" })).toHaveCount(0);
  const archived = await nest.call<{ archivedAt: string | null }>("GET", `/work-orders/${order.id}`);
  expect(archived.archivedAt).not.toBeNull();
});

test("filters the list by status through the form and keeps the filter while paginating", async ({ page }) => {
  const bulkOwner = await seedClient(nest, {
    firstName: "Filtro",
    lastName: "Masivo",
    phone: "555-2600",
    address: "Calle Orden 6",
  });
  const bulkDevice = await nest.call<{ id: string }>("POST", "/devices", {
    clientId: bulkOwner,
    brand: "Acme",
    model: "Masivo",
    physicalCondition: "Fine",
  });
  const quietOwner = await seedClient(nest, {
    firstName: "Filtro",
    lastName: "Recibido",
    phone: "555-2601",
    address: "Calle Orden 7",
  });
  const quietDevice = await nest.call<{ id: string }>("POST", "/devices", {
    clientId: quietOwner,
    brand: "Acme",
    model: "Recibido",
    physicalCondition: "Fine",
  });

  // 21 delivered orders are one more than a page, so the filtered list has to paginate.
  const bulkOrders = await mapWithConcurrency([...Array(21).keys()], 4, (index) =>
    seedWorkOrder(nest, bulkDevice.id, `Masivo ${index}`),
  );
  await mapWithConcurrency(bulkOrders, 4, (order) => deliverWorkOrder(nest, order.id));
  const quiet = await seedWorkOrder(nest, quietDevice.id, "Sigue recibido");

  await login(page, credentials);
  await page.goto("/work-orders");
  await pickOption(page.getByLabel("Estado"), "DELIVERED");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();

  // The list is ordered by receivedAt then id, and a bulk seed lands inside the same millisecond,
  // so row order is not the creation order. Assert on membership instead.
  const bulkNumbers = new Set(bulkOrders.map((order) => order.number));
  const expectOnlyBulkRows = async () => {
    const numbers = await visibleOrderNumbers(page);
    expect(numbers.length).toBeGreaterThan(0);
    for (const number of numbers) expect(bulkNumbers.has(number)).toBe(true);
  };

  await expect(page).toHaveURL(/status=DELIVERED/);
  await expectOnlyBulkRows();
  await expect(page.getByRole("link", { name: quiet.number })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Anterior" })).toHaveCount(0);

  const nextLink = page.getByRole("link", { name: "Siguiente" });
  await expect(nextLink).toBeVisible();
  await nextLink.click();

  // The status filter has to survive the pagination, not fall back to the unfiltered list.
  await expect(page).toHaveURL(/status=DELIVERED/);
  await expect(page).toHaveURL(/page=2/);
  await expectOnlyBulkRows();
  await expect(page.getByRole("link", { name: quiet.number })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Anterior" })).toBeVisible();

  await page.goto("/work-orders");
  await pickOption(page.getByLabel("Cliente"), quietOwner);
  await page.getByRole("button", { name: "Aplicar filtros" }).click();

  await expect(page).toHaveURL(new RegExp(`clientId=${quietOwner}`));
  expect(await visibleOrderNumbers(page)).toEqual([quiet.number]);

  await page.getByRole("link", { name: "Limpiar" }).click();
  await expect(page).toHaveURL(/\/work-orders$/);
  await expect(page.getByRole("link", { name: quiet.number })).toBeVisible();
});

test("ignores an unknown status in the URL instead of failing the list", async ({ page }) => {
  await login(page, credentials);
  await page.goto("/work-orders?status=NOT_A_STATUS");

  await expect(page.getByRole("main").getByRole("alert")).toHaveCount(0);
  await expect(page.getByText("No se pudieron cargar las órdenes")).toHaveCount(0);
});
