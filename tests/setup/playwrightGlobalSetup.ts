/**
 * Playwright global setup — runs in the main process before any test worker.
 *
 * NixOS library path fix (Replit only)
 * ─────────────────────────────────────
 * On Replit, Playwright ships a prebuilt glibc/Ubuntu Chromium binary whose
 * RPATH does not include the nix-store paths for libgbm, libudev, and libglib.
 * We inject them here before any browser is spawned.
 *
 * This block is SKIPPED when REPLIT_DEV_DOMAIN is absent (i.e. in GitHub Actions
 * and any other standard Linux environment).  Ubuntu CI runners get all Chromium
 * dependencies via `playwright install --with-deps` which calls apt-get.
 *
 * Libraries resolved by these nix-store paths:
 *   libgbm.so.1   → mesa-22.3.7
 *   libudev.so.1  → eudev-3.2.11
 *   libglib-2.0   → glib-2.82.1  (pulls gobject, gio, etc. transitively)
 */
export default async function globalSetup() {
  // Only apply on Replit — GitHub Actions provides libs via system package install.
  if (!process.env.REPLIT_DEV_DOMAIN) {
    // eslint-disable-next-line no-console
    console.log("[playwright-setup] Not on Replit — skipping NixOS LD_LIBRARY_PATH shim.");
    return;
  }

  const nixLibs = [
    "/nix/store/2vaiy8gb6y6mic8dn6pbnf446b3k9358-mesa-22.3.7/lib",
    "/nix/store/447fq1l8zagjhc15j07fgwwhs433bwqd-eudev-3.2.11/lib",
    "/nix/store/26hcp8h792wl0h52c5r94qakhvk6q717-glib-2.82.1/lib",
  ];

  const existing = process.env.LD_LIBRARY_PATH ?? "";
  const combined = [...nixLibs, ...(existing ? [existing] : [])].join(":");
  process.env.LD_LIBRARY_PATH = combined;

  // eslint-disable-next-line no-console
  console.log("[playwright-setup] LD_LIBRARY_PATH =", process.env.LD_LIBRARY_PATH);
}
