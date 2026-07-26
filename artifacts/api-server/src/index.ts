import app from "./app.js";
import { logger } from "./lib/logger.js";
import { seedIfEmpty } from "./routes/events.js";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient.js";

// ── Stripe initialisation ─────────────────────────────────────────────────────
async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for Stripe integration.");
  }

  try {
    logger.info("Initialising Stripe schema…");
    await runMigrations({ databaseUrl, schema: "stripe" });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();

    // REPLIT_DOMAINS is a dev-only variable. In production use SITE_URL, falling
    // back to the first entry in REPLIT_DOMAINS (dev) so local testing still works.
    const siteUrl =
      process.env.SITE_URL ||
      (process.env.REPLIT_DOMAINS
        ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
        : null);
    if (!siteUrl) {
      throw new Error("SITE_URL (or REPLIT_DOMAINS) is required to register the Stripe webhook.");
    }
    await stripeSync.findOrCreateManagedWebhook(`${siteUrl}/api/stripe/webhook`);
    logger.info("Stripe webhook configured");

    // Backfill runs async so it doesn't block server startup
    stripeSync.syncBackfill({ object: 'all' })
      .then(() => logger.info("Stripe backfill complete"))
      .catch((err) => logger.error({ err }, "Stripe backfill error"));
  } catch (err) {
    logger.error({ err }, "Failed to initialise Stripe");
    throw err;
  }
}

import { startWebhookWorker } from "./lib/webhookWorker.js";

// ── Server startup ────────────────────────────────────────────────────────────
const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required.");

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

// Bind the port first so the health-check probe always gets a fast response.
// Stripe init (which makes outbound network calls) runs in the background after
// the server is already listening — if it hangs or fails the shop routes handle
// the error themselves; the rest of the API is unaffected.
app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Start background webhook delivery worker (async, non-blocking)
  startWebhookWorker();

  // Stripe init is non-fatal — fire-and-forget after server is up
  initStripe().catch((stripeErr) =>
    logger.warn({ err: stripeErr }, "Stripe init failed — shop routes will return errors until resolved")
  );

  try {
    await seedIfEmpty();
  } catch (seedErr) {
    logger.error({ err: seedErr }, "Failed to seed events on startup");
  }
});
