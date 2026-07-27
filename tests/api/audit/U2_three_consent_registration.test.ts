/**
 * U2 — Three-consent registration API.
 *
 * Confirms that the registration endpoint correctly stores (or leaves null)
 * consent_marketing_at and consent_sponsor_at based on what the caller sends,
 * without any change to the existing consent_events_at / gdprConsent behaviour.
 *
 * Cases:
 *  1. All three consents → consent_marketing_at and consent_sponsor_at non-null.
 *  2. Events consent only → consent_marketing_at and consent_sponsor_at are null
 *     (suppression still excludes those registrants from marketing + sponsor sends).
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import app from "../../../artifacts/api-server/src/app.js";
import { db, registrationsTable } from "@workspace/db";

function uniqueEmail(tag: string) {
  return `u2.${tag}.${Date.now()}@test.invalid`;
}

const emailAllThree   = uniqueEmail("all");
const emailEventsOnly = uniqueEmail("eventsonly");

afterAll(async () => {
  await db.delete(registrationsTable).where(eq(registrationsTable.email, emailAllThree));
  await db.delete(registrationsTable).where(eq(registrationsTable.email, emailEventsOnly));
});

describe("U2 — Three-consent registration API", () => {

  // ── Case 1: all three consents ────────────────────────────────────────────

  describe("all three consents (gdpr + marketing + sponsor)", () => {
    let rowId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/registrations")
        .send({
          fullName:         "Consent Test All",
          email:            emailAllThree,
          gdprConsent:      true,
          consentMarketing: true,
          consentSponsor:   true,
        });
      expect(res.status, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`).toBe(201);
      rowId = (res.body as { id: number }).id;
    });

    it("consent_events_at is set", async () => {
      const [row] = await db
        .select({ v: registrationsTable.consentEventsAt })
        .from(registrationsTable)
        .where(eq(registrationsTable.id, rowId));
      expect(row.v).not.toBeNull();
    });

    it("consent_marketing_at is set", async () => {
      const [row] = await db
        .select({ v: registrationsTable.consentMarketingAt })
        .from(registrationsTable)
        .where(eq(registrationsTable.id, rowId));
      expect(row.v).not.toBeNull();
    });

    it("consent_sponsor_at is set", async () => {
      const [row] = await db
        .select({ v: registrationsTable.consentSponsorAt })
        .from(registrationsTable)
        .where(eq(registrationsTable.id, rowId));
      expect(row.v).not.toBeNull();
    });
  });

  // ── Case 2: events consent only ───────────────────────────────────────────

  describe("events consent only (no marketing, no sponsor)", () => {
    let rowId: number;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/registrations")
        .send({
          fullName:    "Consent Test Events Only",
          email:       emailEventsOnly,
          gdprConsent: true,
          // consentMarketing and consentSponsor intentionally omitted
        });
      expect(res.status, `Expected 201, got ${res.status}: ${JSON.stringify(res.body)}`).toBe(201);
      rowId = (res.body as { id: number }).id;
    });

    it("consent_events_at is set", async () => {
      const [row] = await db
        .select({ v: registrationsTable.consentEventsAt })
        .from(registrationsTable)
        .where(eq(registrationsTable.id, rowId));
      expect(row.v).not.toBeNull();
    });

    it("consent_marketing_at is null (suppression excludes this person from marketing)", async () => {
      const [row] = await db
        .select({ v: registrationsTable.consentMarketingAt })
        .from(registrationsTable)
        .where(eq(registrationsTable.id, rowId));
      expect(row.v).toBeNull();
    });

    it("consent_sponsor_at is null (suppression excludes this person from sponsor sends)", async () => {
      const [row] = await db
        .select({ v: registrationsTable.consentSponsorAt })
        .from(registrationsTable)
        .where(eq(registrationsTable.id, rowId));
      expect(row.v).toBeNull();
    });
  });
});
