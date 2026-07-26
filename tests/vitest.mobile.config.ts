import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals:     true,
    environment: "node",
    // Mobile / static tests do not touch the DB; no special setup needed
    include:     ["mobile/**/*.test.ts"],
    testTimeout: 15_000,
  },
});
