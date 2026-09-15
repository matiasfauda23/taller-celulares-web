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

async function nestApi<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`${NEST_API_URL}${path}`, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return response.json() as Promise<T>;
}

// NestJS throttles login attempts per email (5/15min) — every test below logs in at most
// once, and the whole file stays well under that budget across a full run.
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Password").fill(credentials.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  const response = await fetch(`${NEST_API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const body = (await response.json()) as { tokens: { accessToken: string } };
  accessToken = body.tokens.accessToken;
});

test("redirects an unauthenticated visitor away from the clients pages", async ({ page }) => {
  await page.goto("/clients");
  await expect(page).toHaveURL(/\/login$/);
});

test("shows an empty state, then create, edit and a real 404 all work end to end", async ({ page }) => {
  await login(page);

  await page.goto("/clients");
  await expect(page.getByText("No active clients yet.")).toBeVisible();

  await page.goto("/clients/new");
  await page.getByLabel("First name").fill("Ana");
  await page.getByLabel("Last name").fill("Gomez");
  await page.getByLabel("Phone").fill("555-0100");
  await page.getByLabel("Address").fill("Calle Falsa 123");
  await page.getByRole("button", { name: "Create client" }).click();

  await expect(page).toHaveURL(/\/clients\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: "Ana Gomez" })).toBeVisible();
  await expect(page.getByText("555-0100")).toBeVisible();

  await page.getByRole("link", { name: "Edit" }).click();
  await page.getByLabel("Last name").fill("Gomez Fernandez");
  await page.getByRole("button", { name: "Save changes" }).click();

  await expect(page.getByRole("heading", { name: "Ana Gomez Fernandez" })).toBeVisible();

  await page.goto("/clients/00000000-0000-0000-0000-000000000000");
  await expect(page.getByText("Client not found.")).toBeVisible();
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

  await page.getByRole("button", { name: "Archive" }).click();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  // Still active: Edit/Archive controls remain, and NestJS confirms no archivedAt was set.
  await expect(page.getByRole("link", { name: "Edit" })).toBeVisible();
  const stillActive = await nestApi<{ archivedAt: string | null }>("GET", `/clients/${client.id}`);
  expect(stillActive.archivedAt).toBeNull();

  await page.getByRole("button", { name: "Archive" }).click();
  await page.getByRole("button", { name: "Confirm archive" }).click();
  await expect(page.getByRole("dialog")).toBeHidden();

  await expect(page.getByText("Archived")).toBeVisible();
  await expect(page.getByRole("link", { name: "Edit" })).toHaveCount(0);

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
  await page.getByRole("button", { name: "Archive" }).click();
  await page.getByRole("button", { name: "Confirm archive" }).click();

  await expect(page.getByRole("dialog")).toBeVisible(); // stays open, no optimistic close
  await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();
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
  await expect(page.getByRole("link", { name: "Previous" })).toHaveCount(0);
  const nextLink = page.getByRole("link", { name: "Next" });
  await expect(nextLink).toBeVisible();

  await nextLink.click();
  await expect(page).toHaveURL(/\/clients\?page=2$/);
  await expect(page.getByRole("link", { name: "Previous" })).toBeVisible();
});
