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
}

const partners: Partner[] = [
  {
    id: "corlytics",
    name: "Corlytics",
    tier: "founding",
    category: "RegTech",
    logoLight: "partners/rr.png",
    logoDark: "partners/rr.png",
    url: "https://www.riskrising.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "The world's leading regulatory intelligence platform — making compliance faster, smarter and less costly.",
    showInCarousel: true,
  },
  {
    id: "finativ",
    name: "Finativ",
    tier: "founding",
    category: "FinTech",
    logoLight: "",
    logoDark: "",
    url: "https://www.finativ.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "Data and analytics for financial services firms navigating regulatory change.",
    showInCarousel: true,
  },
  {
    id: "grc-edge",
    name: "GRC Edge",
    tier: "founding",
    category: "GRC & Compliance",
    logoLight: "",
    logoDark: "",
    url: "https://www.grcedge.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "Practical GRC consulting for firms that want clarity, not complexity.",
    showInCarousel: true,
  },
  {
    id: "apollo-1971",
    name: "Apollo 1971",
    tier: "premium",
    category: "Investment",
    logoLight: "",
    logoDark: "",
    url: "https://www.apollo1971.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "Boutique investment firm backing ambitious founders across fintech and professional services.",
    showInCarousel: true,
  },
  {
    id: "byrne-dean",
    name: "byrne·dean",
    tier: "standard",
    category: "Employment Law",
    logoLight: "",
    logoDark: "",
    url: "https://www.byrnedean.com/?utm_source=pcubed&utm_medium=partner&utm_campaign=site",
    blurb: "Transforming how organisations manage people risk — specialist employment lawyers with a human edge.",
    showInCarousel: true,
  },
];

export default partners;
