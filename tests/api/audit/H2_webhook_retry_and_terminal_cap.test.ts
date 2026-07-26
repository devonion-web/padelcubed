/**
 * H2 — Outbound webhook: retry with back-off, terminal at attempt cap,
 *       excluded from further drains, transient failure recovers.
 *
 * Tests processWebhookEntry and drainWebhookQueue directly against the DB
 * so we don't need actual network timeouts.
 *
 * Key constants from webhookService.ts:
 *   HARD_CAP = 10   — entries with attempts ≥ 10 are never retried
 *   Back-off window = 60s (entries with lastAttemptAt < 60s ago are skipped)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { db, webhookLogTable } from "@workspace/db";
import {
  processWebhookEntry,
  drainWebhookQueue,
} from "../../../artifacts/api-server/src/lib/webhookService.js";
import { truncateTables } from "../../setup/seed.js";
import { WebhookCaptureServer } from "../../setup/webhookCapture.js";

const captureServer = new WebhookCaptureServer();
let captureUrl: string;

beforeAll(async () => {
  captureUrl = await captureServer.start();
});

afterAll(async () => {
  delete process.env.WEBHOOK_URL;
  await captureServer.stop();
  await truncateTables("webhook_log");
});

beforeEach(async () => {
  await truncateTables("webhook_log");
  captureServer.reset();
  captureServer.setMode("accept");
  process.env.WEBHOOK_URL = captureUrl;
});

/** Insert a single pending entry and return its id. */
async function insertEntry(opts: { attempts?: number; lastAttemptAt?: Date | null } = {}) {
  const [row] = await db
    .insert(webhookLogTable)
    .values({
      eventType:   "registration.created",
      payloadJson: JSON.stringify({ event: "registration.created", email: "test@p3.test" }),
      status:      "pending",
      attempts:    opts.attempts ?? 0,
      lastAttemptAt: opts.lastAttemptAt === undefined ? null : opts.lastAttemptAt,
    })
    .returning();
  return row!;
}

describe("H2 — webhook retry and terminal cap", () => {
  // ── Dead URL: non-2xx response drives attempts up ──────────────────────────
  it("non-2xx response increments attempts and keeps status=pending (< cap)", async () => {
    captureServer.setMode("reject"); // 503
    const entry = await insertEntry();

    await processWebhookEntry(entry);

    const [updated] = await db.select().from(webhookLogTable).where(eq(webhookLogTable.id, entry.id));
    expect(updated!.attempts).toBe(1);
    expect(updated!.status).toBe("pending");
    expect(updated!.lastAttemptAt).not.toBeNull();
  });

  it("after HARD_CAP (10) failed attempts status becomes 'failed'", async () => {
    captureServer.setMode("reject");
    // Insert entry already at attempts=9 (one more will hit cap)
    const entry = await insertEntry({ attempts: 9 });

    await processWebhookEntry(entry);

    const [updated] = await db.select().from(webhookLogTable).where(eq(webhookLogTable.id, entry.id));
    expect(updated!.attempts).toBe(10);
    expect(updated!.status).toBe("failed");
  });

  it("failed entry at cap is excluded from drainWebhookQueue", async () => {
    captureServer.setMode("reject");
    // Entry already at cap — mark it failed manually
    const [capped] = await db
      .insert(webhookLogTable)
      .values({
        eventType:     "registration.created",
        payloadJson:   JSON.stringify({ event: "test" }),
        status:        "failed",
        attempts:      10,
        lastAttemptAt: new Date(Date.now() - 120_000), // 2 min ago (past back-off)
      })
      .returning();

    await drainWebhookQueue();

    // Should not have been touched — capture server still at 0 requests
    expect(captureServer.requests()).toHaveLength(0);
    const [row] = await db.select().from(webhookLogTable).where(eq(webhookLogTable.id, capped!.id));
    expect(row!.attempts).toBe(10);
    expect(row!.status).toBe("failed");
  });

  // ── Back-off: recent attempt is skipped by drain ──────────────────────────
  it("entry with recent lastAttemptAt is skipped by drainWebhookQueue (back-off)", async () => {
    captureServer.setMode("accept");
    // Attempt made just now — within the 60s back-off window
    await insertEntry({ attempts: 1, lastAttemptAt: new Date() });

    await drainWebhookQueue();

    expect(captureServer.requests()).toHaveLength(0);
  });

  it("entry with old lastAttemptAt IS picked up by drainWebhookQueue", async () => {
    captureServer.setMode("accept");
    // Attempt made 61s ago — past the back-off cutoff
    const old = new Date(Date.now() - 61_000);
    await insertEntry({ attempts: 1, lastAttemptAt: old });

    await drainWebhookQueue();

    expect(captureServer.requests()).toHaveLength(1);
  });

  // ── Transient failure recovers ─────────────────────────────────────────────
  it("transient failure (503) then success delivers the entry", async () => {
    captureServer.setMode("reject");
    const entry = await insertEntry();

    // First attempt: failure
    await processWebhookEntry(entry);

    // Simulate time passing (set lastAttemptAt to the past)
    await db
      .update(webhookLogTable)
      .set({ lastAttemptAt: new Date(Date.now() - 65_000) })
      .where(eq(webhookLogTable.id, entry.id));

    // Switch to accepting mode and re-fetch entry (attempts=1 now)
    const [refreshed] = await db
      .select()
      .from(webhookLogTable)
      .where(eq(webhookLogTable.id, entry.id));

    captureServer.setMode("accept");
    await processWebhookEntry(refreshed!);

    const [delivered] = await db
      .select()
      .from(webhookLogTable)
      .where(eq(webhookLogTable.id, entry.id));
    expect(delivered!.status).toBe("delivered");
    expect(captureServer.requests().at(-1)!.signatureValid).toBe(true);
  });

  // ── Successful delivery ────────────────────────────────────────────────────
  it("successful delivery sets status=delivered and captures valid HMAC signature", async () => {
    captureServer.setMode("accept");
    const entry = await insertEntry();

    await processWebhookEntry(entry);

    const [updated] = await db.select().from(webhookLogTable).where(eq(webhookLogTable.id, entry.id));
    expect(updated!.status).toBe("delivered");
    expect(updated!.deliveredAt).not.toBeNull();
    expect(captureServer.lastRequest()!.signatureValid).toBe(true);
  });

  // ── No WEBHOOK_URL → silent skip ──────────────────────────────────────────
  it("processWebhookEntry is a no-op when WEBHOOK_URL is not set", async () => {
    delete process.env.WEBHOOK_URL;
    const entry = await insertEntry();

    await processWebhookEntry(entry);

    // Entry should be unchanged
    const [row] = await db.select().from(webhookLogTable).where(eq(webhookLogTable.id, entry.id));
    expect(row!.attempts).toBe(0);
    expect(row!.status).toBe("pending");
  });
});
