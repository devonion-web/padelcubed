/**
 * Web E2E — BookingModal (event checkout).
 *
 * EventsSection filters the /api/events response through FEATURED_IDS = ["2","4"],
 * so mocked events MUST use those IDs to appear on the homepage.
 *
 * Flow for each test:
 *   1. Intercept GET /api/events → return mocked events with FEATURED IDs.
 *   2. Navigate to /.
 *   3. Wait for event cards to render (React Query fetch).
 *   4. Click "Book a spot →" on the appropriate card.
 *   5. BookingModal opens (role="dialog" aria-modal="true").
 *   6. Fill form + check gdpr → click submit button.
 *
 * Tests:
 *   1. Free event → POST /api/events/2/checkout → success state shown.
 *   2. Paid event → POST /api/events/4/checkout → returns Stripe URL → redirect.
 *   3. gdpr not checked → submit button is disabled.
 *   4. Duplicate booking (409) → inline error shown.
 */

import { test, expect } from "@playwright/test";

// ── Shared event fixtures (IDs must match FEATURED_IDS in EventsSection) ──────

const FREE_EVENT = {
  id: "2",
  title: "The Surbiton Exchange",
  date: "Thursday 18 September 2026",
  dateShort: "18 Sep",
  time: "6:30 pm – 9:30 pm",
  venue: "Surbiton Racket & Fitness Club",
  location: "London",
  format: "Americano",
  sponsor: "Risk Rising",
  price: "Free",
  pricePence: 0,
  status: "available",       // "soon" would show "Register interest →", not "Book a spot →"
  maxSpots: 16,
  attendeeCount: 4,
  published: true,
  description: "Pre-launch event for registered members.",
};

const PAID_EVENT = {
  id: "4",
  title: "The Padium Launch",
  date: "Thursday 9 October 2026",
  dateShort: "9 Oct",
  time: "6:30 pm – 9:30 pm",
  venue: "Padium Canary Wharf",
  location: "London",
  format: "Americano",
  sponsor: "P³",
  price: "£35",
  pricePence: 3500,
  status: "available",
  maxSpots: 32,
  attendeeCount: 8,
  published: true,
  description: "The flagship P³ launch event.",
};

// ── Helper ────────────────────────────────────────────────────────────────────

/**
 * Mock /api/events, navigate to homepage, wait for event cards to load,
 * click the "Book a spot →" button for the target event, and return the
 * BookingModal locator.
 *
 * @param cardIndex  0 = first event card (event "2" / free), 1 = second (event "4" / paid)
 */
async function openBookingModal(
  page: import("@playwright/test").Page,
  cardIndex: 0 | 1 = 0,
) {
  await page.route("**/api/events", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([FREE_EVENT, PAID_EVENT]),
    })
  );

  await page.goto("/");

  // Wait for React Query to fetch and render the event cards
  const bookBtns = page.getByRole("button", { name: "Book a spot →" });
  await expect(bookBtns.first()).toBeVisible({ timeout: 10_000 });

  // Click the correct card's button
  await bookBtns.nth(cardIndex).click();

  // BookingModal has aria-modal="true"; IntentModal also has it but is not open here
  const modal = page.locator('[role="dialog"][aria-modal="true"]');
  await expect(modal).toBeVisible({ timeout: 5000 });
  return modal;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

test.describe("BookingModal", () => {
  test("free event → success state after checkout POST", async ({ page }) => {
    await page.route("**/api/events/2/checkout", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      })
    );

    const modal = await openBookingModal(page, 0);

    await modal.getByPlaceholder("Jane Smith").fill("Free Booker");
    await modal.getByPlaceholder("jane@company.com").fill("free@e2e.test");

    const gdpr = modal.getByRole("checkbox").first();
    await gdpr.scrollIntoViewIfNeeded();
    await gdpr.check();

    // Free event submit button text: "Reserve my spot"
    await modal.getByRole("button", { name: /reserve my spot/i }).click();

    // Success screen text
    await expect(modal.getByText(/you're in/i)).toBeVisible({ timeout: 8000 });
  });

  test("paid event → checkout POST returns Stripe URL → redirect initiated", async ({ page }) => {
    const stripeUrl = "https://checkout.stripe.com/pay/cs_test_e2e_placeholder";

    await page.route("**/api/events/4/checkout", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ url: stripeUrl }),
      })
    );

    // Intercept the Stripe redirect so the test works without real connectivity
    await page.route("https://checkout.stripe.com/**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body>Stripe mock checkout</body></html>",
      })
    );

    const modal = await openBookingModal(page, 1);

    await modal.getByPlaceholder("Jane Smith").fill("Stripe Booker");
    await modal.getByPlaceholder("jane@company.com").fill("stripe@e2e.test");

    const gdpr = modal.getByRole("checkbox").first();
    await gdpr.scrollIntoViewIfNeeded();
    await gdpr.check();

    // Paid event submit button text: "Pay £35 & reserve spot"
    await Promise.all([
      page.waitForURL(/checkout\.stripe\.com/, { timeout: 8000 }),
      modal.getByRole("button", { name: /pay.*reserve/i }).click(),
    ]);

    expect(page.url()).toContain("checkout.stripe.com");
  });

  test("gdpr not checked → submit button is disabled", async ({ page }) => {
    await page.route("**/api/events/*/checkout", (route) =>
      route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    );

    const modal = await openBookingModal(page, 0);

    await modal.getByPlaceholder("Jane Smith").fill("No Consent");
    await modal.getByPlaceholder("jane@company.com").fill("noconsent@e2e.test");

    // gdpr NOT checked — button must be disabled (the component disables when !fields.gdpr)
    const submitBtn = modal.getByRole("button", { name: /reserve my spot/i });
    await submitBtn.scrollIntoViewIfNeeded();
    await expect(submitBtn).toBeDisabled();
  });

  test("duplicate booking (409) → inline error message shown", async ({ page }) => {
    await page.route("**/api/events/2/checkout", (route) =>
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: "Already booked" }),
      })
    );

    const modal = await openBookingModal(page, 0);

    await modal.getByPlaceholder("Jane Smith").fill("Dup Booker");
    await modal.getByPlaceholder("jane@company.com").fill("dup-book@e2e.test");

    const gdpr = modal.getByRole("checkbox").first();
    await gdpr.scrollIntoViewIfNeeded();
    await gdpr.check();

    await modal.getByRole("button", { name: /reserve my spot/i }).click();

    await expect(modal.getByText(/already booked|booking failed/i)).toBeVisible({ timeout: 6000 });
  });
});
