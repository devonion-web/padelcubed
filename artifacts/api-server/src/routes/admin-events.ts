import { Router, type IRouter } from "express";
import { and, count, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import {
  db,
  eventsTable,
  bookingsTable,
  walkinsTable,
  americanoSessionsTable,
  americanoPlayersTable,
} from "@workspace/db";
import { requireAdmin } from "../middleware/adminAuth.js";

const router: IRouter = Router();

// ─── Live-status helper ───────────────────────────────────────────────────────
// live   : eventDate - 90 min  ≤ now ≤ eventDate + 4 h
// upcoming: now < eventDate - 90 min
// ended  : now > eventDate + 4 h

type LiveStatus = "live" | "upcoming" | "ended";

function getLiveStatus(eventDate: Date | string | null): LiveStatus {
  if (!eventDate) return "upcoming";
  const d = new Date(eventDate).getTime();
  const now = Date.now();
  if (now >= d - 90 * 60_000 && now <= d + 4 * 3_600_000) return "live";
  if (now < d - 90 * 60_000) return "upcoming";
  return "ended";
}

// ─── Zod schema for event create / update ────────────────────────────────────

const EventBody = z.object({
  title: z.string().min(1, "Title is required"),
  date: z.string().min(1, "Date is required"),
  dateShort: z.string().min(1, "Short date is required"),
  time: z.string().min(1, "Time is required"),
  venue: z.string().min(1, "Venue is required"),
  location: z.string().min(1, "Location is required"),
  format: z.string().default("Americano"),
  sponsor: z.string().optional().nullable(),
  price: z.string().default("Free"),
  status: z.enum(["available", "limited", "soon"]).default("available"),
  description: z.string().optional().nullable(),
  maxSpots: z.number().int().min(1).default(16),
  courtsCount: z.number().int().min(1).max(20).default(3),
  roundDurationMinutes: z.number().int().min(5).max(60).default(15),
  totalEventMinutes: z.number().int().min(30).max(480).default(120),
  eventDate: z.string().datetime({ offset: true }).optional().nullable(),
  published: z.boolean().default(true),
});

const CreateEventBody = EventBody.extend({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "ID must be lowercase letters, numbers or hyphens"),
});

// ─── GET /admin/events ────────────────────────────────────────────────────────

router.get("/admin/events", requireAdmin, async (req, res): Promise<void> => {
  try {
    const events = await db
      .select()
      .from(eventsTable)
      .orderBy(eventsTable.eventDate);

    const stats = await Promise.all(
      events.map(async (ev) => {
        const [booked] = await db
          .select({ total: count() })
          .from(bookingsTable)
          .where(and(eq(bookingsTable.eventId, ev.id), eq(bookingsTable.status, "confirmed")));

        const [checkedIn] = await db
          .select({ total: count() })
          .from(bookingsTable)
          .where(and(eq(bookingsTable.eventId, ev.id), eq(bookingsTable.status, "confirmed"), isNotNull(bookingsTable.checkedInAt)));

        const [walkins] = await db
          .select({ total: count() })
          .from(walkinsTable)
          .where(eq(walkinsTable.eventId, ev.id));

        return {
          ...ev,
          bookedCount: Number(booked?.total ?? 0),
          checkedInCount: Number(checkedIn?.total ?? 0),
          walkinCount: Number(walkins?.total ?? 0),
          liveStatus: getLiveStatus(ev.eventDate),
        };
      }),
    );

    // Sort: live first → upcoming (soonest) → ended (most recent)
    const order: Record<LiveStatus, number> = { live: 0, upcoming: 1, ended: 2 };
    stats.sort((a, b) => {
      const od = order[a.liveStatus] - order[b.liveStatus];
      if (od !== 0) return od;
      const da = a.eventDate ? new Date(a.eventDate).getTime() : 0;
      const db2 = b.eventDate ? new Date(b.eventDate).getTime() : 0;
      return a.liveStatus === "ended" ? db2 - da : da - db2;
    });

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load events" });
  }
});

// ─── GET /admin/events/:id ────────────────────────────────────────────────────

