import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const registrationsTable = pgTable("registrations", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  company: text("company"),
  jobTitle: text("job_title"),
  industry: text("industry"),
  function: text("function"),
  seniority: text("seniority"),
  padelLevel: text("padel_level"),
  interests: text("interests").array(),
  linkedinUrl: text("linkedin_url"),
  gdprConsent: boolean("gdpr_consent").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertRegistrationSchema = createInsertSchema(
  registrationsTable,
).omit({ id: true, createdAt: true });

export type InsertRegistration = z.infer<typeof insertRegistrationSchema>;
export type Registration = typeof registrationsTable.$inferSelect;
