/**
 * Shared seed helpers for API tests.
 *
 * - mintAdminJwt / mintMemberJwt: sign test JWTs using SESSION_SECRET
 * - seedEvent / seedMember / seedRegistration / seedBooking: insert rows and
 *   return the full inserted row so tests can reference IDs.
 * - truncate(tables): truncate tables in dependency order, resetting sequences.
 */

import jwt from "jsonwebtoken";
import { db, eventsTable, membersTable, registrationsTable, bookingsTable, webhookLogTable, claimCodesTable } from "@workspace/db";
import type { AdminJwtPayload } from "../../artifacts/api-server/src/middleware/adminAuth.js";
import type { MemberJwtPayload } from "../../artifacts/api-server/src/middleware/memberAuth.js";

// ── JWT helpers ───────────────────────────────────────────────────────────────

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET not set");
  return s;
}

export function mintAdminJwt(
  overrides: Partial<AdminJwtPayload> = {},
): string {
  const payload: AdminJwtPayload = {
    sub:   overrides.sub   ?? 1,
    email: overrides.email ?? "admin@p3.test",
    name:  overrides.name  ?? "Test Admin",
    role:  overrides.role  ?? "admin",
  };
  return jwt.sign({ iss: "p3-admin", ...payload }, secret(), { expiresIn: "1h" });
}

export function mintMemberJwt(
  overrides: Partial<Omit<MemberJwtPayload, "iss">> = {},
): string {
  const payload = {
    sub:   overrides.sub   ?? 99,
    email: overrides.email ?? "member@p3.test",
    name:  overrides.name  ?? "Test Member",
  };
  return jwt.sign({ iss: "p3-member", ...payload }, secret(), { expiresIn: "1h" });
}

// ── Event seed ────────────────────────────────────────────────────────────────

export async function seedEvent(
  overrides: Partial<typeof eventsTable.$inferInsert> = {},
) {
  const id = overrides.id ?? `test-event-${Date.now()}`;
  const [row] = await db
    .insert(eventsTable)
    .values({
      id,
      title:      "Test Event",
      date:       "Thursday 1 January 2099",
      dateShort:  "1 Jan",
      time:       "6:00 pm – 9:00 pm",
      venue:      "Test Venue",
      location:   "Test Location",
      format:     "Americano",
      price:      "Free",
      pricePence: 0,
      status:     "available",
      published:  true,
      maxSpots:   16,
      ...overrides,
    })
    .returning();
  return row!;
}

// ── Member seed ───────────────────────────────────────────────────────────────

export async function seedMember(
  overrides: Partial<typeof membersTable.$inferInsert> = {},
) {
  const ts = Date.now();
  const [row] = await db
    .insert(membersTable)
    .values({
      email:       overrides.email ?? `member-${ts}@p3.test`,
      name:        overrides.name  ?? "Test Member",
      linkedinSub: overrides.linkedinSub,
      ...overrides,
    })
    .returning();
  return row!;
}

// ── Registration seed ─────────────────────────────────────────────────────────

export async function seedRegistration(
  overrides: Partial<typeof registrationsTable.$inferInsert> = {},
) {
  const ts = Date.now();
  const [row] = await db
    .insert(registrationsTable)
    .values({
      fullName:    "Test Registrant",
      email:       `reg-${ts}@p3.test`,
      gdprConsent: true,
      consentEventsAt: new Date(),
      ...overrides,
    })
    .returning();
  return row!;
}

// ── Booking seed ──────────────────────────────────────────────────────────────

export async function seedBooking(
  overrides: Partial<typeof bookingsTable.$inferInsert> = {},
) {
  const ts = Date.now();
  if (!overrides.eventId) throw new Error("seedBooking requires eventId");
  const [row] = await db
    .insert(bookingsTable)
    .values({
      eventId:       overrides.eventId,
      email:         `booking-${ts}@p3.test`,
      fullName:      "Test Booker",
      status:        "confirmed",
      paymentStatus: "free",
      ...overrides,
    })
    .returning();
  return row!;
}

// ── Truncate helpers ──────────────────────────────────────────────────────────

const ALL_TABLES = [
  "claim_codes",
  "webhook_log",
  "password_resets",
  "americano_players",
  "americano_rounds",
  "americano_courts",
  "americano_sessions",
  "walkins",
  "bookings",
  "registrations",
  "corporate_enquiries",
  "members",
  "events",
  "admin_users",
];

/**
 * Truncate all test-relevant tables in safe dependency order,
 * resetting serial sequences so IDs are predictable per test file.
 * Only truncates tables that actually exist — safe against partial schemas.
 */
export async function truncateAll(): Promise<void> {
  const { pool } = await import("@workspace/db");
  // Discover which of our tables actually exist in the DB
  const { rows } = await pool.query<{ tablename: string }>(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1)`,
    [ALL_TABLES],
  );
  const existing = rows.map((r) => r.tablename);
  if (existing.length === 0) return;

  // Preserve truncation order (leaves first) by using the original array order
  const ordered = ALL_TABLES.filter((t) => existing.includes(t));
  // Single statement with CASCADE handles all FK relationships
  await pool.query(
    `TRUNCATE TABLE ${ordered.map((t) => `"${t}"`).join(", ")} RESTART IDENTITY CASCADE`,
  );
}

/**
 * Truncate only specific tables (pass the SQL table names).
 */
export async function truncateTables(...tables: string[]): Promise<void> {
  if (tables.length === 0) return;
  const { pool } = await import("@workspace/db");
  await pool.query(
    `TRUNCATE TABLE ${tables.join(", ")} RESTART IDENTITY CASCADE`,
  );
}
