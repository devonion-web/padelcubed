/**
 * Format manager API — supports Americano, Mexicano, Round Robin, Knockout.
 * All routes require Bearer JWT admin auth.
 */
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
import { eq, and, isNull, isNotNull, ne } from "drizzle-orm";
import { requireAdmin } from "../middleware/adminAuth.js";

const router = Router();

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type PlayerRow = { id: number; totalPoints: number; eliminated: boolean };

/**
 * Build court assignments for a round.
 * All formats pair 4 players per court: Team A = [1st, 4th] vs Team B = [2nd, 3rd]
 * (balances strength across courts).
 */
function buildDraw(
  players: PlayerRow[],
  roundNumber: number,
  format: string,
): Array<{ p1: number; p2: number; p3: number; p4: number }> {
  // Knockout: only non-eliminated players participate
  const active = players.filter((p) => !p.eliminated);

  let ordered: PlayerRow[];
  if (format === "americano" || format === "round_robin") {
    // Pure random every round
    ordered = shuffle(active);
  } else if (format === "mexicano") {
    // Round 1 random; subsequent rounds sort by points desc
    ordered = roundNumber === 1
      ? shuffle(active)
      : [...active].sort((a, b) => b.totalPoints - a.totalPoints);
  } else if (format === "knockout") {
    // Round 1 random; subsequent rounds sort by points desc (eliminated already filtered)
    ordered = roundNumber === 1
      ? shuffle(active)
      : [...active].sort((a, b) => b.totalPoints - a.totalPoints);
  } else {
    ordered = shuffle(active);
  }

  const courts: Array<{ p1: number; p2: number; p3: number; p4: number }> = [];
  for (let i = 0; i + 3 < ordered.length; i += 4) {
    const [a, b, c, d] = ordered.slice(i, i + 4);
    // Team A = [strongest, weakest]; Team B = [2nd, 3rd] — balances courts
    courts.push({ p1: a.id, p2: d.id, p3: b.id, p4: c.id });
  }
  return courts;
}

async function getSession(eventId: string) {
  const rows = await db
    .select()
    .from(americanoSessionsTable)
    .where(eq(americanoSessionsTable.eventId, eventId))
    .orderBy(americanoSessionsTable.createdAt);
  return rows[rows.length - 1] ?? null;
}

async function getFullState(sessionId: number) {
  const [session, players, allRounds] = await Promise.all([
    db.select().from(americanoSessionsTable).where(eq(americanoSessionsTable.id, sessionId)).then((r) => r[0]!),
    db.select().from(americanoPlayersTable).where(eq(americanoPlayersTable.sessionId, sessionId)),
    db.select().from(americanoRoundsTable).where(eq(americanoRoundsTable.sessionId, sessionId)).orderBy(americanoRoundsTable.roundNumber),
  ]);

  const currentRound = allRounds[allRounds.length - 1] ?? null;
  const currentCourts = currentRound
    ? await db.select().from(americanoCourtsTable).where(eq(americanoCourtsTable.roundId, currentRound.id)).orderBy(americanoCourtsTable.courtNumber)
    : [];

  return {
    session,
    players: [...players].sort((a, b) => b.totalPoints - a.totalPoints),
    currentRound,
    currentCourts,
    totalRounds: allRounds.length,
  };
}

// ── GET /admin/events/:eventId/americano ──────────────────────────────────────

router.get("/admin/events/:eventId/americano", requireAdmin, async (req, res) => {
  const session = await getSession(req.params.eventId);
  if (!session) { res.status(404).json({ error: "No session" }); return; }
  res.json(await getFullState(session.id));
});

// ── POST /admin/events/:eventId/americano — start session + generate round 1 ──

const StartSchema = z.object({
  format: z.enum(["americano", "mexicano", "round_robin", "knockout"]).default("americano"),
  courtsCount: z.number().int().min(1).max(10).default(3),
  roundDurationMinutes: z.number().int().min(5).max(60).default(15),
});

