import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
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
  courtsCount: integer("courts_count").default(3),
  roundDurationMinutes: integer("round_duration_minutes").default(15),
  totalEventMinutes: integer("total_event_minutes").default(120),
  eventDate: timestamp("event_date", { withTimezone: true }),
  published: boolean("published").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Event = typeof eventsTable.$inferSelect;
