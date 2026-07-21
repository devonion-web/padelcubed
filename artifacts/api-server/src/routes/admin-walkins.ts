import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import { walkinsTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAdmin } from "../middleware/adminAuth.js";

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
  const [row] = await db
    .update(walkinsTable)
    .set({ checkedInAt: existing.checkedInAt ? null : new Date() })
    .where(eq(walkinsTable.id, id))
    .returning();
  res.json(row);
});

export default router;
