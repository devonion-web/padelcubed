import { pgTable, serial, integer, timestamp } from 'drizzle-orm/pg-core';
import { americanoRoundsTable } from './americano-rounds';
import { americanoPlayersTable } from './americano-players';

export const americanoCourtsTable = pgTable('americano_courts', {
  id: serial('id').primaryKey(),
  roundId: integer('round_id')
    .notNull()
    .references(() => americanoRoundsTable.id, { onDelete: 'cascade' }),
  courtNumber: integer('court_number').notNull(),
  // Team A: player1 + player2  vs  Team B: player3 + player4
  player1Id: integer('player1_id')
    .notNull()
    .references(() => americanoPlayersTable.id),
  player2Id: integer('player2_id')
    .notNull()
    .references(() => americanoPlayersTable.id),
  player3Id: integer('player3_id')
    .notNull()
    .references(() => americanoPlayersTable.id),
  player4Id: integer('player4_id')
    .notNull()
    .references(() => americanoPlayersTable.id),
  /** Null until scores are entered */
  teamAScore: integer('team_a_score'),
  teamBScore: integer('team_b_score'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AmericanoCourt = typeof americanoCourtsTable.$inferSelect;
