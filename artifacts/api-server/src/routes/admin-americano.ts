import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  americanoSessionsTable,
  americanoPlayersTable,
  americanoRoundsTable,
  americanoCourtsTable,
  bookingsTable,
  walkinsTable,
  registrationsTable,
} from "@workspace/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Americano draw algorithm.
 * Round 1: random order.
 * Subsequent rounds: sort by descending points.
 * Each court of 4 players: Team A = [1st, 4th], Team B = [2nd, 3rd]
 * (pairs strongest with weakest to balance courts)
 * Players who can't fill a full court of 4 sit out this round.
 */
function buildDraw(
  players: { id: number; totalPoints: number }[],
  roundNumber: number
): Array<{ p1: number; p2: number; p3: number; p4: number }> {
  const ordered =
    roundNumber === 1
      ? shuffle([...players])
      : [...players].sort((a, b) => b.totalPoints - a.totalPoints);

  const courts: Array<{ p1: number; p2: number; p3: number; p4: number }> = [];
  for (let i = 0; i + 3 < ordered.length; i += 4) {
    const [a, b, c, d] = ordered.slice(i, i + 4);
    courts.push({ p1: a.id, p2: d.id, p3: b.id, p4: c.id });
  }
  return courts;
}

// ── GET session (or 404) ─────────────────────────────────────────────────────
async function getSession(eventId: string) {
  return db
    .select()
    .from(americanoSessionsTable)
    .where(eq(americanoSessionsTable.eventId, eventId))
    .orderBy(americanoSessionsTable.createdAt)
    .then((r) => r[r.length - 1] ?? null);
}

async function getFullState(sessionId: number) {
  const [session, players, rounds] = await Promise.all([
    db
      .select()
      .from(americanoSessionsTable)
      .where(eq(americanoSessionsTable.id, sessionId))
      .then((r) => r[0]!),
    db
      .select()
      .from(americanoPlayersTable)
      .where(eq(americanoPlayersTable.sessionId, sessionId))
      .orderBy(americanoPlayersTable.totalPoints),
    db
      .select()
      .from(americanoRoundsTable)
      .where(eq(americanoRoundsTable.sessionId, sessionId))
      .orderBy(americanoRoundsTable.roundNumber),
  ]);

  const courtsPerRound: Record<number, (typeof americanoCourtsTable.$inferSelect)[]> = {};
  if (rounds.length > 0) {
    const allCourts = await db
      .select()
      .from(americanoCourtsTable)
      .where(
        eq(
          americanoCourtsTable.roundId,
          rounds[rounds.length - 1].id
        )
      );
    courtsPerRound[rounds[rounds.length - 1].id] = allCourts;
  }

  const currentRoundData = rounds[rounds.length - 1] ?? null;
  const currentCourts = currentRoundData
    ? courtsPerRound[currentRoundData.id] ?? []
    : [];

  return { session, players: players.sort((a, b) => b.totalPoints - a.totalPoints), currentRound: currentRoundData, currentCourts };
}

// ── GET /admin/events/:eventId/americano ─────────────────────────────────────
router.get("/admin/events/:eventId/americano", requireAdmin, async (req, res) => {
  const session = await getSession(req.params.eventId);
  if (!session) { res.status(404).json({ error: "No session" }); return; }
  res.json(await getFullState(session.id));
});

