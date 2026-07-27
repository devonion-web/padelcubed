/**
 * Audit: current events + Americano engine row counts.
 */
import {
  db, eventsTable, bookingsTable, walkinsTable,
  americanoSessionsTable, americanoPlayersTable,
  americanoRoundsTable, americanoCourtsTable,
} from "@workspace/db";
import { count } from "drizzle-orm";

const events = await db
  .select({ id: eventsTable.id, title: eventsTable.title, published: eventsTable.published, status: eventsTable.status })
  .from(eventsTable).orderBy(eventsTable.eventDate);
console.log("── events ─────────────────────────────────────────────────────");
for (const e of events) console.log(" ", JSON.stringify(e));

const sessions = await db
  .select({ id: americanoSessionsTable.id, eventId: americanoSessionsTable.eventId, status: americanoSessionsTable.status })
  .from(americanoSessionsTable);

const [{ n: sN }] = await db.select({ n: count() }).from(americanoSessionsTable);
const [{ n: pN }] = await db.select({ n: count() }).from(americanoPlayersTable);
const [{ n: rN }] = await db.select({ n: count() }).from(americanoRoundsTable);
const [{ n: cN }] = await db.select({ n: count() }).from(americanoCourtsTable);
const [{ n: bN }] = await db.select({ n: count() }).from(bookingsTable);
const [{ n: wN }] = await db.select({ n: count() }).from(walkinsTable);

console.log("\n── americano engine (surviving rows) ──────────────────────────");
console.log(` americano_sessions : ${sN}  →`, JSON.stringify(sessions));
console.log(` americano_players  : ${pN}`);
console.log(` americano_rounds   : ${rN}`);
console.log(` americano_courts   : ${cN}`);
console.log(` bookings           : ${bN}`);
console.log(` walkins            : ${wN}`);

process.exit(0);
