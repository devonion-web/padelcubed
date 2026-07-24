import { Router, type IRouter } from "express";
import { and, count, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db, eventsTable, bookingsTable, americanoSessionsTable, americanoPlayersTable } from "@workspace/db";
import { sendBookingConfirmation } from "../email.js";
import { calcPlannedRounds } from "./admin-americano.js";
import { getUncachableStripeClient } from "../stripeClient.js";

const router: IRouter = Router();

// ─── Seed data ────────────────────────────────────────────────────────────────
// Called once at server startup (see index.ts), NOT on every request.
export const SEED_EVENTS = [
  {
    id: "1",
    title: "The City Kickoff",
    date: "Thursday 6 August 2026",
    dateShort: "6 Aug",
    time: "6:30 pm – 9:30 pm",
    venue: "Racketeer",
    location: "Acton, London",
    format: "Americano",
    sponsor: "Corlytics",
    price: "Free",
    status: "available",
    description:
      "Our inaugural event — founders, finance professionals and GRC leaders meet on court. Americano format, drinks, and networking.",
    maxSpots: 16,
    eventDate: new Date("2026-08-06T17:30:00Z"),
  },
  {
    id: "2",
    title: "The Finance Edition",
    date: "Thursday 10 September 2026",
    dateShort: "10 Sep",
    time: "6:30 pm – 9:30 pm",
    venue: "Surbiton Racquet Club",
    location: "Surbiton, Surrey",
    format: "Americano",
    sponsor: "Finativ",
    price: "Free",
    status: "available",
    description:
      "A dedicated evening for the financial services community. Mix of senior finance leaders, VCs and RegTech founders.",
    maxSpots: 16,
    eventDate: new Date("2026-09-10T17:30:00Z"),
  },
  {
    id: "3",
    title: "The GRC Exchange",
    date: "Thursday 8 October 2026",
    dateShort: "8 Oct",
    time: "6:30 pm – 9:30 pm",
    venue: "Racketeer",
    location: "Acton, London",
    format: "Americano",
    sponsor: "GRC Edge",
    price: "Free",
    status: "available",
    description:
      "Governance, Risk and Compliance leaders gather for an evening of play, peer exchange and post-match discussion.",
    maxSpots: 16,
    eventDate: new Date("2026-10-08T17:30:00Z"),
  },
  {
    id: "4",
    title: "The October Smash",
    date: "Thursday 29 October 2026",
    dateShort: "29 Oct",
    time: "6:30 pm – 9:30 pm",
    venue: "Padium",
    location: "London",
    format: "Americano",
    sponsor: "Apollo 1971",
    price: "Free",
    status: "soon",
    description:
      "A high-energy mid-autumn session at one of London's premier padel venues. Limited spaces.",
    maxSpots: 16,
    eventDate: new Date("2026-10-29T18:30:00Z"),
  },
  {
    id: "5",
    title: "The Year Closer",
    date: "Thursday 3 December 2026",
    dateShort: "3 Dec",
    time: "6:30 pm – 9:30 pm",
    venue: "Racketeer",
    location: "Acton, London",
    format: "Americano",
    sponsor: "byrne·dean",
    price: "Free",
    status: "soon",
    description:
      "Close out 2026 on court with the P³ community. Our biggest event of the year — expect a full house.",
    maxSpots: 16,
    eventDate: new Date("2026-12-03T18:30:00Z"),
  },
];

export async function seedIfEmpty() {
  const existing = await db
    .select({ id: eventsTable.id })
    .from(eventsTable)
    .limit(1);
  if (existing.length === 0) {
    await db.insert(eventsTable).values(SEED_EVENTS);
    console.log("Seeded events table with default events.");
  }
}

// ─── GET /events ──────────────────────────────────────────────────────────────
router.get("/events", async (_req, res): Promise<void> => {
  try {
    const events = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.published, true))
      .orderBy(eventsTable.eventDate);

    // Fetch attendee counts for all events in one query
    const bookingCounts = await db
      .select({ eventId: bookingsTable.eventId, total: count() })
      .from(bookingsTable)
      .where(eq(bookingsTable.status, "confirmed"))
      .groupBy(bookingsTable.eventId);

    const countMap: Record<string, number> = {};
    for (const row of bookingCounts) countMap[row.eventId] = Number(row.total);

    res.json(events.map((e) => ({ ...e, attendeeCount: countMap[e.id] ?? 0 })));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load events" });
  }
});

