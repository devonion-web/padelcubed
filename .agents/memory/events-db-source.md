---
name: Events DB source of truth
description: Events are DB-only; no static arrays remain; published boolean controls visibility; listing logic is date-ordered.
---

## Rule
Events are canonical in the database. The API GET /events returns all `published=true` events ordered by `eventDate` asc. No hardcoded event IDs in any frontend component.

## EventsSection.tsx (web)
`FEATURED_IDS` was removed in July 2026. The section now shows `allEvents.slice(0, 2)` — the next two soonest events from the already-sorted API response. Photos and badge text are keyed by **venue name** via `VENUE_META`:
- `"Racketeer"` → racketeer-hero.jpg / "Members Event"
- `"Surbiton Racquet Club"` → surbiton-hero.jpg / "Pre-Launch Event"
- `"Padium"` → padium-hero.webp / "Launch Event"
Add new entries when new venues are introduced.

**Why:** Hardcoded IDs broke whenever test events were added/removed and required code changes to feature different events.

## Seed data (SEED_EVENTS in events.ts)
Only runs when the events table is empty. After July 2026 clean-up, five real events exist (IDs 1–5). The seed must match DB reality:
- ID 4: "P³ Launch — People, Padel, Places", Padium, Oct 15 2026, £20, status: "soon"

## Real events (post-cleanup, July 2026)
| ID | Title | Venue | Date | Status |
|---|---|---|---|---|
| 1 | The City Kickoff | Racketeer | 6 Aug 2026 | available |
| 2 | The Surbiton Exchange | Surbiton Racquet Club | 10 Sep 2026 | available |
| 3 | The GRC Exchange | Racketeer | 8 Oct 2026 | available |
| 4 | P³ Launch — People, Padel, Places | Padium | 15 Oct 2026 | soon |
| 5 | The Year Closer | Racketeer | 3 Dec 2026 | soon |

## Status semantics
- `published: false` → hidden from all listings
- `published: true, status: "soon"` → visible, CTA is "Register interest →" (no booking)
- `published: true, status: "available"` → visible, booking open

To open ticket sales for event 4: flip status from `"soon"` to `"available"` via Admin → Events.
