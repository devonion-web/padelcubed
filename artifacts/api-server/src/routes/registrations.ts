import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, registrationsTable } from "@workspace/db";
import {
  SubmitRegistrationBody,
  SubmitRegistrationResponse,
  ListRegistrationsQueryParams,
  ListRegistrationsResponse,
  ExportRegistrationsQueryParams,
} from "@workspace/api-zod";

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

// Admin auth middleware helper
function checkAdminPassword(password: string | undefined): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return false;
  return password === adminPassword;
}

// GET /admin/registrations — list all registrations (admin only)
router.get("/admin/registrations", async (req, res): Promise<void> => {
  const params = ListRegistrationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!checkAdminPassword(params.data.adminPassword)) {
    res.status(401).json({ error: "Unauthorised — invalid admin password." });
    return;
  }

  const registrations = await db
    .select()
    .from(registrationsTable)
    .orderBy(registrationsTable.createdAt);

  res.json(ListRegistrationsResponse.parse(registrations));
});

// GET /admin/registrations/export — export as CSV (admin only)
router.get("/admin/registrations/export", async (req, res): Promise<void> => {
  const params = ExportRegistrationsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  if (!checkAdminPassword(params.data.adminPassword)) {
    res.status(401).json({ error: "Unauthorised — invalid admin password." });
    return;
  }

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
});

export default router;
