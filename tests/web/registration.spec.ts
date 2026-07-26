/**
 * Web E2E — registration form (IntentModal / join flow).
 *
 * Tests:
 *   1. Happy path: required fields filled, gdpr checked → submit → success state.
 *   2. Duplicate email (API 409) → error message shown to user.
 *   3. Network error (500) → user-facing error shown.
 */

import { test, expect } from "@playwright/test";

async function openJoinForm(page: import("@playwright/test").Page) {
  await page.goto("/");

  await page.getByRole("button", { name: /register your interest/i }).first().click();

  // Filter to the IntentModal specifically (CookieBanner also has role="dialog")
  const modal = page.locator('[role="dialog"][aria-modal="true"]');
  await expect(modal).toBeVisible();

  // Pick intent step → click "Join the community" button card
  await modal.getByRole("button", { name: /join the community/i }).click();

  // Wait for the form transition to complete
  await expect(modal.getByPlaceholder("Jane Smith")).toBeVisible({ timeout: 5000 });

  return modal;
}

test.describe("Registration form", () => {
  test("happy path: fills form, checks gdpr, submits → success state shown", async ({ page }) => {
    await page.route("**/api/registrations", (route) =>
      route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    );

    const modal = await openJoinForm(page);

    await modal.getByPlaceholder("Jane Smith").fill("Playwright User");
    await modal.getByPlaceholder("jane@company.com").fill("playwright@e2e.test");

    const [gdprCheckbox] = await modal.getByRole("checkbox").all();
    await gdprCheckbox.scrollIntoViewIfNeeded();
    await gdprCheckbox.check();

    await modal.getByRole("button", { name: /register my interest/i }).click();

    await expect(modal.getByText(/you're on the list/i)).toBeVisible({ timeout: 8000 });
  });

  test("duplicate email (409) → inline error message shown", async ({ page }) => {
    await page.route("**/api/registrations", (route) =>
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ error: "Already registered" }),
      })
    );

    const modal = await openJoinForm(page);

    await modal.getByPlaceholder("Jane Smith").fill("Duplicate User");
    await modal.getByPlaceholder("jane@company.com").fill("dup@e2e.test");

    const [gdprCheckbox] = await modal.getByRole("checkbox").all();
    await gdprCheckbox.scrollIntoViewIfNeeded();
    await gdprCheckbox.check();

    await modal.getByRole("button", { name: /register my interest/i }).click();

    // The form surfaces the API error as an inline message
    await expect(modal.getByText(/already registered|submission failed/i)).toBeVisible({ timeout: 6000 });
  });

  test("server error (500) → user-facing error shown", async ({ page }) => {
    await page.route("**/api/registrations", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      })
    );

    const modal = await openJoinForm(page);

    await modal.getByPlaceholder("Jane Smith").fill("Error User");
    await modal.getByPlaceholder("jane@company.com").fill("err@e2e.test");

    const [gdprCheckbox] = await modal.getByRole("checkbox").all();
    await gdprCheckbox.scrollIntoViewIfNeeded();
    await gdprCheckbox.check();

    await modal.getByRole("button", { name: /register my interest/i }).click();

    await expect(modal.getByText(/internal server error|something went wrong/i)).toBeVisible({ timeout: 6000 });
  });
});
