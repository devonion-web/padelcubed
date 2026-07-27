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
import { eq, and, isNull, isNotNull, ne, or, desc } from "drizzle-orm";
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

type PlayerRow = {
  id: number;
  totalPoints: number;
  eliminated: boolean;
  byeCount?: number;
  sittingOutNextRound?: boolean;
};

/**
 * Build court assignments for a round.
 * All formats pair 4 players per court: Team A = [1st, 4th] vs Team B = [2nd, 3rd]
 * (balances strength across courts).
 *
 * Bye fairness: when the player count leaves a remainder, players with the fewest
 * prior byes are chosen to sit out first. Forced sit-outs (sittingOutNextRound)
 * are always excluded.
 *
 * Returns both the court draw and the IDs of all players sitting out this round,
 * so callers can increment their byeCount and reset sittingOutNextRound.
 */
export function buildDraw(
  players: PlayerRow[],
  roundNumber: number,
  format: string,
): { courts: Array<{ p1: number; p2: number; p3: number; p4: number }>; sittingOutIds: number[] } {
  // Knockout: only non-eliminated players participate
  const nonEliminated = players.filter((p) => !p.eliminated);

  // Forced sit-outs toggled by admin for this round
  const forcedSitOut = nonEliminated.filter((p) => p.sittingOutNextRound);
  const pool = nonEliminated.filter((p) => !p.sittingOutNextRound);

  // Order pool by format
  let ordered: PlayerRow[];
  if (format === "americano" || format === "round_robin") {
    ordered = shuffle(pool);
  } else if (format === "mexicano" || format === "knockout") {
    ordered = roundNumber === 1
      ? shuffle(pool)
      : [...pool].sort((a, b) => b.totalPoints - a.totalPoints);
  } else {
    ordered = shuffle(pool);
  }

  // Bye fairness: choose who sits out from the natural remainder
  const remainder = ordered.length % 4;
  const sittingOutIds: number[] = forcedSitOut.map((p) => p.id);

  let playingPlayers: PlayerRow[];
  if (remainder === 0) {
    playingPlayers = ordered;
  } else {
    // Prefer lowest byeCount; break ties by lowest totalPoints (sit out the player already behind)
    const sorted = [...ordered].sort(
      (a, b) => (a.byeCount ?? 0) - (b.byeCount ?? 0) || a.totalPoints - b.totalPoints,
    );
    const extraSitOut = sorted.slice(0, remainder);
    sittingOutIds.push(...extraSitOut.map((p) => p.id));
    const sittingOutSet = new Set(extraSitOut.map((p) => p.id));
    // Keep original format order for the playing pool
    playingPlayers = ordered.filter((p) => !sittingOutSet.has(p.id));
  }

  const courts: Array<{ p1: number; p2: number; p3: number; p4: number }> = [];
  for (let i = 0; i + 3 < playingPlayers.length; i += 4) {
    const [a, b, c, d] = playingPlayers.slice(i, i + 4);
    // Team A = [strongest, weakest]; Team B = [2nd, 3rd] — balances courts
    courts.push({ p1: a.id, p2: d.id, p3: b.id, p4: c.id });
  }
  return { courts, sittingOutIds };
}

async function getSession(eventId: string) {
  const rows = await db
    .select()
    .from(americanoSessionsTable)
    .where(eq(americanoSessionsTable.eventId, eventId))
    .orderBy(americanoSessionsTable.createdAt);
  return rows[rows.length - 1] ?? null;
}

const CHANGEOVER_MINUTES = 3; // fixed gap between rounds for changeover

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/**
 * Calculate how many rounds to plan given format, player count, courts, round duration,
 * and the total event time budget.
 */
