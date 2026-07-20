// ─── Website adverts data ─────────────────────────────────────────────────────
// Edit this file to add, remove or schedule paid brand placements.
//
// slot:          "home-banner" | "events-inline"
// creativeLight: path relative to /public (e.g. "adverts/brand-light.svg")
//                Leave empty ("") to show a styled text lockup instead.
// start / end:   ISO date strings (YYYY-MM-DD). Advert only renders inside this window.
//                The AdSlot component checks today's date against these on every render.
//
// UTM guidance for advertisers:
//   utm_source=pcubed  utm_medium=advert  utm_campaign=<their-campaign-slug>

export interface Advert {
  id: string;
  advertiser: string;
  slot: "home-banner" | "events-inline";
  creativeLight: string;
  creativeDark: string;
  headline: string;          // ≤ 6 words — short tagline shown under the creative
  ctaLabel: string;          // Button / link label
  url: string;
  start: string;             // ISO date "YYYY-MM-DD"
  end: string;               // ISO date "YYYY-MM-DD"
}

const adverts: Advert[] = [
  // ── Placeholder — replace with a real booking ──────────────────────────────
  // {
  //   id: "example-summer-2026",
  //   advertiser: "Placeholder Racquet Co",
  //   slot: "home-banner",
  //   creativeLight: "adverts/placeholder-light.svg",
  //   creativeDark: "adverts/placeholder-dark.svg",
  //   headline: "Play better, play longer.",
  //   ctaLabel: "Shop now",
  //   url: "https://example.com/?utm_source=pcubed&utm_medium=advert&utm_campaign=summer",
  //   start: "2026-08-01",
  //   end: "2026-10-31",
  // },
];

export default adverts;
