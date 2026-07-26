/**
 * Member account routes (authenticated members, not admins).
 *
 * GET    /api/members/me                        — current member + registration
 * DELETE /api/members/me                        — GDPR deletion (cascades all PII)
 * POST   /api/members/me/logout                 — clear cookies
 * GET    /api/my-bookings                       — member's confirmed bookings (secured)
 * POST   /api/members/claim-registration        — start claim flow (sends code)
 * POST   /api/members/claim-registration/verify — verify code + link
 */
import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { createHmac, timingSafeEqual } from "crypto";
import { eq, and, sql, gt, lt } from "drizzle-orm";
import { z } from "zod";
import { db, membersTable, registrationsTable, bookingsTable, webhookLogTable, claimCodesTable } from "@workspace/db";
import {
  requireMember,
  requireCsrf,
  clearMemberCookies,
  type MemberJwtPayload,
} from "../middleware/memberAuth.js";

const router: IRouter = Router();

// ── Rate limiters ──────────────────────────────────────────────────────────────
const claimLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "Too many claim attempts — please try again in 15 minutes" },
});

// ── Claim code helpers (DB-persisted, HMAC-signed, survives restarts) ──────────
const CLAIM_TTL_MS        = 24 * 60 * 60 * 1000; // 24 hours
const MAX_VERIFY_ATTEMPTS = 5;                    // lockout after N wrong guesses

function hmacClaimCode(code: string): string {
  const secret = process.env.SESSION_SECRET ?? "";
  return createHmac("sha256", secret).update(code).digest("hex");
}

// ── GET /api/members/me ────────────────────────────────────────────────────────
router.get("/members/me", requireMember, async (req, res): Promise<void> => {
  const { sub: memberId } = (req as any).member as MemberJwtPayload;
  try {
    const [member] = await db.select().from(membersTable).where(eq(membersTable.id, memberId));
    if (!member) { res.status(404).json({ error: "Member not found" }); return; }

    const [registration] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.memberId, memberId));

    res.json({ member, registration: registration ?? null });
  } catch (err) {
    console.error("[members/me]", err);
    res.status(500).json({ error: "Failed to fetch member" });
  }
});

// ── GET /api/my-bookings — secured (replaces unauthenticated ?email= version) ──
router.get("/my-bookings", requireMember, async (req, res): Promise<void> => {
  const { sub: memberId, email } = (req as any).member as MemberJwtPayload;
  try {
    // Look up via memberId first; fall back to email for legacy bookings not yet linked
    const byMember = await db
      .select({
        id:            bookingsTable.id,
        eventId:       bookingsTable.eventId,
        status:        bookingsTable.status,
        paymentStatus: bookingsTable.paymentStatus,
        bookedAt:      bookingsTable.bookedAt,
      })
      .from(bookingsTable)
      .where(and(eq(bookingsTable.memberId, memberId), eq(bookingsTable.status, "confirmed")));

    const byEmail = await db
      .select({
        id:            bookingsTable.id,
        eventId:       bookingsTable.eventId,
        status:        bookingsTable.status,
        paymentStatus: bookingsTable.paymentStatus,
        bookedAt:      bookingsTable.bookedAt,
      })
      .from(bookingsTable)
      .where(and(eq(bookingsTable.email, email), eq(bookingsTable.status, "confirmed")));

    // Merge, deduplicate by id
    const seen = new Set<number>();
    const bookings = [...byMember, ...byEmail].filter(b => {
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });

    res.json(bookings);
  } catch (err) {
    console.error("[my-bookings]", err);
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
});

// ── POST /api/members/me/logout ────────────────────────────────────────────────
router.post("/members/me/logout", (req, res): void => {
  clearMemberCookies(res);
  res.json({ ok: true });
});

// ── DELETE /api/members/me — GDPR self-serve deletion ─────────────────────────
// Anonymises PII across ALL tables. Retains row IDs + consent audit trail.
router.delete("/members/me", requireMember, requireCsrf, async (req, res): Promise<void> => {
  const { sub: memberId, email: memberEmail } = (req as any).member as MemberJwtPayload;
  const now = new Date();

  try {
    // 0. Scrub webhook_log — payload_json stores PII and must be cleared before anonymising
    const emailPattern = `%${memberEmail}%`;
    await db
      .update(webhookLogTable)
      .set({ payloadJson: '{"redacted":"gdpr-erasure","reason":"member-deletion"}' })
      .where(sql`${webhookLogTable.payloadJson}::text ILIKE ${emailPattern}`);

    // Also cover registration email if it differs from the member email in the JWT
    const [regRow] = await db
      .select({ email: registrationsTable.email })
      .from(registrationsTable)
      .where(eq(registrationsTable.memberId, memberId));
    if (regRow?.email && regRow.email !== memberEmail) {
      const regPattern = `%${regRow.email}%`;
      await db
        .update(webhookLogTable)
        .set({ payloadJson: '{"redacted":"gdpr-erasure","reason":"member-deletion"}' })
        .where(sql`${webhookLogTable.payloadJson}::text ILIKE ${regPattern}`);
    }

    // 1. Anonymise members row
    await db
      .update(membersTable)
      .set({
        email:              `deleted-${memberId}@p3.invalid`,
        name:               "Deleted Member",
        linkedinSub:        null,
        optedOutAt:         now,
        // Consent timestamps retained for legal audit — do not null
      })
      .where(eq(membersTable.id, memberId));

    // 2. Anonymise registrations row (PII only — segmentation structure retained as null)
    await db
      .update(registrationsTable)
      .set({
        fullName:    "Deleted",
        email:       `deleted-reg-${memberId}@p3.invalid`,
        company:     null,
        jobTitle:    null,
        industry:    null,
        function:    null,
        seniority:   null,
        padelLevel:  null,
        interests:   null,
        linkedinUrl: null,
      })
      .where(eq(registrationsTable.memberId, memberId));

    // 3. Anonymise bookings (name + email only; event attendance history retained)
    await db
      .update(bookingsTable)
      .set({
        email:    `deleted-${memberId}@p3.invalid`,
        fullName: "Deleted",
        company:  null,
      })
      .where(eq(bookingsTable.memberId, memberId));

    // 4. Clear session
    clearMemberCookies(res);

    res.json({ ok: true, message: "Your data has been deleted. We're sorry to see you go." });
  } catch (err) {
    console.error("[members/me DELETE]", err);
    res.status(500).json({ error: "Deletion failed — please contact us directly." });
  }
});

// ── POST /api/members/claim-registration — link by email verification ──────────
// Sends a 6-digit code; code is HMAC-signed and persisted to DB (survives restarts).
router.post(
  "/members/claim-registration",
  requireMember,
  requireCsrf,
  claimLimiter,
  async (req, res): Promise<void> => {
    const parsed = z.object({ email: z.string().email() }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "Valid email required" }); return; }

    const { sub: memberId } = (req as any).member as MemberJwtPayload;
    const targetEmail = parsed.data.email.toLowerCase().trim();

    const [reg] = await db
      .select()
      .from(registrationsTable)
      .where(eq(registrationsTable.email, targetEmail));

    // Always respond the same way (prevent enumeration)
    if (reg && !reg.memberId) {
      // Purge expired codes; insert a fresh HMAC-signed entry
      await db.delete(claimCodesTable).where(lt(claimCodesTable.expiresAt, new Date())).catch(() => {});

      const rawCode  = String(Math.floor(100_000 + Math.random() * 900_000));
      const codeHmac = hmacClaimCode(rawCode);

      await db.insert(claimCodesTable).values({
        codeHmac,
        memberId,
        registrationEmail: targetEmail,
        expiresAt: new Date(Date.now() + CLAIM_TTL_MS),
      }).catch(err => console.error("[members/claim] Code insert failed:", err));

      const { sendClaimCode } = await import("../email.js");
      sendClaimCode({ to: targetEmail, code: rawCode }).catch(
        err => console.error("[members/claim] Email failed:", err),
      );
    }

    res.json({ message: "If that email matches a registration, a 6-digit code has been sent to it." });
  },
);

