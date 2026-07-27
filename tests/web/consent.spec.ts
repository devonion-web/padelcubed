/**
 * Web E2E — consent checkboxes in the IntentModal (registration form).
 *
 * Tests:
 *   1. All four consent fields are present and labelled correctly.
 *   2. Both required checkboxes (gdpr + termsAccepted) gate the submit button.
 *   3. Optional (marketing + sponsor) can be omitted.
 *   4. All four checked → submit is enabled.
 *
 * Checkbox order: [0]=gdpr (required), [1]=marketing (optional),
 *                 [2]=sponsor (optional), [3]=termsAccepted (required).
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

  await page.getByRole("button", { name: /register your interest/i }).first().click();

  const modal = page.locator('[role="dialog"][aria-modal="true"]');
  await expect(modal).toBeVisible();

  await modal.getByRole("button", { name: /join the community/i }).click();

  await expect(modal.getByPlaceholder("Jane Smith")).toBeVisible({ timeout: 5000 });

  return modal;
}

/** Fill the three required text fields so only checkboxes gate the submit. */
async function fillMinimumFields(modal: import("@playwright/test").Locator) {
  await modal.getByPlaceholder("Jane Smith").fill("Test User");
  await modal.getByPlaceholder("jane@company.com").fill("test@example.com");
  await modal.getByPlaceholder("https://www.linkedin.com/in/yourname").fill("https://linkedin.com/in/testuser");
}

// ── tests ────────────────────────────────────────────────────────────────────

test.describe("Registration consent checkboxes", () => {
  test("all four consent blocks are visible", async ({ page }) => {
    const modal = await openJoinForm(page);

    await modal.getByRole("checkbox").first().scrollIntoViewIfNeeded();

    // 1. Required — events consent
    await expect(modal.getByText("Required", { exact: false }).first()).toBeVisible();
    await expect(modal.getByText(/keep me posted about P³ events/i)).toBeVisible();

    // 2. Optional — newsletter / updates
    await expect(modal.getByText(/occasional newsletter/i)).toBeVisible();

    // 3. Optional — sponsor introductions
    await expect(modal.getByText(/genuine match.*happy to be introduced/i)).toBeVisible();

    // 4. Required — 18+ / terms acceptance
    await expect(modal.getByText(/18 or over/i)).toBeVisible();
    await expect(modal.getByText(/terms of use/i).first()).toBeVisible();
  });

  test("submit button requires both gdpr and 18+/terms checkboxes", async ({ page }) => {
    const modal = await openJoinForm(page);
    await fillMinimumFields(modal);

    const submit = modal.getByRole("button", { name: /register my interest/i });
    await submit.scrollIntoViewIfNeeded();

    // No checkboxes → disabled
    await expect(submit).toBeDisabled();

    const checkboxes = await modal.getByRole("checkbox").all();

    // Only marketing (optional, index 1) → still disabled
    await checkboxes[1].check();
    await expect(submit).toBeDisabled();

    // Add gdpr (index 0) → still disabled (termsAccepted missing)
    await checkboxes[0].check();
    await expect(submit).toBeDisabled();

    // Add termsAccepted (index 3) → now enabled
    await checkboxes[3].check();
    await expect(submit).toBeEnabled();

    // Uncheck gdpr → disabled again
    await checkboxes[0].uncheck();
    await expect(submit).toBeDisabled();
  });

  test("submit blocked if only terms checked but not gdpr", async ({ page }) => {
    const modal = await openJoinForm(page);
    await fillMinimumFields(modal);

    const submit = modal.getByRole("button", { name: /register my interest/i });
    await submit.scrollIntoViewIfNeeded();

    const checkboxes = await modal.getByRole("checkbox").all();

    // Only termsAccepted (index 3) — no gdpr
    await checkboxes[3].check();
    await expect(submit).toBeDisabled();
  });

  test("optional checkboxes (marketing + sponsor) can be omitted", async ({ page }) => {
    const modal = await openJoinForm(page);
    await fillMinimumFields(modal);

    // Only tick the two required boxes: gdpr (0) and termsAccepted (3)
    const checkboxes = await modal.getByRole("checkbox").all();
    await checkboxes[0].scrollIntoViewIfNeeded();
    await checkboxes[0].check();
    await checkboxes[3].check();

    const submit = modal.getByRole("button", { name: /register my interest/i });
    await expect(submit).toBeEnabled();

    // Submit with only required boxes ticked → API mocked to 201 → success
    await submit.click();
    await expect(modal.getByText(/you're on the list/i)).toBeVisible({ timeout: 8000 });
  });

  test("all four consents checked → submit succeeds", async ({ page }) => {
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