router.post("/admin/events/:eventId/americano", requireAdmin, async (req, res) => {
  const { eventId } = req.params;
  const parsed = StartSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { format, courtsCount, roundDurationMinutes } = parsed.data;

  // Gather checked-in bookings
  const bookings = await db
    .select({ bookingId: bookingsTable.id, fullName: bookingsTable.fullName, email: bookingsTable.email })
    .from(bookingsTable)
    .where(and(eq(bookingsTable.eventId, eventId), isNotNull(bookingsTable.checkedInAt)));

  // Gather checked-in walk-ins
  const walkins = await db
    .select()
    .from(walkinsTable)
    .where(and(eq(walkinsTable.eventId, eventId), isNotNull(walkinsTable.checkedInAt)));

  const totalPlayers = bookings.length + walkins.length;
  if (totalPlayers < 4) {
    res.status(400).json({ error: `Need at least 4 checked-in players (have ${totalPlayers})` });
    return;
  }

  // Create session
  const [session] = await db
    .insert(americanoSessionsTable)
    .values({ eventId, format, courtsCount, roundDurationMinutes, status: "active", currentRound: 0 })
    .returning();

  // Insert players
  const playerValues: (typeof americanoPlayersTable.$inferInsert)[] = [
    ...bookings.map((b) => ({
      sessionId: session.id,
      name: b.fullName ?? `Booking #${b.bookingId}`,
      email: b.email ?? null,
      bookingId: b.bookingId,
      walkinId: null,
      totalPoints: 0,
      roundsPlayed: 0,
      wins: 0,
      eliminated: false,
    })),
    ...walkins.map((w) => ({
      sessionId: session.id,
      name: w.name,
      email: w.email ?? null,
      bookingId: null,
      walkinId: w.id,
      totalPoints: 0,
      roundsPlayed: 0,
      wins: 0,
      eliminated: false,
    })),
  ];

  await db.insert(americanoPlayersTable).values(playerValues);

  // Generate round 1 draw (no startedAt yet — admin taps Start Round to sync timer)
  const players = await db.select().from(americanoPlayersTable).where(eq(americanoPlayersTable.sessionId, session.id));
  const draw = buildDraw(players, 1, format);

  const [round] = await db
    .insert(americanoRoundsTable)
    .values({ sessionId: session.id, roundNumber: 1 })
    .returning();

  await db.insert(americanoCourtsTable).values(
    draw.map((c, i) => ({
      roundId: round.id,
      courtNumber: i + 1,
      player1Id: c.p1,
      player2Id: c.p2,
      player3Id: c.p3,
      player4Id: c.p4,
    })),
  );

  await db.update(americanoSessionsTable).set({ currentRound: 1 }).where(eq(americanoSessionsTable.id, session.id));

  res.status(201).json(await getFullState(session.id));
});

// ── PUT /admin/americano/rounds/:roundId/start — sync timer ───────────────────

router.put("/admin/americano/rounds/:roundId/start", requireAdmin, async (req, res) => {
  const roundId = Number(req.params.roundId);
  const [round] = await db
    .update(americanoRoundsTable)
    .set({ startedAt: new Date() })
    .where(eq(americanoRoundsTable.id, roundId))
    .returning();
  if (!round) { res.status(404).json({ error: "Round not found" }); return; }
  res.json(round);
});

// ── POST /admin/events/:eventId/americano/rounds — generate next round ─────────

