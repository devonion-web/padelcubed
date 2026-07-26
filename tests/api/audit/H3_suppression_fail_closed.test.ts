/**
 * H3 — Suppression is fail-closed.
 *
 * Tests the isEmailSuppressed pure function exported from email.ts:
 *   - opted-out member → all email types suppressed
 *   - deleted member (optedOutAt set) → suppressed
 *   - NULL consent_marketing_at → marketing email suppressed
 *   - consented member (consentMarketingAt set) → marketing not suppressed
 *   - NULL consent_sponsor_at → sponsor email suppressed
 *   - transactional type → only blocked by optedOutAt, never by missing consent
 */

import { describe, it, expect } from "vitest";
import {
  isEmailSuppressed,
  type SuppressionData,
} from "../../../artifacts/api-server/src/email.js";

const now = new Date();

describe("H3 — suppression fail-closed", () => {
  // ── optedOutAt set → all types blocked ────────────────────────────────────
  it("opted-out AND deleted member → transactional suppressed", () => {
    const data: SuppressionData = { optedOutAt: now };
    expect(isEmailSuppressed(data, "transactional")).toBe(true);
  });

  it("opted-out member → marketing suppressed", () => {
    const data: SuppressionData = { optedOutAt: now, consentMarketingAt: now };
    expect(isEmailSuppressed(data, "marketing")).toBe(true);
  });

  it("opted-out member → sponsor suppressed even with consent", () => {
    const data: SuppressionData = { optedOutAt: now, consentSponsorAt: now };
    expect(isEmailSuppressed(data, "sponsor")).toBe(true);
  });

  // ── NULL consent_marketing_at → marketing suppressed (fail-closed) ─────────
  it("consentMarketingAt NULL → marketing suppressed", () => {
    const data: SuppressionData = { optedOutAt: null, consentMarketingAt: null };
    expect(isEmailSuppressed(data, "marketing")).toBe(true);
  });

  it("consentMarketingAt NULL → welcome (transactional) NOT suppressed", () => {
    const data: SuppressionData = { optedOutAt: null, consentMarketingAt: null };
    expect(isEmailSuppressed(data, "transactional")).toBe(false);
  });

  // ── Consented member → marketing allowed ──────────────────────────────────
  it("consentMarketingAt set → marketing not suppressed", () => {
    const data: SuppressionData = { optedOutAt: null, consentMarketingAt: now };
    expect(isEmailSuppressed(data, "marketing")).toBe(false);
  });

  // ── Sponsor type ──────────────────────────────────────────────────────────
  it("consentSponsorAt NULL → sponsor suppressed", () => {
    const data: SuppressionData = { optedOutAt: null, consentSponsorAt: null };
    expect(isEmailSuppressed(data, "sponsor")).toBe(true);
  });

  it("consentSponsorAt set → sponsor not suppressed", () => {
    const data: SuppressionData = { optedOutAt: null, consentSponsorAt: now };
    expect(isEmailSuppressed(data, "sponsor")).toBe(false);
  });

  // ── Transactional is fail-open (only optedOutAt blocks it) ────────────────
  it("transactional with no consent data → NOT suppressed (fail-open)", () => {
    const data: SuppressionData = { optedOutAt: null };
    expect(isEmailSuppressed(data, "transactional")).toBe(false);
  });

  it("transactional with all consents missing → NOT suppressed", () => {
    const data: SuppressionData = {
      optedOutAt:         null,
      consentMarketingAt: null,
      consentSponsorAt:   null,
    };
    expect(isEmailSuppressed(data, "transactional")).toBe(false);
  });

  it("empty SuppressionData → transactional not suppressed", () => {
    expect(isEmailSuppressed({}, "transactional")).toBe(false);
  });

  // ── Admin notification: opt-out blocks it (transactional) ─────────────────
  it("opted-out admin notification (transactional) → suppressed", () => {
    // The admin notification route uses {} suppressionData which means
    // no optedOutAt check. But for a MEMBER who opted out, the booking
    // confirmation path respects optedOutAt.
    const data: SuppressionData = { optedOutAt: now };
    expect(isEmailSuppressed(data, "transactional")).toBe(true);
  });
});