// ── POST /admin/events/:eventId/americano — start session ────────────────────
router.post("/admin/events/:eventId/americano", requireAdmin, async (req, res) => {
  const { eventId } = req.params;

  // Collect checked-in bookings (with registration for name)
  const bookings = await db
    .select({ bookingId: bookingsTable.id, registrationId: bookingsTable.registrationId })
    .from(bookingsTable)
    .where(and(eq(bookingsTable.eventId, eventId), isNotNull(bookingsTable.checkedInAt)));

  const regIds = bookings.map((b) => b.registrationId);
  const regs = regIds.length
    ? await db
        .select()
        .from(registrationsTable)
        .where(
          regIds.length === 1
            ? eq(registrationsTable.id, regIds[0])
            : (registrationsTable.id as any).in(regIds)
        )
    : [];

  // Also collect checked-in walk-ins
  const walkins = await db
    .select()
    .from(walkinsTable)
    .where(and(eq(walkinsTable.eventId, eventId), isNotNull(walkinsTable.checkedInAt)));

  if (bookings.length + walkins.length < 4) {
    res.status(400).json({ error: "Need at least 4 checked-in players to start" });
    return;
  }

  // Create session
  const [session] = await db
    .insert(americanoSessionsTable)
    .values({ eventId, status: "active", currentRound: 0 })
    .returning();

  // Insert players
  const playerValues: (typeof americanoPlayersTable.$inferInsert)[] = [
    ...bookings.map((b) => {
      const reg = regs.find((r) => r.id === b.registrationId);
      return {
        sessionId: session.id,
        name: reg ? `${reg.firstName} ${reg.lastName}` : `Booking #${b.bookingId}`,
        email: reg?.email ?? null,
        bookingId: b.bookingId,
        walkinId: null,
        totalPoints: 0,
        roundsPlayed: 0,
      };
    }),
    ...walkins.map((w) => ({
      sessionId: session.id,
      name: w.name,
      email: w.email,
      bookingId: null,
      walkinId: w.id,
      totalPoints: 0,
      roundsPlayed: 0,
    })),
  ];

  await db.insert(americanoPlayersTable).values(playerValues);

  res.status(201).json(await getFullState(session.id));
});

// ── POST /admin/events/:eventId/americano/rounds — next round ────────────────
router.post("/admin/events/:eventId/americano/rounds", requireAdmin, async (req, res) => {
  const session = await getSession(req.params.eventId);
  if (!session) { res.status(404).json({ error: "No session" }); return; }

  // Check all courts from last round have scores
  const lastRound = await db
    .select()
    .from(americanoRoundsTable)
    .where(eq(americanoRoundsTable.sessionId, session.id))
    .orderBy(americanoRoundsTable.roundNumber)
    .then((r) => r[r.length - 1] ?? null);

  if (lastRound) {
    const courts = await db
      .select()
      .from(americanoCourtsTable)
      .where(eq(americanoCourtsTable.roundId, lastRound.id));
    const unscored = courts.filter((c) => c.teamAScore === null || c.teamBScore === null);
    if (unscored.length > 0) {
      res.status(400).json({ error: `${unscored.length} court(s) still need scores` });
      return;
    }
    // Mark last round as ended
    await db
      .update(americanoRoundsTable)
      .set({ endedAt: new Date() })
      .where(eq(americanoRoundsTable.id, lastRound.id));
  }

  const nextRoundNumber = session.currentRound + 1;

  // Get players
  const players = await db
    .select()
    .from(americanoPlayersTable)
    .where(eq(americanoPlayersTable.sessionId, session.id));

  const draw = buildDraw(players, nextRoundNumber);

  // Insert round
  const [round] = await db
    .insert(americanoRoundsTable)
    .values({ sessionId: session.id, roundNumber: nextRoundNumber, startedAt: new Date() })
    .returning();

  // Insert courts
  await db.insert(americanoCourtsTable).values(
    draw.map((c, i) => ({
      roundId: round.id,
      courtNumber: i + 1,
      player1Id: c.p1,
      player2Id: c.p2,
      player3Id: c.p3,
      player4Id: c.p4,
    }))
  );

  // Update session round counter
  await db
    .update(americanoSessionsTable)
    .set({ currentRound: nextRoundNumber })
    .where(eq(americanoSessionsTable.id, session.id));

  res.status(201).json(await getFullState(session.id));
});

// ── POST /admin/americano/courts/:courtId/score ───────────────────────────────
const ScoreSchema = z.object({ teamAScore: z.number().int().min(0), teamBScore: z.number().int().min(0) });

