import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, corporateEnquiriesTable } from "@workspace/db";
import { requireAdmin } from "../middleware/adminAuth.js";

const router: IRouter = Router();

const SubmitCorporateEnquiryBody = z.object({
  company: z.string().min(1),
  contactName: z.string().min(1),
  workEmail: z.string().email(),
  phone: z.string().optional(),
  eventType: z.enum([
    "Team day",
    "Client entertainment",
    "Product launch / Activation",
    "Conference social",
    "Other",
  ]),
  headcount: z.number().int().positive().optional(),
  timeframe: z.string().optional(),
  budgetRange: z.string().optional(),
  message: z.string().optional(),
  gdprConsent: z.boolean(),
});

// POST /corporate-enquiries — public, no payment, separate from member pipeline
router.post("/corporate-enquiries", async (req, res): Promise<void> => {
  const parsed = SubmitCorporateEnquiryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (!parsed.data.gdprConsent) {
    res.status(400).json({ error: "GDPR consent is required." });
    return;
  }

  const [enquiry] = await db
    .insert(corporateEnquiriesTable)
    .values(parsed.data)
    .returning();

  res.status(201).json({
    id: enquiry.id,
    company: enquiry.company,
    createdAt: enquiry.createdAt,
  });
});

// GET /admin/corporate-enquiries — JWT admin only
router.get("/admin/corporate-enquiries", requireAdmin, async (req, res): Promise<void> => {
  try {
    const enquiries = await db
      .select()
      .from(corporateEnquiriesTable)
      .orderBy(corporateEnquiriesTable.createdAt);

    res.json(enquiries);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch enquiries" });
  }
});

export default router;
