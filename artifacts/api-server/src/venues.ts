/**
 * Venue data for email enrichment.
 * Mirrors artifacts/padel-exchange/src/data/venues.ts with the addition of
 * pre-loaded base64 hero images for inline email embedding.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, "email-assets", "venues");

function loadImg(file: string): string {
  try {
    const buf = fs.readFileSync(path.join(ASSETS, file));
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return "";
  }
}

export interface TransportLine {
  name:  string;
  color: string;
}

export interface VenueData {
  id:        string;
  /** Matches the events.venue display string (case-insensitive) */
  names:     string[];
  name:      string;
  location:  string;
  courts:    number;
  surface:   "indoor" | "outdoor" | "mixed";
  blurb:     string;
  url:       string;
  mapsUrl:   string;
  heroB64:   string;   // pre-loaded base64 data URI — empty string if unavailable
  transport: {
    station:    string;
    travelTime: string;
    from:       string;
    lines:      TransportLine[];
  };
}

export const VENUES: VenueData[] = [
  {
    id:       "racketeer",
    names:    ["racketeer"],
    name:     "Racketeer",
    location: "Acton, London",
    courts:   11,
    surface:  "indoor",
    blurb:    "London's padel HQ — 11 professional-grade indoor courts across 9,000m² of warehouse space, plus bar, restaurant, sauna and co-working.",
    url:      "https://www.racketeer.club",
    mapsUrl:  "https://maps.google.com/?q=Racketeer+Padel+Acton+London",
    heroB64:  loadImg("racketeer.jpg"),
    transport: {
      station:    "East Acton",
      travelTime: "~20 min",
      from:       "Bank",
      lines: [
        { name: "Central",     color: "#E32017" },
        { name: "Overground",  color: "#EE7C0E" },
      ],
    },
  },
  {
    id:       "surbiton",
    names:    ["surbiton", "surbiton racket", "surbiton racket & fitness"],
    name:     "Surbiton Racket & Fitness Club",
    location: "Surbiton, Surrey",
    courts:   5,
    surface:  "outdoor",
    blurb:    "A family-friendly multi-sport club with 5 padel courts, ~1,500 members, and top-quality facilities for tennis, squash, gym and more.",
    url:      "https://www.surbiton.org",
    mapsUrl:  "https://maps.google.com/?q=Surbiton+Racket+Fitness+Club",
    heroB64:  loadImg("surbiton.jpg"),
    transport: {
      station:    "Surbiton",
      travelTime: "~20 min",
      from:       "Waterloo",
      lines: [
        { name: "SWR", color: "#0099D4" },
      ],
    },
  },
  {
    id:       "padium",
    names:    ["padium"],
    name:     "Padium",
    location: "Canary Wharf, London",
    courts:   9,
    surface:  "mixed",
    blurb:    "Premium padel in Canary Wharf — 7 indoor and 2 outdoor courts, pro shop, Ace Bar, and an elevated experience from warm-up to wind-down.",
    url:      "https://padium.com/canary-wharf",
    mapsUrl:  "https://maps.google.com/?q=Padium+Canary+Wharf+London",
    heroB64:  loadImg("padium.jpg"),
    transport: {
      station:    "Canary Wharf",
      travelTime: "~10 min",
      from:       "Bank",
      lines: [
        { name: "Jubilee",   color: "#A0A5A9" },
        { name: "Elizabeth", color: "#6950A1" },
        { name: "DLR",       color: "#00A4A7" },
      ],
    },
  },
];

/** Look up a venue by display name (case-insensitive prefix match). */
export function findVenue(venueName: string): VenueData | undefined {
  const needle = venueName.toLowerCase().trim();
  return VENUES.find((v) =>
    v.names.some((n) => needle.includes(n) || n.includes(needle)),
  );
}

// ─── Format explainers ────────────────────────────────────────────────────────

export interface FormatInfo {
  label:   string;
  emoji:   string;
  summary: string;
  detail:  string;
}

export const FORMAT_INFO: Record<string, FormatInfo> = {
  americano: {
    label:   "Americano",
    emoji:   "🔀",
    summary: "Random partners every round",
    detail:  "You'll rotate partners after each court — every round you play with someone new. Points are scored individually, so the leaderboard reflects your personal performance across the whole event.",
  },
  mexicano: {
    label:   "Mexicano",
    emoji:   "📊",
    summary: "Points-based partner rotation",
    detail:  "After each round the leaderboard pairs the top player with the bottom player, 2nd with 2nd-last, and so on. It keeps matches competitive and ensures everyone faces a range of opponents.",
  },
  round_robin: {
    label:   "Round Robin",
    emoji:   "🔁",
    summary: "Everyone plays everyone",
    detail:  "Courts are fixed for the session. Every pairing will play against every other pairing at least once. Perfect for building connections and getting a true read on the standings.",
  },
  knockout: {
    label:   "Knockout",
    emoji:   "⚡",
    summary: "Win or go home",
    detail:  "Lose a round and you're out. The last pair standing takes the title. High stakes, fast format — expect big moments and even bigger celebrations.",
  },
};
