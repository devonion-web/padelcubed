/**
 * Web E2E — consent checkboxes in the IntentModal (registration form).
 *
 * Tests:
 *   1. All three consent fields are present and labelled correctly.
 *   2. Required (gdpr) checkbox gates the submit button.
 *   3. Optional (marketing + sponsor) can be omitted.
 *   4. All three checked → submit is enabled.
 *
 * API calls are intercepted so no real DB writes occur.
 */

import { test, expect } from "@playwright/test";

// ── helpers ─────────────────────────────────────────────────────────────────

async function openJoinForm(page: import("@playwright/test").Page) {
  // Intercept registration POST so we don't need a real DB
  await page.route("**/api/registrations", (route) =>
    route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  );

  await page.goto("/");

  // Click any "Register your interest" CTA on the homepage
  await page.getByRole("button", { name: /register your interest/i }).first().click();

  // The modal should open
  // Filter to the IntentModal specifically — the page also has a CookieBanner
  // with role="dialog" (no aria-modal), so we key on aria-modal="true".
  const modal = page.locator('[role="dialog"][aria-modal="true"]');
  await expect(modal).toBeVisible();

  // The modal opens at the "pick intent" step — click "Join the community"
  // (it's a <button> element, not just text)
  await modal.getByRole("button", { name: /join the community/i }).click();

  // Wait for the form to appear (brief Framer Motion transition)
  await expect(modal.getByPlaceholder("Jane Smith")).toBeVisible({ timeout: 5000 });

  return modal;
}

async function fillMinimumFields(modal: import("@playwright/test").Locator) {
  await modal.getByPlaceholder("Jane Smith").fill("Test User");
  await modal.getByPlaceholder("jane@company.com").fill("test@example.com");
}

// ── tests ────────────────────────────────────────────────────────────────────

test.describe("Registration consent checkboxes", () => {
  test("all three consent blocks are visible", async ({ page }) => {
    const modal = await openJoinForm(page);

    // Scroll to the consent section at the bottom of the form
    await modal.getByRole("checkbox").first().scrollIntoViewIfNeeded();

    // 1. Required — events consent (new wording)
    await expect(modal.getByText("Required", { exact: false }).first()).toBeVisible();
    await expect(modal.getByText(/keep me posted about P³ events/i)).toBeVisible();

    // 2. Optional — newsletter / updates
    await expect(modal.getByText(/occasional newsletter/i)).toBeVisible();

    // 3. Optional — sponsor introductions
    await expect(modal.getByText(/genuine match.*happy to be introduced/i)).toBeVisible();
  });

  test("submit button is disabled until required (gdpr) checkbox is checked", async ({ page }) => {
    const modal = await openJoinForm(page);
    await fillMinimumFields(modal);

    const submit = modal.getByRole("button", { name: /register my interest/i });
    await submit.scrollIntoViewIfNeeded();

    // Without any consent → disabled
    await expect(submit).toBeDisabled();

    // Check only the optional marketing checkbox → still disabled
    const checkboxes = await modal.getByRole("checkbox").all();
    await checkboxes[1].check(); // marketing (2nd checkbox)
    await expect(submit).toBeDisabled();

    // Check the required gdpr checkbox (1st) → enabled
    await checkboxes[0].check();
    await expect(submit).toBeEnabled();
  });

  test("optional checkboxes (marketing + sponsor) can be omitted", async ({ page }) => {
    const modal = await openJoinForm(page);
    await fillMinimumFields(modal);

    // Only check the required gdpr box (first checkbox)
    const [gdprCheckbox] = await modal.getByRole("checkbox").all();
    await gdprCheckbox.scrollIntoViewIfNeeded();
    await gdprCheckbox.check();

    const submit = modal.getByRole("button", { name: /register my interest/i });
    await expect(submit).toBeEnabled();

    // Submit with only gdpr → should succeed (API is mocked to 201)
    await submit.click();
    await expect(modal.getByText(/you're on the list/i)).toBeVisible({ timeout: 8000 });
  });

  test("all three consents checked → submit succeeds", async ({ page }) => {
    const modal = await openJoinForm(page);
    await fillMinimumFields(modal);

    const checkboxes = await modal.getByRole("checkbox").all();
    for (const cb of checkboxes) {
      await cb.scrollIntoViewIfNeeded();
      await cb.check();
    }

    const submit = modal.getByRole("button", { name: /register my interest/i });
    await expect(submit).toBeEnabled();
    await submit.click();
    await expect(modal.getByText(/you're on the list/i)).toBeVisible({ timeout: 8000 });
  });
});
