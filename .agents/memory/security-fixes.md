---
name: Security audit fixes
description: Key decisions and constraints from the Phase 2 security audit (9 fixes applied July 2026).
---

## Rules

**Admin JWT iss stamp (B1)**
`signAdminToken` stamps `iss:"p3-admin"`; `verifyAdminToken` rejects any token without that claim.
Member JWTs share the same SESSION_SECRET but have `iss:"p3-member"` — they are now correctly rejected on all admin routes.
**Why:** A member JWT signed with the same secret could previously 200 on admin routes.

**Booking route guard (B2)**
`POST /events/:id/bookings` and `DELETE /events/:id/bookings` both require `requireAdmin`.
`POST` also rejects paid events (pricePence > 0) with 400 "use /checkout".
**Why:** Unauthenticated POST could create confirmed bookings for free, bypassing payment.

**GDPR webhook_log scrub (B3)**
`DELETE /members/me` now scrubs `webhook_log.payload_json` (ILIKE on member email AND registration email if different) before anonymising member rows. Import `webhookLogTable` from `@workspace/db`, use `sql` from drizzle-orm.
**Why:** payload_json stored PII that survived member deletion.

**Checkout memberId (H1)**
`POST /events/:id/checkout` now applies `optionalMember` middleware; passes `memberId` in Stripe metadata. `handleCheckoutComplete` in webhookHandlers.ts reads `meta.memberId` and sets it on the booking row when marking paid.
**Why:** Paid bookings were never linked to member accounts.

**Email suppression (H3)**
`SuppressionData`, `EmailSendType`, `isEmailSuppressed()` added to email.ts.
All send functions accept optional `suppressionData?`. Transactional: blocks only if opted out. Marketing/sponsor: also require respective consent timestamp.
**Why:** No suppression check — opted-out members still received emails.

**Webhook retry cap (H2)**
Changed `MAX_ATTEMPTS=3` to `HARD_CAP=10`. `drainWebhookQueue` now picks up `status IN ('pending','failed')` with `attempts < HARD_CAP`.
**Why:** After 3 failures rows became permanently stuck as 'failed'.

**Claim codes in DB (M1/B4)**
`claim_codes` table (code_hmac, member_id, registration_email, attempts, expires_at). Plain code never stored — HMAC-SHA256(SESSION_SECRET, code). Attempts incremented BEFORE comparison. timingSafeEqual for comparison. 24h TTL, lockout after 5 wrong attempts.
**Why:** In-memory Map lost on restart, codes not HMAC-signed, no lockout, 10 min TTL.

## members table column names (actual DB)
`id, email, name, linkedin_sub, consent_events_at, consent_marketing_at, consent_sponsor_at, opted_out_at, created_at`
Note: column is `name` NOT `full_name`.

## Admin auth
Login endpoint: `POST /api/admin/auth/login` with `{ email, password }`.
Master key (ADMIN_PASSWORD) used only for creating new users, not for login.
Admin JWT route verified at `GET /api/admin/registrations`.
