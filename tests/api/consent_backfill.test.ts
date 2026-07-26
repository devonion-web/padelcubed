/**
 * Mobile / DB test — Consent backfill correctness.
 *
 * Verifies the backfill SQL that retroactively sets consent_events_at = created_at
 * for rows that have gdpr_consent = true but consent_events_at IS NULL
 * (rows created before the timestamp columns were added).
 *
 * Steps:
 *  1. Insert a "pre-consent" registration: gdprConsent=true, consentEventsAt=null
 *  2. Insert a control row: gdprConsent=false — must NOT be updated
 *  3. Insert another control row: consentEventsAt already set — must NOT be overwritten
 *  4. Run the backfill SQL
 *  5. Assert exactly the pre-consent row gets consentEventsAt = createdAt
 *     and the control rows are unaffected.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db, registrationsTable } from "@workspace/db";
import { truncateTables } from "../setup/seed.js";

// The canonical backfill SQL — mirrors what a migration/admin script would run
const BACKFILL_SQL = `
  UPDATE registrations
  SET    consent_events_at = created_at
  WHERE  gdpr_consent = true
  AND    consent_events_at IS NULL
`;

beforeAll(() => truncateTables("registrations"));
afterAll(() => truncateTables("registrations"));

describe("Consent backfill SQL", () => {
  let preConsentId:    number;
  let noConsentId:     number;
  let alreadySetId:    number;
  const alreadySetTs = new Date("2024-01-15T12:00:00Z");

  beforeAll(async () => {
    // Row 1: pre-consent (gdprConsent=true, consentEventsAt=null) — MUST be updated
    const [pre] = await db.insert(registrationsTable).values({
      fullName:        "Pre Consent",
      email:           "backfill-pre@p3.test",
      gdprConsent:     true,
      consentEventsAt: null,
    }).returning();
    preConsentId = pre!.id;

    // Row 2: no consent (gdprConsent=false) — must NOT be updated
    const [none] = await db.insert(registrationsTable).values({
      fullName:        "No Consent",
      email:           "backfill-none@p3.test",
      gdprConsent:     false,
      consentEventsAt: null,
    }).returning();
    noConsentId = none!.id;

    // Row 3: already has consent timestamp — must NOT be overwritten
    const [already] = await db.insert(registrationsTable).values({
      fullName:        "Already Set",
      email:           "backfill-already@p3.test",
      gdprConsent:     true,
      consentEventsAt: alreadySetTs,
    }).returning();
    alreadySetId = already!.id;

    // Run backfill
    const { pool } = await import("@workspace/db");
    await pool.query(BACKFILL_SQL);
  });

  it("pre-consent row has consentEventsAt set after backfill", async () => {
    const [row] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.id, preConsentId));
    expect(row!.consentEventsAt).not.toBeNull();
  });

  it("pre-consent row: consentEventsAt equals createdAt (within 2s)", async () => {
    const [row] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.id, preConsentId));
    const diff = Math.abs(
      row!.consentEventsAt!.getTime() - row!.createdAt.getTime(),
    );
    expect(diff).toBeLessThan(2000);
  });

  it("no-consent row is NOT updated by backfill (consentEventsAt still null)", async () => {
    const [row] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.id, noConsentId));
    expect(row!.consentEventsAt).toBeNull();
  });

  it("already-set row is NOT overwritten by backfill (timestamp preserved)", async () => {
    const [row] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.id, alreadySetId));
    expect(row!.consentEventsAt!.getTime()).toBe(alreadySetTs.getTime());
  });

  it("re-running the backfill is idempotent", async () => {
    const { pool } = await import("@workspace/db");
    // Second run: WHERE clause excludes all rows (either null gdprConsent OR already set)
    const { rowCount } = await pool.query(BACKFILL_SQL);
    expect(rowCount).toBe(0); // nothing to update
  });
});
