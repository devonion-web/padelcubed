// ─── Venues data ──────────────────────────────────────────────────────────────
// Add or remove venues here. photo paths are relative to /public.
// Leave photo: "" to show a gradient placeholder.

export interface Venue {
  id: string;
  name: string;
  location: string;
  city: string;
  courts: number;
  photo: string;   // full-bleed venue photo (preferred)
  logo: string;    // wordmark shown on gradient placeholder when no photo
  url: string;
  blurb: string;
}

const venues: Venue[] = [
  {
    id: "racketeer",
    name: "Racketeer",
    location: "Acton, London W3",
    city: "London",
    courts: 6,
    photo: "",
    logo: "venues/racketeer-logo.webp",
    url: "https://www.racketeer.london",
    blurb: "One of London's flagship padel clubs — purpose-built courts, bar, and a serious playing community.",
  },
  {
    id: "surbiton",
    name: "Surbiton Racquet Club",
    location: "Surbiton, Surrey",
    city: "London",
    courts: 4,
    photo: "",
    logo: "",
    url: "https://www.surbitonraquetclub.co.uk",
    blurb: "A storied racquet club bringing padel to South West London with top-tier facilities and a warm members' culture.",
  },
  {
    id: "padium",
    name: "Padium",
    location: "Canary Wharf, London",
    city: "London",
    courts: 8,
    photo: "",
    logo: "",
    url: "https://www.padium.co.uk",
    blurb: "London's largest dedicated padel venue — right in the heart of Canary Wharf, steps from the City.",
  },
];

export default venues;
