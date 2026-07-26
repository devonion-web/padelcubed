/**
 * Playwright configuration for P³ web E2E tests.
 *
 * Server strategy
 * ───────────────
 * On Replit  — both servers are managed by Replit workflows and are already
 *              running; no webServer stanza is used.
 * On CI      — process.env.CI is set by GitHub Actions; the webServer array
 *              boots the API server (port 8080) and the Vite dev server
 *              (port 24308), waits for each to pass a health probe, then shuts
 *              them down after the run.
 *
 * Override base URL / API URL with env vars:
 *   PLAYWRIGHT_BASE_URL=http://localhost:24308 pnpm test:web
 */

import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:24308";
const API_URL  = process.env.PLAYWRIGHT_API_URL  ?? "http://localhost:8080";

export default defineConfig({
  testDir:   "./web",
  outputDir: "./.playwright-results",
  globalSetup: "./setup/playwrightGlobalSetup.ts",

  // Run each spec file serially (some tests interact with the real API)
  fullyParallel: false,
  workers: 1,

  // Retry once on CI to smooth over animation-timing flakes
  retries: process.env.CI ? 1 : 0,

  reporter: [["list"], ["html", { open: "never", outputFolder: ".playwright-report" }]],

  use: {
    baseURL:           BASE_URL,
    actionTimeout:     10_000,
    navigationTimeout: 15_000,
    screenshot:        "only-on-failure",
    video:             "retain-on-failure",
    trace:             "retain-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use:  { ...devices["Desktop Chrome"] },
    },
  ],

  // ── CI server boot ──────────────────────────────────────────────────────────
  // On GitHub Actions (process.env.CI) both servers are started here.
  // On Replit the webServer key is undefined — Replit workflow-managed servers
  // are already listening and reuseExistingServer would be irrelevant.
  //
  // Environment notes for each server:
  //   API server  — PORT, DATABASE_URL, SESSION_SECRET, RESEND_API_KEY are
  //                 inherited from the job's env block automatically.
  //                 We only need to ADD PORT and NODE_ENV here.
  //   Vite server — BASE_PATH is required at vite.config.ts module top-level.
  //                 On CI there is no Replit path prefix so base = "/".
  //                 The Vite proxy (/api → localhost:8080) works as-is.
  webServer: process.env.CI
    ? [
        {
          command:              "pnpm --filter @workspace/api-server run dev",
          url:                  "http://localhost:8080/api/healthz",
          timeout:              120_000,
          reuseExistingServer:  false,
          env: { PORT: "8080", NODE_ENV: "test" },
        },
        {
          command:              "pnpm --filter @workspace/padel-exchange run dev",
          url:                  "http://localhost:24308/",
          timeout:              120_000,
          reuseExistingServer:  false,
          // BASE_PATH is read at vite.config.ts module load — must be set.
          // On CI, no Replit path prefix; the app is served at the root "/".
          env: { PORT: "24308", BASE_PATH: "/", NODE_ENV: "development" },
        },
      ]
    : undefined,
});

// Export for use in tests
export { BASE_URL, API_URL };
