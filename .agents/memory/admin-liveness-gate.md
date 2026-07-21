---
name: Admin liveness gate
description: The getLiveStatus() time window must never block admin operational tools — and how to keep the test event live.
---

## Rule
Admin operational tools (Scan QR, Walk-in, Begin Event / Manage Tournament, Standings, Export) must **never** be gated on `liveStatus`. The status badge is informational only.

**Why:** `getLiveStatus()` in `admin-events.ts` computes a `live` window of `eventDate - 90min → eventDate + 4h`. Once the test event passes that window it becomes `ended` and all admin tooling vanishes from the UI, making it impossible to test or run a tournament. Admin knows the context better than the clock.

**How to apply:**
- `admin/event/[id].tsx`: do not branch on `isLive` / `isEnded` for showing/hiding tool buttons. Show all tools unconditionally; use `liveStatus` only for the status badge and the contextual notice text.
- The `ContextNotice` component shows a soft informational banner for upcoming/ended, but does not lock anything.
- Check-in row toggles: always enabled for admin (no `isLive` gate).

## Test event date
The `test-live` event in the DB must have `event_date` within the live window to get the green LIVE badge (cosmetic, not functional). To refresh it:
```sql
UPDATE events SET event_date = NOW() - INTERVAL '1 hour' WHERE id = 'test-live';
```
This sets the window to `NOW() - 2.5h → NOW() + 3h`.

## Session prerequisites
`POST /api/admin/events/:eventId/americano` requires ≥ 4 checked-in players (bookings with `checkedInAt IS NOT NULL`). The test-live event has 12 checked-in dummy bookings — enough for 3 courts.
