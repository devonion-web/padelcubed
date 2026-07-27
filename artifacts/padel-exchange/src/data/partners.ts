// ─── Partners data ────────────────────────────────────────────────────────────
// Edit this file to add, remove or update partners.
// tier: "founding" | "premium" | "standard"
// showInCarousel: true → appears in the homepage marquee
// logoLight / logoDark: paths relative to /public (e.g. "partners/corlytics-light.svg")
//   Leave empty ("") to fall back to a styled text lockup using `name`.

export interface Partner {
  id: string;
  name: string;
  tier: "founding" | "premium" | "standard";
  category: string;
  logoLight: string;
  logoDark: string;
  url: string;
  blurb: string;
  showInCarousel: boolean;
  logoClassName?: string;
  /** CSS filter applied to the logo image on light (white-card) backgrounds */
  logoFilter?: string;
}

const partners: Partner[] = [
  {
    id: "risk-rising",
    name: "Risk Rising",
    tier: "founding",
    category: "Risk & Compliance",
    logoLight: "partners/rr-clean.png",
    logoDark: "partners/rr-clean.png",
    url: "https://www.riskrising.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "Risk Rising helps financial services firms build resilient, high-performing risk and compliance functions.",
    showInCarousel: true,
  },
  {
    id: "panorays",
    name: "Panorays",
    tier: "founding",
    category: "Third-Party Risk",
    logoLight: "partners/panorays-color.png",
    logoDark: "partners/panorays-color.png",
    url: "https://www.panorays.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "End-to-end third-party cyber risk management, powered by native AI — helping enterprises secure their entire supply chain.",
    showInCarousel: true,
    logoClassName: "h-11",
  },
  {
    id: "logicgate",
    name: "LogicGate",
    tier: "founding",
    category: "GRC Platform",
    logoLight: "partners/logicgate.svg",
    logoDark: "partners/logicgate.svg",
    url: "https://www.logicgate.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "The leading AI GRC platform — helping enterprises manage governance, risk and compliance with powerful agents and applications.",
    showInCarousel: true,
  },
  {
    id: "corlytics",
    name: "Corlytics",
    tier: "founding",
    category: "RegTech",
    logoLight: "partners/corlytics.svg",
    logoDark: "partners/corlytics.svg",
    url: "https://www.corlytics.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "AI-powered regulatory intelligence — keeping compliance, risk and legal teams ahead of the curve.",
    showInCarousel: true,
  },
  {
    id: "finativ",
    name: "Finativ",
    tier: "founding",
    category: "Specialist Advisory",
    logoLight: "partners/finativ-dark.png",
    logoDark:  "partners/finativ-dark.png",
    url: "https://www.finativ.co.uk/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "Specialist consulting and advisory for asset, motor, invoice and other finance companies — strategic insight from experienced leaders.",
    showInCarousel: true,
  },
  {
    id: "byrnedean",
    name: "byrne·dean",
    tier: "standard",
    category: "Workplace Culture & Behaviour",
    logoLight: "partners/byrnedean.svg",
    logoDark: "partners/byrnedean.svg",
    url: "https://www.byrnedean.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "Experts in improving workplace culture and behaviour — helping organisations create kinder, fairer environments where every person can do their best work.",
    showInCarousel: true,
  },
  {
    id: "racketeer",
    name: "Racketeer",
    tier: "standard",
    category: "Venue Partner",
    logoLight: "venues/racketeer-clean.png",
    logoDark: "venues/racketeer-clean.png",
    url: "https://www.racketeer.club",
    blurb: "London's premier padel and sports bar — premium courts, great food, and an electric atmosphere right in the heart of the city.",
    showInCarousel: true,
  },
  {
    id: "padium",
    name: "Padium",
    tier: "standard",
    category: "Venue Partner",
    logoLight: "venues/padium-logo.svg",
    logoDark: "venues/padium-logo.svg",
    url: "https://padium.com",
    blurb: "World-class padel at Canary Wharf — state-of-the-art courts in one of London's most iconic locations.",
    showInCarousel: true,
  },
];

export default partners;
