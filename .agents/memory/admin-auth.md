---
name: Admin auth system
description: JWT-based multi-user admin auth replacing the single shared ADMIN_PASSWORD.
---

## Rule
All admin API routes use `Authorization: Bearer <jwt>` — the old `?adminPassword=` query param is gone. The `ADMIN_PASSWORD` env secret is now a **bootstrap-only master key** used solely to create the first admin user via `POST /admin/auth/users` with `{ masterPassword }`.

**Why:** Single shared password can't distinguish users, can't be revoked per-person, and leaks in server logs via query params.

**How to apply:** Any new admin route must use the `requireAdmin` middleware from `artifacts/api-server/src/middleware/adminAuth.ts`. Never re-introduce password-in-query-param auth.

## Key decisions
- JWT secret = `SESSION_SECRET` env var (30-day expiry)
- Roles: `superadmin` (can create/delete admin users) and `admin`
- `bcryptjs` (pure JS) used for password hashing — 12 rounds
- Mobile stores `{ token, user }` JSON in AsyncStorage under `@pcubed_admin_v2`
- `AdminContext` exposes `token` (not `adminPassword`) — all hooks updated accordingly

## First admin user (already seeded)
- Email: `admin@riskreising.com`
- Password: `ChangeMe123!` — **change this immediately in production**
- Role: `superadmin`

## To add more admin users
```bash
curl -X POST https://<domain>/api/admin/auth/users \
  -H "Content-Type: application/json" \
  -d '{"email":"...", "password":"...", "name":"...", "role":"admin", "masterPassword":"<ADMIN_PASSWORD>"}'
```
Or from a superadmin JWT (omit `masterPassword`, include `Authorization: Bearer <token>`).
