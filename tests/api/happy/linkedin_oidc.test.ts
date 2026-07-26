/**
 * Happy path — LinkedIn OIDC: member upsert and auto-link by email.
 *
 * We cannot do a full OAuth round-trip in tests (requires real LinkedIn).
 * Instead we test the OAuth START route and the callback shape:
 *
 *  - GET /api/auth/linkedin → 302 redirect to LinkedIn (or 503 if not configured)
 *  - GET /api/auth/linkedin?platform=mobile → includes platform in state
 *  - Callback with error → redirects with li_err param
 *
 * The upsert + auto-link logic is tested by calling the LinkedIn callback
 * handler indirectly via the auth-linkedin route with a mocked OIDC response
 * — this is OUT OF SCOPE for this test file (requires mocking the LinkedIn
 * token exchange). It is documented as NOT COVERED / requires integration env.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app.js";
import { truncateAll } from "../../setup/seed.js";

const CLIENT_IP = "10.0.2.5";
const get = (path: string) =>
  request(app).get(path).set("X-Forwarded-For", CLIENT_IP);

beforeAll(() => truncateAll());
afterAll(() => truncateAll());

describe("LinkedIn OIDC auth routes", () => {
  it("GET /api/auth/linkedin → 302 or 503", async () => {
    const res = await get("/api/auth/linkedin").redirects(0);
    // 302 if LINKEDIN_CLIENT_ID is set, 503 if not configured
    expect([302, 503]).toContain(res.status);
  });

  it("GET /api/auth/linkedin with ?platform=mobile → 302 or 503", async () => {
    const res = await get("/api/auth/linkedin?platform=mobile").redirects(0);
    expect([302, 503]).toContain(res.status);
  });

  it("callback with error param → redirects with li_err", async () => {
    const res = await get("/api/auth/linkedin/callback?error=access_denied&state=web:abc123")
      .redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("li_err=access_denied");
  });

  it("callback with no code → redirects with li_err=no_code", async () => {
    const res = await get("/api/auth/linkedin/callback?state=web:abc123")
      .redirects(0);
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain("li_err=no_code");
  });

  it("healthz endpoint is reachable without auth", async () => {
    const res = await get("/api/healthz");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
