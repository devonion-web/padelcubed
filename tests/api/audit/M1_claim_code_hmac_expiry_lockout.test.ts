/**
 * M1 — Claim code: HMAC-signed, DB-persisted (survives restart),
 *       expires after 24h, locks out after 5 wrong attempts.
 *
 * Strategy: insert known codes directly into claimCodesTable (bypassing the
 * HTTP initiation endpoint that sends email) so we control the raw code.
 * The verify endpoint is tested via HTTP with Bearer auth (CSRF auto-skipped).
 *
 * IP strategy: claimLimiter is 5/15min per IP. Each test case that calls
 * verify() uses a unique virtual IP so no single IP exhausts the limiter.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createHmac } from "crypto";
import { eq } from "drizzle-orm";
import app from "../../../artifacts/api-server/src/app.js";
import { db, claimCodesTable, registrationsTable } from "@workspace/db";
import { truncateAll, seedMember, seedRegistration, mintMemberJwt } from "../../setup/seed.js";

// Each test case uses a unique IP to avoid hitting the claimLimiter (5/15min)
let ipIndex = 0;
const nextIp = () => `10.1.${Math.floor(++ipIndex / 254)}.${(ipIndex % 254) + 1}`;

function hmacCode(code: string): string {
  return createHmac("sha256", process.env.SESSION_SECRET!).update(code).digest("hex");
}

const GOOD_CODE  = "654321";
const WRONG_CODE = "000000";

let memberId: number;
let memberToken: string;
let regEmail: string;

beforeAll(async () => {
  await truncateAll();

  const m = await seedMember({ email: "m1-member@p3.test", name: "M1 Member" });
  memberId    = m.id;
  memberToken = mintMemberJwt({ sub: memberId, email: m.email });

  const reg = await seedRegistration({
    email: "m1-registration@p3.test",
    fullName: "M1 Registrant",
  });
  regEmail = reg.email;
});

afterAll(async () => {
  await truncateAll();
});

async function insertCode(opts: {
  code?:      string;
  attempts?:  number;
  expiresAt?: Date;
} = {}) {
  await db.delete(claimCodesTable).where(eq(claimCodesTable.memberId, memberId));
  const [row] = await db.insert(claimCodesTable).values({
    codeHmac:          hmacCode(opts.code ?? GOOD_CODE),
    memberId,
    registrationEmail: regEmail,
    attempts:          opts.attempts ?? 0,
    expiresAt:         opts.expiresAt ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
  }).returning();
  return row!;
}

/** Each call uses a fresh IP to stay under the 5/15min claimLimiter cap. */
const verify = (body: object, ip = nextIp()) =>
  request(app)
    .post("/api/members/claim-registration/verify")
    .set("X-Forwarded-For", ip)
    .set("Authorization", `Bearer ${memberToken}`)
    .send(body);

describe("M1 — claim code HMAC, expiry, lockout", () => {
  // ── HMAC sign + DB persistence ────────────────────────────────────────────
  it("code is stored as HMAC-SHA256 digest (not plaintext)", async () => {
    const row = await insertCode();
    expect(row.codeHmac).toBe(hmacCode(GOOD_CODE));
    expect(row.codeHmac).not.toBe(GOOD_CODE);
    expect(row.codeHmac).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it("correct code → 200 OK and registration IS linked to member", async () => {
    await insertCode();
    const res = await verify({ code: GOOD_CODE });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    // The registration row must now have memberId set.
    // (Bug was: members.ts used eq(col, null) → SQL `member_id = NULL` which
    // always matches 0 rows. Fixed by replacing with isNull(col).)
    const [reg] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.email, regEmail));
    expect(reg!.memberId).toBe(memberId);
  });

  it("code is consumed on success (cannot be reused)", async () => {
    // Code row must be deleted after a successful verify
    const rows = await db
      .select()
      .from(claimCodesTable)
      .where(eq(claimCodesTable.memberId, memberId));
    expect(rows).toHaveLength(0);
  });

  // ── Expiry ────────────────────────────────────────────────────────────────
  it("expired code → 400 'Invalid or expired code'", async () => {
    await insertCode({ expiresAt: new Date(Date.now() - 1000) }); // already expired
    const res = await verify({ code: GOOD_CODE });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
    await db.delete(claimCodesTable).where(eq(claimCodesTable.memberId, memberId));
  });

  // ── Persistence across 'restart' ──────────────────────────────────────────
  it("code persists across server restart (DB-backed)", async () => {
    await insertCode();
    const rows = await db
      .select()
      .from(claimCodesTable)
      .where(eq(claimCodesTable.memberId, memberId));
    expect(rows).toHaveLength(1);
    expect(rows[0]!.codeHmac).toBe(hmacCode(GOOD_CODE));
    await db.delete(claimCodesTable).where(eq(claimCodesTable.memberId, memberId));
  });

  // ── Wrong code: attempts counted, remaining shown ─────────────────────────
  it("wrong code → 400 with attempts-remaining message", async () => {
    await insertCode({ attempts: 0 });
    const res = await verify({ code: WRONG_CODE });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid code/i);
    expect(res.body.error).toMatch(/4 attempt/i); // 5 - (0+1) = 4 remaining
    await db.delete(claimCodesTable).where(eq(claimCodesTable.memberId, memberId));
  });

  it("wrong code increments attempts in DB", async () => {
    await insertCode({ attempts: 1 }); // already 1, we'll add another
    await verify({ code: WRONG_CODE });

    const [row] = await db
      .select()
      .from(claimCodesTable)
      .where(eq(claimCodesTable.memberId, memberId));
    expect(row!.attempts).toBe(2);
    await db.delete(claimCodesTable).where(eq(claimCodesTable.memberId, memberId));
  });

  // ── Lockout after 5th wrong attempt ───────────────────────────────────────
  it("5th wrong attempt → 400 'Too many attempts — code locked'", async () => {
    await insertCode({ attempts: 4 });
    const res = await verify({ code: WRONG_CODE });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/too many attempts/i);
    await db.delete(claimCodesTable).where(eq(claimCodesTable.memberId, memberId));
  });

  it("locked code (attempts=5) is excluded from future verify queries", async () => {
    // Insert code already at lockout threshold (attempts=5)
    // The query filters `attempts < MAX_VERIFY_ATTEMPTS`, so this won't be found
    await insertCode({ attempts: 5 });
    const res = await verify({ code: GOOD_CODE });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/invalid or expired/i);
    await db.delete(claimCodesTable).where(eq(claimCodesTable.memberId, memberId));
  });

  // ── Invalid body ─────────────────────────────────────────────────────────
  it("non-6-digit code body → 400 validation error", async () => {
    const res = await verify({ code: "12345" }); // 5 digits, not 6
    expect(res.status).toBe(400);
  });
});
