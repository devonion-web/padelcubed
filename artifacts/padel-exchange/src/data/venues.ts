// ─── Venues data ──────────────────────────────────────────────────────────────
// Add or remove venues here. photo paths are relative to /public.
// Leave photo: "" to show a gradient placeholder.

export interface Venue {
  id: string;
  name: string;
  location: string;
  city: string;
  courts: number;
  surface: "indoor" | "outdoor" | "mixed";
  travelTime: string;   // e.g. "25 min from Waterloo"
  photo: string;        // full-bleed venue photo (preferred)
  logo: string;         // wordmark shown on gradient placeholder when no photo
  url: string;
  blurb: string;
}

const venues: Venue[] = [
  {
    id: "racketeer",
    name: "Racketeer",
    location: "Acton, London",
    city: "London",
    courts: 11,
    surface: "indoor",
    travelTime: "25 min from Waterloo",
    photo: "",
    logo: "venues/racketeer-logo.webp",
    url: "https://www.racketeer.club",
    blurb: "London's padel HQ — 11 professional-grade indoor courts across 9,000m² of warehouse space, plus bar, restaurant, sauna and co-working.",
  },
  {
    id: "surbiton",
    name: "Surbiton Racket & Fitness Club",
    location: "Surbiton, Surrey",
    city: "London",
    courts: 5,
    surface: "outdoor",
    travelTime: "30 min from Waterloo",
    photo: "",
    logo: "venues/surbiton-logo.png",
    url: "https://www.surbiton.org",
    blurb: "A family-friendly multi-sport club with 5 padel courts, ~1,500 members, and top-quality facilities for tennis, squash, gym and more.",
  },
  {
    id: "padium",
    name: "Padium",
    location: "Canary Wharf, London",
    city: "London",
    courts: 9,
    surface: "mixed",
    travelTime: "10 min from Bank",
    photo: "",
    logo: "venues/padium-logo.svg",
    url: "https://padium.com/canary-wharf",
    blurb: "Premium padel in Canary Wharf — 7 indoor and 2 outdoor courts, pro shop, Ace Bar, and an elevated experience from warm-up to wind-down.",
  },
];

export default venues;
