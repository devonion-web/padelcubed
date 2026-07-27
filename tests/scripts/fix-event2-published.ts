/**
 * Set event 2 (Surbiton Exchange) to published=true, status="soon"
 * so it appears in the public listing (not bookable — booking opens when admin
 * flips status to "available").
 */
import { db, eventsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

await db.update(eventsTable)
  .set({ published: true, status: "soon" })
  .where(eq(eventsTable.id, "2"));

console.log("✓ Event 2 → published=true, status=soon");
process.exit(0);
