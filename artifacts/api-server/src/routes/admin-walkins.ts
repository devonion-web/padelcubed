import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { walkinsTable, americanoSessionsTable, americanoPlayersTable, americanoRoundsTable, americanoCourtsTable, eventsTable } from "@workspace/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { requireAdmin } from "../middleware/adminAuth.js";
import { sendWalkinConfirmation } from "../email.js";

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

  // Fetch event details for the confirmation email (parallel with nothing yet)
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, eventId)).limit(1);

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

  // Auto-add to active americano session if checked in, and send confirmation email
  if (checkedIn) {
    await addWalkinToActiveSession(row.id, name, email, eventId);
  }

  // Send confirmation email (fire-and-forget — don't block the response)
  if (event) {
    sendWalkinConfirmation({
      to: email,
      name,
      eventTitle: event.title,
      eventDate: event.date,
      eventTime: event.time,
      eventVenue: event.venue,
      eventLocation: event.location,
    }).catch((err) => console.error("[email] Failed to send walk-in confirmation:", err));
  }

  res.status(201).json(row);
});

// ── Update paid status ──────────────────────────────────────────────────────
router.patch("/admin/walkins/:id/paid", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const { paid } = z.object({ paid: z.boolean() }).parse(req.body);
  const [row] = await db
    .update(walkinsTable)
    .set({ paid })
    .where(eq(walkinsTable.id, id))
    .returning();
  if (!row) { res.status(404).json({ error: "Not found" }); return; }
  res.json(row);
});

// ── Toggle check-in for a walk-in ──────────────────────────────────────────
router.patch("/admin/walkins/:id/checkin", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
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

  // Auto-add to active americano session when checking in
  if (nowCheckedIn) {
    await addWalkinToActiveSession(id, existing.name, existing.email, existing.eventId);
  }

  res.json(row);
});

export default router;
