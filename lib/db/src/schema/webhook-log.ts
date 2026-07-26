import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Outbound webhook delivery log.
 * Background worker drains this queue asynchronously — never blocks a request thread.
 * Retried up to 3× with exponential back-off; status 'failed' after exhaustion.
 */
export const webhookLogTable = pgTable("webhook_log", {
  id: serial("id").primaryKey(),

  // Event type: 'registration.created' | 'booking.paid'
  eventType: text("event_type").notNull(),

  // Full JSON payload to deliver
  payloadJson: text("payload_json").notNull(),

  // 'pending' | 'delivered' | 'failed'
  status: text("status").notNull().default("pending"),

  // Delivery attempts made so far
  attempts: integer("attempts").notNull().default(0),

  // Timestamp of last successful delivery
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),

  // Timestamp of last attempt (success or failure)
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WebhookLog = typeof webhookLogTable.$inferSelect;
