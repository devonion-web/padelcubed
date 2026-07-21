---
name: Phase 3 implementation
description: Format manager (Americano/Mexicano/Round Robin/Knockout), QR tickets, admin auth — key decisions and notes.
---

## Format Manager (all 4 formats)

**DB schema additions** (pushed via drizzle-kit push):
- `americano_sessions`: added `format` (text, default 'americano'), `courts_count` (integer), `round_duration_minutes` (integer)
- `americano_players`: added `wins` (integer, default 0), `eliminated` (boolean, default false)
- `americano_rounds`: `started_at` already existed — used for server-synced timer

**Score entry**: One-team only. Team A enters score X → Team B = 32 − X (fixed 32 total per court, standard padel americano).

**Draw algorithms** (in `artifacts/api-server/src/routes/admin-americano.ts`):
- `americano`: pure random shuffle every round
- `mexicano`: round 1 random; round 2+ sort by points desc, pair 1+4 vs 2+3
- `round_robin`: pure random (same as americano, different label)
- `knockout`: same as mexicano but after each round, losing team per court marked `eliminated=true`

**Timer sync**: All devices compute `remaining = durationMinutes * 60 - (now - started_at_ms)`. Server sets `started_at` via `PUT /admin/americano/rounds/:id/start`.

**Key API routes**:
- `POST /admin/events/:id/americano` — start session (accepts format, courtsCount, roundDurationMinutes), generates round 1 draw with no `started_at`
- `PUT /admin/americano/rounds/:id/start` — sets `started_at = now`, syncing all devices
- `POST /admin/events/:id/americano/rounds` — next round (validates all courts scored first; for knockout, marks losers eliminated)
- `POST /admin/americano/courts/:id/score` — one-team entry, handles re-scoring (reverses previous points before applying new)
- `GET /admin/events/:id/report` — post-event CSV with attendance + americano leaderboard (in admin-events.ts)

**Mobile screens**:
- `app/admin/format-setup/[id].tsx` — format picker (4 cards) + courts stepper + duration stepper → calls POST to start session → navigates to americano/[id]
- `app/admin/americano/[id].tsx` — generic format manager: draw display, server-synced countdown ring, per-court score entry, Start Round / Next Round buttons, eliminated players section for knockout
- `app/admin/event/[id].tsx` — toolbar: Walk-in always visible; LIVE adds Scan QR + Format + Manage + Export; ENDED adds Full Report + Final Standings + Attendance CSV

**Walk-ins**: Always accessible from event detail regardless of liveStatus.

**liveStatus window**: live = eventDate−90min to eventDate+4h; computed server-side and returned in GET /admin/events.

## QR Tickets / Admin Check-in (Phase 3 original)
- QR ticket in booking confirmation email (base64 encoded booking ID)
- Scan screen at `app/admin/scan/[id].tsx` uses expo-camera
- Check-in toggle on booking rows in event detail

## Admin Auth
- JWT multi-user; ADMIN_PASSWORD env var is bootstrap-only master key
- Forgot-password: 6-digit code logged to server stdout (30 min TTL, single-use)
- Admin email: `info@padelcubed.co.uk`
