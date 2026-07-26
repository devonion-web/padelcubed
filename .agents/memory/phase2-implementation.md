---
name: Phase 2 implementation
description: Member accounts, GDPR, webhooks, UTMs, insights — key decisions and constraints for Phase 2 of The Padel Exchange.
---

## Legal entity
Dev AI Ltd is the operating entity. Risk Rising Ltd is a sponsor/partner only.
All consent text, privacy notices, and footer copy must say "Dev AI Ltd (operating P³)".
`partners.ts` and testimonials may still reference Risk Rising as a partner — that's correct.

## Consent model (granular — do NOT collapse back to single flag)
Three independent consent timestamps on both `registrations` and `members`:
- `consent_events_at` — event operations (required at registration)
- `consent_marketing_at` — marketing email (optional)
- `consent_sponsor_at` — sponsor cohort sharing (optional)

Backfill rule applied: `consent_events_at = created_at` only where `gdpr_consent = true`.
`consent_marketing_at` and `consent_sponsor_at` were NOT backfilled (not captured originally).
Web form: 3 checkboxes — first required (blocks submit), two optional.

## Member auth
- JWT issued by LinkedIn OIDC callback, stored in httpOnly cookie `p3_member_token`
- CSRF: Double Submit Cookie pattern — readable `p3_csrf` cookie + `X-CSRF-Token` header
- Mobile: JWT delivered via deep-link `exp://auth?token=...` for SecureStore storage
- JWT distinguisher: `{ iss: 'p3-member', sub: memberId, email, name }`
- `SESSION_SECRET` signs both admin and member JWTs; `iss` field distinguishes them
- `requireMember` middleware in `artifacts/api-server/src/middleware/memberAuth.ts`

## GDPR deletion
`DELETE /api/members/me` cascades PII anonymisation across:
1. `members` → email/name/linkedinSub nulled, `opted_out_at` set
2. `registrations` (by memberId) → all PII columns nulled, replaced with `deleted-reg-${id}@p3.invalid`
3. `bookings` (by memberId) → email/name/company anonymised
Consent timestamps are RETAINED for legal audit trail.

## Webhook service
- `enqueueWebhook()` does a DB INSERT into `webhook_log` — synchronous, never makes HTTP calls
- Background worker in `webhookWorker.ts` polls every 30s via setInterval in the API server process
- Max 3 attempts with 60s minimum delay between retries
- Fires for: `registration.created` and `booking.paid`
- HMAC-SHA256 signed with `WEBHOOK_SECRET` env var; target is `WEBHOOK_URL` env var
- Worker stays alive as long as the API server process lives (Replit = same process)
- Idempotency fix: webhookHandlers.ts checks `booking.paymentStatus === 'paid'` before acting

## UTM capture
- `Home.tsx` reads UTM params from URL on mount, stores as `p3_utms` JSON in sessionStorage
- `JoinForm` reads sessionStorage at submit and includes `utmSource/Medium/Campaign/Content/Term` in POST body
- API accepts these via `ExtendedRegistrationBody` (local extension of `SubmitRegistrationBody`)
- Stored as `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` on registrations

## Rate limiting
- `POST /registrations`: 20 requests per 15 min per IP (express-rate-limit)
- `POST /members/claim-registration*`: 5 requests per 15 min per IP

## Claim registration flow
For LinkedIn email ≠ registration email mismatch:
1. `POST /api/members/claim-registration` — sends 6-digit code to the registration email
2. `POST /api/members/claim-registration/verify` — verifies code, links registration to member
Code stored in-memory Map with 10-minute TTL; short-lived, low-volume flow.

## Admin insights
`GET /api/admin/insights` (requireAdmin) returns:
- Totals: registrations, member accounts, consent rates, UTM coverage
- Breakdowns: industry, seniority, function, padel level
- Attribution: UTM source, UTM campaign
- Weekly signups (last 12 weeks)
Shown in new "Insights" tab in Admin.tsx (between Members and Team tabs).

## Schema
New tables: `members`, `webhook_log`
New columns on `registrations`: member_id FK, utm_*, consent_events_at, consent_marketing_at, consent_sponsor_at
New column on `bookings`: member_id FK
Old `GET /my-bookings?email=` endpoint removed; replaced by `GET /my-bookings` (requireMember).

## RegistrationForm.tsx
Orphaned component — not imported anywhere. Inert. Do not delete unless cleaning up.