// ─── GET /events/:id ──────────────────────────────────────────────────────────
router.get("/events/:id", async (req, res): Promise<void> => {
  try {
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, req.params.id));

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const [row] = await db
      .select({ total: count() })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.eventId, req.params.id),
          eq(bookingsTable.status, "confirmed"),
        ),
      );

    res.json({ ...event, attendeeCount: Number(row?.total ?? 0) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load event" });
  }
});

// ─── GET /events/:id/attendees ────────────────────────────────────────────────
router.get("/events/:id/attendees", async (req, res): Promise<void> => {
  try {
    const rows = await db
      .select({
        fullName: bookingsTable.fullName,
        company: bookingsTable.company,
      })
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.eventId, req.params.id),
          eq(bookingsTable.status, "confirmed"),
        ),
      )
      .orderBy(bookingsTable.bookedAt);

    const attendees = rows.map((r) => ({
      firstName: r.fullName.split(" ")[0],
      company: r.company ?? null,
    }));

    res.json(attendees);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load attendees" });
  }
});

// ─── POST /events/:id/bookings ────────────────────────────────────────────────
const BookingBody = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  company: z.string().optional(),
});

router.post("/events/:id/bookings", async (req, res): Promise<void> => {
  const parsed = BookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    // Fetch event details (needed for 404 check and confirmation email)
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, req.params.id));

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const existing = await db
      .select()
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.eventId, req.params.id),
          eq(bookingsTable.email, parsed.data.email),
        ),
      );

    if (existing.length > 0) {
      if (existing[0].status === "confirmed") {
        res.status(409).json({ error: "Already booked for this event" });
        return;
      }
      // Re-activate cancelled booking and resend confirmation
      const [updated] = await db
        .update(bookingsTable)
        .set({ status: "confirmed", bookedAt: new Date() })
        .where(eq(bookingsTable.id, existing[0].id))
        .returning();

      sendBookingConfirmation({
        to: parsed.data.email,
        name: parsed.data.fullName,
        eventId: req.params.id,
        bookingId: existing[0].id,
        eventTitle: event.title,
        eventDate: event.date,
        eventTime: event.time,
        eventVenue: event.venue,
        eventLocation: event.location,
        eventFormat: event.format,
      }).catch((err) => console.error("[email] Booking re-confirmation failed:", err));

      res.status(201).json(updated);
      return;
    }

    const [booking] = await db
      .insert(bookingsTable)
      .values({
        eventId: req.params.id,
        email: parsed.data.email,
        fullName: parsed.data.fullName,
        company: parsed.data.company,
        status: "confirmed",
      })
      .returning();

    // Fire-and-forget confirmation email
    sendBookingConfirmation({
      to: parsed.data.email,
      name: parsed.data.fullName,
      eventId: req.params.id,
      bookingId: booking.id,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventVenue: event.venue,
      eventLocation: event.location,
      eventFormat: event.format,
    }).catch((err) => console.error("[email] Booking confirmation failed:", err));

    res.status(201).json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create booking" });
  }
});

// ─── DELETE /events/:id/bookings ──────────────────────────────────────────────
const CancelBody = z.object({ email: z.string().email() });

router.delete("/events/:id/bookings", async (req, res): Promise<void> => {
  const parsed = CancelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [booking] = await db
    .update(bookingsTable)
    .set({ status: "cancelled" })
    .where(
      and(
        eq(bookingsTable.eventId, req.params.id),
        eq(bookingsTable.email, parsed.data.email),
      ),
    )
    .returning();

  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }

  res.json({ success: true });
});

// ─── POST /events/:id/checkout ────────────────────────────────────────────────
// Creates a Stripe Checkout session for paid events, or books directly if free.
const CheckoutBody = z.object({
  email: z.string().email(),
  fullName: z.string().min(1),
  company: z.string().optional(),
});

