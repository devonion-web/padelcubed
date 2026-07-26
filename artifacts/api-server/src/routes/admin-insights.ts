/**
 * GET /api/admin/insights — marketing & consent analytics for the admin dashboard.
 *
 * Returns aggregated, non-PII data for decision-making:
 * - Registrations over time (weekly)
 * - Segmentation breakdown (industry, seniority, function)
 * - Consent rates (events, marketing, sponsor)
 * - UTM attribution (source, medium, campaign)
 * - Member account adoption rate
 */
import { Router, type IRouter } from "express";
import { db, registrationsTable, membersTable } from "@workspace/db";
import { sql, count, isNotNull } from "drizzle-orm";
import { requireAdmin } from "../middleware/adminAuth.js";

const router: IRouter = Router();

router.get("/admin/insights", requireAdmin, async (req, res): Promise<void> => {
  try {
    // Run all aggregations in parallel
    const [
      totals,
      byIndustry,
      bySeniority,
      byFunction,
      byPadelLevel,
      consentRates,
      utmSources,
      utmCampaigns,
      weeklySignups,
    ] = await Promise.all([
      // Totals
      db
        .select({
          totalRegistrations: count(),
          withMemberAccount:  sql<number>`cast(count(*) filter (where ${registrationsTable.memberId} is not null) as int)`,
          consentMarketing:   sql<number>`cast(count(*) filter (where ${registrationsTable.consentMarketingAt} is not null) as int)`,
          consentSponsor:     sql<number>`cast(count(*) filter (where ${registrationsTable.consentSponsorAt} is not null) as int)`,
          consentEvents:      sql<number>`cast(count(*) filter (where ${registrationsTable.consentEventsAt} is not null) as int)`,
          withUtm:            sql<number>`cast(count(*) filter (where ${registrationsTable.utmSource} is not null) as int)`,
        })
        .from(registrationsTable),

      // By industry
      db
        .select({
          label: sql<string>`coalesce(${registrationsTable.industry}, 'Unknown')`,
          value: sql<number>`cast(count(*) as int)`,
        })
        .from(registrationsTable)
        .groupBy(registrationsTable.industry)
        .orderBy(sql`count(*) desc`),

      // By seniority
      db
        .select({
          label: sql<string>`coalesce(${registrationsTable.seniority}, 'Unknown')`,
          value: sql<number>`cast(count(*) as int)`,
        })
        .from(registrationsTable)
        .groupBy(registrationsTable.seniority)
        .orderBy(sql`count(*) desc`),

      // By function
      db
        .select({
          label: sql<string>`coalesce(${registrationsTable.function}, 'Unknown')`,
          value: sql<number>`cast(count(*) as int)`,
        })
        .from(registrationsTable)
        .groupBy(registrationsTable.function)
        .orderBy(sql`count(*) desc`),

      // By padel level
      db
        .select({
          label: sql<string>`coalesce(${registrationsTable.padelLevel}, 'Unknown')`,
          value: sql<number>`cast(count(*) as int)`,
        })
        .from(registrationsTable)
        .groupBy(registrationsTable.padelLevel)
        .orderBy(sql`count(*) desc`),

      // Consent rates (% of total)
      db
        .select({
          events:    sql<number>`cast(round(100.0 * count(*) filter (where ${registrationsTable.consentEventsAt} is not null) / nullif(count(*), 0), 1) as numeric)`,
          marketing: sql<number>`cast(round(100.0 * count(*) filter (where ${registrationsTable.consentMarketingAt} is not null) / nullif(count(*), 0), 1) as numeric)`,
          sponsor:   sql<number>`cast(round(100.0 * count(*) filter (where ${registrationsTable.consentSponsorAt} is not null) / nullif(count(*), 0), 1) as numeric)`,
        })
        .from(registrationsTable),

      // UTM source breakdown
      db
        .select({
          label: sql<string>`coalesce(${registrationsTable.utmSource}, '(direct)')`,
          value: sql<number>`cast(count(*) as int)`,
        })
        .from(registrationsTable)
        .where(
          sql`${registrationsTable.utmSource} is not null or true`,
        )
        .groupBy(registrationsTable.utmSource)
        .orderBy(sql`count(*) desc`)
        .limit(10),

      // UTM campaign breakdown (only where set)
      db
        .select({
          label: sql<string>`${registrationsTable.utmCampaign}`,
          value: sql<number>`cast(count(*) as int)`,
        })
        .from(registrationsTable)
        .where(isNotNull(registrationsTable.utmCampaign))
        .groupBy(registrationsTable.utmCampaign)
        .orderBy(sql`count(*) desc`)
        .limit(10),

      // Weekly signups (last 12 weeks)
      db
        .select({
          week:  sql<string>`to_char(date_trunc('week', ${registrationsTable.createdAt}), 'YYYY-MM-DD')`,
          value: sql<number>`cast(count(*) as int)`,
        })
        .from(registrationsTable)
        .where(sql`${registrationsTable.createdAt} >= now() - interval '12 weeks'`)
        .groupBy(sql`date_trunc('week', ${registrationsTable.createdAt})`)
        .orderBy(sql`date_trunc('week', ${registrationsTable.createdAt})`),
    ]);

    const total = totals[0];

    res.json({
      totals: {
        registrations:     total?.totalRegistrations ?? 0,
        withMemberAccount: total?.withMemberAccount   ?? 0,
        consentEvents:     total?.consentEvents       ?? 0,
        consentMarketing:  total?.consentMarketing    ?? 0,
        consentSponsor:    total?.consentSponsor      ?? 0,
        withUtm:           total?.withUtm             ?? 0,
      },
      consentRates:  consentRates[0] ?? { events: 0, marketing: 0, sponsor: 0 },
      byIndustry,
      bySeniority,
      byFunction,
      byPadelLevel,
      utmSources,
      utmCampaigns,
      weeklySignups,
    });
  } catch (err) {
    console.error("[admin/insights]", err);
    res.status(500).json({ error: "Failed to load insights" });
  }
});

export default router;
