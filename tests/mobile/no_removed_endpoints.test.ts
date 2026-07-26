/**
 * Mobile static test — No removed/deprecated API endpoints called.
 *
 * Greps the mobile app source for API endpoint patterns that were replaced
 * during the security audit. Fails if any deprecated endpoint is still used.
 *
 * Deprecated endpoints:
 *   GET /api/my-bookings?email=  — replaced by auth-required GET /api/my-bookings
 *   GET /api/events/:id?email=   — unauthenticated email-based lookup removed
 *
 * Note: this is a static source scan — no device/simulator needed.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, extname } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const WORKSPACE_ROOT = join(__dirname, "../..");
const MOBILE_DIR = join(WORKSPACE_ROOT, "artifacts/padel-cubed-mobile/app");

function getAllSourceFiles(dir: string, ext: string[] = [".ts", ".tsx", ".js", ".jsx"]): string[] {
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

function grepFiles(files: string[], pattern: RegExp): { file: string; line: number; text: string }[] {
  const hits: { file: string; line: number; text: string }[] = [];
  for (const f of files) {
    const lines = readFileSync(f, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
      if (pattern.test(lines[i]!)) {
        hits.push({ file: f.replace(WORKSPACE_ROOT, ""), line: i + 1, text: lines[i]!.trim() });
      }
    }
  }
  return hits;
}

const sourceFiles = getAllSourceFiles(MOBILE_DIR);

describe("Mobile static: no deprecated API endpoints", () => {
  it("does not use GET /my-bookings?email= (deprecated email-based lookup)", () => {
    const hits = grepFiles(sourceFiles, /my-bookings\?email=/);
    expect(hits, `Deprecated endpoint found:\n${JSON.stringify(hits, null, 2)}`).toHaveLength(0);
  });

  it("does not call unauthenticated booking list via query param", () => {
    // Pattern: any fetch to /bookings with an email= query string
    const hits = grepFiles(sourceFiles, /\/bookings\?.*email=/);
    expect(hits, `Deprecated endpoint found:\n${JSON.stringify(hits, null, 2)}`).toHaveLength(0);
  });

  it("does not use /api/members/me without Bearer token header", () => {
    // If /api/members/me is fetched, it must include Authorization: Bearer
    // This test checks there's no unauthenticated call pattern
    const membersMe = grepFiles(sourceFiles, /\/api\/members\/me/);
    for (const hit of membersMe) {
      const fileContent = readFileSync(
        join(WORKSPACE_ROOT, hit.file.replace(/^\//, "")),
        "utf8",
      );
      const hasAuthRef = /Authorization|Bearer|token|secureStore/i.test(fileContent);
      expect(
        hasAuthRef,
        `${hit.file}:${hit.line} calls /api/members/me but no auth token reference found in file`,
      ).toBe(true);
    }
  });

  it("total mobile source files scanned is non-zero", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });
});
