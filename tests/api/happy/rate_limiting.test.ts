/**
 * Happy path — Rate limiting.
 *
 * Tests that rate-limiting headers are present and that the limiters enforce
 * their caps. Each test uses a unique X-Forwarded-For address (trust proxy=1)
 * so buckets don't spill over from other test files.
 *
 * Registration limiter:  20 / 15 min per IP
 * Admin login limiter:   10 / 15 min per IP
 * Claim limiter:          5 / 15 min per IP
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app.js";
import { truncateAll, mintMemberJwt, seedMember } from "../../setup/seed.js";

// Unique IPs so rate-limit buckets are isolated from every other test file
const IP_REG   = "10.0.3.1";
const IP_LOGIN = "10.0.3.2";
const IP_CLAIM = "10.0.3.3";

beforeAll(() => truncateAll());
afterAll(() => truncateAll());

describe("Rate limiting", () => {
  // ── Registration limiter: standard headers present ───────────────────────
  it("POST /registrations response includes RateLimit headers", async () => {
    const res = await request(app)
      .post("/api/registrations")
      .set("X-Forwarded-For", IP_REG)
      .send({
        fullName: "Rate Test", email: `rate-hdr-${Date.now()}@p3.test`,
        gdprConsent: true,
      });
    // 201 or 400 (validation) — either way headers should be present
    expect(res.headers).toHaveProperty("ratelimit-limit");
    expect(res.headers).toHaveProperty("ratelimit-remaining");
  });

  // ── Registration limiter cap: 21st request from same IP → 429 ────────────
  it("21st registration attempt from same IP → 429", async () => {
    let lastStatus = 0;
    for (let i = 0; i < 21; i++) {
      const res = await request(app)
        .post("/api/registrations")
        .set("X-Forwarded-For", IP_REG)
        .send({
          fullName: `Flood ${i}`, email: `flood-${i}@p3.test`, gdprConsent: true,
        });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  // ── Admin login limiter headers ───────────────────────────────────────────
  it("POST /admin/auth/login includes RateLimit headers", async () => {
    const res = await request(app)
      .post("/api/admin/auth/login")
      .set("X-Forwarded-For", IP_LOGIN)
      .send({ email: "nobody@p3.test", password: "wrong" });
    expect([401, 400, 429]).toContain(res.status);
    expect(res.headers).toHaveProperty("ratelimit-limit");
  });

  // ── Admin login limiter cap: 11th attempt → 429 ──────────────────────────
  it("11th admin login attempt from same IP → 429", async () => {
    let lastStatus = 0;
    for (let i = 0; i < 11; i++) {
      const res = await request(app)
        .post("/api/admin/auth/login")
        .set("X-Forwarded-For", IP_LOGIN)
        .send({ email: `flood${i}@p3.test`, password: "bad" });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  // ── Claim limiter cap: 6th attempt from same IP → 429 ───────────────────
  // (claimLimiter does not send standardHeaders, so we test enforcement only)
  it("6th claim-registration attempt from same IP → 429", async () => {
    const m = await seedMember({ email: `claim-rl-${Date.now()}@p3.test` });
    const token = mintMemberJwt({ sub: m.id, email: m.email });
    let lastStatus = 0;
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post("/api/members/claim-registration")
        .set("X-Forwarded-For", IP_CLAIM)
        .set("Authorization", `Bearer ${token}`)
        .send({ email: `nobody${i}@p3.test` });
      lastStatus = res.status;
    }
    expect(lastStatus).toBe(429);
  });

  // ── Trust proxy: X-Forwarded-For is respected ─────────────────────────────
  it("different IPs get separate rate-limit buckets", async () => {
    // Exhaust IP_REG (already done above); a fresh IP should still get 200/201
    const res = await request(app)
      .post("/api/registrations")
      .set("X-Forwarded-For", "10.0.3.99") // fresh IP
      .send({ fullName: "Fresh IP", email: `fresh-ip-${Date.now()}@p3.test`, gdprConsent: true });
    expect([201, 400]).toContain(res.status); // not 429
    expect(res.status).not.toBe(429);
  });
});
