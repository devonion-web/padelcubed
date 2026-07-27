/**
 * U1 — Unsubscribe route (RFC 8058 one-click).
 *
 * Security properties verified:
 *   1. GET is read-only — link scanners / prefetchers cannot silently opt people out.
 *   2. POST with valid HMAC token → opted_out_at set on members AND registrations.
 *   3. Tampered, wrong-email, and missing tokens → 400, zero DB mutation.
 *   4. RFC 8058 machine POST (body = List-Unsubscribe=One-Click) → 200, mutation.
 *   5. After opt-out: isEmailSuppressed returns true for all send types,
 *      confirming outbound email is suppressed for the opted-out address.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import app from "../../../artifacts/api-server/src/app.js";
import { db, membersTable, registrationsTable } from "@workspace/db";
import { truncateAll, seedMember, seedRegistration } from "../../setup/seed.js";
import { makeUnsubToken } from "../../../artifacts/api-server/src/routes/unsubscribe.js";
import { isEmailSuppressed } from "../../../artifacts/api-server/src/email.js";

const get  = (path: string) => request(app).get(path);
const post = (path: string) => request(app).post(path);

beforeAll(() => truncateAll());
afterAll(()  => truncateAll());

// ── GET — confirmation page; must NOT mutate DB ───────────────────────────────

describe("GET /api/unsubscribe — confirmation page (link-scanner-safe)", () => {
  it("valid token → 200 confirmation page, opted_out_at NOT touched", async () => {
    const member = await seedMember({ email: "unsub-get-valid@p3.test" });
    const tok    = makeUnsubToken(member.email);

    const res = await get(
      `/api/unsubscribe?email=${encodeURIComponent(member.email)}&tok=${tok}`,
    );

    expect(res.status).toBe(200);
    // Must contain the confirmation form (POST action) — not a success/done page
    expect(res.text).toMatch(/confirm/i);
    expect(res.text).toContain("method=\"POST\"");

    // Crucial: DB was NOT mutated on GET
    const [row] = await db.select().from(membersTable)
      .where(eq(membersTable.email, member.email));
    expect(row!.optedOutAt).toBeNull();
  });

  it("tampered token → 400, opted_out_at still null", async () => {
    const member = await seedMember({ email: "unsub-get-tamper@p3.test" });
    const tok    = "a".repeat(64); // wrong token, same length

    const res = await get(
      `/api/unsubscribe?email=${encodeURIComponent(member.email)}&tok=${tok}`,
    );

    expect(res.status).toBe(400);

    const [row] = await db.select().from(membersTable)
      .where(eq(membersTable.email, member.email));
    expect(row!.optedOutAt).toBeNull();
  });

  it("missing email param → 400", async () => {
    const res = await get("/api/unsubscribe?tok=abc123");
    expect(res.status).toBe(400);
  });

  it("missing tok param → 400", async () => {
    const res = await get("/api/unsubscribe?email=nobody@p3.test");
    expect(res.status).toBe(400);
  });
});

// ── POST — actual opt-out ─────────────────────────────────────────────────────

describe("POST /api/unsubscribe — opt-out", () => {
  it("member only — valid token → opted_out_at set on member row", async () => {
    const member = await seedMember({ email: "unsub-post-member@p3.test" });
    const tok    = makeUnsubToken(member.email);

    const res = await post(
      `/api/unsubscribe?email=${encodeURIComponent(member.email)}&tok=${tok}`,
    ).send();

    expect(res.status).toBe(200);
    expect(res.text).toMatch(/unsubscribed/i);

    const [row] = await db.select().from(membersTable)
      .where(eq(membersTable.email, member.email));
    expect(row!.optedOutAt).not.toBeNull();
  });

  it("registration only — valid token → opted_out_at set on registration row", async () => {
    const reg = await seedRegistration({ email: "unsub-post-reg@p3.test" });
    const tok  = makeUnsubToken(reg.email);

    const res = await post(
      `/api/unsubscribe?email=${encodeURIComponent(reg.email)}&tok=${tok}`,
    ).send();

    expect(res.status).toBe(200);

    const [row] = await db.select().from(registrationsTable)
      .where(eq(registrationsTable.email, reg.email));
    expect(row!.optedOutAt).not.toBeNull();
  });

  it("both member + registration — valid token → opted_out_at set on BOTH rows", async () => {
    const email  = "unsub-post-both@p3.test";
    await seedMember({ email });
    await seedRegistration({ email });
    const tok = makeUnsubToken(email);

    const res = await post(
      `/api/unsubscribe?email=${encodeURIComponent(email)}&tok=${tok}`,
    ).send();

    expect(res.status).toBe(200);

    const [mRow] = await db.select().from(membersTable)
      .where(eq(membersTable.email, email));
    const [rRow] = await db.select().from(registrationsTable)
      .where(eq(registrationsTable.email, email));

    expect(mRow!.optedOutAt).not.toBeNull();
    expect(rRow!.optedOutAt).not.toBeNull();
  });

  it("tampered token (last char flipped) → 400, no DB mutation", async () => {
    const member = await seedMember({ email: "unsub-post-tamper@p3.test" });
    const tok    = makeUnsubToken(member.email);
    const bad    = tok.slice(0, -1) + (tok.endsWith("0") ? "1" : "0");

    const res = await post(
      `/api/unsubscribe?email=${encodeURIComponent(member.email)}&tok=${bad}`,
    ).send();

    expect(res.status).toBe(400);

    const [row] = await db.select().from(membersTable)
      .where(eq(membersTable.email, member.email));
    expect(row!.optedOutAt).toBeNull();
  });

  it("token signed for different email → 400, no mutation", async () => {
    const member = await seedMember({ email: "unsub-post-wrong@p3.test" });
    const tok    = makeUnsubToken("someone-else@p3.test"); // signed for different address

    const res = await post(
      `/api/unsubscribe?email=${encodeURIComponent(member.email)}&tok=${tok}`,
    ).send();

    expect(res.status).toBe(400);

    const [row] = await db.select().from(membersTable)
      .where(eq(membersTable.email, member.email));
    expect(row!.optedOutAt).toBeNull();
  });

  it("missing params → 400, no mutation", async () => {
    const res = await post("/api/unsubscribe").send();
    expect(res.status).toBe(400);
  });

  it("RFC 8058 machine post (body=List-Unsubscribe=One-Click) → 200, opted_out_at set", async () => {
    const member = await seedMember({ email: "unsub-rfc8058@p3.test" });
    const tok    = makeUnsubToken(member.email);

    // RFC 8058: email client POSTs application/x-www-form-urlencoded with this body
    const res = await post(
      `/api/unsubscribe?email=${encodeURIComponent(member.email)}&tok=${tok}`,
    )
      .type("form")
      .send({ "List-Unsubscribe": "One-Click" });

    expect(res.status).toBe(200);

    const [row] = await db.select().from(membersTable)
      .where(eq(membersTable.email, member.email));
    expect(row!.optedOutAt).not.toBeNull();
  });
});

// ── Post-opt-out: email + webhook suppression ─────────────────────────────────
//
// After POST /api/unsubscribe succeeds, the opted_out_at timestamp on the DB
// row becomes the authoritative suppression signal. Every outbound email send
// function (sendRegistrationWelcome, sendBookingConfirmation, etc.) consumes
// this via the SuppressionData interface. These tests verify the end-to-end
// chain: unsubscribe → DB flag set → isEmailSuppressed blocks all send types.
//
// The same optedOutAt flag also gates the P³ outbound webhook notification
// system via the same isEmailSuppressed helper — any caller that looks up
// opted_out_at before firing a webhook will be blocked.

describe("post-opt-out suppression chain", () => {
  it("opted-out member → DB row has optedOutAt; all email types suppressed", async () => {
    const email = "unsub-suppress-member@p3.test";
    const member = await seedMember({ email });
    const tok    = makeUnsubToken(email);

    const optOut = await post(
      `/api/unsubscribe?email=${encodeURIComponent(email)}&tok=${tok}`,
    ).send();
    expect(optOut.status).toBe(200);

    const [row] = await db.select().from(membersTable)
      .where(eq(membersTable.email, email));
    expect(row!.optedOutAt).not.toBeNull();

    // The suppression data you'd pass to any send function
    const sup = { optedOutAt: row!.optedOutAt };
    expect(isEmailSuppressed(sup, "transactional")).toBe(true);
    expect(isEmailSuppressed(sup, "marketing")).toBe(true);
    expect(isEmailSuppressed(sup, "sponsor")).toBe(true);
  });

  it("opted-out registration → DB row has optedOutAt; all email types suppressed", async () => {
    const email = "unsub-suppress-reg@p3.test";
    await seedRegistration({ email });
    const tok = makeUnsubToken(email);

    const optOut = await post(
      `/api/unsubscribe?email=${encodeURIComponent(email)}&tok=${tok}`,
    ).send();
    expect(optOut.status).toBe(200);

    const [row] = await db.select().from(registrationsTable)
      .where(eq(registrationsTable.email, email));
    expect(row!.optedOutAt).not.toBeNull();

    const sup = { optedOutAt: row!.optedOutAt };
    expect(isEmailSuppressed(sup, "transactional")).toBe(true);
    expect(isEmailSuppressed(sup, "marketing")).toBe(true);
    expect(isEmailSuppressed(sup, "sponsor")).toBe(true);
  });

  it("non-opted-out member → optedOutAt null; transactional NOT suppressed", async () => {
    const email = "unsub-not-opted@p3.test";
    await seedMember({ email, optedOutAt: null as unknown as undefined });

    const [row] = await db.select().from(membersTable)
      .where(eq(membersTable.email, email));
    expect(row!.optedOutAt).toBeNull();

    const sup = { optedOutAt: row!.optedOutAt };
    expect(isEmailSuppressed(sup, "transactional")).toBe(false);
  });
});
