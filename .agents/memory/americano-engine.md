---
name: Americano engine
description: DB tables, API routes, mobile screens for on-site tournament management. Key design decisions and known pitfalls.
---

## Rule
"Next Round" must never auto-complete the session for Americano / Mexicano / Round Robin formats. Only Knockout auto-completes when `active.length < 4`.

**Why:** The original code always auto-completed when active players < 4, which fired immediately after round 1 if the session had only 4 players (1 court). Fixed by checking `session.format === "knockout"` first.

## Score entry
Both team scores are entered independently — there is NO fixed total (the old `32 - teamAScore` formula has been removed).

**API** (`POST /admin/americano/courts/:courtId/score`):
- Accepts `{ teamAScore: number, teamBScore: number }` — both required, min 0, no max.

**Mobile** (`CourtCard`): Two separate `TextInput` fields (Team A tinted primary, Team B tinted indigo). Tab/return advances from A to B input. Save button appears only when both fields are filled.

**api-client-react** (`useEnterScore`): mutation payload is `{ courtId, teamAScore, teamBScore, eventId }`.

## How to apply
- Never revert to the single-score auto-calculate pattern.
- If adding a fixed-total mode later, add a `pointsPerCourt` field on the session and validate on the API; do NOT hardcode 32.

## Screens
- `app/admin/format-setup/[id].tsx` — format/courts/duration picker; creates session via POST.
- `app/admin/americano/[id].tsx` — main manager: draw, timer, score entry, leaderboard shortcut.
- `app/admin/leaderboard/[id].tsx` — full standings.
- `app/admin/scan/[id].tsx` — QR check-in.
- `app/admin/walkin/[id].tsx` — walk-in add.
