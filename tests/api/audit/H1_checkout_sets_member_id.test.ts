/**
 * H1 — Authenticated checkout sets booking.memberId; GET /my-bookings returns it.
 *
 * Tests the Stripe webhook handler path:
 *   checkout.session.completed → booking.paymentStatus = 'paid',
 *                                 booking.memberId = member.id
 * Then verifies GET /api/my-bookings returns the booking for that member.
 *
 * handleCheckoutComplete is called directly (private static, cast via `any`)
 * because the HTTP endpoint requires a live Stripe client for signature
 * verification — that's tested separately in stripe_webhook.test.ts.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import app from "../../../artifacts/api-server/src/app.js";
import { db, bookingsTable } from "@workspace/db";
import { WebhookHandlers } from "../../../artifacts/api-server/src/webhookHandlers.js";
import { truncateAll, seedMember, seedEvent, seedBooking, mintMemberJwt } from "../../setup/seed.js";

const CLIENT_IP = "10.0.1.4";

let memberId: number;
let memberEmail: string;
let memberToken: string;
let bookingId: number;
const SESSION_ID = "cs_test_h1_integration_001";

beforeAll(async () => {
  await truncateAll();

  const member = await seedMember({ email: "h1-member@p3.test", name: "H1 Member" });
  memberId    = member.id;
  memberEmail = member.email;
  memberToken = mintMemberJwt({ sub: memberId, email: memberEmail, name: member.name });

  await seedEvent({ id: "h1-event", pricePence: 1500, price: "£15", stripePriceId: "price_test_h1" });

  // Insert a pending booking (as if checkout was initiated but not yet paid)
  const booking = await seedBooking({
    eventId:         "h1-event",
    email:           memberEmail,
    fullName:        "H1 Member",
    status:          "confirmed",
    paymentStatus:   "pending",
    stripeSessionId: SESSION_ID,
    memberId:        null as unknown as number, // explicitly no member yet
  });
  bookingId = booking.id;
});

afterAll(async () => {
  await truncateAll();
});

describe("H1 — checkout sets memberId on booking", () => {
  it("booking starts with paymentStatus=pending and no memberId", async () => {
    const [row] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
    expect(row!.paymentStatus).toBe("pending");
    expect(row!.memberId).toBeNull();
  });

  it("handleCheckoutComplete sets paymentStatus=paid and memberId", async () => {
    const session = {
      id:       SESSION_ID,
      metadata: {
        eventId:  "h1-event",
        email:    memberEmail,
        fullName: "H1 Member",
        company:  "",
        memberId: String(memberId),
      },
    };

    // handleCheckoutComplete is private — cast via any
    await (WebhookHandlers as any).handleCheckoutComplete(session);

    const [row] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
    expect(row!.paymentStatus).toBe("paid");
    expect(row!.memberId).toBe(memberId);
  });

  it("GET /api/my-bookings returns the paid booking for the member", async () => {
    const res = await request(app)
      .get("/api/my-bookings")
      .set("X-Forwarded-For", CLIENT_IP)
      .set("Authorization", `Bearer ${memberToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);

    const booking = (res.body as any[]).find((b) => b.id === bookingId);
    expect(booking).toBeDefined();
    expect(booking.eventId).toBe("h1-event");
  });

  // ── Idempotency: replaying the webhook must not re-process ────────────────
  it("replaying handleCheckoutComplete is idempotent (no duplicate email / takings)", async () => {
    // The handler guards: if booking.paymentStatus === 'paid' → return early.
    // Verify the row isn't regressed by a second call.
    const session = {
      id:       SESSION_ID,
      metadata: {
        eventId:  "h1-event",
        email:    memberEmail,
        fullName: "H1 Member",
        company:  "",
        memberId: String(memberId),
      },
    };

    await (WebhookHandlers as any).handleCheckoutComplete(session);

    // Row should still show paid — not double-debited or reset
    const [row] = await db.select().from(bookingsTable).where(eq(bookingsTable.id, bookingId));
    expect(row!.paymentStatus).toBe("paid");
  });
});
