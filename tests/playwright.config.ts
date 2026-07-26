/**
 * Playwright configuration for P³ web E2E tests.
 *
 * The web app runs on port 24308 (managed by the Replit workflow).
 * The API server runs on port 8080.
 *
 * Tests run against the already-running dev servers — no webServer stanza
 * needed here because both servers are managed by Replit workflows.
 *
 * Override the base URL with:
 *   PLAYWRIGHT_BASE_URL=http://localhost:24308 pnpm test:web
 */

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:24308";
const API_URL  = process.env.PLAYWRIGHT_API_URL  ?? "http://localhost:8080";

export default defineConfig({
  testDir:   "./web",
  outputDir: "./.playwright-results",
  globalSetup: "./setup/playwrightGlobalSetup.ts",

  // Run each spec file serially (registration creates real DB rows)
  fullyParallel: false,
  workers: 1,

  // Retry once on CI to avoid flaky failures from animation timing
  retries: process.env.CI ? 1 : 0,

  reporter: [["list"], ["html", { open: "never", outputFolder: ".playwright-report" }]],

  use: {
    baseURL:         BASE_URL,
    // All API calls go through the same origin as the app (Vite proxy) — no
    // need to set extraHTTPHeaders; the app itself proxies /api → port 8080.
    actionTimeout:   10_000,
    navigationTimeout: 15_000,
    screenshot:      "only-on-failure",
    video:           "retain-on-failure",
    trace:           "retain-on-failure",

    // LD_LIBRARY_PATH is set by playwrightGlobalSetup.ts before browsers launch
  },

  projects: [
    {
      name:  "chromium",
      use:   { ...devices["Desktop Chrome"] },
    },
  ],
});

// Export for use in tests
export { BASE_URL, API_URL };
