import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';
import { adminUsersTable } from './admin-users';

export const passwordResetsTable = pgTable('password_resets', {
  id: serial('id').primaryKey(),
  adminUserId: integer('admin_user_id')
    .notNull()
    .references(() => adminUsersTable.id, { onDelete: 'cascade' }),
  /** 6-digit numeric code */
  code: text('code').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type PasswordReset = typeof passwordResetsTable.$inferSelect;
