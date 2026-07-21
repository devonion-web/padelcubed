import { pgTable, serial, text, integer, boolean, timestamp } from 'drizzle-orm/pg-core';
import { americanoSessionsTable } from './americano-sessions';

export const americanoPlayersTable = pgTable('americano_players', {
  id: serial('id').primaryKey(),
  sessionId: integer('session_id')
    .notNull()
    .references(() => americanoSessionsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email'),
  /** Set for a registered attendee */
  bookingId: integer('booking_id'),
  /** Set for an on-the-day walk-in */
  walkinId: integer('walkin_id'),
  totalPoints: integer('total_points').notNull().default(0),
  roundsPlayed: integer('rounds_played').notNull().default(0),
  wins: integer('wins').notNull().default(0),
  /** Knockout: player is out of the tournament */
  eliminated: boolean('eliminated').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AmericanoPlayer = typeof americanoPlayersTable.$inferSelect;
