/**
 * Vitest globalSetup — runs once in the MAIN process before any workers start.
 *
 * Responsibilities:
 *  1. DB safety guard — abort if the resolved test DB name is not obviously a
 *     test database (must match /_test$/ or === 'p3_test') AND must differ from
 *     the production DB name.
 *  2. Create the p3_test database if it does not yet exist.
 *  3. Push the Drizzle schema via `drizzle-kit push --force` (the project uses
 *     schema-push, not migrate — only one partial migration file exists).
 *  4. Export DATABASE_URL_TEST + DATABASE_URL_PROD env vars for the workers.
 */

import pg from "pg";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEST_DB_NAME = "p3_test";

function buildTestUrl(prodUrl: string): string {
  const u = new URL(prodUrl);
  u.pathname = `/${TEST_DB_NAME}`;
  return u.toString();
}

function buildMaintenanceUrl(prodUrl: string): string {
  const u = new URL(prodUrl);
  u.pathname = "/postgres";
  return u.toString();
}

function extractDbName(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}

function assertTestDbName(dbName: string, prodDbName: string): void {
  if (!/^p3_test$/.test(dbName) && !/_test$/.test(dbName)) {
    throw new Error(
      `\n\n🛑  TEST SUITE ABORTED\n` +
        `DATABASE_URL_TEST points to '${dbName}'.\n` +
        `Test databases must be named 'p3_test' or match /_test$/.\n` +
        `Fix DATABASE_URL or DATABASE_URL_TEST before running tests.\n`,
    );
  }
  if (prodDbName && dbName === prodDbName) {
    throw new Error(
      `\n\n🛑  TEST SUITE ABORTED\n` +
        `DATABASE_URL_TEST ('${dbName}') is the SAME database as production.\n` +
        `Running tests would destroy production data. Aborting.\n`,
    );
  }
}

export async function setup(): Promise<void> {
  const prodUrl = process.env.DATABASE_URL;
  if (!prodUrl) {
    throw new Error("DATABASE_URL is not set — cannot derive test database URL.");
  }

  const prodDbName = extractDbName(prodUrl);
  const testDbUrl  = buildTestUrl(prodUrl);
  const testDbName = extractDbName(testDbUrl);

  // ── Safety guard ──────────────────────────────────────────────────────────
  assertTestDbName(testDbName, prodDbName);

  // ── Create p3_test if it doesn't exist ────────────────────────────────────
  const maintClient = new Client({ connectionString: buildMaintenanceUrl(prodUrl) });
  try {
    await maintClient.connect();
    const { rows } = await maintClient.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [TEST_DB_NAME],
    );
    if (rows.length === 0) {
      await maintClient.query(`CREATE DATABASE ${TEST_DB_NAME}`);
      console.log(`[globalSetup] Created database '${TEST_DB_NAME}'.`);
    }
  } finally {
    await maintClient.end().catch(() => {});
  }

  // ── Push schema via drizzle-kit push --force ──────────────────────────────
  // The project uses schema-push (drizzle-kit push) — there is only one
  // partial migration file that doesn't include later tables (claim_codes, etc).
  // We run `drizzle-kit push --force` from the lib/db package directory.
  const libDbDir = path.resolve(__dirname, "../../lib/db");
  try {
    execSync(
      `pnpm drizzle-kit push --force --config ./drizzle.config.ts`,
      {
        cwd: libDbDir,
        env: { ...process.env, DATABASE_URL: testDbUrl },
        stdio: "pipe",
      },
    );
    console.log("[globalSetup] Schema pushed to test database via drizzle-kit.");
  } catch (err: unknown) {
    const e = err as { stderr?: Buffer; stdout?: Buffer; message?: string };
    const detail = (e.stderr?.toString() ?? e.stdout?.toString() ?? String(e)).slice(0, 1000);
    throw new Error(`[globalSetup] drizzle-kit push failed:\n${detail}`);
  }

  // ── Export env vars to worker processes ───────────────────────────────────
  process.env.DATABASE_URL_TEST = testDbUrl;
  process.env.DATABASE_URL_PROD = prodUrl;

  console.log(`[globalSetup] Test DB ready: ${TEST_DB_NAME}`);
}

export async function teardown(): Promise<void> {
  // Keep p3_test between runs — re-running push is fast and idempotent.
}
