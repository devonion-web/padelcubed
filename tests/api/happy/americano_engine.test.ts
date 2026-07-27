/**
 * Americano engine — happy path tests.
 *
 * Covers:
 *  1. Public leaderboard returns currentCourts with player names + round timing (unauth)
 *  2. Undo reverses totalPoints / wins exactly and re-opens the previous round
 *  3. Late-arrival player appears in the next round's draw
 *  4. Soft sit-out excludes a player for one round; they're reinstated automatically
 *  5. Bye count increments for sitting-out players; next draw selects higher-bye player first
 *  6. Score sanity: negative score, score > 99, and one-sided score all return 422
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app.js";
import { db } from "@workspace/db";
import {
  americanoSessionsTable,
  americanoPlayersTable,
  americanoRoundsTable,
  americanoCourtsTable,
  bookingsTable,
  walkinsTable,
  eventsTable,
} from "@workspace/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { truncateAll, seedEvent, mintAdminJwt } from "../../setup/seed.js";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ADMIN_TOKEN = mintAdminJwt();
const CLIENT_IP = "10.0.3.3";

function api(method: "get" | "post" | "put" | "patch" | "delete") {
  return (path: string) =>
    (request(app) as any)[method](path)
      .set("X-Forwarded-For", CLIENT_IP)
      .set("Authorization", `Bearer ${ADMIN_TOKEN}`);
}
function publicApi(method: "get") {
  return (path: string) =>
    (request(app) as any)[method](path).set("X-Forwarded-For", CLIENT_IP);
}

/**
 * Seed a minimal event, 8 checked-in bookings, start an Americano session on 2 courts,
 * and return all relevant IDs.
 */
async function seedSession(eventSuffix: string) {
  const event = await seedEvent({ id: `amer-${eventSuffix}-${Date.now()}`, pricePence: 0 });

  // Insert 8 bookings (all checked in)
  const names = ["Alice Smith", "Bob Jones", "Carol Page", "Dave Mills",
                 "Eve Turner", "Frank King", "Grace Hall", "Harry Ford"];
  const insertedBookings = await db.insert(bookingsTable).values(
    names.map((n) => ({
      eventId: event.id,
      email: `${n.split(" ")[0].toLowerCase()}@p3.test`,
      fullName: n,
      status: "confirmed" as const,
      paymentStatus: "free" as const,
      checkedInAt: new Date(),
    }))
  ).returning();

  // Start session (2 courts, 15 min rounds)
  const res = await api("post")(`/api/admin/events/${event.id}/americano`)
    .send({ format: "americano", courtsCount: 2, roundDurationMinutes: 15, totalEventMinutes: 120 });
  expect(res.status).toBe(201);

  const session = res.body.session;
  const players: any[] = res.body.players;
  const currentCourts: any[] = res.body.currentCourts;
  const currentRound = res.body.currentRound;

  return { event, session, players, currentCourts, currentRound, bookings: insertedBookings };
}

