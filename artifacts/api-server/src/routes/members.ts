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
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { db, membersTable, registrationsTable, bookingsTable } from "@workspace/db";
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

// ── In-memory claim code store (short-lived, rarely used) ─────────────────────
interface ClaimEntry { memberId: number; registrationEmail: string; expiry: number }
const claimCodes = new Map<string, ClaimEntry>();
const CLAIM_TTL  = 10 * 60 * 1000; // 10 minutes

function cleanClaimCodes() {
  const now = Date.now();
  for (const [k, v] of claimCodes) if (v.expiry < now) claimCodes.delete(k);
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
  const { sub: memberId } = (req as any).member as MemberJwtPayload;
  const now = new Date();

  try {
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
// Used when LinkedIn email ≠ registration email. Sends a 6-digit code.
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
      cleanClaimCodes();
      const code = String(Math.floor(100_000 + Math.random() * 900_000));
      claimCodes.set(code, { memberId, registrationEmail: targetEmail, expiry: Date.now() + CLAIM_TTL });

      // Import lazily to avoid circular deps
      const { sendClaimCode } = await import("../email.js");
      sendClaimCode({ to: targetEmail, code }).catch(
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
    const entry = claimCodes.get(parsed.data.code);

    if (!entry || entry.expiry < Date.now() || entry.memberId !== memberId) {
      res.status(400).json({ error: "Invalid or expired code" });
      return;
    }

    claimCodes.delete(parsed.data.code);

    // Link the registration to this member
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