export function calcPlannedRounds(
  format: string,
  numPlayers: number,
  courtsCount: number,
  roundDurationMinutes: number,
  totalEventMinutes: number,
): number {
  if (format === "knockout") {
    return Math.max(1, Math.ceil(Math.log2(Math.max(numPlayers, 2))));
  }

  const seats = courtsCount * 4;

  // Time budget: how many full rounds fit?
  const maxByTime = Math.max(1, Math.floor(totalEventMinutes / (roundDurationMinutes + CHANGEOVER_MINUTES)));

  // Rotation fairness cap
  let maxByRotation: number;
  if (numPlayers <= seats) {
    maxByRotation = Math.max(1, numPlayers - 1);
  } else {
    const g = gcd(numPlayers, seats);
    const cycleLength = numPlayers / g;
    maxByRotation = cycleLength * 2;
  }

  return Math.max(1, Math.min(maxByTime, maxByRotation));
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

  const plannedRounds = calcPlannedRounds(
    session.format,
    players.length,
    session.courtsCount,
    session.roundDurationMinutes,
    session.totalEventMinutes,
  );

  return {
    session,
    players: [...players].sort((a, b) => b.totalPoints - a.totalPoints),
    currentRound,
    currentCourts,
    totalRounds: allRounds.length,
    plannedRounds,
  };
}

// ── Helper: insert courts + increment byeCount + reset sittingOutNextRound ────

async function insertCourtsAndUpdateByes(
  roundId: number,
  sessionId: number,
  courts: Array<{ p1: number; p2: number; p3: number; p4: number }>,
  sittingOutIds: number[],
) {
  if (courts.length > 0) {
    await db.insert(americanoCourtsTable).values(
      courts.map((c, i) => ({
        roundId,
        courtNumber: i + 1,
        player1Id: c.p1,
        player2Id: c.p2,
        player3Id: c.p3,
        player4Id: c.p4,
      })),
    );
  }
  // Increment byeCount for players sitting out
  for (const pid of sittingOutIds) {
    const [cur] = await db.select({ bc: americanoPlayersTable.byeCount })
      .from(americanoPlayersTable).where(eq(americanoPlayersTable.id, pid));
    if (cur) {
      await db.update(americanoPlayersTable)
        .set({ byeCount: cur.bc + 1 })
        .where(eq(americanoPlayersTable.id, pid));
    }
  }
  // Reset sittingOutNextRound for all players in this session
  await db.update(americanoPlayersTable)
    .set({ sittingOutNextRound: false })
    .where(eq(americanoPlayersTable.sessionId, sessionId));
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
  totalEventMinutes: z.number().int().min(30).max(480).default(120),
});

