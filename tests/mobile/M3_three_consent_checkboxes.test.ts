/**
 * M3 — Mobile register screen has all three unbundled consent checkboxes.
 *
 * Static-source assertions (no runtime rendering needed):
 *  1. All three state variables declared and default to false (not pre-ticked).
 *  2. All three exact wording strings are present in the source.
 *  3. Submit guard (`handleSubmit`) only gates on gdprConsent — NOT on
 *     consentMarketing or consentSponsor (they are optional).
 *  4. Both optional booleans are forwarded in the mutateAsync payload.
 *  5. Reassurance line text is present.
 */

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname   = fileURLToPath(new URL(".", import.meta.url));
const REGISTER_TX = join(__dirname, "../../artifacts/padel-cubed-mobile/app/(tabs)/register.tsx");

const src = existsSync(REGISTER_TX) ? readFileSync(REGISTER_TX, "utf8") : "";

describe("M3 — Mobile register screen: three unbundled consent checkboxes", () => {

  it("register.tsx exists", () => {
    expect(existsSync(REGISTER_TX), `register.tsx not found at ${REGISTER_TX}`).toBe(true);
  });

  // ── State declarations — none pre-ticked ──────────────────────────────────

  it("gdprConsent state declared and defaults to false", () => {
    expect(src).toMatch(/useState\(false\)/);
    expect(src).toMatch(/const \[gdprConsent/);
  });

  it("consentMarketing state declared and defaults to false", () => {
    expect(src).toMatch(/const \[consentMarketing.*useState\(false\)/s);
  });

  it("consentSponsor state declared and defaults to false", () => {
    expect(src).toMatch(/const \[consentSponsor.*useState\(false\)/s);
  });

  // ── Exact wording ─────────────────────────────────────────────────────────

  it("events (required) wording is present verbatim", () => {
    expect(src).toContain(
      "Keep me posted about P³ events, and store my details so you can.",
    );
  });

  it("newsletter wording is present verbatim", () => {
    expect(src).toContain(
      "Send me the occasional newsletter and the odd update beyond events.",
    );
  });

  it("sponsor wording is present verbatim", () => {
    expect(src).toContain(
      "When a sponsor's a genuine match for someone like me, I'm happy to be introduced.",
    );
  });

  it("reassurance line is present", () => {
    expect(src).toContain(
      "We never sell your data, and you can delete it whenever you like.",
    );
  });

  // ── Submit gate — only gdprConsent blocks submission ──────────────────────

  it("handleSubmit gates only on gdprConsent (not consentMarketing or consentSponsor)", () => {
    // Extract the handleSubmit function body
    const submitMatch = src.match(/const handleSubmit[^}]+\{([\s\S]*?)\n  \};/);
    expect(submitMatch, "handleSubmit function not found").toBeTruthy();
    const body = submitMatch![1];

    expect(body).toMatch(/gdprConsent/);
    // consentMarketing and consentSponsor must NOT appear as guards
    expect(body).not.toMatch(/!consentMarketing/);
    expect(body).not.toMatch(/!consentSponsor/);
  });

  // ── Payload forwarding ────────────────────────────────────────────────────

  it("consentMarketing is forwarded in mutateAsync payload", () => {
    expect(src).toMatch(/mutateAsync[\s\S]{0,600}consentMarketing/);
  });

  it("consentSponsor is forwarded in mutateAsync payload", () => {
    expect(src).toMatch(/mutateAsync[\s\S]{0,600}consentSponsor/);
  });
});
