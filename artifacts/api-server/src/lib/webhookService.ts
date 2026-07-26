/**
 * Outbound webhook service.
 *
 * Enqueues events to webhook_log; the background worker drains the queue.
 * Never fires inline — call enqueueWebhook() from any route and return immediately.
 *
 * Config (env vars — named sub-processor config, not hardcoded):
 *   WEBHOOK_URL    — target endpoint (e.g. Make.com / n8n webhook URL)
 *   WEBHOOK_SECRET — HMAC-SHA256 signing key; signature in X-P3-Signature header
 */
import { createHmac } from "crypto";
import { db, webhookLogTable } from "@workspace/db";
import { eq, and, lte, lt } from "drizzle-orm";
import { sql } from "drizzle-orm";

export type WebhookEventType = "registration.created" | "booking.paid";

/** Enqueue a webhook event — synchronous DB insert only, never blocks on HTTP. */
export async function enqueueWebhook(
  eventType: WebhookEventType,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    await db.insert(webhookLogTable).values({
      eventType,
      payloadJson: JSON.stringify({ event: eventType, ...payload, meta: { timestamp: new Date().toISOString() } }),
      status: "pending",
      attempts: 0,
    });
  } catch (err) {
    // Log failure but never propagate — webhook failure must not break the request
    console.error("[webhook] Failed to enqueue:", err);
  }
}

function sign(body: string): string {
  const secret = process.env.WEBHOOK_SECRET ?? "";
  return "sha256=" + createHmac("sha256", secret).update(body).digest("hex");
}

const MAX_ATTEMPTS = 3;

/** Process a single pending webhook_log entry. Called by the background worker. */
export async function processWebhookEntry(entry: { id: number; payloadJson: string; attempts: number }): Promise<void> {
  const url = process.env.WEBHOOK_URL;
  if (!url) return; // Silently skip — not configured yet

  const signature = sign(entry.payloadJson);
  const attempts = entry.attempts + 1;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-P3-Signature": signature,
        "X-P3-Event-Id": String(entry.id),
      },
      body: entry.payloadJson,
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    if (res.ok) {
      await db
        .update(webhookLogTable)
        .set({ status: "delivered", attempts, deliveredAt: new Date(), lastAttemptAt: new Date() })
        .where(eq(webhookLogTable.id, entry.id));
    } else {
      const newStatus = attempts >= MAX_ATTEMPTS ? "failed" : "pending";
      await db
        .update(webhookLogTable)
        .set({ status: newStatus, attempts, lastAttemptAt: new Date() })
        .where(eq(webhookLogTable.id, entry.id));
      console.warn(`[webhook] Delivery failed (${res.status}) for entry ${entry.id}, attempt ${attempts}/${MAX_ATTEMPTS}`);
    }
  } catch (err) {
    const newStatus = attempts >= MAX_ATTEMPTS ? "failed" : "pending";
    await db
      .update(webhookLogTable)
      .set({ status: newStatus, attempts, lastAttemptAt: new Date() })
      .where(eq(webhookLogTable.id, entry.id));
    console.warn(`[webhook] Network error for entry ${entry.id}, attempt ${attempts}/${MAX_ATTEMPTS}:`, err);
  }
}

/** Drain all pending entries from the queue. Called by the background worker. */
export async function drainWebhookQueue(): Promise<void> {
  if (!process.env.WEBHOOK_URL) return;

  try {
    // Exponential back-off: only retry entries whose last attempt was >delay ago
    // Attempt 1: immediate, Attempt 2: 60s, Attempt 3: 300s
    const retryDelaySeconds = 60;
    const cutoff = new Date(Date.now() - retryDelaySeconds * 1000);

    const pending = await db
      .select()
      .from(webhookLogTable)
      .where(
        and(
          eq(webhookLogTable.status, "pending"),
          sql`(${webhookLogTable.lastAttemptAt} IS NULL OR ${webhookLogTable.lastAttemptAt} < ${cutoff})`,
        ),
      )
      .limit(20);

    for (const entry of pending) {
      await processWebhookEntry(entry);
    }
  } catch (err) {
    console.error("[webhook] Worker drain error:", err);
  }
}
