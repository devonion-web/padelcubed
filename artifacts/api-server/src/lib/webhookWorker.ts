/**
 * Background webhook worker.
 *
 * Runs as a setInterval inside the API server process — no separate worker needed.
 * Drains the webhook_log queue every 30 seconds.
 * Survives process restarts automatically (started fresh on each boot).
 *
 * If WEBHOOK_URL is not set, the worker runs but does nothing (skips silently).
 */
import { drainWebhookQueue } from "./webhookService.js";

const INTERVAL_MS = 30_000; // 30 seconds

let started = false;

export function startWebhookWorker(): void {
  if (started) return;
  started = true;

  // Run once immediately on startup to clear any entries that survived a restart
  drainWebhookQueue().catch((err) =>
    console.error("[webhook-worker] Initial drain error:", err),
  );

  setInterval(() => {
    drainWebhookQueue().catch((err) =>
      console.error("[webhook-worker] Interval drain error:", err),
    );
  }, INTERVAL_MS);

  console.log("[webhook-worker] Started — polling every 30s");
}
