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
}

const partners: Partner[] = [
  {
    id: "risk-rising",
    name: "Risk Rising",
    tier: "founding",
    category: "Risk & Compliance",
    logoLight: "partners/rr.png",
    logoDark: "partners/rr.png",
    url: "https://www.riskrising.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "Risk Rising helps financial services firms build resilient, high-performing risk and compliance functions.",
    showInCarousel: true,
  },
  {
    id: "panorays",
    name: "Panorays",
    tier: "founding",
    category: "Third-Party Risk",
    logoLight: "partners/panorays.png",
    logoDark: "partners/panorays.png",
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
    logoLight: "",
    logoDark: "",
    url: "https://www.finativ.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "Specialist consulting and advisory for asset, motor, invoice and other finance companies — strategic insight from experienced leaders.",
    showInCarousel: true,
  },
  {
    id: "grc-edge",
    name: "GRC Edge",
    tier: "founding",
    category: "GRC & Cyber",
    logoLight: "",
    logoDark: "",
    url: "https://www.grcedge.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "Independent advisory in GRC, cyber & AI governance, and operational resilience — helping organisations navigate complexity.",
    showInCarousel: true,
  },
  {
    id: "byrne-dean",
    name: "byrne·dean",
    tier: "standard",
    category: "Workplace Culture",
    logoLight: "",
    logoDark: "",
    url: "https://www.byrnedean.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "Leaders in workplace culture & behaviour — helping organisations build kinder, fairer workplaces for over 20 years.",
    showInCarousel: true,
  },
];

export default partners;
