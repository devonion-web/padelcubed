import { pgTable, serial, text, boolean, timestamp, integer } from 'drizzle-orm/pg-core';

export const walkinsTable = pgTable('walkins', {
  id: serial('id').primaryKey(),
  eventId: text('event_id').notNull(),
  name: text('name').notNull(),
  email: text('email').notNull(),
  paid: boolean('paid').notNull().default(false),
  checkedInAt: timestamp('checked_in_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Walkin = typeof walkinsTable.$inferSelect;
export type WalkinInsert = typeof walkinsTable.$inferInsert;
