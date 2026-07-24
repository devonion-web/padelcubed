---
name: Stripe Shop Setup
description: How Stripe is wired up for the P³ apparel shop — credential fetch, backfill quirks, and known gotchas.
---

# Stripe Shop Setup

## Credential fetch
The Replit connectors API returns `settings.secret` and `settings.publishable` — NOT `settings.secret_key`. The skill template is wrong; use `settings.secret` for the Stripe secret key.

**Why:** Confirmed by live inspection of the connectors API response. The template uses `secret_key` but the actual field is `secret`.

## syncBackfill must be called with `{ object: 'all' }`
`stripeSync.syncBackfill()` with no arguments silently syncs nothing. The switch statement falls through all cases when `object` is undefined.

**Why:** Source inspection of stripe-replit-sync v1.0.0 dist/index.js:1158 — `const { object } = params ?? { object: this.getSupportedEventTypes }` — when params is omitted, object becomes a function reference that matches no switch case.

**How to apply:** Always call `syncBackfill({ object: 'all' })` in initStripe and when running manual backfills.

## runMigrations + tables
`runMigrations({ databaseUrl, schema: 'stripe' })` ran but the `stripe.accounts` table didn't exist until the second run. The fix was running `runMigrations` manually from the shell, after which all 30 stripe schema tables were created. On subsequent server starts everything is idempotent.

## Seed-then-backfill ordering
Products must exist in Stripe BEFORE backfill runs, or they won't be synced. If you seed products and then immediately start the server, the backfill may race ahead. Run a manual backfill after seeding to guarantee sync.

## P³ shop products (test mode)
- P³ Hoodie — £55 — prod_UwbqZdfEaX4SUt
- P³ Padel Shirt — £35 — prod_UwbqDv1utsuAFa
- P³ Cap — £25 — prod_UwbqZvG26AFrPd
- P³ Shorts — £30 — prod_Uwbq80SP8M2XnM

Re-seed is idempotent (checks by name before creating).

## Shop routes
- `GET /api/shop/products` — queries stripe.products + stripe.prices, groups by product
- `POST /api/shop/checkout` — creates one-time `payment` mode Stripe Checkout session; accepts `{ priceId, size? }`

## stripe.products column names
Has `created` (unix timestamp), `images` (text[]), `metadata` (jsonb). The SQL CTE must SELECT `created` if the outer query uses `ORDER BY p.created`.

## Webhook route ordering
Stripe webhook route MUST be registered in app.ts BEFORE `app.use(express.json())`. The current app.ts does this correctly.
