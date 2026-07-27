import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Member accounts — created on first LinkedIn OIDC sign-in.
 * Separate from admin_users; these are event attendees/registrants.
 *
 * Consent fields are stored as timestamps (null = not given).
 * Three independent consents per GDPR granularity requirements:
 *   a) events  — "Keep me posted about P³ events, and store my details so you can."
 *   b) marketing — "Send me the occasional newsletter and the odd update beyond events."
 *   c) sponsor  — "When a sponsor's a genuine match for someone like me, I'm happy to
 *                  be introduced." IDENTIFIABLE personal introduction consent ONLY.
 *                  Anonymised cohort sharing is disclosed separately — no tick required.
 *
 * Original registrations (pre-accounts) backfill:
 *   consent_events_at  = registration.created_at  (original checkbox covered this)
 *   consent_marketing_at = NULL                    (not explicitly captured)
 *   consent_sponsor_at  = NULL                    (not explicitly captured)
 */
export const membersTable = pgTable("members", {
  id: serial("id").primaryKey(),

  // Identity
  email: text("email").notNull().unique(),
  name: text("name").notNull(),

  // LinkedIn OIDC stable identifier (sub claim)
  linkedinSub: text("linkedin_sub").unique(),

  // Granular consent timestamps (null = not given / pre-dates this system)
  consentEventsAt: timestamp("consent_events_at", { withTimezone: true }),
  consentMarketingAt: timestamp("consent_marketing_at", { withTimezone: true }),
  consentSponsorAt: timestamp("consent_sponsor_at", { withTimezone: true }),

  // Contractual acceptance — 18+ age confirmation + Terms of Use + Terms of Sale
  termsAcceptedAt: timestamp("terms_accepted_at", { withTimezone: true }),
  termsVersion:    text("terms_version"),

  // Opt-out / soft-delete
  optedOutAt: timestamp("opted_out_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Member = typeof membersTable.$inferSelect;
export type InsertMember = typeof membersTable.$inferInsert;
