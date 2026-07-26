/**
 * Happy path — Registration.
 *
 * Covers:
 *  - All consent combos (events-only, events+marketing, events+marketing+sponsor, none)
 *  - Three granular timestamps stored per combo
 *  - UTM attribution captured
 *  - Backfill logic: pre-consent row (gdprConsent=true, consentEventsAt=null)
 *    updated by the known backfill SQL → consentEventsAt set to createdAt
 *  - Duplicate email → 409
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import app from "../../../artifacts/api-server/src/app.js";
import { db, registrationsTable } from "@workspace/db";
import { truncateAll } from "../../setup/seed.js";

const CLIENT_IP = "10.0.2.1";
const post = (path: string) =>
  request(app).post(path).set("X-Forwarded-For", CLIENT_IP);

const BASE_BODY = {
  fullName:    "Test Person",
  email:       "", // set per test
  company:     "ACME Ltd",
  jobTitle:    "CTO",
  industry:    "Technology",
  function:    "Product / Engineering",
  seniority:   "C-suite",
  padelLevel:  "Beginner",
  interests:   ["Playing / fitness"],
  linkedinUrl: "https://linkedin.com/in/test",
  gdprConsent: true,
};

beforeAll(() => truncateAll());
afterAll(() => truncateAll());

describe("Registration happy paths", () => {
  // ── Events-only consent (gdprConsent=true, others false) ──────────────────
  it("events-only consent → consentEventsAt set, marketing+sponsor null", async () => {
    const body = { ...BASE_BODY, email: "reg-events-only@p3.test", gdprConsent: true,
                   consentMarketing: false, consentSponsor: false };
    const res = await post("/api/registrations").send(body);
    expect(res.status).toBe(201);

    const [row] = await db.select().from(registrationsTable)
      .where(eq(registrationsTable.email, body.email));
    expect(row!.consentEventsAt).not.toBeNull();
    expect(row!.consentMarketingAt).toBeNull();
    expect(row!.consentSponsorAt).toBeNull();
  });

  // ── Events + marketing ────────────────────────────────────────────────────
  it("events+marketing consent → two timestamps set, sponsor null", async () => {
    const body = { ...BASE_BODY, email: "reg-events-mkt@p3.test",
                   gdprConsent: true, consentMarketing: true, consentSponsor: false };
    const res = await post("/api/registrations").send(body);
    expect(res.status).toBe(201);

    const [row] = await db.select().from(registrationsTable)
      .where(eq(registrationsTable.email, body.email));
    expect(row!.consentEventsAt).not.toBeNull();
    expect(row!.consentMarketingAt).not.toBeNull();
    expect(row!.consentSponsorAt).toBeNull();
  });

  // ── All three consents ─────────────────────────────────────────────────────
  it("all three consents → all three timestamps set", async () => {
    const body = { ...BASE_BODY, email: "reg-all-consent@p3.test",
                   gdprConsent: true, consentMarketing: true, consentSponsor: true };
    const res = await post("/api/registrations").send(body);
    expect(res.status).toBe(201);

    const [row] = await db.select().from(registrationsTable)
      .where(eq(registrationsTable.email, body.email));
    expect(row!.consentEventsAt).not.toBeNull();
    expect(row!.consentMarketingAt).not.toBeNull();
    expect(row!.consentSponsorAt).not.toBeNull();
  });

  // ── No consent ────────────────────────────────────────────────────────────
  it("no consent → all three timestamps null", async () => {
    const body = { ...BASE_BODY, email: "reg-no-consent@p3.test",
                   gdprConsent: false, consentMarketing: false, consentSponsor: false };
    const res = await post("/api/registrations").send(body);
    expect(res.status).toBe(201);

    const [row] = await db.select().from(registrationsTable)
      .where(eq(registrationsTable.email, body.email));
    expect(row!.consentEventsAt).toBeNull();
    expect(row!.consentMarketingAt).toBeNull();
    expect(row!.consentSponsorAt).toBeNull();
  });

  // ── UTM attribution ───────────────────────────────────────────────────────
  it("UTM params captured on registration", async () => {
    const body = {
      ...BASE_BODY, email: "reg-utm@p3.test",
      gdprConsent: true,
      utmSource: "linkedin", utmMedium: "social",
      utmCampaign: "q3-launch", utmContent: "banner-a", utmTerm: "padel",
    };
    const res = await post("/api/registrations").send(body);
    expect(res.status).toBe(201);

    const [row] = await db.select().from(registrationsTable)
      .where(eq(registrationsTable.email, body.email));
    expect(row!.utmSource).toBe("linkedin");
    expect(row!.utmMedium).toBe("social");
    expect(row!.utmCampaign).toBe("q3-launch");
    expect(row!.utmContent).toBe("banner-a");
    expect(row!.utmTerm).toBe("padel");
  });

  // ── Duplicate email → 409 ─────────────────────────────────────────────────
  it("duplicate email → 409 Conflict", async () => {
    const email = "reg-duplicate@p3.test";
    await post("/api/registrations").send({ ...BASE_BODY, email, gdprConsent: true });
    const res = await post("/api/registrations").send({ ...BASE_BODY, email, gdprConsent: true });
    expect(res.status).toBe(409);
  });

  // ── Backfill: pre-consent row → consentEventsAt backfilled ─────────────────
  it("backfill: gdprConsent=true + consentEventsAt=null → SQL sets consentEventsAt=createdAt", async () => {
    // Simulate a pre-consent row that pre-dates the timestamp columns
    const [pre] = await db.insert(registrationsTable).values({
      fullName:       "Pre Consent",
      email:          "reg-preconsent@p3.test",
      gdprConsent:    true,
      consentEventsAt: null, // as if inserted before the timestamp column was added
    }).returning();

    // Run the known backfill SQL (mirrors what a migration or admin script would do)
    const { pool } = await import("@workspace/db");
    await pool.query(`
      UPDATE registrations
      SET    consent_events_at = created_at
      WHERE  gdpr_consent = true
      AND    consent_events_at IS NULL
    `);

    const [updated] = await db.select().from(registrationsTable)
      .where(eq(registrationsTable.id, pre!.id));
    expect(updated!.consentEventsAt).not.toBeNull();
    // consentEventsAt should equal createdAt (within a second of each other)
    const diff = Math.abs(
      updated!.consentEventsAt!.getTime() - updated!.createdAt.getTime()
    );
    expect(diff).toBeLessThan(2000);
  });

  // ── Invalid body ─────────────────────────────────────────────────────────
  it("missing required fields → 400", async () => {
    const res = await post("/api/registrations").send({ email: "bad@p3.test" });
    expect(res.status).toBe(400);
  });
});
