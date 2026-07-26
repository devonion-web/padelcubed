/**
 * Web E2E — /api/my-bookings authentication guard (browser layer).
 *
 * These tests use Playwright's request API (not a headless browser page) to
 * verify that the API correctly rejects unauthenticated requests for
 * member-specific data — confirming the auth guard is wired end-to-end.
 *
 * Tests:
 *   1. GET /api/my-bookings without Bearer → 401.
 *   2. GET /api/my-bookings with a malformed Bearer → 401.
 *   3. DELETE /api/members/me without Bearer → 401.
 *   4. GET /api/members/me without Bearer → 401.
 */

import { test, expect } from "@playwright/test";

const API = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8080";

test.describe("Member auth guard (browser → API)", () => {
  test("GET /api/my-bookings without auth → 401", async ({ request }) => {
    const res = await request.get(`${API}/api/my-bookings`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/my-bookings with malformed Bearer → 401", async ({ request }) => {
    const res = await request.get(`${API}/api/my-bookings`, {
      headers: { Authorization: "Bearer this.is.garbage" },
    });
    expect(res.status()).toBe(401);
  });

  test("DELETE /api/members/me without auth → 401", async ({ request }) => {
    const res = await request.delete(`${API}/api/members/me`);
    expect(res.status()).toBe(401);
  });

  test("GET /api/members/me without auth → 401", async ({ request }) => {
    const res = await request.get(`${API}/api/members/me`);
    expect(res.status()).toBe(401);
  });
});