router.post("/admin/events/:eventId/americano/rounds", requireAdmin, async (req, res) => {
  const session = await getSession(req.params.eventId);
  if (!session) { res.status(404).json({ error: "No session" }); return; }

  // Verify all courts from current round are scored
  const allRounds = await db
    .select()
    .from(americanoRoundsTable)
    .where(eq(americanoRoundsTable.sessionId, session.id))
    .orderBy(americanoRoundsTable.roundNumber);

  const lastRound = allRounds[allRounds.length - 1] ?? null;
  if (!lastRound) { res.status(400).json({ error: "No rounds exist" }); return; }

  const courts = await db.select().from(americanoCourtsTable).where(eq(americanoCourtsTable.roundId, lastRound.id));
  const unscored = courts.filter((c) => c.teamAScore === null);
  if (unscored.length > 0) {
    res.status(400).json({ error: `${unscored.length} court(s) still need scores` });
    return;
  }

  // Close last round
  await db.update(americanoRoundsTable).set({ endedAt: new Date() }).where(eq(americanoRoundsTable.id, lastRound.id));

  // Knockout: eliminate the losing team players from each court in last round
  if (session.format === "knockout") {
    const eliminatedIds: number[] = [];
    for (const c of courts) {
      if (c.teamAScore !== null && c.teamBScore !== null) {
        if (c.teamAScore < c.teamBScore) {
          eliminatedIds.push(c.player1Id, c.player2Id);
        } else if (c.teamBScore < c.teamAScore) {
          eliminatedIds.push(c.player3Id, c.player4Id);
        }
        // Tie: nobody eliminated on this court
      }
    }
    for (const pid of eliminatedIds) {
      await db.update(americanoPlayersTable).set({ eliminated: true }).where(eq(americanoPlayersTable.id, pid));
    }
  }

  const nextRoundNumber = session.currentRound + 1;
  const players = await db.select().from(americanoPlayersTable).where(eq(americanoPlayersTable.sessionId, session.id));

  const active = players.filter((p) => !p.eliminated);
  if (active.length < 4) {
    // End session — not enough active players
    await db.update(americanoSessionsTable).set({ status: "complete" }).where(eq(americanoSessionsTable.id, session.id));
    res.json(await getFullState(session.id));
    return;
  }

  const draw = buildDraw(players, nextRoundNumber, session.format);

  const [round] = await db
    .insert(americanoRoundsTable)
    .values({ sessionId: session.id, roundNumber: nextRoundNumber })
    .returning();

  await db.insert(americanoCourtsTable).values(
    draw.map((c, i) => ({
      roundId: round.id,
      courtNumber: i + 1,
      player1Id: c.p1,
      player2Id: c.p2,
      player3Id: c.p3,
      player4Id: c.p4,
    })),
  );

  await db.update(americanoSessionsTable).set({ currentRound: nextRoundNumber }).where(eq(americanoSessionsTable.id, session.id));

  res.status(201).json(await getFullState(session.id));
});

// ── PUT /admin/events/:eventId/americano/end — end session early ──────────────

router.put("/admin/events/:eventId/americano/end", requireAdmin, async (req, res) => {
  const session = await getSession(req.params.eventId);
  if (!session) { res.status(404).json({ error: "No session" }); return; }
  if (session.status === "complete") { res.status(400).json({ error: "Session already complete" }); return; }

  // Mark any in-progress round as ended
  await db
    .update(americanoRoundsTable)
    .set({ endedAt: new Date() })
    .where(and(eq(americanoRoundsTable.sessionId, session.id), isNull(americanoRoundsTable.endedAt)));

  // Mark session complete
  await db
    .update(americanoSessionsTable)
    .set({ status: "complete" })
    .where(eq(americanoSessionsTable.id, session.id));

  res.json(await getFullState(session.id));
});

// ── POST /admin/americano/courts/:courtId/score — one-team entry ──────────────

const ScoreSchema = z.object({ teamAScore: z.number().int().min(0).max(32) });

