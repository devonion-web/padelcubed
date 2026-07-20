import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  integer,
} from "drizzle-orm/pg-core";

export const corporateEnquiriesTable = pgTable("corporate_enquiries", {
  id: serial("id").primaryKey(),
  company: text("company").notNull(),
  contactName: text("contact_name").notNull(),
  workEmail: text("work_email").notNull(),
  phone: text("phone"),
  eventType: text("event_type").notNull(),
  headcount: integer("headcount"),
  timeframe: text("timeframe"),
  budgetRange: text("budget_range"),
  message: text("message"),
  gdprConsent: boolean("gdpr_consent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type InsertCorporateEnquiry = typeof corporateEnquiriesTable.$inferInsert;
export type CorporateEnquiry = typeof corporateEnquiriesTable.$inferSelect;
