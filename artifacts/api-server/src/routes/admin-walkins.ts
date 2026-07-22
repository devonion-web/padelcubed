import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { walkinsTable, americanoSessionsTable, americanoPlayersTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../middleware/adminAuth.js";

/** If there's an active americano session for this event, add the walk-in as a player (idempotent). */
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