router.post("/events/:id/checkout", async (req, res): Promise<void> => {
  const parsed = CheckoutBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, fullName, company } = parsed.data;

  try {
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, req.params.id));

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    // Check for existing confirmed booking
    const [existing] = await db
      .select()
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.eventId, req.params.id),
          eq(bookingsTable.email, email),
        ),
      );

    if (existing?.status === "confirmed" && existing.paymentStatus !== "pending") {
      res.status(409).json({ error: "Already booked for this event" });
      return;
    }

    // ── Free event — book directly ────────────────────────────────────────────
    if (!event.pricePence || event.pricePence === 0) {
      if (existing) {
        // Re-activate cancelled booking
        await db
          .update(bookingsTable)
          .set({ status: "confirmed", paymentStatus: "free", bookedAt: new Date() })
          .where(eq(bookingsTable.id, existing.id));
      } else {
        await db.insert(bookingsTable).values({
          eventId: event.id,
          email,
          fullName,
          company,
          status: "confirmed",
          paymentStatus: "free",
        });

        const [newBooking] = await db
          .select()
          .from(bookingsTable)
          .where(and(eq(bookingsTable.eventId, event.id), eq(bookingsTable.email, email)));

        sendBookingConfirmation({
          to: email,
          name: fullName,
          eventId: event.id,
          bookingId: newBooking?.id ?? 0,
          eventTitle: event.title,
          eventDate: event.date,
          eventTime: event.time,
          eventVenue: event.venue,
          eventLocation: event.location,
          eventFormat: event.format,
        }).catch((err) => console.error("[email] Booking confirmation failed:", err));
      }

      res.status(201).json({ booked: true });
      return;
    }

    // ── Paid event — Stripe Checkout ──────────────────────────────────────────
    // Ensure we have a Stripe price ID for this event (create once, cache forever)
    let stripePriceId = event.stripePriceId;

    if (!stripePriceId) {
      const stripe = await getUncachableStripeClient();

      const product = await stripe.products.create({
        name: event.title,
        description: event.description ?? undefined,
        metadata: { eventId: event.id, venue: event.venue },
      });

      const price = await stripe.prices.create({
        product: product.id,
        unit_amount: event.pricePence,
        currency: "gbp",
      });

      stripePriceId = price.id;

      await db
        .update(eventsTable)
        .set({ stripePriceId })
        .where(eq(eventsTable.id, event.id));
    }

    // Create (or replace) the pending booking row before creating the session,
    // so we always have a row to update when the webhook fires.
    const stripe = await getUncachableStripeClient();

    const origin =
      req.headers.origin ??
      `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: stripePriceId, quantity: 1 }],
      mode: "payment",
      success_url: `${origin}/?booking=success`,
      cancel_url: `${origin}/#events`,
      customer_email: email,
      metadata: { eventId: event.id, email, fullName, company: company ?? "" },
    });

    if (existing) {
      await db
        .update(bookingsTable)
        .set({
          status: "confirmed",
          paymentStatus: "pending",
          stripeSessionId: session.id,
          bookedAt: new Date(),
        })
        .where(eq(bookingsTable.id, existing.id));
    } else {
      await db.insert(bookingsTable).values({
        eventId: event.id,
        email,
        fullName,
        company,
        status: "confirmed",
        paymentStatus: "pending",
        stripeSessionId: session.id,
      });
    }

    res.json({ url: session.url });
  } catch (err) {
    console.error("[checkout] Error:", err);
    res.status(500).json({ error: "Failed to create checkout" });
  }
});

// ── GET /events/:eventId/leaderboard — public, no auth ────────────────────────

router.get("/events/:eventId/leaderboard", async (req, res) => {
  try {
    const { eventId } = req.params;
    const myEmail = typeof req.query.email === "string" ? req.query.email.toLowerCase() : null;

    const sessions = await db
      .select()
      .from(americanoSessionsTable)
      .where(eq(americanoSessionsTable.eventId, eventId))
      .orderBy(americanoSessionsTable.createdAt);

    const session = sessions[sessions.length - 1] ?? null;

    if (!session) {
      res.json({ session: null, players: [], plannedRounds: 0 });
      return;
    }

    const rows = await db
      .select({
        id:           americanoPlayersTable.id,
        name:         americanoPlayersTable.name,
        email:        americanoPlayersTable.email,
        totalPoints:  americanoPlayersTable.totalPoints,
        roundsPlayed: americanoPlayersTable.roundsPlayed,
        wins:         americanoPlayersTable.wins,
        eliminated:   americanoPlayersTable.eliminated,
      })
      .from(americanoPlayersTable)
      .where(eq(americanoPlayersTable.sessionId, session.id))
      .orderBy(desc(americanoPlayersTable.totalPoints));

    const plannedRounds = calcPlannedRounds(
      session.format,
      rows.length,
      session.courtsCount,
      session.roundDurationMinutes,
      session.totalEventMinutes,
    );

    // Strip emails from response; only mark the requesting player with isMe
    const players = rows.map((r) => ({
      id:           r.id,
      name:         r.name,
      totalPoints:  r.totalPoints,
      roundsPlayed: r.roundsPlayed,
      wins:         r.wins,
      eliminated:   r.eliminated,
      isMe:         myEmail ? r.email?.toLowerCase() === myEmail : false,
    }));

    res.json({
      session: {
        id:           session.id,
        status:       session.status,
        currentRound: session.currentRound,
        format:       session.format,
      },
      plannedRounds,
      players,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
});

export default router;
