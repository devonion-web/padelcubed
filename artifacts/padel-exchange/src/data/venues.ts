// ─── Venues data ──────────────────────────────────────────────────────────────
// Add or remove venues here. photo paths are relative to /public.
// Leave photo: "" to show a gradient placeholder.

export interface TransportLine {
  name: string;
  color: string; // TfL brand colour
}

export interface VenueTransport {
  station: string;
  travelTime: string;   // e.g. "~25 min"
  from: string;         // e.g. "Waterloo"
  lines: TransportLine[];
}

export interface Venue {
  id: string;
  name: string;
  location: string;
  city: string;
  courts: number;
  surface: "indoor" | "outdoor" | "mixed";
  transport: VenueTransport;
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
    transport: {
      station: "East Acton",
      travelTime: "~20 min",
      from: "Bank",
      lines: [
        { name: "Central", color: "#E32017" },
        { name: "Overground", color: "#EE7C0E" },
      ],
    },
    photo: "venues/racketeer-hero.jpg",
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
    transport: {
      station: "Surbiton",
      travelTime: "~20 min",
      from: "Waterloo",
      lines: [
        { name: "SWR", color: "#0099D4" },
      ],
    },
    photo: "venues/surbiton-hero.jpg",
    logo: "",
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
    transport: {
      station: "Canary Wharf",
      travelTime: "~10 min",
      from: "Bank",
      lines: [
        { name: "Jubilee", color: "#A0A5A9" },
        { name: "Elizabeth", color: "#6950A1" },
        { name: "DLR", color: "#00A4A7" },
      ],
    },
    photo: "venues/padium-hero.webp",
    logo: "",
    url: "https://padium.com/canary-wharf",
    blurb: "Premium padel in Canary Wharf — 7 indoor and 2 outdoor courts, pro shop, Ace Bar, and an elevated experience from warm-up to wind-down.",
  },
];

export default venues;
