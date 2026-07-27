import { db, eventsTable } from "@workspace/db";
const rows = await db
  .select({ id: eventsTable.id, title: eventsTable.title, venue: eventsTable.venue, date: eventsTable.date, status: eventsTable.status, published: eventsTable.published })
  .from(eventsTable).orderBy(eventsTable.eventDate);
for (const r of rows) console.log(JSON.stringify(r));
process.exit(0);
