/**
 * API — terms acceptance is persisted to the database.
 *
 * Tests:
 *   1. A registration submitted with termsAccepted:true stores a non-null
 *      terms_accepted_at timestamp and the correct terms_version.
 *   2. A registration submitted without termsAccepted leaves both columns null.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { eq } from "drizzle-orm";
import app from "../../../artifacts/api-server/src/app.js";
import { db, registrationsTable } from "@workspace/db";

const UNIQUE_SUFFIX = `terms-${Date.now()}`;
const EMAIL_WITH    = `with-terms-${UNIQUE_SUFFIX}@e2e.test`;
const EMAIL_WITHOUT = `no-terms-${UNIQUE_SUFFIX}@e2e.test`;

beforeAll(async () => {
  await db.delete(registrationsTable).where(eq(registrationsTable.email, EMAIL_WITH));
  await db.delete(registrationsTable).where(eq(registrationsTable.email, EMAIL_WITHOUT));
});

afterAll(async () => {
  await db.delete(registrationsTable).where(eq(registrationsTable.email, EMAIL_WITH));
  await db.delete(registrationsTable).where(eq(registrationsTable.email, EMAIL_WITHOUT));
});

describe("Terms acceptance persistence", () => {
  it("terms_accepted_at is non-null when termsAccepted:true is submitted", async () => {
    const res = await request(app)
      .post("/api/registrations")
      .send({
        fullName:      "Terms Test User",
        email:         EMAIL_WITH,
        gdprConsent:   true,
        termsAccepted: true,
        termsVersion:  "1.0",
      });

    expect(res.status).toBe(201);

    const [row] = await db
      .select({
        termsAcceptedAt: registrationsTable.termsAcceptedAt,
        termsVersion:    registrationsTable.termsVersion,
      })
      .from(registrationsTable)
      .where(eq(registrationsTable.email, EMAIL_WITH));

    expect(row).toBeDefined();
    expect(row.termsAcceptedAt).not.toBeNull();
    expect(row.termsVersion).toBe("1.0");
  });

  it("terms_accepted_at is null when termsAccepted is omitted", async () => {
    const res = await request(app)
      .post("/api/registrations")
      .send({
        fullName:    "Terms Test User",
        email:       EMAIL_WITHOUT,
        gdprConsent: true,
      });

    expect(res.status).toBe(201);

    const [row] = await db
      .select({
        termsAcceptedAt: registrationsTable.termsAcceptedAt,
        termsVersion:    registrationsTable.termsVersion,
      })
      .from(registrationsTable)
      .where(eq(registrationsTable.email, EMAIL_WITHOUT));

    expect(row).toBeDefined();
    expect(row.termsAcceptedAt).toBeNull();
    expect(row.termsVersion).toBeNull();
  });
});
