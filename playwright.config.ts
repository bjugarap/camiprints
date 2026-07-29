import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: {
    command: "npm run dev -- --port 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      // The AI path runs against the mock vendor adapter: the full
      // production pipeline (create → poll → validate → download) with no
      // cost, network, or key. There is no mock-only client code.
      AI_PROVIDER: "mock",
      AI_LIMIT_ANON_PER_DAY: "1000",
      NEXT_PUBLIC_AI_ENABLED: "true",
      NEXT_PUBLIC_LOCAL_ENABLED: "true",
      NEXT_PUBLIC_LOCAL_DEFAULT: "false",
      NEXT_PUBLIC_POLL_INTERVAL_MS: "500",
    },
  },
});
