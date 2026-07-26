/**
 * Web E2E — account self-deletion (GDPR right to erasure) — auth layer.
 *
 * Tests that the DELETE /api/members/me endpoint correctly requires auth.
 * The full deletion flow (PII scrub, cascade) is covered by the API test suite
 * (api/happy/self_delete.test.ts and api/audit/B3_gdpr_deletion_pii_scrub.test.ts).
 *
 * Tests:
 *   1. DELETE /api/members/me without auth → 401.
 *   2. DELETE /api/members/me with a malformed Bearer → 401.
 *   3. GET  /api/members/me without auth → 401.
 */

import { test, expect } from "@playwright/test";

const API = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8080";

test.describe("Account self-deletion — API auth layer", () => {
  test("DELETE /api/members/me without Bearer → 401", async ({ request }) => {
    const res = await request.delete(`${API}/api/members/me`);
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/members/me with malformed Bearer → 401", async ({ request }) => {
    const res = await request.delete(`${API}/api/members/me`, {
      headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiJ9.garbage.sig" },
    });
    expect(res.status()).toBe(401);
  });

  test("GET /api/members/me without auth → 401", async ({ request }) => {
    const res = await request.get(`${API}/api/members/me`);
    expect(res.status()).toBe(401);
  });
});
