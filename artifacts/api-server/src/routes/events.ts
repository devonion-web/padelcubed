import { Router, type IRouter } from "express";
import { and, count, eq } from "drizzle-orm";
import { z } from "zod";
import { db, eventsTable, bookingsTable } from "@workspace/db";

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

  const [event] = await db
    .select({ id: eventsTable.id })
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
    // Re-activate cancelled booking
    const [updated] = await db
      .update(bookingsTable)
      .set({ status: "confirmed", bookedAt: new Date() })
      .where(eq(bookingsTable.id, existing[0].id))
      .returning();
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

  res.status(201).json(booking);
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

export default router;
