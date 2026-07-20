import { Router, type IRouter } from "express";
import { and, count, eq, isNotNull } from "drizzle-orm";
import { z } from "zod";
import { db, eventsTable, bookingsTable } from "@workspace/db";
import { requireAdmin } from "../middleware/adminAuth.js";

const router: IRouter = Router();

// ─── GET /admin/events ────────────────────────────────────────────────────────

router.get("/admin/events", requireAdmin, async (req, res): Promise<void> => {
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

router.get("/admin/events/:id/bookings", requireAdmin, async (req, res): Promise<void> => {
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

const CheckInBody = z.object({
  bookingId: z.number().int().positive(),
});

router.post("/admin/events/:id/checkin", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CheckInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
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

const UndoCheckInBody = z.object({
  bookingId: z.number().int().positive(),
});

router.delete("/admin/events/:id/checkin", requireAdmin, async (req, res): Promise<void> => {
  const parsed = UndoCheckInBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
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
