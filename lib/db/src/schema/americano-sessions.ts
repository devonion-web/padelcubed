import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const americanoSessionsTable = pgTable('americano_sessions', {
  id: serial('id').primaryKey(),
  eventId: text('event_id').notNull(),
  // 'setup' | 'active' | 'complete'
  status: text('status').notNull().default('active'),
  currentRound: integer('current_round').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AmericanoSession = typeof americanoSessionsTable.$inferSelect;
