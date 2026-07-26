import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Persisted claim codes for the registration-linking flow.
 *
 * The plain 6-digit code is NEVER stored — only HMAC-SHA256(SESSION_SECRET, code).
 * Verified with timingSafeEqual to prevent timing attacks.
 * Attempts are incremented before comparison to prevent brute-force probing.
 */
export const claimCodesTable = pgTable("claim_codes", {
  id:                serial("id").primaryKey(),
  /** HMAC-SHA256(SESSION_SECRET, plaintext_code) — plain code never stored */
  codeHmac:          text("code_hmac").notNull().unique(),
  memberId:          integer("member_id").notNull(),
  registrationEmail: text("registration_email").notNull(),
  /** Incremented on every verify attempt — locked when >= MAX_VERIFY_ATTEMPTS */
  attempts:          integer("attempts").notNull().default(0),
  expiresAt:         timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt:         timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
