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

    const webhookBase = `https://${process.env.REPLIT_DOMAINS?.split(",")[0]}`;
    await stripeSync.findOrCreateManagedWebhook(`${webhookBase}/api/stripe/webhook`);
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

// ── Server startup ────────────────────────────────────────────────────────────
const rawPort = process.env["PORT"];
if (!rawPort) throw new Error("PORT environment variable is required.");

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);

// Stripe init is non-fatal — other routes keep working if credentials are
// temporarily unavailable. Shop routes have their own error handling.
try {
  await initStripe();
} catch (err) {
  logger.warn({ err }, "Stripe init failed — shop routes will return errors until resolved");
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  try {
    await seedIfEmpty();
  } catch (seedErr) {
    logger.error({ err: seedErr }, "Failed to seed events on startup");
  }
});
