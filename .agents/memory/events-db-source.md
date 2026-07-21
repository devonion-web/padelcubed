---
name: Events DB source of truth
description: Events moved to DB as sole source; no static arrays remain anywhere; attendeeCount is included in list response; admin can create/edit via event-form screen.
---

## Rule
The database is the single source of truth for events. No static `EVENTS` arrays exist in any client. Both web and mobile must fetch from `/api/events`.

**Why:** Spec required admin create/edit without a deploy cycle.

## Schema additions
- `events` table gained `published boolean NOT NULL DEFAULT true` — controls public list visibility.
- Applied via `drizzle-kit push` (column addition only, safe).

## API behaviour
- `GET /api/events` — returns published events ordered by `eventDate`, each with `attendeeCount` (confirmed bookings count via GROUP BY subquery, no N+1).
- `GET /api/events/:id` — returns single event with `attendeeCount`.
- `POST /admin/events` — create event; requires `id` field (slug); Zod-validated.
- `PUT /admin/events/:id` — full update; Zod-validated.

## Client wiring
- **Mobile events list** (`app/(tabs)/index.tsx`): `useEvents()` hook.
- **Mobile event detail** (`app/event/[id].tsx`): `useEvent(id)` hook; loading state renders `ActivityIndicator`; `scheduleReminder` now takes `eventDate` string instead of hardcoded timestamp map.
- **Mobile admin event detail** (`app/admin/event/[id].tsx`): `useAdminEvent(id, token)` for title/date in header; "Edit Event Details" button navigates to `/admin/event-form/${id}`.
- **Mobile admin tab** (`app/(tabs)/admin-tab.tsx`): "New" button in header navigates to `/admin/event-form/new`.
- **Mobile admin event form** (`app/admin/event-form/[id].tsx`): `id=new` → create mode, `id=<slug>` → edit mode.
- **Web Home** (`artifacts/padel-exchange/src/pages/Home.tsx`): `useQuery` fetches `/api/events`; static array removed; statusConfig lookup has fallback for unknown status values; featured section guarded with `events.length > 0`.

## How to apply
- Adding an event: POST to `/admin/events` with `id` (slug), or use the admin event-form screen.
- Never add events to any static array — the DB is the only source.
- `attendeeCount` is available on list response; `spotsLeft = maxSpots - attendeeCount`.
