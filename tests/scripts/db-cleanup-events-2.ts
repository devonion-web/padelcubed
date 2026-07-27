/**
 * Phase-2 event cleanup
 * ─────────────────────
 * • Checks bookings / sessions / walkins on IDs 1, 3, 5
 * • Hard-deletes if safe; sets published=false otherwise
 * • Sets event 2  → published=false, status="soon"  (private rehearsal)
 * • Updates event 4 → courtsCount=4, broad description, keep status=soon
 */
import {
  db, eventsTable, bookingsTable,
  americanoSessionsTable, americanoPlayersTable, americanoRoundsTable,
  walkinsTable, americanoCourtsTable,
} from "@workspace/db";
import { inArray, eq } from "drizzle-orm";

const REMOVE_IDS = ["1", "3", "5"];

// ── 1. Check for FK-dependent rows ───────────────────────────────────────────
const bk = await db
  .select({ eventId: bookingsTable.eventId })
  .from(bookingsTable)
  .where(inArray(bookingsTable.eventId, REMOVE_IDS));

const am = await db
  .select({ id: americanoSessionsTable.id, eventId: americanoSessionsTable.eventId })
  .from(americanoSessionsTable)
  .where(inArray(americanoSessionsTable.eventId, REMOVE_IDS));

const wk = await db
  .select({ eventId: walkinsTable.eventId })
  .from(walkinsTable)
  .where(inArray(walkinsTable.eventId, REMOVE_IDS));

console.log(`bookings on 1/3/5 : ${bk.length}`);
console.log(`sessions on 1/3/5 : ${am.length}`);
console.log(`walkins  on 1/3/5 : ${wk.length}`);

const canHardDelete = bk.length === 0 && am.length === 0 && wk.length === 0;

if (canHardDelete) {
  // Safe to hard-delete
  await db.delete(eventsTable).where(inArray(eventsTable.id, REMOVE_IDS));
  console.log("✓ IDs 1, 3, 5 → HARD DELETED (no dependent rows)");
} else {
  // Rows reference these events — hide instead of deleting
  const sessionIds = am.map((s) => s.id);
  if (sessionIds.length > 0) {
    // cascade through americano tables before hiding
    const rounds = await db
      .select({ id: americanoRoundsTable.id })
      .from(americanoRoundsTable)
      .where(inArray(americanoRoundsTable.sessionId, sessionIds));
    if (rounds.length > 0) {
      await db.delete(americanoCourtsTable)
        .where(inArray(americanoCourtsTable.roundId, rounds.map((r) => r.id)));
    }
    await db.delete(americanoPlayersTable)
      .where(inArray(americanoPlayersTable.sessionId, sessionIds));
    await db.delete(americanoRoundsTable)
      .where(inArray(americanoRoundsTable.sessionId, sessionIds));
    await db.delete(americanoSessionsTable)
      .where(inArray(americanoSessionsTable.id, sessionIds));
  }
  await db.update(eventsTable)
    .set({ published: false })
    .where(inArray(eventsTable.id, REMOVE_IDS));
  console.log("✓ IDs 1, 3, 5 → published=false (had dependent rows — bookings/walkins preserved)");
}

// ── 2. Event 2 — private rehearsal, not publicly visible ─────────────────────
await db.update(eventsTable).set({
  published: false,
  status:    "soon",
}).where(eq(eventsTable.id, "2"));
console.log("✓ Event 2 (Surbiton) → published=false, status=soon (private rehearsal)");

// ── 3. Event 4 — fix courtsCount + description ───────────────────────────────
await db.update(eventsTable).set({
  courtsCount: 4,   // 16 players ÷ 4 per court = 4 courts
  description: "An evening of curated play and new connections at Padium, Canary Wharf. " +
               "Americano format, drinks, and a room full of founders and senior professionals worth meeting.",
}).where(eq(eventsTable.id, "4"));
console.log("✓ Event 4 → courtsCount=4, description updated");

// ── 4. Final state ────────────────────────────────────────────────────────────
const remaining = await db
  .select({
    id:        eventsTable.id,
    title:     eventsTable.title,
    status:    eventsTable.status,
    published: eventsTable.published,
    venue:     eventsTable.venue,
  })
  .from(eventsTable)
  .orderBy(eventsTable.eventDate);

console.log("\nFinal event table:");
for (const r of remaining) console.log("  ", JSON.stringify(r));
process.exit(0);
