/**
 * Playwright global setup — runs in the main process before any test worker.
 *
 * Sets LD_LIBRARY_PATH so Chromium headless-shell can find the shared libraries
 * it needs in Replit's NixOS environment.  The prebuilt binary ships without
 * RPATH entries for these nix-store paths; we inject them here.
 *
 * Libraries resolved by these paths (confirmed via `ldd`):
 *   libgbm.so.1   → mesa-22.3.7
 *   libudev.so.1  → eudev-3.2.11
 *   libglib-2.0   → glib-2.82.1  (also pulls libgobject, libgio, etc.)
 *
 * All other dependencies are found transitively once these are on the path.
 */
export default async function globalSetup() {
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