router.get("/admin/events/:id", requireAdmin, async (req, res): Promise<void> => {
  try {
    const [event] = await db
      .select()
      .from(eventsTable)
      .where(eq(eventsTable.id, req.params.id));

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    const [[booked], [checkedIn], [walkins]] = await Promise.all([
      db.select({ total: count() }).from(bookingsTable)
        .where(and(eq(bookingsTable.eventId, event.id), eq(bookingsTable.status, "confirmed"))),
      db.select({ total: count() }).from(bookingsTable)
        .where(and(eq(bookingsTable.eventId, event.id), eq(bookingsTable.status, "confirmed"), isNotNull(bookingsTable.checkedInAt))),
      db.select({ total: count() }).from(walkinsTable)
        .where(eq(walkinsTable.eventId, event.id)),
    ]);

    res.json({
      ...event,
      bookedCount: Number(booked?.total ?? 0),
      checkedInCount: Number(checkedIn?.total ?? 0),
      walkinCount: Number(walkins?.total ?? 0),
      liveStatus: getLiveStatus(event.eventDate),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load event" });
  }
});

// ─── POST /admin/events ───────────────────────────────────────────────────────

router.post("/admin/events", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    // Check for duplicate ID
    const [existing] = await db
      .select({ id: eventsTable.id })
      .from(eventsTable)
      .where(eq(eventsTable.id, parsed.data.id));

    if (existing) {
      res.status(409).json({ error: `Event with id "${parsed.data.id}" already exists` });
      return;
    }

    const [event] = await db
      .insert(eventsTable)
      .values({
        ...parsed.data,
        eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : null,
      })
      .returning();

    res.status(201).json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create event" });
  }
});

// ─── PUT /admin/events/:id ────────────────────────────────────────────────────

router.put("/admin/events/:id", requireAdmin, async (req, res): Promise<void> => {
  const parsed = EventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten().fieldErrors });
    return;
  }

  try {
    const [event] = await db
      .update(eventsTable)
      .set({
        ...parsed.data,
        eventDate: parsed.data.eventDate ? new Date(parsed.data.eventDate) : null,
      })
      .where(eq(eventsTable.id, req.params.id))
      .returning();

    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    res.json(event);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update event" });
  }
});

// ─── GET /admin/events/:id/bookings ──────────────────────────────────────────

router.get("/admin/events/:id/bookings", requireAdmin, async (req, res): Promise<void> => {
  try {
    const bookings = await db
      .select()
      .from(bookingsTable)
      .where(and(eq(bookingsTable.eventId, req.params.id), eq(bookingsTable.status, "confirmed")))
      .orderBy(bookingsTable.bookedAt);
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load bookings" });
  }
});

// ─── POST /admin/events/:id/checkin ──────────────────────────────────────────

const CheckInBody = z.object({ bookingId: z.number().int().positive() });

router.post("/admin/events/:id/checkin", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CheckInBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [booking] = await db
      .update(bookingsTable)
      .set({ checkedInAt: new Date() })
      .where(and(eq(bookingsTable.id, parsed.data.bookingId), eq(bookingsTable.eventId, req.params.id), eq(bookingsTable.status, "confirmed")))
      .returning();
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check in" });
  }
});

// ─── DELETE /admin/events/:id/checkin ────────────────────────────────────────

const UndoCheckInBody = z.object({ bookingId: z.number().int().positive() });

router.delete("/admin/events/:id/checkin", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UndoCheckInBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  try {
    const [booking] = await db
      .update(bookingsTable)
      .set({ checkedInAt: null })
      .where(and(eq(bookingsTable.id, parsed.data.bookingId), eq(bookingsTable.eventId, req.params.id)))
      .returning();
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to undo check-in" });
  }
});

// ─── GET /admin/events/:id/export  (attendance CSV) ──────────────────────────

