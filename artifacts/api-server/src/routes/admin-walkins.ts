import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { walkinsTable, americanoSessionsTable, americanoPlayersTable, americanoRoundsTable, americanoCourtsTable, eventsTable } from "@workspace/db/schema";
import { eq, and, or, isNull, desc } from "drizzle-orm";
import { requireAdmin } from "../middleware/adminAuth.js";
import { sendWalkinConfirmation } from "../email.js";
import { buildDraw } from "./admin-americano.js";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * If there's an active americano session for this event, add the walk-in as a player (idempotent).
 * If the current round hasn't started yet, also regenerates the court draw so the new player is included.
 */
async function addWalkinToActiveSession(walkinId: number, name: string, email: string | null, eventId: string) {
  const [session] = await db
    .select()
    .from(americanoSessionsTable)
    .where(and(eq(americanoSessionsTable.eventId, eventId), eq(americanoSessionsTable.status, "active")))
    .limit(1);
  if (!session) return;

  // Check if already a player (idempotent)
  const existing = await db
    .select({ id: americanoPlayersTable.id })
    .from(americanoPlayersTable)
    .where(and(eq(americanoPlayersTable.sessionId, session.id), eq(americanoPlayersTable.walkinId, walkinId)))
    .limit(1);
  if (existing.length > 0) return;

  await db.insert(americanoPlayersTable).values({
    sessionId: session.id,
    name,
    email,
    bookingId: null,
    walkinId,
    totalPoints: 0,
    roundsPlayed: 0,
    wins: 0,
    eliminated: false,
  });

  // If the current round hasn't started yet, regenerate its court draw with all players now included
  const [pendingRound] = await db
    .select()
    .from(americanoRoundsTable)
    .where(and(eq(americanoRoundsTable.sessionId, session.id), isNull(americanoRoundsTable.startedAt)))
    .orderBy(desc(americanoRoundsTable.roundNumber))
    .limit(1);

  if (!pendingRound) return; // Round already started — new player sits out this round

  const allPlayers = await db
    .select({ id: americanoPlayersTable.id, totalPoints: americanoPlayersTable.totalPoints, eliminated: americanoPlayersTable.eliminated })
    .from(americanoPlayersTable)
    .where(eq(americanoPlayersTable.sessionId, session.id));

  const active = allPlayers.filter((p) => !p.eliminated);
  const ordered = shuffle(active);

  const courts: Array<{ p1: number; p2: number; p3: number; p4: number }> = [];
  for (let i = 0; i + 3 < ordered.length; i += 4) {
    const [a, b, c, d] = ordered.slice(i, i + 4);
    courts.push({ p1: a.id, p2: d.id, p3: b.id, p4: c.id });
  }

  if (courts.length === 0) return;

  // Delete the old draw and replace with the updated one
  await db.delete(americanoCourtsTable).where(eq(americanoCourtsTable.roundId, pendingRound.id));
  await db.insert(americanoCourtsTable).values(
    courts.map((c, i) => ({
      roundId: pendingRound.id,
      courtNumber: i + 1,
      player1Id: c.p1,
      player2Id: c.p2,
      player3Id: c.p3,
      player4Id: c.p4,
    })),
  );
}

const router = Router();

// ── List walk-ins for an event ──────────────────────────────────────────────
router.get("/admin/events/:eventId/walkins", requireAdmin, async (req, res) => {
  const { eventId } = req.params;
  const rows = await db
    .select()
    .from(walkinsTable)
    .where(eq(walkinsTable.eventId, eventId))
    .orderBy(walkinsTable.createdAt);
  res.json(rows);
});

// ── Add a walk-in ───────────────────────────────────────────────────────────
const CreateWalkinSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  paid: z.boolean().default(false),
  checkedIn: z.boolean().default(true),
});

router.post("/admin/events/:eventId/walkins", requireAdmin, async (req, res) => {
  const { eventId } = req.params;
  const parsed = CreateWalkinSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }
  const { name, email, paid, checkedIn } = parsed.data;

  try {
    // Fetch event details (needed for email) — also checks event exists
    const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);
    if (!event) {
      res.status(404).json({ error: "Event not found" });
      return;
    }

    // Prevent duplicate walk-in registrations for the same email + event
    const [dup] = await db
      .select({ id: walkinsTable.id })
      .from(walkinsTable)
      .where(and(eq(walkinsTable.eventId, eventId), eq(walkinsTable.email, email)))
      .limit(1);
    if (dup) {
      res.status(409).json({ error: "A walk-in with that email is already registered for this event" });
      return;
    }

    const [row] = await db
      .insert(walkinsTable)
      .values({
        eventId,
        name,
        email,
        paid,
        checkedInAt: checkedIn ? new Date() : null,
      })
      .returning();

    // Auto-add to active americano session if checked in
    if (checkedIn) {
      await addWalkinToActiveSession(row.id, name, email, eventId);
    }

    // Fire-and-forget confirmation email
    sendWalkinConfirmation({
      to: email,
      name,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventVenue: event.venue,
      eventLocation: event.location,
      eventFormat: event.format,
    }).catch((err) => console.error("[email] Walk-in confirmation failed:", err));

    res.status(201).json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create walk-in" });
  }
});

