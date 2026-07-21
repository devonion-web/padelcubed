import { pgTable, serial, integer, timestamp } from 'drizzle-orm/pg-core';
import { americanoSessionsTable } from './americano-sessions';

export const americanoRoundsTable = pgTable('americano_rounds', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => americanoSessionsTable.id, { onDelete: 'cascade' }),
  roundNumber: integer('round_number').notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  endedAt: timestamp('ended_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AmericanoRound = typeof americanoRoundsTable.$inferSelect;
