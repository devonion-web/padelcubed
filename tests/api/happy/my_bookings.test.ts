/**
 * Happy path — GET /api/my-bookings.
 *
 * Covers:
 *  - Auth required (401 without token)
 *  - Shows only the signed-in member's own bookings (not other members')
 *  - Returns confirmed bookings by memberId AND by email (legacy fallback)
 *  - Does NOT return cancelled bookings
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app.js";
import { db, bookingsTable } from "@workspace/db";
import {
  truncateAll, seedMember, seedEvent, seedBooking, mintMemberJwt,
} from "../../setup/seed.js";

const CLIENT_IP = "10.0.2.3";
const get = (path: string) =>
  request(app).get(path).set("X-Forwarded-For", CLIENT_IP);

let memberAId:    number;
let memberAEmail: string;
let memberAToken: string;
let memberBId:    number;
let memberBToken: string;
let eventId:      string;

beforeAll(async () => {
  await truncateAll();

  const mA = await seedMember({ email: "mb-member-a@p3.test" });
  const mB = await seedMember({ email: "mb-member-b@p3.test" });
  memberAId    = mA.id;
  memberAEmail = mA.email;
  memberAToken = mintMemberJwt({ sub: mA.id, email: mA.email });
  memberBId    = mB.id;
  memberBToken = mintMemberJwt({ sub: mB.id, email: mB.email });

  const ev = await seedEvent({ id: "mb-event-1" });
  eventId = ev.id;

  // Member A has a confirmed booking (linked by memberId)
  await seedBooking({ eventId, email: memberAEmail, memberId: memberAId, status: "confirmed" });

  // Member A also has a legacy booking linked only by email
  const ev2 = await seedEvent({ id: "mb-event-2" });
  await seedBooking({ eventId: ev2.id, email: memberAEmail, memberId: null as unknown as number, status: "confirmed" });

  // Member B has a booking — should NOT appear for member A
  const ev3 = await seedEvent({ id: "mb-event-3" });
  await seedBooking({ eventId: ev3.id, email: mB.email, memberId: memberBId, status: "confirmed" });

  // Cancelled booking for member A — should NOT appear
  const ev4 = await seedEvent({ id: "mb-event-4" });
  await seedBooking({ eventId: ev4.id, email: memberAEmail, memberId: memberAId, status: "cancelled" });
});

afterAll(() => truncateAll());

describe("GET /api/my-bookings", () => {
  it("no auth → 401", async () => {
    const res = await get("/api/my-bookings");
    expect(res.status).toBe(401);
  });

  it("member JWT → 200 with array of bookings", async () => {
    const res = await get("/api/my-bookings")
      .set("Authorization", `Bearer ${memberAToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("returns booking linked by memberId", async () => {
    const res = await get("/api/my-bookings")
      .set("Authorization", `Bearer ${memberAToken}`);
    const ids = (res.body as any[]).map((b) => b.eventId);
    expect(ids).toContain(eventId);
  });

  it("returns legacy booking linked by email only", async () => {
    const res = await get("/api/my-bookings")
      .set("Authorization", `Bearer ${memberAToken}`);
    const ids = (res.body as any[]).map((b) => b.eventId);
    expect(ids).toContain("mb-event-2");
  });

  it("does NOT return member B's bookings when called as member A", async () => {
    const res = await get("/api/my-bookings")
      .set("Authorization", `Bearer ${memberAToken}`);
    const ids = (res.body as any[]).map((b) => b.eventId);
    expect(ids).not.toContain("mb-event-3");
  });

  it("does NOT return cancelled bookings", async () => {
    const res = await get("/api/my-bookings")
      .set("Authorization", `Bearer ${memberAToken}`);
    const ids = (res.body as any[]).map((b) => b.eventId);
    expect(ids).not.toContain("mb-event-4");
  });

  it("member B sees only their own bookings", async () => {
    const res = await get("/api/my-bookings")
      .set("Authorization", `Bearer ${memberBToken}`);
    const ids = (res.body as any[]).map((b) => b.eventId);
    expect(ids).toContain("mb-event-3");
    expect(ids).not.toContain(eventId);
  });

  it("response shape includes required booking fields", async () => {
    const res = await get("/api/my-bookings")
      .set("Authorization", `Bearer ${memberAToken}`);
    const booking = (res.body as any[])[0];
    expect(booking).toHaveProperty("id");
    expect(booking).toHaveProperty("eventId");
    expect(booking).toHaveProperty("status");
    expect(booking).toHaveProperty("paymentStatus");
    expect(booking).toHaveProperty("bookedAt");
  });
});