// ── Update paid status ──────────────────────────────────────────────────────
router.patch("/admin/walkins/:id/paid", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const parsed = z.object({ paid: z.boolean() }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "paid (boolean) required" }); return; }
    const [row] = await db
      .update(walkinsTable)
      .set({ paid: parsed.data.paid })
      .where(eq(walkinsTable.id, id))
      .returning();
    if (!row) { res.status(404).json({ error: "Not found" }); return; }
    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to update paid status" });
  }
});

// ── Toggle check-in for a walk-in ──────────────────────────────────────────
router.patch("/admin/walkins/:id/checkin", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    const existing = await db
      .select()
      .from(walkinsTable)
      .where(eq(walkinsTable.id, id))
      .then((r) => r[0]);
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }

    const nowCheckedIn = !existing.checkedInAt;
    const [row] = await db
      .update(walkinsTable)
      .set({ checkedInAt: nowCheckedIn ? new Date() : null })
      .where(eq(walkinsTable.id, id))
      .returning();

    if (nowCheckedIn) {
      await addWalkinToActiveSession(id, existing.name, existing.email, existing.eventId);
    }

    res.json(row);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to toggle check-in" });
  }
});

// ── Delete a walk-in (and remove from any active session) ──────────────────
router.delete("/admin/walkins/:id", requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  try {
    // Find the player row(s) for this walk-in so we can clean up court references first
    const players = await db
      .select()
      .from(americanoPlayersTable)
      .where(eq(americanoPlayersTable.walkinId, id));

    for (const player of players) {
      const [session, rounds] = await Promise.all([
        db.select().from(americanoSessionsTable).where(eq(americanoSessionsTable.id, player.sessionId)).then((r) => r[0]!),
        db.select().from(americanoRoundsTable).where(eq(americanoRoundsTable.sessionId, player.sessionId)).orderBy(americanoRoundsTable.roundNumber),
      ]);
      const currentRound = rounds[rounds.length - 1] ?? null;

      for (const round of rounds) {
        const isCurrentUnstarted = currentRound?.id === round.id && !currentRound?.startedAt;
        if (isCurrentUnstarted) {
          await db.delete(americanoCourtsTable).where(eq(americanoCourtsTable.roundId, round.id));
        } else {
          const affectedCourts = await db
            .select()
            .from(americanoCourtsTable)
            .where(
              and(
                eq(americanoCourtsTable.roundId, round.id),
                or(
                  eq(americanoCourtsTable.player1Id, player.id),
                  eq(americanoCourtsTable.player2Id, player.id),
                  eq(americanoCourtsTable.player3Id, player.id),
                  eq(americanoCourtsTable.player4Id, player.id),
                ),
              ),
            );
          for (const court of affectedCourts) {
            if (court.teamAScore === null || court.teamBScore === null) {
              await db.delete(americanoCourtsTable).where(eq(americanoCourtsTable.id, court.id));
            }
          }
        }
      }

      // Remove the player row
      await db.delete(americanoPlayersTable).where(eq(americanoPlayersTable.id, player.id));

      // Regenerate draw if current round hasn't started
      if (currentRound && !currentRound.startedAt) {
        const remainingPlayers = await db
          .select()
          .from(americanoPlayersTable)
          .where(eq(americanoPlayersTable.sessionId, player.sessionId));
        const draw = buildDraw(remainingPlayers, currentRound.roundNumber, session.format);
        if (draw.length > 0) {
          await db.insert(americanoCourtsTable).values(
            draw.map((c, i) => ({
              roundId: currentRound.id,
              courtNumber: i + 1,
              player1Id: c.p1,
              player2Id: c.p2,
              player3Id: c.p3,
              player4Id: c.p4,
            })),
          );
        }
      }
    }

    // Delete the walk-in record
    const [deleted] = await db.delete(walkinsTable).where(eq(walkinsTable.id, id)).returning();
    if (!deleted) { res.status(404).json({ error: "Walk-in not found" }); return; }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete walk-in" });
  }
});

export default router;
