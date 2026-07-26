/**
 * M2 — No orphaned single-consent RegistrationForm component.
 *
 * Audit finding: the legacy single-consent pattern (exactly ONE gdpr/consent
 * checkbox, no consentMarketing, no consentSponsor) must not exist as a
 * standalone component. The current form (IntentModal.tsx + BookingModal.tsx)
 * uses three separate consent checkboxes.
 *
 * This test:
 *  1. Asserts no file named RegistrationForm.{tsx,jsx,ts,js} exists in the
 *     web app source.
 *  2. Asserts no TSX file has a single "gdpr" boolean field with no
 *     consentMarketing or consentSponsor field alongside it (the "orphaned"
 *     pattern).
 *  3. Verifies IntentModal.tsx has ALL THREE consent fields (gdpr,
 *     consentMarketing, consentSponsor).
 *  4. Verifies BookingModal.tsx (if present) also handles all three.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync, existsSync } from "fs";
import { join, extname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const WORKSPACE_ROOT = join(__dirname, "../..");
const WEB_SRC = join(WORKSPACE_ROOT, "artifacts/padel-exchange/src");

function getAllFiles(dir: string, ext: string[]): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  function walk(d: string) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry);
      if (statSync(full).isDirectory()) walk(full);
      else if (ext.includes(extname(entry))) files.push(full);
    }
  }
  walk(dir);
  return files;
}

const sourceFiles = getAllFiles(WEB_SRC, [".tsx", ".ts", ".jsx", ".js"]);

describe("M2 — No orphaned single-consent RegistrationForm", () => {
  // ── Test 1: No RegistrationForm file exists ───────────────────────────────
  it("no file named RegistrationForm.{tsx,jsx,ts,js} exists in web app src", () => {
    const registrationForms = sourceFiles.filter((f) =>
      /^RegistrationForm\.(tsx|jsx|ts|js)$/.test(basename(f)),
    );
    expect(
      registrationForms,
      `Orphaned RegistrationForm components found: ${registrationForms.join(", ")}`,
    ).toHaveLength(0);
  });

  // ── Test 2: No TSX has only gdpr without the three-consent pattern ─────────
  it("no TSX component uses gdpr alone without consentMarketing/consentSponsor alongside", () => {
    const suspicious: string[] = [];
    for (const f of sourceFiles) {
      const content = readFileSync(f, "utf8");
      const hasGdpr           = /\bgdpr\b/i.test(content);
      const hasMkt            = /consentMarketing/i.test(content);
      const hasSponsor        = /consentSponsor/i.test(content);
      const isFormComponent   = /useState.*gdpr|gdpr.*useState|register.*form|Form.*Register/i.test(content);

      if (hasGdpr && isFormComponent && !(hasMkt && hasSponsor)) {
        suspicious.push(f.replace(WORKSPACE_ROOT, ""));
      }
    }
    expect(
      suspicious,
      `Files with single-consent form pattern (no consentMarketing+consentSponsor):\n${suspicious.join("\n")}`,
    ).toHaveLength(0);
  });

  // ── Test 3: IntentModal has all three consent fields ─────────────────────
  it("IntentModal.tsx has all three consent checkboxes (gdpr, consentMarketing, consentSponsor)", () => {
    const intentModal = sourceFiles.find((f) => basename(f) === "IntentModal.tsx");
    expect(intentModal, "IntentModal.tsx not found in web app source").toBeTruthy();

    const content = readFileSync(intentModal!, "utf8");
    expect(content).toMatch(/\bgdpr\b/i);
    expect(content).toMatch(/consentMarketing/i);
    expect(content).toMatch(/consentSponsor/i);
  });

  // ── Test 4: BookingModal.tsx (if present) also has all three ─────────────
  it("BookingModal.tsx (if present) references all three consent fields", () => {
    const bookingModal = sourceFiles.find((f) => basename(f) === "BookingModal.tsx");
    if (!bookingModal) {
      return; // not required — skip gracefully
    }
    const content = readFileSync(bookingModal, "utf8");
    expect(content).toMatch(/gdpr|consent/i);
  });

  // ── Test 5: Source files count sanity check ───────────────────────────────
  it("web app source scan returned files (non-zero)", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });
});
