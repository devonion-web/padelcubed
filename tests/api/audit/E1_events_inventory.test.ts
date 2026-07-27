/**
 * E1 — Events inventory
 *
 * Seeds the five real P³ events and verifies:
 *   • GET /api/events returns all five in eventDate order.
 *   • Deleted test IDs (evt-000 etc.) return 404.
 *   • Event 4 carries the confirmed P³ launch details.
 *   • Event ordering is chronological.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../../artifacts/api-server/src/app.js";
import { truncateAll, seedEvent } from "../../setup/seed.js";

const DELETED_IDS = ["evt-000", "evt-001", "evt-002", "live-2026-07-26", "test-live"];

beforeAll(async () => {
  await truncateAll();

  // Seed the five real events in date order
  await seedEvent({ id: "1", title: "The City Kickoff",         date: "Thursday 6 August 2026",     dateShort: "6 Aug",  venue: "Racketeer",            location: "Acton, London",           format: "Americano", price: "Free", pricePence: 0,    status: "available", eventDate: new Date("2026-08-06T17:30:00Z"), maxSpots: 16 });
  await seedEvent({ id: "2", title: "The Surbiton Exchange",    date: "Thursday 10 September 2026", dateShort: "10 Sep", venue: "Surbiton Racquet Club", location: "London",                  format: "Americano", price: "Free", pricePence: 0,    status: "available", eventDate: new Date("2026-09-10T17:30:00Z"), maxSpots: 16 });
  await seedEvent({ id: "3", title: "The GRC Exchange",         date: "Thursday 8 October 2026",    dateShort: "8 Oct",  venue: "Racketeer",            location: "Acton, London",           format: "Americano", price: "Free", pricePence: 0,    status: "available", eventDate: new Date("2026-10-08T17:30:00Z"), maxSpots: 16 });
  await seedEvent({ id: "4", title: "P³ Launch — People, Padel, Places", date: "Thursday 15 October 2026", dateShort: "15 Oct", venue: "Padium", location: "Canary Wharf, London", format: "Americano", price: "£20", pricePence: 2000, status: "soon",      eventDate: new Date("2026-10-15T17:30:00Z"), maxSpots: 16, courtsCount: 2 });
  await seedEvent({ id: "5", title: "The Year Closer",          date: "Thursday 3 December 2026",   dateShort: "3 Dec",  venue: "Racketeer",            location: "Acton, London",           format: "Americano", price: "Free", pricePence: 0,    status: "soon",      eventDate: new Date("2026-12-03T18:30:00Z"), maxSpots: 16 });
});

afterAll(() => truncateAll());

describe("E1 — Events inventory", () => {
  let events: Array<Record<string, unknown>> = [];

  beforeAll(async () => {
    const res = await request(app).get("/api/events");
    expect(res.status).toBe(200);
    events = res.body as Array<Record<string, unknown>>;
  });

  it("returns exactly 5 published events", () => {
    expect(events).toHaveLength(5);
  });

  it("events are returned in chronological order", () => {
    const dates = events
      .map((e) => new Date(e.eventDate as string).getTime())
      .filter((t) => !isNaN(t));
    expect(dates).toHaveLength(5);
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
    }
  });

  it("deleted test IDs are not present", () => {
    const ids = events.map((e) => e.id);
    for (const testId of DELETED_IDS) {
      expect(ids).not.toContain(testId);
    }
  });

  it("deleted test event IDs return 404", async () => {
    for (const id of DELETED_IDS) {
      const res = await request(app).get(`/api/events/${id}`);
      expect(res.status, `expected 404 for ${id}`).toBe(404);
    }
  });

  it("event 4 has the confirmed P³ launch details", () => {
    const launch = events.find((e) => e.id === "4");
    expect(launch).toBeDefined();
    expect(launch!.title).toBe("P³ Launch — People, Padel, Places");
    expect(launch!.venue).toBe("Padium");
    expect(launch!.location).toBe("Canary Wharf, London");
    expect(launch!.pricePence).toBe(2000);
    expect(launch!.price).toBe("£20");
    expect(launch!.maxSpots).toBe(16);
    expect(launch!.status).toBe("soon");
    expect(launch!.format).toBe("Americano");
  });

  it("event 4 eventDate is 15 October 2026", () => {
    const launch = events.find((e) => e.id === "4");
    const d = new Date(launch!.eventDate as string);
    expect(d.getUTCFullYear()).toBe(2026);
    expect(d.getUTCMonth()).toBe(9); // 0-indexed → October
    expect(d.getUTCDate()).toBe(15);
  });

  it("no event title signals a test/demo event", () => {
    for (const e of events) {
      expect((e.title as string)).not.toMatch(/⚡\s*test/i);
      expect((e.title as string)).not.toMatch(/^P³ Test Event$/i);
    }
  });
});