router.post("/admin/events/:eventId/americano", requireAdmin, async (req, res) => {
  const { eventId } = req.params;
  const parsed = StartSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }
  const { format, courtsCount, roundDurationMinutes, totalEventMinutes } = parsed.data;

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
    .values({ eventId, format, courtsCount, roundDurationMinutes, totalEventMinutes, status: "active", currentRound: 0 })
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
      byeCount: 0,
      sittingOutNextRound: false,
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
      byeCount: 0,
      sittingOutNextRound: false,
    })),
  ];

  await db.insert(americanoPlayersTable).values(playerValues);

  // Generate round 1 draw
  const players = await db.select().from(americanoPlayersTable).where(eq(americanoPlayersTable.sessionId, session.id));
  const { courts, sittingOutIds } = buildDraw(players, 1, format);

  const [round] = await db
    .insert(americanoRoundsTable)
    .values({ sessionId: session.id, roundNumber: 1 })
    .returning();

  await insertCourtsAndUpdateByes(round.id, session.id, courts, sittingOutIds);
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

  const allRounds = await db
    .select()
    .from(americanoRoundsTable)
    .where(eq(americanoRoundsTable.sessionId, session.id))
    .orderBy(americanoRoundsTable.roundNumber);

  const lastRound = allRounds[allRounds.length - 1] ?? null;
  if (!lastRound) { res.status(400).json({ error: "No rounds exist" }); return; }

  const courts = await db.select().from(americanoCourtsTable).where(eq(americanoCourtsTable.roundId, lastRound.id));
  const unscored = courts.filter((c) => c.teamAScore === null || c.teamBScore === null);
  if (unscored.length > 0) {
    res.status(400).json({ error: `${unscored.length} court(s) still need scores` });
    return;
  }

  // Close last round
  await db.update(americanoRoundsTable).set({ endedAt: new Date() }).where(eq(americanoRoundsTable.id, lastRound.id));

  // Knockout: eliminate the losing team players
  if (session.format === "knockout") {
    const eliminatedIds: number[] = [];
    for (const c of courts) {
      if (c.teamAScore !== null && c.teamBScore !== null) {
        if (c.teamAScore < c.teamBScore) {
          eliminatedIds.push(c.player1Id, c.player2Id);
        } else if (c.teamBScore < c.teamAScore) {
          eliminatedIds.push(c.player3Id, c.player4Id);
        }
      }
    }
    for (const pid of eliminatedIds) {
      await db.update(americanoPlayersTable).set({ eliminated: true }).where(eq(americanoPlayersTable.id, pid));
    }
  }

  const nextRoundNumber = session.currentRound + 1;
  const players = await db.select().from(americanoPlayersTable).where(eq(americanoPlayersTable.sessionId, session.id));

  const active = players.filter((p) => !p.eliminated);
  if (session.format === "knockout" && active.length < 4) {
    await db.update(americanoSessionsTable).set({ status: "complete" }).where(eq(americanoSessionsTable.id, session.id));
    res.json(await getFullState(session.id));
    return;
  }

  const { courts: draw, sittingOutIds } = buildDraw(players, nextRoundNumber, session.format);

  const [round] = await db
    .insert(americanoRoundsTable)
    .values({ sessionId: session.id, roundNumber: nextRoundNumber })
    .returning();

  await insertCourtsAndUpdateByes(round.id, session.id, draw, sittingOutIds);
  await db.update(americanoSessionsTable).set({ currentRound: nextRoundNumber }).where(eq(americanoSessionsTable.id, session.id));

  res.status(201).json(await getFullState(session.id));
});

// ── POST /admin/events/:eventId/americano/undo — rollback last round ──────────

