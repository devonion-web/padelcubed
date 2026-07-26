/**
 * B2 — Booking endpoint auth and paid-event guard.
 *
 * - Unauthenticated POST /events/:id/bookings → 401
 * - Admin + paid event → 400, zero rows created
 * - Admin + free event → 201 confirmed booking
 * - Unauthenticated DELETE /events/:id/bookings → 401
 *
 * Note: POST /events/:id/bookings is admin-only (requireAdmin).
 *       The public booking path is POST /events/:id/checkout (optionalMember).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { and, eq } from "drizzle-orm";
import app from "../../../artifacts/api-server/src/app.js";
import { db, bookingsTable } from "@workspace/db";
import { mintAdminJwt, truncateAll, seedEvent } from "../../setup/seed.js";

const CLIENT_IP = "10.0.1.2";
const api = (method: "get" | "post" | "delete") =>
  (path: string) => (request(app) as any)[method](path).set("X-Forwarded-For", CLIENT_IP);

let adminToken: string;

beforeAll(async () => {
  await truncateAll();
  // Free event
  await seedEvent({ id: "b2-free", pricePence: 0 });
  // Paid event (£10)
  await seedEvent({ id: "b2-paid", pricePence: 1000, price: "£10" });
  adminToken = mintAdminJwt();
});

afterAll(async () => {
  await truncateAll();
});

describe("B2 — booking auth and paid-event guard", () => {
  // ── Unauthenticated POST → 401 ─────────────────────────────────────────────
  it("unauthenticated POST /events/:id/bookings → 401", async () => {
    const res = await api("post")("/api/events/b2-free/bookings")
      .send({ email: "anon@p3.test", fullName: "Anon" });
    expect(res.status).toBe(401);
  });

  // ── Admin + paid event → 400, no rows created ──────────────────────────────
  it("admin JWT + paid event → 400", async () => {
    const res = await api("post")("/api/events/b2-paid/bookings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "admin@p3.test", fullName: "Admin" });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/paid event/i);
  });

  it("admin JWT + paid event → zero booking rows created", async () => {
    const rows = await db
      .select()
      .from(bookingsTable)
      .where(
        and(eq(bookingsTable.eventId, "b2-paid"), eq(bookingsTable.email, "admin@p3.test")),
      );
    expect(rows).toHaveLength(0);
  });

  // ── Admin + free event → 201 confirmed ────────────────────────────────────
  it("admin JWT + free event → 201 confirmed booking", async () => {
    const res = await api("post")("/api/events/b2-free/bookings")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ email: "gooduser@p3.test", fullName: "Good User", company: "ACME" });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe("confirmed");
    expect(res.body.eventId).toBe("b2-free");
  });

  // ── Public checkout — free event → 201 (via /checkout, no auth required) ──
  it("unauthenticated POST /events/:id/checkout on free event → 201", async () => {
    const res = await api("post")("/api/events/b2-free/checkout")
      .send({ email: "public@p3.test", fullName: "Public User" });
    expect(res.status).toBe(201);
    expect(res.body.booked).toBe(true);
  });

  // ── Unauthenticated DELETE → 401 ───────────────────────────────────────────
  it("unauthenticated DELETE /events/:id/bookings → 401", async () => {
    const res = await api("delete")("/api/events/b2-free/bookings")
      .send({ email: "gooduser@p3.test" });
    expect(res.status).toBe(401);
  });

  // ── Confirm the confirmed booking exists in DB ────────────────────────────
  it("confirmed booking is stored in the database", async () => {
    const [row] = await db
      .select()
      .from(bookingsTable)
      .where(
        and(eq(bookingsTable.eventId, "b2-free"), eq(bookingsTable.email, "gooduser@p3.test")),
      );
    expect(row).toBeDefined();
    expect(row!.status).toBe("confirmed");
    expect(row!.paymentStatus).toBe("free");
  });
});
