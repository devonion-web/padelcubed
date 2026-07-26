---
name: Test suite setup
description: Key decisions and gotchas for the @workspace/tests package (Vitest API + mobile static tests).
---

## Architecture
- Package: `tests/` → `@workspace/tests`
- API tests: `vitest.config.ts` with `pool: 'forks', singleFork: true, concurrent: false`
- Mobile tests: `vitest.mobile.config.ts` (no DB, no setup files)
- Test DB: `p3_test` on the same Replit PostgreSQL instance

## DB safety
- `globalSetup.ts` asserts test DB name matches `/^p3_test$/` or `/_test$/` AND differs from prod DB name
- `dbSetup.ts` (setupFiles) re-asserts in the worker and overrides `DATABASE_URL` before any module loads

## Schema push — NOT migrate
The project uses `drizzle-kit push` (no full migration chain). Only one partial migration exists that predates `claim_codes`. `globalSetup.ts` runs `drizzle-kit push --force` via `execSync` against the test DB — NOT `drizzle migrate()`.

## truncateAll safety
`TRUNCATE TABLE IF EXISTS` is NOT valid PostgreSQL syntax. Instead: query `pg_tables WHERE tablename = ANY($1)` to find existing tables, then truncate only those.

## Rate limiter isolation
Every API test file uses a unique `X-Forwarded-For` IP so rate-limit MemoryStore buckets don't bleed. The claimLimiter is 5/15min; M1 test uses `nextIp()` (incrementing counter) per verify call.

## claimLimiter headers
`claimLimiter` in `members.ts` has no `standardHeaders: true` config → no `ratelimit-*` response headers. Test the cap enforcement (429) rather than headers.

## Production bug found by tests
`members.ts:296` — `eq(registrationsTable.memberId, null as any)` in the claim verify handler generates `member_id = $1` (with $1=NULL). In PostgreSQL `= NULL` never matches; should be `isNull(registrationsTable.memberId)`. The registration link step silently no-ops. Documented in M1 test with `// NOTE:` comment.

## Run commands
```
pnpm test:api     # API integration tests (needs DB)
pnpm test:mobile  # Static scans (no DB)
pnpm test:all     # both
```
All commands are on both the root `package.json` and `tests/package.json`.
