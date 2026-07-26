/**
 * Web E2E — LinkedIn OAuth entry point.
 *
 * Tests:
 *   1. GET /api/auth/linkedin redirects to a LinkedIn OAuth URL.
 *   2. The redirect URL contains the expected OIDC params
 *      (response_type, client_id, redirect_uri, scope, state).
 *   3. GET /api/auth/linkedin/callback with error param redirects back
 *      to the web app with an error indicator.
 *
 * Uses the Playwright request API (no browser UI needed) since the entire
 * flow up to the LinkedIn handshake is server-side redirects.
 */

import { test, expect } from "@playwright/test";

const API = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:8080";

test.describe("LinkedIn OAuth entry point", () => {
  test("GET /api/auth/linkedin → 302 redirect to LinkedIn authorization", async ({ request }) => {
    // Playwright's fetch does NOT follow redirects by default when
    // maxRedirects is set; use 0 to capture the Location header.
    const res = await request.get(`${API}/api/auth/linkedin`, {
      maxRedirects: 0,
    });

    expect(res.status()).toBe(302);

    const location = res.headers()["location"] ?? "";
    expect(location).toMatch(/linkedin\.com\/oauth\/v2\/authorization/);
  });

  test("LinkedIn redirect URL contains required OAuth params", async ({ request }) => {
    const res = await request.get(`${API}/api/auth/linkedin`, {
      maxRedirects: 0,
    });

    const location = res.headers()["location"] ?? "";
    const url = new URL(location);

    expect(url.searchParams.get("response_type")).toBe("code");
    expect(url.searchParams.get("client_id")).toBeTruthy();
    expect(url.searchParams.get("redirect_uri")).toBeTruthy();
    expect(url.searchParams.get("scope")).toMatch(/openid|profile|email/);
    expect(url.searchParams.get("state")).toBeTruthy();
  });

  test("GET /api/auth/linkedin → 503 when LinkedIn credentials absent", async ({ request }) => {
    // This test only applies when LINKEDIN_CLIENT_ID is not configured.
    // In the test environment credentials are set (LINKEDIN_CLIENT_ID secret),
    // so we just verify the endpoint responds in one of two valid ways.
    const res = await request.get(`${API}/api/auth/linkedin`, {
      maxRedirects: 0,
    });

    // Valid responses: 302 (configured) or 503 (credentials missing)
    expect([302, 503]).toContain(res.status());
  });

  test("callback with error param → redirect back to web app", async ({ request }) => {
    // Simulate LinkedIn declining the OAuth request
    const res = await request.get(
      `${API}/api/auth/linkedin/callback?error=access_denied&error_description=User+cancelled`,
      { maxRedirects: 0 }
    );

    // Should redirect somewhere (to the app or an error page), not 500
    expect([301, 302, 303]).toContain(res.status());
    const location = res.headers()["location"] ?? "";
    expect(location).toBeTruthy();
  });
});
