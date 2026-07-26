/**
 * B3 — GDPR self-serve deletion: full PII scrub across all tables.
 *
 * After DELETE /api/members/me:
 *   • members: email anonymised, name anonymised, linkedinSub cleared,
 *              optedOutAt set, consentEventsAt RETAINED (legal audit trail)
 *   • registrations: fullName, email, all professional fields anonymised
 *   • bookings: email + fullName anonymised
 *   • webhook_log: payloadJson redacted for entries containing the member email
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import app from "../../../artifacts/api-server/src/app.js";
import { db, membersTable, registrationsTable, bookingsTable, webhookLogTable } from "@workspace/db";
import {
  mintMemberJwt, truncateAll, seedMember, seedEvent,
  seedRegistration, seedBooking,
} from "../../setup/seed.js";

const CLIENT_IP = "10.0.1.3";

let memberId: number;
let memberEmail: string;
let memberToken: string;

beforeAll(async () => {
  await truncateAll();

  // Create member with PII
  const m = await seedMember({
    email:       "gdpr-victim@p3.test",
    name:        "Full Name Person",
    linkedinSub: "li-sub-99",
    consentEventsAt:    new Date(),
    consentMarketingAt: new Date(),
    consentSponsorAt:   new Date(),
  });
  memberId    = m.id;
  memberEmail = m.email;

  // Create linked registration with PII
  await seedRegistration({
    memberId,
    email:       memberEmail,
    fullName:    "Full Name Person",
    company:     "Secret Corp",
    jobTitle:    "CEO",
    industry:    "Finance",
    function:    "Executive",
    seniority:   "C-suite",
    padelLevel:  "Beginner",
    interests:   ["Playing / fitness"],
    linkedinUrl: "https://linkedin.com/in/secret",
    consentEventsAt: new Date(),
  });

  // Create an event and a booking
  await seedEvent({ id: "b3-event" });
  await seedBooking({
    eventId:  "b3-event",
    memberId,
    email:    memberEmail,
    fullName: "Full Name Person",
    company:  "Secret Corp",
    status:   "confirmed",
  });

  // Insert webhook_log entry containing the member email in the payload
  await db.insert(webhookLogTable).values({
    eventType:   "registration.created",
    payloadJson: JSON.stringify({ event: "registration.created", email: memberEmail, name: "Full Name Person" }),
    status:      "pending",
    attempts:    0,
  });

  // Mint member JWT for Bearer auth (skips CSRF check)
  memberToken = mintMemberJwt({ sub: memberId, email: memberEmail });
});

afterAll(async () => {
  await truncateAll();
});

describe("B3 — GDPR deletion PII scrub", () => {
  it("DELETE /api/members/me returns 200 OK", async () => {
    const res = await request(app)
      .delete("/api/members/me")
      .set("X-Forwarded-For", CLIENT_IP)
      .set("Authorization", `Bearer ${memberToken}`)
      .send();
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  // ── members table ─────────────────────────────────────────────────────────
  it("members.email is anonymised", async () => {
    const [m] = await db.select().from(membersTable).where(eq(membersTable.id, memberId));
    expect(m!.email).toMatch(/^deleted-\d+@p3\.invalid$/);
  });

  it("members.name is anonymised", async () => {
    const [m] = await db.select().from(membersTable).where(eq(membersTable.id, memberId));
    expect(m!.name).toBe("Deleted Member");
  });

  it("members.linkedinSub is cleared", async () => {
    const [m] = await db.select().from(membersTable).where(eq(membersTable.id, memberId));
    expect(m!.linkedinSub).toBeNull();
  });

  it("members.optedOutAt is set", async () => {
    const [m] = await db.select().from(membersTable).where(eq(membersTable.id, memberId));
    expect(m!.optedOutAt).not.toBeNull();
  });

  it("members.consentEventsAt is RETAINED (legal audit trail)", async () => {
    const [m] = await db.select().from(membersTable).where(eq(membersTable.id, memberId));
    // Consent timestamps must NOT be nulled — they are the legal basis record
    expect(m!.consentEventsAt).not.toBeNull();
  });

  // ── registrations table ───────────────────────────────────────────────────
  it("registrations.email is anonymised", async () => {
    const [r] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.memberId, memberId));
    expect(r!.email).toMatch(/^deleted-reg-\d+@p3\.invalid$/);
  });

  it("registrations.fullName is anonymised", async () => {
    const [r] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.memberId, memberId));
    expect(r!.fullName).toBe("Deleted");
  });

  it("registrations PII fields are nulled", async () => {
    const [r] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.memberId, memberId));
    expect(r!.company).toBeNull();
    expect(r!.jobTitle).toBeNull();
    expect(r!.industry).toBeNull();
    expect(r!.function).toBeNull();
    expect(r!.seniority).toBeNull();
    expect(r!.interests).toBeNull();
    expect(r!.linkedinUrl).toBeNull();
  });

  // ── bookings table ────────────────────────────────────────────────────────
  it("bookings.email is anonymised", async () => {
    const [b] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.memberId, memberId));
    expect(b!.email).toMatch(/^deleted-\d+@p3\.invalid$/);
  });

  it("bookings.fullName is anonymised", async () => {
    const [b] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.memberId, memberId));
    expect(b!.fullName).toBe("Deleted");
  });

  it("bookings.company is nulled", async () => {
    const [b] = await db
      .select()
      .from(bookingsTable)
      .where(eq(bookingsTable.memberId, memberId));
    expect(b!.company).toBeNull();
  });

  // ── webhook_log table ─────────────────────────────────────────────────────
  it("webhook_log.payloadJson is redacted for entries containing member email", async () => {
    const rows = await db.select().from(webhookLogTable);
    // Every row that originally contained the member email should be redacted
    const withOriginalEmail = rows.filter((r) =>
      r.payloadJson.includes(memberEmail),
    );
    expect(withOriginalEmail).toHaveLength(0);
  });

  it("webhook_log.payloadJson redacted rows contain GDPR erasure marker", async () => {
    const rows = await db.select().from(webhookLogTable);
    const redacted = rows.filter((r) =>
      r.payloadJson.includes("gdpr-erasure"),
    );
    expect(redacted.length).toBeGreaterThan(0);
  });

  // ── Cross-member: original email is gone from all user-facing tables ───────
  it("original email no longer appears in members table", async () => {
    const rows = await db
      .select()
      .from(membersTable)
      .where(eq(membersTable.email, memberEmail));
    expect(rows).toHaveLength(0);
  });
});
