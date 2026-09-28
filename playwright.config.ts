import { defineConfig, devices } from "@playwright/test";

// Must match APP_ORIGIN in .env.local: the BFF rejects state-changing requests whose
// Origin does not match, so a 127.0.0.1 baseURL would make every login/register 401.
const APP_URL = "http://localhost:3001";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: APP_URL, ...devices["Desktop Chrome"] },
  webServer: {
    command: "pnpm dev",
    url: APP_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