router.post("/admin/americano/courts/:courtId/score", requireAdmin, async (req, res) => {
  const courtId = Number(req.params.courtId);
  const parsed = ScoreSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { teamAScore, teamBScore } = parsed.data;

  const court = await db
    .select()
    .from(americanoCourtsTable)
    .where(eq(americanoCourtsTable.id, courtId))
    .then((r) => r[0]);
  if (!court) { res.status(404).json({ error: "Court not found" }); return; }

  // Update scores
  await db
    .update(americanoCourtsTable)
    .set({ teamAScore, teamBScore })
    .where(eq(americanoCourtsTable.id, courtId));

  // Update player points: team A players get teamAScore, team B players get teamBScore
  for (const [pId, pts] of [
    [court.player1Id, teamAScore],
    [court.player2Id, teamAScore],
    [court.player3Id, teamBScore],
    [court.player4Id, teamBScore],
  ] as [number, number][]) {
    await db
      .update(americanoPlayersTable)
      .set({
        totalPoints: (await db
          .select({ tp: americanoPlayersTable.totalPoints })
          .from(americanoPlayersTable)
          .where(eq(americanoPlayersTable.id, pId))
          .then((r) => r[0]!.tp)) + pts,
        roundsPlayed: (await db
          .select({ rp: americanoPlayersTable.roundsPlayed })
          .from(americanoPlayersTable)
          .where(eq(americanoPlayersTable.id, pId))
          .then((r) => r[0]!.rp)) + 1,
      })
      .where(eq(americanoPlayersTable.id, pId));
  }

  // Return updated session state
  const round = await db
    .select()
    .from(americanoRoundsTable)
    .where(eq(americanoRoundsTable.id, court.roundId))
    .then((r) => r[0]!);

  res.json(await getFullState(round.sessionId));
});

// ── GET /admin/events/:eventId/leaderboard ────────────────────────────────────
router.get("/admin/events/:eventId/leaderboard", requireAdmin, async (req, res) => {
  const session = await getSession(req.params.eventId);
  if (!session) { res.status(404).json({ error: "No session" }); return; }
  const players = await db
    .select()
    .from(americanoPlayersTable)
    .where(eq(americanoPlayersTable.sessionId, session.id));
  const sorted = players.sort((a, b) => b.totalPoints - a.totalPoints || a.id - b.id);
  res.json({ session, players: sorted });
});

// ── GET /admin/events/:eventId/export ─────────────────────────────────────────
router.get("/admin/events/:eventId/export", requireAdmin, async (req, res) => {
  const { eventId } = req.params;

  // Bookings with registrations
  const bookings = await db
    .select()
    .from(bookingsTable)
    .where(eq(bookingsTable.eventId, eventId));

  const regIds = bookings.map((b) => b.registrationId);
  const regs = regIds.length
    ? await db.select().from(registrationsTable).where(
        regIds.length === 1
          ? eq(registrationsTable.id, regIds[0])
          : (registrationsTable.id as any).in(regIds)
      )
    : [];

  // Walk-ins
  const walkins = await db
    .select()
    .from(walkinsTable)
    .where(eq(walkinsTable.eventId, eventId));

  // Americano scores
  const session = await getSession(eventId);
  let playerMap: Record<string, { points: number; rounds: number }> = {};
  if (session) {
    const players = await db
      .select()
      .from(americanoPlayersTable)
      .where(eq(americanoPlayersTable.sessionId, session.id));
    for (const p of players) {
      if (p.bookingId) playerMap[`b${p.bookingId}`] = { points: p.totalPoints, rounds: p.roundsPlayed };
      if (p.walkinId) playerMap[`w${p.walkinId}`] = { points: p.totalPoints, rounds: p.roundsPlayed };
    }
  }

  const rows: string[] = [
    "Name,Email,Type,Checked In,Paid,Americano Points,Rounds Played",
  ];

  for (const b of bookings) {
    const reg = regs.find((r) => r.id === b.registrationId);
    const name = reg ? `${reg.firstName} ${reg.lastName}` : "Unknown";
    const email = reg?.email ?? "";
    const checkedIn = b.checkedInAt ? "Yes" : "No";
    const key = `b${b.id}`;
    const pts = playerMap[key]?.points ?? "";
    const rds = playerMap[key]?.rounds ?? "";
    rows.push(`"${name}","${email}","Registered","${checkedIn}","","${pts}","${rds}"`);
  }

  for (const w of walkins) {
    const checkedIn = w.checkedInAt ? "Yes" : "No";
    const paid = w.paid ? "Yes" : "No";
    const key = `w${w.id}`;
    const pts = playerMap[key]?.points ?? "";
    const rds = playerMap[key]?.rounds ?? "";
    rows.push(`"${w.name}","${w.email}","Walk-in","${checkedIn}","${paid}","${pts}","${rds}"`);
  }

  const csv = rows.join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="event-${eventId}.csv"`);
  res.send(csv);
});

export default router;
