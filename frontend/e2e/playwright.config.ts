import { defineConfig, devices } from "@playwright/test";

// End-to-end specs against a running stack (Tilt locally, kind + helm in CI). The web app
// is the Vite dev server; it proxies the API, and sign-in goes through Keycloak's own page.
const webPort = process.env.WEB_PORT ?? "5173";
const ci = !!process.env.CI;

export default defineConfig({
  testDir: ".",
  testMatch: "*.spec.ts",
  outputDir: "test-results",
  // The specs share the dev users, so run them one at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: ci
    ? [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${webPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
