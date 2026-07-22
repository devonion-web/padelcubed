import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, registrationsTable } from "@workspace/db";
import {
  SubmitRegistrationBody,
  SubmitRegistrationResponse,
} from "@workspace/api-zod";
import { requireAdmin } from "../middleware/adminAuth.js";

const router: IRouter = Router();

// POST /registrations — public registration of interest
router.post("/registrations", async (req, res): Promise<void> => {
  const parsed = SubmitRegistrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { gdprConsent, ...rest } = parsed.data;

  // Check for duplicate email
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
    .values({
      ...rest,
      gdprConsent: gdprConsent ?? false,
    })
    .returning();

  res.status(201).json(SubmitRegistrationResponse.parse(registration));
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
