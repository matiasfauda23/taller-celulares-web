import { defineConfig, devices } from "@playwright/test";

// Must match APP_ORIGIN in .env.local: the BFF rejects state-changing requests whose
// Origin does not match, so a 127.0.0.1 baseURL would make every login/register 401.
const APP_URL = "http://localhost:3001";

export default defineConfig({
  testDir: "./tests/e2e",
  // Several specs drive a full flow against the real API (register, seed, submit, archive), and
  // the dev server's late hydration can cost a retry, so the 30s default is too tight.
  timeout: 90_000,
  use: { baseURL: APP_URL, ...devices["Desktop Chrome"] },
  webServer: {
    // A production build, not `next dev`: the dev server hydrates slowly enough that a spec can
    // interact with a form before react-hook-form has attached its handlers, which silently drops
    // the interaction. `next start` also proves the build under test is the one that ships.
    command: "pnpm build && pnpm start:e2e",
    url: APP_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
  },
});
