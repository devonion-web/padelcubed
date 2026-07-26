import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals:      true,
    environment:  "node",

    // ── DB + env bootstrap ────────────────────────────────────────────
    // globalSetup: creates p3_test DB, runs migrations
    // setupFiles:  DB safety guard, overrides DATABASE_URL → test DB
    globalSetup: ["./setup/globalSetup.ts"],
    setupFiles:  ["./setup/dbSetup.ts"],

    // ── Parallelism: single worker, sequential files ──────────────────
    // Rationale: supertest shares one in-process DB connection pool and
    // one express-rate-limit MemoryStore; races between concurrent files
    // would cause flaky results. singleFork + concurrent:false gives us
    // full isolation without per-worker schema gymnastics.
    pool: "forks",
    poolOptions: {
      forks: { singleFork: true },
    },
    sequence: { concurrent: false },

    include:     ["api/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