router.post("/admin/americano/courts/:courtId/score", requireAdmin, async (req, res) => {
  const courtId = Number(req.params.courtId);
  const parsed = ScoreSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const { teamAScore } = parsed.data;
  const teamBScore = 32 - teamAScore;

  const court = await db.select().from(americanoCourtsTable).where(eq(americanoCourtsTable.id, courtId)).then((r) => r[0]);
  if (!court) { res.status(404).json({ error: "Court not found" }); return; }

  // If already scored, reverse the previous points before applying new ones
  const alreadyScored = court.teamAScore !== null;
  if (alreadyScored) {
    const prev = { a: court.teamAScore!, b: court.teamBScore! };
    const reverseMap: [number, number][] = [
      [court.player1Id, -prev.a], [court.player2Id, -prev.a],
      [court.player3Id, -prev.b], [court.player4Id, -prev.b],
    ];
    for (const [pid, delta] of reverseMap) {
      const [cur] = await db.select({ tp: americanoPlayersTable.totalPoints }).from(americanoPlayersTable).where(eq(americanoPlayersTable.id, pid));
      await db.update(americanoPlayersTable).set({ totalPoints: (cur?.tp ?? 0) + delta }).where(eq(americanoPlayersTable.id, pid));
    }
  }

  // Apply new scores
  await db.update(americanoCourtsTable).set({ teamAScore, teamBScore }).where(eq(americanoCourtsTable.id, courtId));

  // Update player totals and rounds played
  const aWin = teamAScore > teamBScore ? 1 : 0;
  const bWin = teamBScore > teamAScore ? 1 : 0;
  const playerUpdates: [number, number, number][] = [
    [court.player1Id, teamAScore, aWin],
    [court.player2Id, teamAScore, aWin],
    [court.player3Id, teamBScore, bWin],
    [court.player4Id, teamBScore, bWin],
  ];
  for (const [pid, pts, win] of playerUpdates) {
    const [cur] = await db.select({ tp: americanoPlayersTable.totalPoints, rp: americanoPlayersTable.roundsPlayed, w: americanoPlayersTable.wins })
      .from(americanoPlayersTable).where(eq(americanoPlayersTable.id, pid));
    await db.update(americanoPlayersTable).set({
      totalPoints: (cur?.tp ?? 0) + pts,
      roundsPlayed: alreadyScored ? (cur?.rp ?? 0) : (cur?.rp ?? 0) + 1,
      wins: (cur?.w ?? 0) + win,
    }).where(eq(americanoPlayersTable.id, pid));
  }

  const round = await db.select().from(americanoRoundsTable).where(eq(americanoRoundsTable.id, court.roundId)).then((r) => r[0]!);
  res.json(await getFullState(round.sessionId));
});

// ── GET /admin/events/:eventId/leaderboard ────────────────────────────────────

router.get("/admin/events/:eventId/leaderboard", requireAdmin, async (req, res) => {
  const session = await getSession(req.params.eventId);
  if (!session) { res.status(404).json({ error: "No session" }); return; }
  const players = await db.select().from(americanoPlayersTable).where(eq(americanoPlayersTable.sessionId, session.id));
  res.json({ session, players: [...players].sort((a, b) => b.totalPoints - a.totalPoints || a.id - b.id) });
});

// ── GET /admin/events/:eventId/export (kept for backward compat) ──────────────

router.get("/admin/events/:eventId/export", requireAdmin, async (req, res) => {
  const { eventId } = req.params;
  const bookings = await db.select().from(bookingsTable).where(eq(bookingsTable.eventId, eventId));
  const walkins = await db.select().from(walkinsTable).where(eq(walkinsTable.eventId, eventId));

  const session = await getSession(eventId);
  let playerMap: Record<string, { points: number; rounds: number }> = {};
  if (session) {
    const players = await db.select().from(americanoPlayersTable).where(eq(americanoPlayersTable.sessionId, session.id));
    for (const p of players) {
      if (p.bookingId) playerMap[`b${p.bookingId}`] = { points: p.totalPoints, rounds: p.roundsPlayed };
      if (p.walkinId) playerMap[`w${p.walkinId}`] = { points: p.totalPoints, rounds: p.roundsPlayed };
    }
  }

  const rows = ["Name,Email,Type,Checked In,Paid,Points,Rounds Played"];
  for (const b of bookings) {
    const key = `b${b.id}`;
    rows.push(`"${b.fullName ?? ""}","${b.email}","Booking","${b.checkedInAt ? "Yes" : "No"}","","${playerMap[key]?.points ?? ""}","${playerMap[key]?.rounds ?? ""}"`);
  }
  for (const w of walkins) {
    const key = `w${w.id}`;
    rows.push(`"${w.name}","${w.email ?? ""}","Walk-in","${w.checkedInAt ? "Yes" : "No"}","${w.paid ? "Yes" : "No"}","${playerMap[key]?.points ?? ""}","${playerMap[key]?.rounds ?? ""}"`);
  }

  res.setHeader("Content-Type", "text/csv");
  res.send(rows.join("\n"));
});

export default router;
