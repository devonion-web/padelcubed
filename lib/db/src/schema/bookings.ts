import {
  pgTable,
  text,
  serial,
  integer,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { eventsTable } from "./events";
import { membersTable } from "./members";

export const bookingsTable = pgTable(
  "bookings",
  {
    id: serial("id").primaryKey(),

    // Linked member account (null for legacy/anonymous bookings)
    memberId: integer("member_id").references(() => membersTable.id, {
      onDelete: "set null",
    }),

    eventId: text("event_id")
      .notNull()
      .references(() => eventsTable.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    company: text("company"),

    // 'pending_payment' | 'confirmed' | 'cancelled'
    status: text("status").notNull().default("confirmed"),

    // 'free' | 'pending' | 'paid' | 'refunded'
    paymentStatus: text("payment_status").notNull().default("free"),
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
