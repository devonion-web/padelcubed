import {
  pgTable,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const eventsTable = pgTable("events", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  date: text("date").notNull(),
  dateShort: text("date_short").notNull(),
  time: text("time").notNull(),
  venue: text("venue").notNull(),
  location: text("location").notNull(),
  format: text("format").notNull().default("Americano"),
  sponsor: text("sponsor"),
  price: text("price").notNull().default("Free"),
  status: text("status").notNull().default("available"),
  description: text("description"),
  maxSpots: integer("max_spots").default(16),
  eventDate: timestamp("event_date", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Event = typeof eventsTable.$inferSelect;
