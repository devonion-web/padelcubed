import app from "./app";
import { logger } from "./lib/logger";
import { seedIfEmpty } from "./routes/events.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, async (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Seed the events table once on startup if it is empty.
  // This runs only when no events exist — safe for production.
  try {
    await seedIfEmpty();
  } catch (seedErr) {
    logger.error({ err: seedErr }, "Failed to seed events on startup");
  }
});
