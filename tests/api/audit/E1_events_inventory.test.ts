/**
 * E1 — Events inventory
 *
 * After the July 2026 clean-up, exactly TWO events live in the DB:
 *   ID 2  — Surbiton Exchange  (published=false → private rehearsal, not in public list)
 *   ID 4  — Padium launch      (published=true, status="soon" → visible but not bookable)
 *
 * GET /api/events returns only published=true rows, so the public endpoint
 * yields 1 event.  Deleted IDs and unpublished IDs both return 404.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app.js";
import { truncateAll, seedEvent } from "../../setup/seed.js";

const ABSENT_IDS = [
  // hard-deleted test events
  "evt-000", "evt-001", "evt-002", "live-2026-07-26", "test-live",
  // deleted non-planned events
  "1", "3", "5",
];

beforeAll(async () => {
  await truncateAll();
  // Surbiton — private rehearsal, hidden from public list
  await seedEvent({
    id: "2", title: "The Surbiton Exchange",
    date: "Thursday 10 September 2026", dateShort: "10 Sep",
    venue: "Surbiton Racquet Club", location: "Surbiton, Surrey",
    format: "Americano", price: "Free", pricePence: 0,
    status: "soon", published: false,
    eventDate: new Date("2026-09-10T17:30:00Z"), maxSpots: 16,
  });
  // Padium launch — publicly visible, booking not yet open
  await seedEvent({
    id: "4", title: "P³ Launch — People, Padel, Places",
    date: "Thursday 15 October 2026", dateShort: "15 Oct",
    venue: "Padium", location: "Canary Wharf, London",
    format: "Americano", price: "£20", pricePence: 2000,
    status: "soon", published: true,
    eventDate: new Date("2026-10-15T17:30:00Z"),
    maxSpots: 16, courtsCount: 4,
    description:
      "An evening of curated play and new connections at Padium, Canary Wharf. " +
      "Americano format, drinks, and a room full of founders and senior professionals worth meeting.",
  });
});

afterAll(() => truncateAll());

describe("E1 — Events inventory", () => {
  let events: Array<Record<string, unknown>> = [];

  beforeAll(async () => {
    const res = await request(app).get("/api/events");
    expect(res.status).toBe(200);
    events = res.body as Array<Record<string, unknown>>;
  });

  it("public GET /api/events returns exactly 1 event (published=true only)", () => {
    expect(events).toHaveLength(1);
  });

  it("the single public event is the Padium launch (event 4)", () => {
    expect(events[0]!.id).toBe("4");
    expect(events[0]!.title).toBe("P³ Launch — People, Padel, Places");
    expect(events[0]!.status).toBe("soon");
  });

  it("event 4 has the confirmed fields", () => {
    const e = events[0]!;
    expect(e.venue).toBe("Padium");
    expect(e.location).toBe("Canary Wharf, London");
    expect(e.pricePence).toBe(2000);
    expect(e.price).toBe("£20");
    expect(e.maxSpots).toBe(16);
    expect(e.courtsCount).toBe(4);
    expect(e.format).toBe("Americano");
  });

  it("event 4 eventDate is 15 October 2026", () => {
    const d = new Date(events[0]!.eventDate as string);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(9); // 0-indexed → October
    expect(d.getUTCDate()).toBe(15);
  });

  it("event 4 description is broad — no GRC/finance/debut language", () => {
    const desc = events[0]!.description as string;
    expect(desc).not.toMatch(/\bdebut\b/i);
    expect(desc).not.toMatch(/\bGRC\b/);
    expect(desc).not.toMatch(/\bfinance\b/i);
  });

  it("absent IDs return 404", async () => {
    for (const id of ABSENT_IDS) {
      const res = await request(app).get(`/api/events/${id}`);
      expect(res.status, `expected 404 for ${id}`).toBe(404);
    }
  });

  it("Surbiton (event 2) does NOT appear in the public list", () => {
    expect(events.map((e) => e.id)).not.toContain("2");
  });
});
