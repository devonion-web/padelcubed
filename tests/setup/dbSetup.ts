/**
 * Vitest setupFiles — runs in every worker BEFORE any test file is imported.
 *
 * 1. Re-asserts the DB safety guard (belt-and-braces in case env was altered).
 * 2. Overrides DATABASE_URL to point at the test database.
 * 3. Sets default test-only env vars (SESSION_SECRET, etc.) if not already set.
 *
 * This file must set DATABASE_URL BEFORE any test file is evaluated,
 * because @workspace/db reads it at module-import time.
 */

// ── DB safety guard (re-check in worker) ─────────────────────────────────────

const testDbUrl  = process.env.DATABASE_URL_TEST;
const prodDbUrl  = process.env.DATABASE_URL_PROD ?? process.env.DATABASE_URL ?? "";

if (!testDbUrl) {
  throw new Error(
    "TEST ABORT: DATABASE_URL_TEST is not set.\n" +
      "This means globalSetup did not run or the env var was lost between processes.\n" +
      "Run tests via `pnpm --filter @workspace/tests run test:api`.",
  );
}

function extractDbName(url: string): string {
  try { return new URL(url).pathname.replace(/^\//, ""); } catch { return ""; }
}

const testDbName = extractDbName(testDbUrl);
const prodDbName = extractDbName(prodDbUrl);

if (!/^p3_test$/.test(testDbName) && !/_test$/.test(testDbName)) {
  throw new Error(
    `TEST ABORT: DATABASE_URL_TEST points to '${testDbName}', which is not a test database.\n` +
      `Test databases must be named 'p3_test' or match /_test$/.`,
  );
}

if (prodDbName && testDbName === prodDbName) {
  throw new Error(
    `TEST ABORT: DATABASE_URL_TEST ('${testDbName}') === production DB name.\n` +
      `Tests would destroy production data. Aborting.`,
  );
}

// ── Override DATABASE_URL → test DB ──────────────────────────────────────────
// Must happen BEFORE any module that imports @workspace/db is evaluated.
process.env.DATABASE_URL = testDbUrl;

// ── Default test-only secrets ─────────────────────────────────────────────────
// These allow the JWT helpers to work without real secrets configured.
// Never use these values in production.
process.env.SESSION_SECRET         ??= "p3-test-secret-do-not-use-in-production-0000";
process.env.STRIPE_WEBHOOK_SECRET  ??= "whsec_test_placeholder_for_tests_only";
process.env.WEBHOOK_SECRET         ??= "test-webhook-secret";
// Do NOT set WEBHOOK_URL here — tests that need it set it themselves
// Do NOT set RESEND_API_KEY — emails fire-and-forget so test failures are silent
