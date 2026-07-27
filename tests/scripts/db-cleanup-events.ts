import {
  db, eventsTable, bookingsTable,
  americanoSessionsTable, americanoPlayersTable, americanoRoundsTable,
  walkinsTable,
} from "@workspace/db";
import { americanoCourtsTable } from "@workspace/db";
import { inArray, eq } from "drizzle-orm";

const testIds = ["evt-000","evt-001","evt-002","live-2026-07-26","test-live"];

// Step 1 — session IDs
const sessions = await db
  .select({ id: americanoSessionsTable.id })
  .from(americanoSessionsTable)
  .where(inArray(americanoSessionsTable.eventId, testIds));
const sessionIds = sessions.map((s) => s.id);
console.log("sessions:", sessionIds);

if (sessionIds.length > 0) {
  // Step 2 — round IDs (needed to delete courts, which ref rounds AND players)
  const rounds = await db
    .select({ id: americanoRoundsTable.id })
    .from(americanoRoundsTable)
    .where(inArray(americanoRoundsTable.sessionId, sessionIds));
  const roundIds = rounds.map((r) => r.id);
  console.log("rounds:", roundIds);

  if (roundIds.length > 0) {
    // Step 3 — courts (ref round_id and player_id — must go before players)
    await db.delete(americanoCourtsTable)
      .where(inArray(americanoCourtsTable.roundId, roundIds));
    console.log("✓ americano_courts");
  }

  // Step 4 — players (courts now gone, safe to delete)
  await db.delete(americanoPlayersTable)
    .where(inArray(americanoPlayersTable.sessionId, sessionIds));
  console.log("✓ americano_players");

  // Step 5 — rounds
  await db.delete(americanoRoundsTable)
    .where(inArray(americanoRoundsTable.sessionId, sessionIds));
  console.log("✓ americano_rounds");

  // Step 6 — sessions
  await db.delete(americanoSessionsTable)
    .where(inArray(americanoSessionsTable.id, sessionIds));
  console.log("✓ americano_sessions");
}

// Step 7 — bookings
await db.delete(bookingsTable).where(inArray(bookingsTable.eventId, testIds));
console.log("✓ bookings");

// Step 8 — walk-ins
await db.delete(walkinsTable).where(inArray(walkinsTable.eventId, testIds));
console.log("✓ walkins");

// Step 9 — events
await db.delete(eventsTable).where(inArray(eventsTable.id, testIds));
console.log("✓ test events deleted");

// Step 10 — update event 4 with confirmed launch details
await db.update(eventsTable).set({
  title:       "P³ Launch — People, Padel, Places",
  date:        "Thursday 15 October 2026",
  dateShort:   "15 Oct",
  time:        "6:30 pm – 9:00 pm",
  venue:       "Padium",
  location:    "Canary Wharf, London",
  format:      "Americano",
  sponsor:     "P³",
  price:       "£20",
  pricePence:  2000,
  maxSpots:    16,
  courtsCount: 2,
  status:      "soon",
  published:   true,
  eventDate:   new Date("2026-10-15T17:30:00Z"),
  description: "P³'s debut ticketed event — founders, finance and GRC leaders meet on court at Padium, Canary Wharf. Americano format, drinks, and introductions.",
}).where(eq(eventsTable.id, "4"));
console.log("✓ event 4 updated");

// Verify final state
const remaining = await db
  .select({ id: eventsTable.id, title: eventsTable.title, status: eventsTable.status, venue: eventsTable.venue })
  .from(eventsTable)
  .orderBy(eventsTable.eventDate);
console.log("\nFinal event list:");
for (const r of remaining) console.log("  ", JSON.stringify(r));
process.exit(0);
