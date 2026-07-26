---
name: Test suite setup
description: Key decisions and gotchas for the @workspace/tests package (Vitest API + mobile static + Playwright web E2E).
---

## Architecture
- Package: `tests/` → `@workspace/tests`
- API tests: `vitest.config.ts` with `pool: 'forks', singleFork: true, concurrent: false`
- Mobile tests: `vitest.mobile.config.ts` (no DB, no setup files)
- Web E2E tests: `playwright.config.ts` with chromium; baseURL=http://localhost:24308
- Test DB: `p3_test` on the same Replit PostgreSQL instance

## Run commands
```
pnpm test:api     # API integration tests (needs DB + API server running)
pnpm test:mobile  # Static source scans (no runtime needed)
pnpm test:web     # Playwright E2E (needs API server + web server running)
pnpm test:all     # all three
```

## Final test counts (all passing, 0 skipped)
- API:    119 / 119  (16 files)
- Mobile:   9 /   9   (2 files)
- Web E2E: 25 /  25   (6 files)

## DB safety
- `globalSetup.ts` asserts test DB name matches `/^p3_test$/` and differs from prod DB name
- `dbSetup.ts` (setupFiles) re-asserts in the worker and overrides `DATABASE_URL` before any module loads

## Schema push — NOT migrate
The project uses `drizzle-kit push` (no full migration chain). Only one partial migration exists that predates many tables. `globalSetup.ts` runs `drizzle-kit push --force` via `execSync` against the test DB — NOT `drizzle migrate()`.

## truncateAll safety
`TRUNCATE TABLE IF EXISTS` is NOT valid PostgreSQL syntax. Instead: query `pg_tables WHERE tablename = ANY($1)` to find existing tables, then truncate only those.

## Rate limiter isolation
Every API test file uses a unique `X-Forwarded-For` IP so rate-limit MemoryStore buckets don't bleed. The claimLimiter is 5/15min; M1 test uses `nextIp()` (incrementing counter) per verify call.

## claimLimiter headers
`claimLimiter` in `members.ts` has no `standardHeaders: true` config → no `ratelimit-*` response headers.

## Production bug found and FIXED
`members.ts` — `eq(registrationsTable.memberId, null as any)` in the claim verify handler generates `member_id = $1` (with $1=NULL). In PostgreSQL `= NULL` never matches; should be `isNull(registrationsTable.memberId)`. Fixed. M1 test now asserts the link IS made after verify.

## Drizzle null comparison audit — clean
Grep confirmed: zero `eq(<col>, null)` and zero `ne(<col>, null)` Drizzle calls anywhere in the codebase. The only `!== undefined` hit is a plain JS Zod `.refine()` callback in admin-charge.ts — unrelated to Drizzle.

## Playwright NixOS library fix
Chromium headless-shell is a prebuilt Ubuntu binary; needs libs not on the default path in Replit's NixOS.

`tests/setup/playwrightGlobalSetup.ts` sets `LD_LIBRARY_PATH` before browser launch:
- libgbm.so.1  → `/nix/store/2vaiy8gb6y6mic8dn6pbnf446b3k9358-mesa-22.3.7/lib`
- libudev.so.1 → `/nix/store/447fq1l8zagjhc15j07fgwwhs433bwqd-eudev-3.2.11/lib`
- libglib-2.0  → `/nix/store/26hcp8h792wl0h52c5r94qakhvk6q717-glib-2.82.1/lib`

Also set in `test:web` npm script as fallback.

## Playwright selector gotcha — two role="dialog" elements
The homepage has two `role="dialog"` elements: the IntentModal (`aria-modal="true"`) and a CookieBanner (no aria-modal). Use `page.locator('[role="dialog"][aria-modal="true"]')` NOT `page.getByRole("dialog")`.

## Vite dev proxy for Playwright
Added `server.proxy: { '/api': { target: 'http://localhost:8080' } }` to `artifacts/padel-exchange/vite.config.ts` so Playwright (hitting port 24308 directly) can reach the API without going through the Replit proxy.

## Member JWT secret
API server uses `SESSION_SECRET` env var (not `JWT_SECRET`) for member token signing. Issuer is `"p3-member"`.

## EventsSection FEATURED_IDS — booking spec critical detail
EventsSection filters `allEvents` through `FEATURED_IDS = ["2", "4"]`. Mocked events in booking.spec.ts MUST use IDs "2" and "4" or they are filtered out and no cards render (tests would always skip). Also: events with `status: "soon"` show "Register interest →" not "Book a spot →" — mock must use `status: "available"`.

## BookingModal submit button text
- Free event: "Reserve my spot"
- Paid event: "Pay £XX & reserve spot"  (£ symbol + price from event.price)
- Success screen: "You're in — see you on court."
- GDPR gate: button is `disabled={loading || !fields.gdpr}` — clicking is impossible until checkbox checked.
