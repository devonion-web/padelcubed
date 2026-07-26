/**
 * Happy path — Admin insights endpoint.
 *
 * GET /api/admin/insights requires admin JWT and returns aggregated analytics:
 *   totals, consentRates, byIndustry, bySeniority, byFunction, byPadelLevel,
 *   utmSources, utmCampaigns, weeklySignups.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app.js";
import { truncateAll, mintAdminJwt, seedRegistration } from "../../setup/seed.js";

const CLIENT_IP = "10.0.2.7";
const get = (path: string) =>
  request(app).get(path).set("X-Forwarded-For", CLIENT_IP);

let adminToken: string;

beforeAll(async () => {
  await truncateAll();
  adminToken = mintAdminJwt();

  // Seed a couple of registrations with known attributes
  await seedRegistration({
    email: "ins-mkt@p3.test", fullName: "Insights Mkt",
    industry: "Technology", seniority: "C-suite", function: "Founder / CEO",
    utmSource: "linkedin", utmCampaign: "q3",
    gdprConsent: true,
    consentEventsAt: new Date(), consentMarketingAt: new Date(),
  });
  await seedRegistration({
    email: "ins-nomkt@p3.test", fullName: "Insights NoMkt",
    industry: "Finance", seniority: "VP / Head of", function: "Risk / Compliance / GRC",
    gdprConsent: true,
    consentEventsAt: new Date(),
  });
});

afterAll(() => truncateAll());

describe("GET /api/admin/insights", () => {
  it("no auth → 401", async () => {
    const res = await get("/api/admin/insights");
    expect(res.status).toBe(401);
  });

  it("member JWT → 401", async () => {
    const { mintMemberJwt } = await import("../../setup/seed.js");
    const token = mintMemberJwt();
    const res = await get("/api/admin/insights")
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(401);
  });

  it("admin JWT → 200 with expected shape", async () => {
    const res = await get("/api/admin/insights")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);

    const body = res.body as Record<string, unknown>;
    expect(body).toHaveProperty("totals");
    expect(body).toHaveProperty("consentRates");
    expect(body).toHaveProperty("byIndustry");
    expect(body).toHaveProperty("bySeniority");
    expect(body).toHaveProperty("byFunction");
    expect(body).toHaveProperty("byPadelLevel");
    expect(body).toHaveProperty("utmSources");
    expect(body).toHaveProperty("utmCampaigns");
    expect(body).toHaveProperty("weeklySignups");
  });

  it("totals.registrations reflects seeded rows", async () => {
    const res = await get("/api/admin/insights")
      .set("Authorization", `Bearer ${adminToken}`);
    const totals = (res.body as any).totals;
    expect(totals.registrations).toBeGreaterThanOrEqual(2);
  });

  it("totals.consentMarketing counts only rows with consentMarketingAt set", async () => {
    const res = await get("/api/admin/insights")
      .set("Authorization", `Bearer ${adminToken}`);
    const totals = (res.body as any).totals;
    // ins-mkt has marketing consent; ins-nomkt does not
    expect(totals.consentMarketing).toBeGreaterThanOrEqual(1);
    expect(totals.consentMarketing).toBeLessThan(totals.registrations);
  });

  it("byIndustry includes Technology and Finance entries", async () => {
    const res = await get("/api/admin/insights")
      .set("Authorization", `Bearer ${adminToken}`);
    const industries = (res.body as any).byIndustry as { label: string; value: number }[];
    const labels = industries.map((i) => i.label);
    expect(labels).toContain("Technology");
    expect(labels).toContain("Finance");
  });

  it("utmSources includes linkedin entry", async () => {
    const res = await get("/api/admin/insights")
      .set("Authorization", `Bearer ${adminToken}`);
    const sources = (res.body as any).utmSources as { label: string; value: number }[];
    const labels = sources.map((s) => s.label);
    expect(labels).toContain("linkedin");
  });
});
