import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL: "http://127.0.0.1:3101", ...devices["Desktop Chrome"] },
  webServer: { command: "pnpm exec next dev -p 3101", url: "http://127.0.0.1:3101", reuseExistingServer: false, timeout: 120_000 },
});
