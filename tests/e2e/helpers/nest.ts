import { randomUUID } from "node:crypto";
import { expect, type Locator, type Page } from "@playwright/test";

export const NEST_API_URL = "http://localhost:3000";

export interface NestCredentials {
  ownerName: string;
  email: string;
  password: string;
  workshopName: string;
  workshopAddress: string;
}

export function uniqueCredentials(label: string): NestCredentials {
  return {
    ownerName: `${label} Tester`,
    email: `${label.toLowerCase()}-verify-${randomUUID()}@example.com`,
    password: "correct horse battery",
    workshopName: `Taller ${label}`,
    workshopAddress: "Av Siempre Viva 321",
  };
}

export interface NestSession {
  accessToken: string;
  call<T>(method: string, path: string, body?: unknown): Promise<T>;
}

/**
 * Registers directly against NestJS and returns a session whose `call` renews the access token on
 * a 401. NestJS issues 25-second access tokens in this environment, so a serial spec that reuses
 * one token across many requests would otherwise fail later assertions on a 401 body.
 */
export async function registerNest(credentials: NestCredentials): Promise<NestSession> {
  const response = await fetch(`${NEST_API_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credentials),
  });
  const raw = await response.text();
  if (!response.ok) {
    // A throttled or rejected register would otherwise surface as "cannot read accessToken",
    // which hides the status and body that actually explain the failure.
    throw new Error(`NestJS register failed (${response.status}) for ${credentials.email}: ${raw}`);
  }
  const body = JSON.parse(raw) as { tokens: { accessToken: string; refreshToken: string } };
  let accessToken = body.tokens.accessToken;
  let refreshToken = body.tokens.refreshToken;

  async function refresh(): Promise<boolean> {
    const response = await fetch(`${NEST_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) return false;
    const rotated = (await response.json()) as { tokens: { accessToken: string; refreshToken: string } };
    accessToken = rotated.tokens.accessToken;
    refreshToken = rotated.tokens.refreshToken;
    return true;
  }

  // Single-flight: the refresh token rotates on use, so several parallel calls that each see a 401
  // would otherwise race and invalidate each other, leaving all but one with a 401 forever.
  let refreshing: Promise<boolean> | null = null;
  async function refreshOnce(): Promise<boolean> {
    const pending = (refreshing ??= refresh());
    const renewed = await pending;
    if (refreshing === pending) refreshing = null;
    return renewed;
  }

  async function call<T>(method: string, path: string, requestBody?: unknown): Promise<T> {
    const send = (token: string) =>
      fetch(`${NEST_API_URL}${path}`, {
        method,
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: requestBody !== undefined ? JSON.stringify(requestBody) : undefined,
      });

    let upstream = await send(accessToken);
    if (upstream.status === 401 && (await refreshOnce())) {
      upstream = await send(accessToken);
    }
    return upstream.json() as Promise<T>;
  }

  return {
    get accessToken() {
      return accessToken;
    },
    call,
  };
}

/** Signs in through the real UI and confirms the dashboard actually rendered. */
export async function login(page: Page, credentials: NestCredentials): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(credentials.email);
  await page.getByLabel("Contraseña").fill(credentials.password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function seedClient(
  nest: NestSession,
  client: { firstName: string; lastName: string; phone: string; address: string },
): Promise<string> {
  const created = await nest.call<{ id: string }>("POST", "/clients", client);
  return created.id;
}

/** Creates an order and returns its id and human-facing number. */
export async function seedWorkOrder(
  nest: NestSession,
  deviceId: string,
  reportedIssue: string,
): Promise<{ id: string; number: string }> {
  const created = await nest.call<{ id?: string; number?: string }>("POST", "/work-orders", {
    deviceId,
    reportedIssue,
  });
  // A rejected create would otherwise yield an order with no id, and the failure would surface
  // much later as a confusing PATCH against "undefined".
  if (!created?.id) throw new Error(`Could not seed work order "${reportedIssue}": ${JSON.stringify(created)}`);
  return { id: created.id, number: created.number ?? "" };
}

/**
 * Drives an order to DELIVERED through the transitions NestJS actually allows.
 *
 * Archiving and the delivered filter both need a final status, and the lifecycle has no shortcut
 * from RECEIVED to DELIVERED. Two transitions are also gated on content: leaving DIAGNOSING
 * requires a diagnosis and leaving REPAIRING requires the work performed, so those details are
 * filled in before each step rather than assumed.
 */
export async function deliverWorkOrder(nest: NestSession, orderId: string): Promise<void> {
  const transitions: { status: string; detail?: Record<string, string> }[] = [
    { status: "DIAGNOSING" },
    {
      status: "REPAIRING",
      detail: { diagnosis: "Placa quemada", workPerformed: "Cambio de placa" },
    },
    { status: "READY" },
    { status: "DELIVERED" },
  ];

  for (const [index, transition] of transitions.entries()) {
    if (transition.detail) {
      await nest.call("PATCH", `/work-orders/${orderId}`, transition.detail);
    }
    const response = await nest.call<{ status?: string }>("PATCH", `/work-orders/${orderId}/status`, {
      status: transition.status,
    });
    if (response?.status !== transition.status) {
      throw new Error(
        `Step ${index + 1} to ${transition.status} on order ${orderId} failed: ${JSON.stringify(response)}`,
      );
    }
  }
}

/** A client plus one device, the minimum NestJS requires to open a work order. */
export async function seedClientWithDevice(
  nest: NestSession,
  client: { firstName: string; lastName: string; phone: string; address: string },
  device: { brand: string; model: string; physicalCondition: string; serialNumber?: string },
): Promise<{ clientId: string; deviceId: string }> {
  const clientId = await seedClient(nest, client);
  const createdDevice = await nest.call<{ id: string }>("POST", "/devices", {
    clientId,
    ...device,
  });
  return { clientId, deviceId: createdDevice.id };
}

/**
 * Maps items with a bounded number of concurrent tasks.
 *
 * Creating a work order runs an interactive transaction that locks the workshop row, so a fully
 * parallel burst serialises on that lock while still holding a pool connection each. Enough of
 * them at once exhaust Prisma's pool and the stragglers fail with a server error, so bulk seeding
 * uses a small window instead of `Promise.all` over everything.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
}

/**
 * Picks an option and confirms the choice survived on the very same DOM node.
 *
 * A late hydration/stream settle can replace the `<select>` outright, and a replaced node carries
 * the default value ("") instead of the choice, which leaves react-hook-form's state untouched and
 * fails validation at submit with a message that looks like a bug in the form. Tagging the node
 * makes that race visible: the tag is gone once the node was replaced, so the pick is retried
 * against the node that is actually on screen.
 */
export async function pickOption(select: Locator, value: string): Promise<void> {
  const tag = `picked-${randomUUID()}`;
  await expect(async () => {
    await select.selectOption(value);
    await select.evaluate((node, marker) => node.setAttribute("data-pick", marker), tag);
    await expect(select).toHaveAttribute("data-pick", tag);
    await expect(select).toHaveValue(value);
  }).toPass();
}
