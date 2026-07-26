import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { db, registrationsTable } from "@workspace/db";
import {
  SubmitRegistrationBody,
  SubmitRegistrationResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/adminAuth.js";
import { sendRegistrationWelcome, sendNewMemberNotification } from "../email.js";
import { enqueueWebhook } from "../lib/webhookService.js";

// ── Rate limiter: 20 submissions per 15 min per IP (email-enumeration + spam) ─
const registrationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many registration attempts — please try again in 15 minutes." },
});

// ── Extended body schema: core fields from api-zod + UTMs + granular consent ──
const ExtendedRegistrationBody = SubmitRegistrationBody.extend({
  // UTM attribution (all optional — not always present)
  utmSource:   z.string().optional(),
  utmMedium:   z.string().optional(),
  utmCampaign: z.string().optional(),
  utmContent:  z.string().optional(),
  utmTerm:     z.string().optional(),
  // Granular consent beyond the base gdprConsent flag
  consentMarketing: z.boolean().optional().default(false),
  consentSponsor:   z.boolean().optional().default(false),
});

const router: IRouter = Router();

// POST /registrations — public registration of interest
router.post("/registrations", registrationLimiter, async (req, res): Promise<void> => {
  const parsed = ExtendedRegistrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const {
    gdprConsent,
    consentMarketing,
    consentSponsor,
    utmSource, utmMedium, utmCampaign, utmContent, utmTerm,
    ...rest
  } = parsed.data;

  // Check for duplicate email
  const existing = await db
    .select({ id: registrationsTable.id })
    .from(registrationsTable)
    .where(eq(registrationsTable.email, rest.email));

  if (existing.length > 0) {
    res.status(409).json({ error: "This email is already on the list." });
    return;
  }

  const now = new Date();

  const [registration] = await db
    .insert(registrationsTable)
    .values({
      ...rest,
      gdprConsent: gdprConsent ?? false,
      // Granular consent timestamps — only set if explicitly given
      consentEventsAt:    gdprConsent      ? now : undefined,
      consentMarketingAt: consentMarketing ? now : undefined,
      consentSponsorAt:   consentSponsor   ? now : undefined,
      // UTM attribution
      utmSource:   utmSource   || undefined,
      utmMedium:   utmMedium   || undefined,
      utmCampaign: utmCampaign || undefined,
      utmContent:  utmContent  || undefined,
      utmTerm:     utmTerm     || undefined,
    })
    .returning();

  res.status(201).json(SubmitRegistrationResponse.parse(registration));

  // Fire emails after responding — non-blocking
  sendRegistrationWelcome({
    to:              registration.email,
    fullName:        registration.fullName,
    padelLevel:      registration.padelLevel,
    interests:       registration.interests,
    suppressionData: { optedOutAt: null }, // new registrations are never opted out
  }).catch(err => console.error("[email] Welcome email failed:", err));

  sendNewMemberNotification({
    fullName:    registration.fullName,
    email:       registration.email,
    company:     registration.company,
    jobTitle:    registration.jobTitle,
    industry:    registration.industry,
    function:    registration.function,
    seniority:   registration.seniority,
    padelLevel:  registration.padelLevel,
    interests:   registration.interests,
    linkedinUrl: registration.linkedinUrl,
  }).catch(err => console.error("[email] Admin notification failed:", err));

  // Enqueue outbound webhook — never blocks the response
  enqueueWebhook("registration.created", {
    registration: {
      id:       registration.id,
      fullName: registration.fullName,
      email:    registration.email,
      company:  registration.company,
      jobTitle: registration.jobTitle,
      industry: registration.industry,
      seniority: registration.seniority,
    },
    attribution: { utmSource, utmMedium, utmCampaign, utmContent, utmTerm },
    consent: {
      events:    !!gdprConsent,
      marketing: !!consentMarketing,
      sponsor:   !!consentSponsor,
    },
  }).catch(err => console.error("[webhook] Enqueue failed after registration:", err));
});

// POST /api/admin/registrations — manually add a member (JWT admin only, no welcome email)
router.post("/admin/registrations", requireAdmin, async (req, res): Promise<void> => {
  const parsed = SubmitRegistrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { gdprConsent, ...rest } = parsed.data;

  const existing = await db
    .select({ id: registrationsTable.id })
    .from(registrationsTable)
    .where(eq(registrationsTable.email, rest.email));

  if (existing.length > 0) {
    res.status(409).json({ error: "This email is already on the list." });
    return;
  }

  const [registration] = await db
    .insert(registrationsTable)
    .values({ ...rest, gdprConsent: gdprConsent ?? false })
    .returning();

  res.status(201).json(SubmitRegistrationResponse.parse(registration));
});

// DELETE /api/admin/registrations/:id — remove a member (JWT admin only)
router.delete("/admin/registrations/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }
  try {
    await db.delete(registrationsTable).where(eq(registrationsTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete registration" });
  }
});

// GET /admin/registrations — list all registrations (JWT admin only)
router.get("/admin/registrations", requireAdmin, async (req, res): Promise<void> => {
  try {
    const registrations = await db
      .select()
      .from(registrationsTable)
      .orderBy(registrationsTable.createdAt);

    res.json(registrations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

// GET /admin/registrations/export — export as CSV (JWT admin only)
router.get("/admin/registrations/export", requireAdmin, async (req, res): Promise<void> => {
  try {
    const registrations = await db
      .select()
      .from(registrationsTable)
      .orderBy(registrationsTable.createdAt);

    const headers = [
      "id",
      "fullName",
      "email",
      "company",
      "jobTitle",
      "industry",
      "function",
      "seniority",
      "padelLevel",
      "interests",
      "linkedinUrl",
      "gdprConsent",
      "createdAt",
    ];

    function escapeCsv(val: unknown): string {
      if (val == null) return "";
      if (Array.isArray(val)) return `"${val.join("; ")}"`;
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    }

    const rows = registrations.map((r) =>
      [
        r.id,
        r.fullName,
        r.email,
        r.company,
        r.jobTitle,
        r.industry,
        r.function,
        r.seniority,
        r.padelLevel,
        r.interests,
        r.linkedinUrl,
        r.gdprConsent,
        r.createdAt?.toISOString(),
      ]
        .map(escapeCsv)
        .join(","),
    );

    const csv = [headers.join(","), ...rows].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=padel-exchange-registrations.csv",
    );
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to export registrations" });
  }
});

export default router;
