/**
 * P³ — People, Padel, Places
 * Design tokens synced from the sibling web artifact (artifacts/padel-exchange/src/index.css).
 * Source of truth: CSS custom properties under :root in index.css.
 * Light-only — the web has no dark mode, so neither does the mobile app.
 */
const colors = {
  light: {
    // ── Surfaces ──────────────────────────────────────────────────────────────
    // web: --background: 0 0% 100%
    background: '#FFFFFF',
    // web: --foreground: 222 47% 11%
    foreground: '#0F172A',

    // web: --card: 210 40% 98%
    card: '#F8FAFC',
    cardForeground: '#0F172A',

    // ── Brand colour — deep teal ───────────────────────────────────────────────
    // web: --primary: 175 68% 30%
    primary: '#178177',
    // web: --primary-foreground: 0 0% 100%
    primaryForeground: '#FFFFFF',

    // ── Secondary / muted surfaces ────────────────────────────────────────────
    // web: --secondary: 210 40% 96%
    secondary: '#F1F5F9',
    secondaryForeground: '#0F172A',

    // web: --muted: 210 40% 96%
    muted: '#F1F5F9',
    // web: --muted-foreground: 215 16% 47%
    mutedForeground: '#64748B',

    // ── Borders & inputs ──────────────────────────────────────────────────────
    // web: --border / --input: 214 32% 88%
    border: '#E2E8F0',
    input: '#E2E8F0',

    // ── Accent (light teal wash) ──────────────────────────────────────────────
    // web: --accent: 175 50% 92%
    accent: '#E6F6F4',
    // web: --accent-foreground: 175 68% 20%
    accentForeground: '#0F564F',

    // ── Destructive ───────────────────────────────────────────────────────────
    // web: --destructive: 0 84% 60%
    destructive: '#EF4444',
    destructiveForeground: '#FFFFFF',

    // ── Logo gradient stops — DO NOT repurpose ────────────────────────────────
    navy: '#0E1B2C',
    navyLight: '#153052',

    // ── Legacy alias (kept for any remaining direct `.tint` usage) ────────────
    tint: '#178177',
    text: '#0F172A',
  },

  // Border radius in px — synced from --radius: 0.75rem → 12 px
  radius: 12,
};

export default colors;