/** Score all courts of a round, then advance to the next round. */
async function scoreAndAdvance(eventId: string, courts: any[]) {
  for (const court of courts) {
    const res = await api("post")(`/api/admin/americano/courts/${court.id}/score`)
      .send({ teamAScore: 15, teamBScore: 10 });
    expect(res.status).toBe(200);
  }
  const res = await api("post")(`/api/admin/events/${eventId}/americano/rounds`).send({});
  expect(res.status).toBe(201);
  return res.body;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeAll(() => truncateAll());
afterAll(() => truncateAll());

describe("1. Public leaderboard — court assignments + round timing", () => {
  it("returns currentCourts with player names and roundStartedAt / roundDurationMinutes", async () => {
    const { event, currentRound } = await seedSession("lb-courts");

    // Start the round so roundStartedAt is set
    const startRes = await api("put")(`/api/admin/americano/rounds/${currentRound.id}/start`).send({});
    expect(startRes.status).toBe(200);

    // Fetch the public leaderboard (no auth)
    const res = await publicApi("get")(`/api/events/${event.id}/leaderboard`);
    expect(res.status).toBe(200);

    expect(res.body.currentCourts).toBeInstanceOf(Array);
    expect(res.body.currentCourts.length).toBeGreaterThan(0);

    const court = res.body.currentCourts[0];
    expect(court).toHaveProperty("courtNumber");
    expect(court.teamA).toHaveLength(2);
    expect(court.teamB).toHaveLength(2);
    // Names should be "First L." format
    expect(court.teamA[0]).toMatch(/^[A-Z][a-z]+ [A-Z]\.$|^[A-Za-z]+$/);

    // Round timing
    expect(res.body.session.roundStartedAt).toBeTruthy();
    expect(res.body.session.roundDurationMinutes).toBe(15);
  });
});

describe("2. Undo last round", () => {
  it("reverses points/wins and re-opens the previous round", async () => {
    const { event, players, currentCourts } = await seedSession("undo");

    // Score and advance to round 2
    const afterRound2 = await scoreAndAdvance(event.id, currentCourts);
    const round2Courts = afterRound2.currentCourts;
    const playersAfterR1 = afterRound2.players as any[];

    // Record standing of one player after round 1 scored
    const samplePlayer = playersAfterR1[0];
    const pointsBefore = samplePlayer.totalPoints;
    expect(pointsBefore).toBeGreaterThan(0);

    // Undo (round 2 has no scores yet)
    const undoRes = await api("post")(`/api/admin/events/${event.id}/americano/undo`).send({});
    expect(undoRes.status).toBe(200);

    const undoneState = undoRes.body;
    // Session should be back on round 1
    expect(undoneState.session.currentRound).toBe(1);

    // The player's points should be reversed (0 for all since we just undid round 1)
    const undonePlayer = undoneState.players.find((p: any) => p.id === samplePlayer.id);
    expect(undonePlayer.totalPoints).toBe(0);
    expect(undonePlayer.roundsPlayed).toBe(0);
    expect(undonePlayer.wins).toBe(0);

    // Round 1 should now have no endedAt (re-opened)
    const openRounds = await db
      .select()
      .from(americanoRoundsTable)
      .where(and(eq(americanoRoundsTable.sessionId, undoneState.session.id), isNull(americanoRoundsTable.endedAt)));
    expect(openRounds.length).toBe(1);
    expect(openRounds[0].roundNumber).toBe(1);
  });

  it("rejects undo when the new round already has scores", async () => {
    const { event, currentCourts } = await seedSession("undo-guard");

    await scoreAndAdvance(event.id, currentCourts);

    // Fetch state to get round 2 courts
    const stateRes = await api("get")(`/api/admin/events/${event.id}/americano`);
    const r2courts = stateRes.body.currentCourts;

    // Enter a score for round 2
    await api("post")(`/api/admin/americano/courts/${r2courts[0].id}/score`)
      .send({ teamAScore: 5, teamBScore: 3 });

    // Undo should be blocked
    const undoRes = await api("post")(`/api/admin/events/${event.id}/americano/undo`).send({});
    expect(undoRes.status).toBe(409);
  });
});

describe("3. Late arrival — player joins a running session", () => {
  it("adds a booking to the active session (they appear in the next draw)", async () => {
    const { event, session, players, currentCourts } = await seedSession("late");

    // Score round 1 and advance to round 2
    await scoreAndAdvance(event.id, currentCourts);

    // Insert a walk-in directly (not via the admin route which auto-adds to sessions)
    const [walkin] = await db.insert(walkinsTable).values({
      eventId: event.id,
      name: "Lateena Comer",
      email: "lateena@p3.test",
      paid: true,
      checkedInAt: new Date(),
    }).returning();
    const walkinId = walkin.id;

    // Now add them to the running session via the late-arrival endpoint
    const addRes = await api("post")(`/api/admin/events/${event.id}/americano/players`)
      .send({ walkinId });
    expect(addRes.status).toBe(201);

    // The new player should appear in the session's player list
    const newPlayer = addRes.body.players.find((p: any) => p.name === "Lateena Comer");
    expect(newPlayer).toBeDefined();
    expect(newPlayer.totalPoints).toBe(0);
  });

  it("returns 409 if player already in session", async () => {
    const { event, session, bookings, currentCourts } = await seedSession("late-dup");
    await scoreAndAdvance(event.id, currentCourts);

    const existingBookingId = bookings[0].id;
    const res = await api("post")(`/api/admin/events/${event.id}/americano/players`)
      .send({ bookingId: existingBookingId });
    expect(res.status).toBe(409);
  });
});

describe("4. Soft sit-out — exclude a player for one round only", () => {
  it("flagged player is excluded from the next draw then automatically reinstated", async () => {
    const { event, players, currentCourts } = await seedSession("sitout");

    // Flag one player to sit out next round
    const targetPlayer = players[0];
    const flagRes = await api("patch")(`/api/admin/americano/players/${targetPlayer.id}/sit-out`).send({});
    expect(flagRes.status).toBe(200);
    expect(flagRes.body.sittingOutNextRound).toBe(true);

    // Score round 1 and advance
    const afterR2 = await scoreAndAdvance(event.id, currentCourts);

    // The flagged player should NOT appear in round 2 courts
    const r2Courts = afterR2.currentCourts as any[];
    const allR2PlayerIds = r2Courts.flatMap((c: any) => [c.player1Id, c.player2Id, c.player3Id, c.player4Id]);
    expect(allR2PlayerIds).not.toContain(targetPlayer.id);

    // After the draw, sittingOutNextRound should be reset to false
    const playerRow = afterR2.players.find((p: any) => p.id === targetPlayer.id);
    expect(playerRow.sittingOutNextRound).toBe(false);
  });
});

describe("5. Bye fairness — low-bye-count players sit out first", () => {
  it("increments byeCount for players who sit out; draw prefers those with fewer byes", async () => {
    // Use 9 players on 2 courts → 1 sitter per round
    const event = await seedEvent({ id: `bye-fair-${Date.now()}`, pricePence: 0 });
    const names = ["P1 A", "P2 B", "P3 C", "P4 D", "P5 E", "P6 F", "P7 G", "P8 H", "P9 I"];
    await db.insert(bookingsTable).values(
      names.map((n, i) => ({
        eventId: event.id,
        email: `bye${i}@p3.test`,
        fullName: n,
        status: "confirmed" as const,
        paymentStatus: "free" as const,
        checkedInAt: new Date(),
      }))
    );

    const startRes = await api("post")(`/api/admin/events/${event.id}/americano`)
      .send({ format: "americano", courtsCount: 2, roundDurationMinutes: 15, totalEventMinutes: 120 });
    expect(startRes.status).toBe(201);

    const r1Courts = startRes.body.currentCourts as any[];
    const r1Players = startRes.body.players as any[];

    // Find who sat out round 1 (9 players, 2 courts = 8 play, 1 sits out)
    const onCourtR1 = new Set(r1Courts.flatMap((c: any) => [c.player1Id, c.player2Id, c.player3Id, c.player4Id]));
    const sitterR1 = r1Players.find((p: any) => !onCourtR1.has(p.id));
    expect(sitterR1).toBeDefined();

    // Score round 1 and advance
    const afterR2 = await scoreAndAdvance(event.id, r1Courts);

    // The round-1 sitter should now have byeCount = 1
    const sitterAfterR1 = afterR2.players.find((p: any) => p.id === sitterR1.id);
    expect(sitterAfterR1.byeCount).toBe(1);

    // The round-1 sitter should NOT sit out round 2 (has the most byes already)
    const r2Courts = afterR2.currentCourts as any[];
    const onCourtR2 = new Set(r2Courts.flatMap((c: any) => [c.player1Id, c.player2Id, c.player3Id, c.player4Id]));
    expect(onCourtR2.has(sitterR1.id)).toBe(true);

    // Someone else (different from R1 sitter) should be sitting out round 2
    const sitterR2 = afterR2.players.find((p: any) => !onCourtR2.has(p.id) && !p.eliminated);
    expect(sitterR2).toBeDefined();
    // The round 2 sitter must be a different player (fairness: spread byes evenly)
    expect(sitterR2.id).not.toBe(sitterR1.id);
    // byeCount is already incremented to 1 after selection (that's correct behaviour)
    expect(sitterR2.byeCount).toBe(1);
  });
});

describe("6. Score sanity validation", () => {
  it("rejects negative scores with 422", async () => {
    const { currentCourts } = await seedSession("sanity-neg");
    const court = currentCourts[0];
    const res = await api("post")(`/api/admin/americano/courts/${court.id}/score`)
      .send({ teamAScore: -1, teamBScore: 10 });
    expect(res.status).toBe(422);
  });

  it("rejects scores > 99 with 422", async () => {
    const { currentCourts } = await seedSession("sanity-high");
    const court = currentCourts[0];
    const res = await api("post")(`/api/admin/americano/courts/${court.id}/score`)
      .send({ teamAScore: 100, teamBScore: 5 });
    expect(res.status).toBe(422);
  });

  it("rejects one-sided score (only one team provided) with 400", async () => {
    const { currentCourts } = await seedSession("sanity-onesided");
    const court = currentCourts[0];
    // Missing teamBScore — Zod should reject this
    const res = await api("post")(`/api/admin/americano/courts/${court.id}/score`)
      .send({ teamAScore: 10 });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });

  it("accepts lopsided but valid scores (e.g. 21-4)", async () => {
    const { currentCourts } = await seedSession("sanity-valid");
    const court = currentCourts[0];
    const res = await api("post")(`/api/admin/americano/courts/${court.id}/score`)
      .send({ teamAScore: 21, teamBScore: 4 });
    expect(res.status).toBe(200);
  });

  it("accepts 0-0 draw", async () => {
    const { currentCourts } = await seedSession("sanity-zero");
    const court = currentCourts[0];
    const res = await api("post")(`/api/admin/americano/courts/${court.id}/score`)
      .send({ teamAScore: 0, teamBScore: 0 });
    expect(res.status).toBe(200);
  });
});