router.post("/admin/events/:eventId/americano/undo", requireAdmin, async (req, res) => {
  const session = await getSession(req.params.eventId);
  if (!session) { res.status(404).json({ error: "No session" }); return; }

  const allRounds = await db
    .select()
    .from(americanoRoundsTable)
    .where(eq(americanoRoundsTable.sessionId, session.id))
    .orderBy(americanoRoundsTable.roundNumber);

  const openRound = allRounds.find((r) => r.endedAt === null) ?? null;
  const closedRounds = allRounds.filter((r) => r.endedAt !== null);
  const lastClosedRound = closedRounds[closedRounds.length - 1] ?? null;

  if (!openRound || !lastClosedRound) {
    res.status(400).json({ error: "Nothing to undo — no completed round to roll back to" });
    return;
  }

  // Guard: if the new open round already has scores, it's too late to undo cleanly
  const openCourts = await db
    .select()
    .from(americanoCourtsTable)
    .where(eq(americanoCourtsTable.roundId, openRound.id));

  const hasScores = openCourts.some((c) => c.teamAScore !== null || c.teamBScore !== null);
  if (hasScores) {
    res.status(409).json({ error: "Cannot undo — scores have already been entered for the new round" });
    return;
  }

  // Get the closed round's courts so we can reverse their deltas
  const closedCourts = await db
    .select()
    .from(americanoCourtsTable)
    .where(eq(americanoCourtsTable.roundId, lastClosedRound.id));

  await db.transaction(async (tx) => {
    // 1. Delete the open round (and its courts via cascade)
    await tx.delete(americanoCourtsTable).where(eq(americanoCourtsTable.roundId, openRound.id));
    await tx.delete(americanoRoundsTable).where(eq(americanoRoundsTable.id, openRound.id));

    // 2. Reopen the closed round
    await tx.update(americanoRoundsTable)
      .set({ endedAt: null })
      .where(eq(americanoRoundsTable.id, lastClosedRound.id));

    // 3. Reverse point / win / roundsPlayed deltas from the closed round's scored courts
    for (const court of closedCourts) {
      if (court.teamAScore === null || court.teamBScore === null) continue;
      const aWin = court.teamAScore > court.teamBScore ? 1 : 0;
      const bWin = court.teamBScore > court.teamAScore ? 1 : 0;
      const reversals: [number, number, number][] = [
        [court.player1Id, -court.teamAScore, -aWin],
        [court.player2Id, -court.teamAScore, -aWin],
        [court.player3Id, -court.teamBScore, -bWin],
        [court.player4Id, -court.teamBScore, -bWin],
      ];
      for (const [pid, deltaPts, deltaWins] of reversals) {
        const [cur] = await tx
          .select({ tp: americanoPlayersTable.totalPoints, rp: americanoPlayersTable.roundsPlayed, w: americanoPlayersTable.wins })
          .from(americanoPlayersTable)
          .where(eq(americanoPlayersTable.id, pid));
        if (cur) {
          await tx.update(americanoPlayersTable).set({
            totalPoints: Math.max(0, cur.tp + deltaPts),
            roundsPlayed: Math.max(0, cur.rp - 1),
            wins: Math.max(0, cur.w + deltaWins),
          }).where(eq(americanoPlayersTable.id, pid));
        }
      }
    }

    // 4. Decrement byeCount for players who sat out the closed round
    const playingIds = new Set(
      closedCourts.flatMap((c) => [c.player1Id, c.player2Id, c.player3Id, c.player4Id]),
    );
    const allPlayers = await tx
      .select({ id: americanoPlayersTable.id, byeCount: americanoPlayersTable.byeCount, eliminated: americanoPlayersTable.eliminated })
      .from(americanoPlayersTable)
      .where(eq(americanoPlayersTable.sessionId, session.id));

    for (const p of allPlayers) {
      if (!p.eliminated && !playingIds.has(p.id)) {
        await tx.update(americanoPlayersTable)
          .set({ byeCount: Math.max(0, p.byeCount - 1) })
          .where(eq(americanoPlayersTable.id, p.id));
      }
    }

    // 5. Un-eliminate losers from the closed round (knockout only)
    if (session.format === "knockout") {
      for (const court of closedCourts) {
        if (court.teamAScore === null || court.teamBScore === null) continue;
        const loserIds: number[] = [];
        if (court.teamAScore < court.teamBScore) {
          loserIds.push(court.player1Id, court.player2Id);
        } else if (court.teamBScore < court.teamAScore) {
          loserIds.push(court.player3Id, court.player4Id);
        }
        for (const pid of loserIds) {
          await tx.update(americanoPlayersTable)
            .set({ eliminated: false })
            .where(eq(americanoPlayersTable.id, pid));
        }
      }
    }

    // 6. Decrement session.currentRound back to the reopened round
    await tx.update(americanoSessionsTable)
      .set({ currentRound: lastClosedRound.roundNumber })
      .where(eq(americanoSessionsTable.id, session.id));
  });

  res.json(await getFullState(session.id));
});

// ── POST /admin/events/:eventId/americano/players — add a late-arrival ────────

const LateArrivalSchema = z.object({
  bookingId: z.number().int().positive().optional(),
  walkinId: z.number().int().positive().optional(),
}).refine((d) => d.bookingId !== undefined || d.walkinId !== undefined, {
  message: "bookingId or walkinId is required",
});

