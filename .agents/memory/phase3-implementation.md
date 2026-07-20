---
name: Phase 3 — QR ticket + admin mode
description: Key decisions, package choices, and integration notes for the QR ticket and admin check-in system.
---

## QR Payload Format
Base64-encoded JSON: `{ v: 1, eventId: string, bookingId: number, email: string }`. Encoded with `btoa()` / decoded with `atob()` — both available in Hermes. No HMAC (flagged for future hardening).

## Package Choices
- `react-native-qrcode-svg` + `react-native-svg@15.x` — renders QR codes on native and web; react-native-svg was already present.
- `expo-camera@~17.0.10` — SDK 54 compatible version (NOT 57.x — Expo CLI warns about mismatch if you install 57.x).

## Metro Config Fix
`zxing-wasm` (pulled in by expo-camera) creates a temp dir (`zxing-wasm_tmp_*`) during install that Metro tries to watch after it's deleted → ENOENT crash. Fix: add `/zxing-wasm_tmp_/` to `config.resolver.blockList` in `metro.config.js`.

## Admin Auth
Password validated by calling `GET /api/admin/events?adminPassword=...` — if the server returns 200, the password is correct. Session stored in AsyncStorage (`@pcubed_admin_v1`). Context lives in `AdminContext.tsx` / `useAdmin()`.

## Admin Entry Point
Hidden shield icon at the bottom of the Profile tab (barely visible). Tapping it opens a `Modal` with a password field. On success, navigates to `/admin` stack (outside tabs, full-screen).

## BookingsContext v2
Storage key bumped to `@pcubed_bookings_v2` (added `bookingId?: number` field). `handleBook` in `event/[id].tsx` now captures `result.id` from the API response and passes it to `book()`. 409 (duplicate) path stores no bookingId — ticket button hides when `bookingId` is undefined.

## Route Structure
New routes registered in root Stack (`_layout.tsx`):
- `ticket/[id]` — attendee QR ticket
- `admin` — maps to `app/admin/_layout.tsx` (Stack with index, event/[id], scan/[id])

## Admin Refresh
`useAdminEvents` polled every 15s; `useAdminEventBookings` every 10s (via `refetchInterval`). Manual invalidation after check-in mutations via `queryClient.invalidateQueries`.

**Why:** Events are low-traffic; polling is simpler than WebSockets and sufficient for a door-check-in use case.
