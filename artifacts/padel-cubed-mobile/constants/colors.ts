/**
 * P³ — People, Padel, Places
 * Design tokens synced from the sibling web artifact (artifacts/padel-exchange/src/index.css)
 * Royal Blue base + Electric Turquoise accent.
 */
const colors = {
  light: {
    // Legacy aliases
    text: '#FAFAFA',
    tint: '#19C3B0',

    // Core surfaces
    background: '#4169E1',
    foreground: '#FAFAFA',

    // Cards / elevated surfaces
    card: '#3557C8',
    cardForeground: '#FAFAFA',

    // Primary action — Electric Turquoise
    primary: '#19C3B0',
    primaryForeground: '#000000',

    // Secondary
    secondary: '#3A52A6',
    secondaryForeground: '#FAFAFA',

    // Muted
    muted: '#3655B6',
    mutedForeground: '#C5D2F5',

    // Borders & inputs
    border: '#3A52A6',
    input: '#2F47A0',

    // Accent (same as primary for this brand)
    accent: '#19C3B0',
    accentForeground: '#000000',

    // Destructive
    destructive: '#EF4444',
    destructiveForeground: '#FAFAFA',

    // Deep navy (logo background)
    navy: '#0E1B2C',
    navyLight: '#153052',
  },

  // Border radius in px — synced from --radius: 0.75rem → 12px
  radius: 12,
};

export default colors;
