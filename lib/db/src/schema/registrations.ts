import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { membersTable } from "./members";

export const registrationsTable = pgTable("registrations", {
  id: serial("id").primaryKey(),

  // Linked member account (null for pre-account registrations)
  memberId: integer("member_id").references(() => membersTable.id, {
    onDelete: "set null",
  }),

  // Core identity
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),

  // Professional segmentation — the commercial engine; never remove these
  company: text("company"),
  jobTitle: text("job_title"),
  industry: text("industry"),
  function: text("function"),
  seniority: text("seniority"),
  padelLevel: text("padel_level"),
  interests: text("interests").array(),
  linkedinUrl: text("linkedin_url"),

  // UTM attribution
  utmSource: text("utm_source"),
  utmMedium: text("utm_medium"),
  utmCampaign: text("utm_campaign"),
  utmContent: text("utm_content"),
  utmTerm: text("utm_term"),

  // Consent — granular timestamps
  // consentEventsAt    — "Keep me posted about P³ events, and store my details so you can."
  // consentMarketingAt — "Send me the occasional newsletter and the odd update beyond events."
  // consentSponsorAt   — "When a sponsor's a genuine match for someone like me, I'm happy to
  //                       be introduced." IDENTIFIABLE personal introduction consent ONLY.
  //                       Does NOT cover anonymised cohort sharing (disclosed, no tick needed).
  //                       Do NOT treat pre-2025 consent_sponsor_at rows (if any) as covering
  //                       personal intros — check created_at against the label-change date.
  consentEventsAt: timestamp("consent_events_at", { withTimezone: true }),
  consentMarketingAt: timestamp("consent_marketing_at", { withTimezone: true }),
  consentSponsorAt: timestamp("consent_sponsor_at", { withTimezone: true }),

  // Opt-out — set by one-click unsubscribe link; suppresses all further email
  optedOutAt: timestamp("opted_out_at", { withTimezone: true }),

  // Legacy boolean kept for backwards-compat read; new rows use timestamp fields
  gdprConsent: boolean("gdpr_consent").notNull().default(false),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertRegistrationSchema = createInsertSchema(
  registrationsTable,
).omit({ id: true, createdAt: true, memberId: true });

export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrationsTable.$inferSelect;
