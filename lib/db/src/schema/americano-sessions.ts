import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const americanoSessionsTable = pgTable('americano_sessions', {
  id: serial('id').primaryKey(),
  eventId: text('event_id').notNull(),
  /** americano | mexicano | round_robin | knockout */
  format: text('format').notNull().default('americano'),
  courtsCount: integer('courts_count').notNull().default(3),
  roundDurationMinutes: integer('round_duration_minutes').notNull().default(15),
  /** Total event time budget in minutes (used to cap planned rounds) */
  totalEventMinutes: integer('total_event_minutes').notNull().default(120),
  /** setup | active | complete */
  status: text('status').notNull().default('active'),
  currentRound: integer('current_round').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AmericanoSession = typeof americanoSessionsTable.$inferSelect;
