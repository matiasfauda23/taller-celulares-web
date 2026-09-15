import "server-only";
import { getServerEnv } from "@/lib/config/server-env";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class CsrfError extends Error {
  constructor() {
    super("Cross-origin or unverifiable request rejected");
    this.name = "CsrfError";
  }
}

/**
 * Same-origin proof for state-changing BFF requests: the browser attaches `Origin` to every
 * fetch using one of these methods, and a cross-site page cannot forge it. `SameSite=Lax` on
 * the session cookie is a second, independent layer — this check does not depend on it.
 * Read-only requests are left alone; they must stay safe by not mutating anything.
 */
export function assertSameOriginRequest(request: Request): void {
  if (!STATE_CHANGING_METHODS.has(request.method.toUpperCase())) return;

  const origin = request.headers.get("origin");
  if (!origin) throw new CsrfError();

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    throw new CsrfError();
  }

  const { appOrigin } = getServerEnv();
  if (originUrl.origin !== appOrigin.origin) throw new CsrfError();
}
