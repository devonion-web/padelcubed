import {
  pgTable,
  text,
  serial,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { eventsTable } from "./events";

export const bookingsTable = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => eventsTable.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    company: text("company"),
    status: text("status").notNull().default("confirmed"),
    // Payment fields
    paymentStatus: text("payment_status").notNull().default("free"), // 'free' | 'pending' | 'paid'
    stripeSessionId: text("stripe_session_id"),
    bookedAt: timestamp("booked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
  },
  (table) => [
    unique("bookings_event_email_uniq").on(table.eventId, table.email),
  ],
);

export type Booking = typeof bookingsTable.$inferSelect;
