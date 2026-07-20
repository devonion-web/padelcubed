import { Router, type IRouter } from "express";
import { and, count, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db, eventsTable, bookingsTable } from "@workspace/db";

const router: IRouter = Router();

function checkAdmin(password: unknown): boolean {
  return (
    typeof password === "string" &&
    password.length > 0 &&
    password === process.env.ADMIN_PASSWORD
  );
}

// ─── GET /admin/events ────────────────────────────────────────────────────────
// Returns all events with confirmed booking count and check-in count.

router.get("/admin/events", async (req, res): Promise<void> => {
  if (!checkAdmin(req.query.adminPassword)) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }

  try {
    const events = await db.select().from(eventsTable).orderBy(eventsTable.id);

    const stats = await Promise.all(
      events.map(async (ev) => {
        const [booked] = await db
          .select({ total: count() })
          .from(bookingsTable)
          .where(
            and(
              eq(bookingsTable.eventId, ev.id),
              eq(bookingsTable.status, "confirmed"),
            ),
          );

        const [checkedIn] = await db
          .select({ total: count() })
          .from(bookingsTable)
          .where(
            and(
              eq(bookingsTable.eventId, ev.id),
              eq(bookingsTable.status, "confirmed"),
              isNotNull(bookingsTable.checkedInAt),
            ),
          );

        return {
          ...ev,
          bookedCount: Number(booked?.total ?? 0),
          checkedInCount: Number(checkedIn?.total ?? 0),
        };
      }),
    );

    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load events" });
  }
});

// ─── GET /admin/events/:id/bookings ──────────────────────────────────────────
// Returns all confirmed bookings for an event including check-in status.

router.get("/admin/events/:id/bookings", async (req, res): Promise<void> => {
  if (!checkAdmin(req.query.adminPassword)) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }

  try {
    const bookings = await db
      .select()
      .from(bookingsTable)
      .where(
        and(
          eq(bookingsTable.eventId, req.params.id),
          eq(bookingsTable.status, "confirmed"),
        ),
      )
      .orderBy(bookingsTable.bookedAt);

    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load bookings" });
  }
});

// ─── POST /admin/events/:id/checkin ──────────────────────────────────────────
// Mark a booking as checked in.

const CheckInBody = z.object({
  bookingId: z.number().int().positive(),
  adminPassword: z.string(),
});

router.post("/admin/events/:id/checkin", async (req, res): Promise<void> => {
  const parsed = CheckInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!checkAdmin(parsed.data.adminPassword)) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }

  try {
    const [booking] = await db
      .update(bookingsTable)
      .set({ checkedInAt: new Date() })
      .where(
        and(
          eq(bookingsTable.id, parsed.data.bookingId),
          eq(bookingsTable.eventId, req.params.id),
          eq(bookingsTable.status, "confirmed"),
        ),
      )
      .returning();

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to check in" });
  }
});

// ─── DELETE /admin/events/:id/checkin ────────────────────────────────────────
// Undo a check-in.

const UndoCheckInBody = z.object({
  bookingId: z.number().int().positive(),
  adminPassword: z.string(),
});

router.delete("/admin/events/:id/checkin", async (req, res): Promise<void> => {
  const parsed = UndoCheckInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!checkAdmin(parsed.data.adminPassword)) {
    res.status(401).json({ error: "Unauthorised" });
    return;
  }

  try {
    const [booking] = await db
      .update(bookingsTable)
      .set({ checkedInAt: null })
      .where(
        and(
          eq(bookingsTable.id, parsed.data.bookingId),
          eq(bookingsTable.eventId, req.params.id),
        ),
      )
      .returning();

    if (!booking) {
      res.status(404).json({ error: "Booking not found" });
      return;
    }

    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to undo check-in" });
  }
});

export default router;