router.get("/admin/events/:id/export", requireAdmin, async (req, res): Promise<void> => {
  try {
    const { id } = req.params;
    const bookings = await db
      .select()
      .from(bookingsTable)
      .where(and(eq(bookingsTable.eventId, id), eq(bookingsTable.status, "confirmed")))
      .orderBy(bookingsTable.fullName);

    const walkins = await db
      .select()
      .from(walkinsTable)
      .where(eq(walkinsTable.eventId, id))
      .orderBy(walkinsTable.name);

    const rows = [
      "Type,Name,Company,Email,Checked In",
      ...bookings.map((b) =>
        `Booking,"${b.fullName}","${b.company ?? ""}","${b.email}","${b.checkedInAt ? "Yes" : "No"}"`
      ),
      ...walkins.map((w) =>
        `Walk-in,"${w.name}","","${w.email ?? ""}","${w.checkedInAt ? "Yes" : "No"}"`
      ),
    ];

    res.setHeader("Content-Type", "text/csv");
    res.send(rows.join("\n"));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Export failed" });
  }
});

// ─── GET /admin/events/:id/report  (post-event full report CSV) ───────────────

router.get("/admin/events/:id/report", requireAdmin, async (req, res): Promise<void> => {
  try {
    const { id } = req.params;

    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, id));
    const [bookings, walkins, session] = await Promise.all([
      db.select().from(bookingsTable)
        .where(and(eq(bookingsTable.eventId, id), eq(bookingsTable.status, "confirmed")))
        .orderBy(bookingsTable.fullName),
      db.select().from(walkinsTable)
        .where(eq(walkinsTable.eventId, id))
        .orderBy(walkinsTable.name),
      db.select().from(americanoSessionsTable)
        .where(eq(americanoSessionsTable.eventId, id))
        .then((rows) => rows[0] ?? null),
    ]);

    const lines: string[] = [];
    const eventTitle = event?.title ?? id;

    lines.push(`"EVENT REPORT: ${eventTitle}"`);
    lines.push(`"Date:","${event?.date ?? ""}"`);
    lines.push(`"Venue:","${event?.venue ?? ""}"`);
    lines.push(`"Generated:","${new Date().toUTCString()}"`);
    lines.push("");

    lines.push("ATTENDANCE");
    lines.push("Type,Name,Company,Email,Checked In,Walk-in Paid");
    for (const b of bookings) {
      lines.push(`Booking,"${b.fullName}","${b.company ?? ""}","${b.email}","${b.checkedInAt ? "Yes" : "No"}",""`);
    }
    for (const w of walkins) {
      lines.push(`Walk-in,"${w.name}","","${w.email ?? ""}","${w.checkedInAt ? "Yes" : "No"}","${w.paid ? "Yes" : "No"}"`);
    }
    const totalAttended = bookings.filter((b) => b.checkedInAt).length + walkins.filter((w) => w.checkedInAt).length;
    lines.push(`"Total attended:","${totalAttended}"`);
    lines.push(`"Total booked:","${bookings.length}"`);
    lines.push(`"Walk-ins:","${walkins.length}"`);
    lines.push("");

    if (session) {
      const players = await db
        .select()
        .from(americanoPlayersTable)
        .where(eq(americanoPlayersTable.sessionId, session.id))
        .orderBy(americanoPlayersTable.totalPoints);

      const bookingMap = Object.fromEntries(bookings.map((b) => [b.id, b.fullName]));
      const walkinMap = Object.fromEntries(walkins.map((w) => [w.id, w.name]));

      const named = players
        .map((p) => ({
          name: p.bookingId ? (bookingMap[p.bookingId] ?? `Booking #${p.bookingId}`)
            : p.walkinId ? (walkinMap[p.walkinId] ?? `Walk-in #${p.walkinId}`)
            : "Unknown",
          points: p.totalPoints,
          rounds: p.roundsPlayed,
        }))
        .sort((a, b) => b.points - a.points);

      lines.push("AMERICANO LEADERBOARD");
      lines.push(`"Rounds played:","${session.currentRound ?? 0}"`);
      lines.push("");
      lines.push("Rank,Name,Points,Rounds Played");
      named.forEach((p, i) => {
        lines.push(`${i + 1},"${p.name}",${p.points},${p.rounds}`);
      });
    }

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="report-${id}.csv"`);
    res.send(lines.join("\n"));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Report generation failed" });
  }
});

export default router;