router.post("/admin/events/:eventId/americano/players", requireAdmin, async (req, res) => {
  const { eventId } = req.params;
  const parsed = LateArrivalSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.flatten() }); return; }

  const session = await getSession(eventId);
  if (!session || session.status !== "active") {
    res.status(400).json({ error: "No active session for this event" });
    return;
  }

  let name: string;
  let email: string | null;

  if (parsed.data.bookingId !== undefined) {
    const [booking] = await db
      .select({ fullName: bookingsTable.fullName, email: bookingsTable.email })
      .from(bookingsTable)
      .where(eq(bookingsTable.id, parsed.data.bookingId))
      .limit(1);
    if (!booking) { res.status(404).json({ error: "Booking not found" }); return; }
    name = booking.fullName ?? `Booking #${parsed.data.bookingId}`;
    email = booking.email ?? null;

    const existing = await db
      .select({ id: americanoPlayersTable.id })
      .from(americanoPlayersTable)
      .where(and(eq(americanoPlayersTable.sessionId, session.id), eq(americanoPlayersTable.bookingId, parsed.data.bookingId)))
      .limit(1);
    if (existing.length > 0) { res.status(409).json({ error: "Player already in session" }); return; }
  } else {
    const walkinId = parsed.data.walkinId!;
    const [walkin] = await db
      .select()
      .from(walkinsTable)
      .where(eq(walkinsTable.id, walkinId))
      .limit(1);
    if (!walkin) { res.status(404).json({ error: "Walk-in not found" }); return; }
    name = walkin.name;
    email = walkin.email ?? null;

    const existing = await db
      .select({ id: americanoPlayersTable.id })
      .from(americanoPlayersTable)
      .where(and(eq(americanoPlayersTable.sessionId, session.id), eq(americanoPlayersTable.walkinId, walkinId)))
      .limit(1);
    if (existing.length > 0) { res.status(409).json({ error: "Player already in session" }); return; }
  }

  await db.insert(americanoPlayersTable).values({
    sessionId: session.id,
    name,
    email,
    bookingId: parsed.data.bookingId ?? null,
    walkinId: parsed.data.walkinId ?? null,
    totalPoints: 0,
    roundsPlayed: 0,
    wins: 0,
    eliminated: false,
    byeCount: 0,
    sittingOutNextRound: false,
  });

  res.status(201).json(await getFullState(session.id));
});

// ── PATCH /admin/americano/players/:playerId/sit-out — soft sit-out toggle ────

router.patch("/admin/americano/players/:playerId/sit-out", requireAdmin, async (req, res) => {
  const playerId = parseInt(req.params.playerId, 10);
  if (isNaN(playerId)) { res.status(400).json({ error: "Invalid playerId" }); return; }

  const [player] = await db
    .select()
    .from(americanoPlayersTable)
    .where(eq(americanoPlayersTable.id, playerId))
    .limit(1);
  if (!player) { res.status(404).json({ error: "Player not found" }); return; }

  const [updated] = await db
    .update(americanoPlayersTable)
    .set({ sittingOutNextRound: !player.sittingOutNextRound })
    .where(eq(americanoPlayersTable.id, playerId))
    .returning();

  res.json(updated);
});

// ── PUT /admin/events/:eventId/americano/end — end session early ──────────────

router.put("/admin/events/:eventId/americano/end", requireAdmin, async (req, res) => {
  const session = await getSession(req.params.eventId);
  if (!session) { res.status(404).json({ error: "No session" }); return; }
  if (session.status === "complete") { res.status(400).json({ error: "Session already complete" }); return; }

  await db
    .update(americanoRoundsTable)
    .set({ endedAt: new Date() })
    .where(and(eq(americanoRoundsTable.sessionId, session.id), isNull(americanoRoundsTable.endedAt)));

  await db
    .update(americanoSessionsTable)
    .set({ status: "complete" })
    .where(eq(americanoSessionsTable.id, session.id));

  res.json(await getFullState(session.id));
});

// ── DELETE /admin/americano/players/:playerId — remove one player from session ─

