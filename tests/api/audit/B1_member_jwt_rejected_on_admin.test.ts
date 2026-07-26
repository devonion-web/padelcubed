/**
 * B1 — Member JWT (iss:'p3-member') must be rejected on every admin route.
 *      Admin JWT must be accepted.
 *
 * Audit finding: a member token signed with the same SESSION_SECRET must not
 * grant access to admin endpoints; the iss claim check is the guard.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app.js";
import { mintAdminJwt, mintMemberJwt, truncateAll, seedEvent } from "../../setup/seed.js";

// Unique virtual IP so rate-limit buckets don't bleed from other test files
const CLIENT_IP = "10.0.1.1";
const req = (method: "get" | "post" | "put") =>
  (path: string) => (request(app) as any)[method](path).set("X-Forwarded-For", CLIENT_IP);

let adminToken: string;
let memberToken: string;

beforeAll(async () => {
  await truncateAll();
  await seedEvent({ id: "b1-event" });
  adminToken  = mintAdminJwt();
  memberToken = mintMemberJwt();
});

afterAll(async () => {
  await truncateAll();
});

describe("B1 — member JWT rejected on admin routes", () => {
  // ── GET /api/admin/insights ────────────────────────────────────────────────
  it("member JWT → 401 on GET /admin/insights", async () => {
    const res = await req("get")("/api/admin/insights")
      .set("Authorization", `Bearer ${memberToken}`);
    expect(res.status).toBe(401);
  });

  it("no token → 401 on GET /admin/insights", async () => {
    const res = await req("get")("/api/admin/insights");
    expect(res.status).toBe(401);
  });

  it("admin JWT → 200 on GET /admin/insights", async () => {
    const res = await req("get")("/api/admin/insights")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  // ── GET /api/admin/events ──────────────────────────────────────────────────
  it("member JWT → 401 on GET /admin/events", async () => {
    const res = await req("get")("/api/admin/events")
      .set("Authorization", `Bearer ${memberToken}`);
    expect(res.status).toBe(401);
  });

  it("admin JWT → 200 on GET /admin/events", async () => {
    const res = await req("get")("/api/admin/events")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  // ── GET /api/admin/events/:id/bookings ─────────────────────────────────────
  it("member JWT → 401 on GET /admin/events/:id/bookings", async () => {
    const res = await req("get")("/api/admin/events/b1-event/bookings")
      .set("Authorization", `Bearer ${memberToken}`);
    expect(res.status).toBe(401);
  });

  it("admin JWT → 200 on GET /admin/events/:id/bookings", async () => {
    const res = await req("get")("/api/admin/events/b1-event/bookings")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
  });

  // ── POST /api/admin/events ─────────────────────────────────────────────────
  it("member JWT → 401 on POST /admin/events", async () => {
    const res = await req("post")("/api/admin/events")
      .set("Authorization", `Bearer ${memberToken}`)
      .send({ title: "Hack", date: "x", dateShort: "x", time: "x", venue: "x", location: "x" });
    expect(res.status).toBe(401);
  });

  // ── Explicit iss check: crafted payload without iss field ──────────────────
  it("JWT without iss field → 401 on admin routes", async () => {
    const jwt = await import("jsonwebtoken");
    const noIssToken = jwt.default.sign(
      { sub: 1, email: "hacker@evil.com", name: "Hacker", role: "admin" },
      process.env.SESSION_SECRET!,
      { expiresIn: "1h" },
    );
    const res = await req("get")("/api/admin/insights")
      .set("Authorization", `Bearer ${noIssToken}`);
    expect(res.status).toBe(401);
  });

  // ── Expired admin token → 401 ──────────────────────────────────────────────
  it("expired admin JWT → 401 on admin routes", async () => {
    const jwt = await import("jsonwebtoken");
    const expiredToken = jwt.default.sign(
      { iss: "p3-admin", sub: 1, email: "admin@p3.test", name: "Admin", role: "admin" },
      process.env.SESSION_SECRET!,
      { expiresIn: -1 }, // already expired
    );
    const res = await req("get")("/api/admin/insights")
      .set("Authorization", `Bearer ${expiredToken}`);
    expect(res.status).toBe(401);
  });
});
