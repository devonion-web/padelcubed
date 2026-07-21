---
name: Americano engine
description: On-site event management — walk-ins, Americano draw, scores, leaderboard, CSV export.
---

## Rule
All Americano and walk-in routes sit behind `requireAdmin` middleware. Scores are entered per-court and immediately update player totals. The draw algorithm sorts by points (descending) each round except round 1 (random); groups of 4 → Team A = [1st, 4th], Team B = [2nd, 3rd].

**Why:** Partners the strongest with the weakest to balance courts, which is standard for competitive Americano.

## DB tables added
walkins, americano_sessions, americano_players, americano_rounds, americano_courts — all with cascade deletes from the session.

## API routes (all under /api/admin/)
- GET/POST events/:id/walkins, PATCH walkins/:id/paid, PATCH walkins/:id/checkin
- GET/POST events/:id/americano, POST events/:id/americano/rounds
- POST americano/courts/:id/score
- GET events/:id/leaderboard, GET events/:id/export (CSV)

## Mobile screens
- app/admin/walkin/[id] — add walk-in (name, email, paid toggle)
- app/admin/americano/[id] — draw + score entry + 15-min countdown timer
- app/admin/leaderboard/[id] — live standings with medals
- event/[id] updated — 2-row toolbar: [Scan QR | Walk-in] [Americano | Standings | Export]

## Export
Fetch CSV with Authorization header, then React Native Share.share(). Web alternative: just open the URL — but auth header won't follow, so mobile fetch+share is correct.

## Key constraints
- Need ≥ 4 checked-in players to start a session
- All court scores must be entered before next round can be generated
- Player points updated immediately on score entry (not on round completion)
- Timer is client-side only (15 min), not persisted