router.delete("/admin/americano/players/:playerId", requireAdmin, async (req, res) => {
  const playerId = parseInt(req.params.playerId, 10);
  if (isNaN(playerId)) { res.status(400).json({ error: "Invalid playerId" }); return; }

  try {
    const [player] = await db
      .select()
      .from(americanoPlayersTable)
      .where(eq(americanoPlayersTable.id, playerId))
      .limit(1);
    if (!player) { res.status(404).json({ error: "Player not found" }); return; }

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
                eq(americanoCourtsTable.player1Id, playerId),
                eq(americanoCourtsTable.player2Id, playerId),
                eq(americanoCourtsTable.player3Id, playerId),
                eq(americanoCourtsTable.player4Id, playerId),
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

    await db.delete(americanoPlayersTable).where(eq(americanoPlayersTable.id, playerId));

    if (currentRound && !currentRound.startedAt) {
      const remainingPlayers = await db
        .select()
        .from(americanoPlayersTable)
        .where(eq(americanoPlayersTable.sessionId, player.sessionId));

      const { courts, sittingOutIds } = buildDraw(remainingPlayers, currentRound.roundNumber, session.format);
      await insertCourtsAndUpdateByes(currentRound.id, player.sessionId, courts, sittingOutIds);
    }

    res.json(await getFullState(player.sessionId));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to remove player" });
  }
});

// ── DELETE /admin/events/:eventId/americano — reset session ───────────────────

router.delete("/admin/events/:eventId/americano", requireAdmin, async (req, res) => {
  const session = await getSession(req.params.eventId);
  if (!session) { res.status(404).json({ error: "No session" }); return; }

  const rounds = await db.select({ id: americanoRoundsTable.id })
    .from(americanoRoundsTable)
    .where(eq(americanoRoundsTable.sessionId, session.id));
  for (const r of rounds) {
    await db.delete(americanoCourtsTable).where(eq(americanoCourtsTable.roundId, r.id));
  }
  await db.delete(americanoRoundsTable).where(eq(americanoRoundsTable.sessionId, session.id));
  await db.delete(americanoPlayersTable).where(eq(americanoPlayersTable.sessionId, session.id));
  await db.delete(americanoSessionsTable).where(eq(americanoSessionsTable.id, session.id));

  res.status(204).end();
});

// ── POST /admin/americano/courts/:courtId/score ───────────────────────────────

const ScoreSchema = z.object({
  teamAScore: z.number().int().min(0).max(99),
  teamBScore: z.number().int().min(0).max(99),
});

router.post("/admin/americano/courts/:courtId/score", requireAdmin, async (req, res) => {
  const courtId = Number(req.params.courtId);
  const parsed = ScoreSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({ error: parsed.error.flatten() });
    return;
  }

  const { teamAScore, teamBScore } = parsed.data;

  const court = await db.select().from(americanoCourtsTable).where(eq(americanoCourtsTable.id, courtId)).then((r) => r[0]);
  if (!court) { res.status(404).json({ error: "Court not found" }); return; }

  // If already scored, reverse the previous points before applying new ones
  const alreadyScored = court.teamAScore !== null;
  if (alreadyScored) {
    const prev = { a: court.teamAScore!, b: court.teamBScore! };
    const prevAWin = prev.a > prev.b ? 1 : 0;
    const prevBWin = prev.b > prev.a ? 1 : 0;
    const reverseMap: [number, number, number][] = [
      [court.player1Id, -prev.a, -prevAWin],
      [court.player2Id, -prev.a, -prevAWin],
      [court.player3Id, -prev.b, -prevBWin],
      [court.player4Id, -prev.b, -prevBWin],
    ];
    for (const [pid, deltaPts, deltaWins] of reverseMap) {
      const [cur] = await db.select({ tp: americanoPlayersTable.totalPoints, w: americanoPlayersTable.wins })
        .from(americanoPlayersTable).where(eq(americanoPlayersTable.id, pid));
      await db.update(americanoPlayersTable).set({
        totalPoints: (cur?.tp ?? 0) + deltaPts,
        wins: Math.max(0, (cur?.w ?? 0) + deltaWins),
      }).where(eq(americanoPlayersTable.id, pid));
    }
  }

  await db.update(americanoCourtsTable).set({ teamAScore, teamBScore }).where(eq(americanoCourtsTable.id, courtId));

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

// ── GET /admin/events/:eventId/export ─────────────────────────────────────────

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
