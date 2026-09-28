import "server-only";

type ServerEnv = {
  nestApiUrl: URL;
  redisUrl: URL;
  appOrigin: URL;
  sessionCookieSecret: string;
};

function required(name: string, value: string | undefined): string {
  if (!value || value.startsWith("<")) throw new Error(`Missing server environment variable: ${name}`);
  return value;
}

function parseUrl(name: string, value: string, protocols: string[]): URL {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error(`Invalid URL in ${name}`); }
  if (!protocols.includes(parsed.protocol)) throw new Error(`Invalid protocol in ${name}`);
  return parsed;
}

export function validateServerEnv(values: NodeJS.ProcessEnv): ServerEnv {
  const nestApiUrl = parseUrl("NEST_API_URL", required("NEST_API_URL", values.NEST_API_URL), ["http:", "https:"]);
  const redisUrl = parseUrl("REDIS_URL", required("REDIS_URL", values.REDIS_URL), ["redis:", "rediss:"]);
  const appOrigin = parseUrl("APP_ORIGIN", required("APP_ORIGIN", values.APP_ORIGIN), ["http:", "https:"]);
  const sessionCookieSecret = required("SESSION_COOKIE_SECRET", values.SESSION_COOKIE_SECRET);
  if (sessionCookieSecret.length < 32) throw new Error("SESSION_COOKIE_SECRET must have at least 32 characters");
  if (values.NODE_ENV === "production" && appOrigin.protocol !== "https:" && !allowInsecureOrigin(values)) {
    throw new Error("APP_ORIGIN must use HTTPS in production");
  }
  return { nestApiUrl, redisUrl, appOrigin, sessionCookieSecret };
}

/**
 * Local-verification escape hatch for the HTTPS guard above. The E2E suite runs the real
 * production build over plain HTTP, so without this every private page 500s. It has to be
 * set deliberately, and never belongs in a deployed environment.
 */
function allowInsecureOrigin(values: NodeJS.ProcessEnv): boolean {
  return values.APP_ALLOW_INSECURE_ORIGIN === "true";
}

export function getServerEnv(): ServerEnv {
  return validateServerEnv(process.env);
}