// ── POST /api/members/claim-registration/verify ────────────────────────────────
router.post(
  "/members/claim-registration/verify",
  requireMember,
  requireCsrf,
  claimLimiter,
  async (req, res): Promise<void> => {
    const parsed = z.object({ code: z.string().length(6) }).safeParse(req.body);
    if (!parsed.success) { res.status(400).json({ error: "6-digit code required" }); return; }

    const { sub: memberId } = (req as any).member as MemberJwtPayload;
    const submittedHmac = hmacClaimCode(parsed.data.code);
    const now = new Date();

    // Find an active, unexpired code for this member that hasn't hit the lockout cap
    const [entry] = await db
      .select()
      .from(claimCodesTable)
      .where(
        and(
          eq(claimCodesTable.memberId, memberId),
          gt(claimCodesTable.expiresAt, now),
          lt(claimCodesTable.attempts, MAX_VERIFY_ATTEMPTS),
        ),
      )
      .limit(1);

    if (!entry) {
      res.status(400).json({ error: "Invalid or expired code" });
      return;
    }

    // Increment attempts BEFORE comparing — stops brute-force even on timing attacks
    await db
      .update(claimCodesTable)
      .set({ attempts: entry.attempts + 1 })
      .where(eq(claimCodesTable.id, entry.id));

    // Constant-time HMAC comparison
    const storedBuf    = Buffer.from(entry.codeHmac, "hex");
    const submittedBuf = Buffer.from(submittedHmac, "hex");
    const valid =
      storedBuf.length === submittedBuf.length &&
      timingSafeEqual(storedBuf, submittedBuf);

    if (!valid) {
      const remaining = MAX_VERIFY_ATTEMPTS - (entry.attempts + 1);
      if (remaining <= 0) {
        res.status(400).json({ error: "Too many attempts — code locked. Request a new code." });
      } else {
        res.status(400).json({ error: `Invalid code — ${remaining} attempt${remaining === 1 ? "" : "s"} remaining` });
      }
      return;
    }

    // Valid — consume code and link registration
    await db.delete(claimCodesTable).where(eq(claimCodesTable.id, entry.id));

    await db
      .update(registrationsTable)
      .set({ memberId })
      .where(
        and(
          eq(registrationsTable.email, entry.registrationEmail),
          eq(registrationsTable.memberId, null as any),
        ),
      );

    res.json({ ok: true, message: "Registration linked to your account." });
  },
);

export default router;
