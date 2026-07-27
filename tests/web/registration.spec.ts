/**
 * Web E2E — registration form (IntentModal / join flow).
 *
 * Tests:
 *   1. Happy path: required fields filled, both required checkboxes ticked → submit → success.
 *   2. Duplicate email (API 409) → error message shown to user.
 *   3. Network error (500) → user-facing error shown.
 *
 * Checkbox order: [0]=gdpr (required), [1]=marketing (optional),
 *                 [2]=sponsor (optional), [3]=termsAccepted (required).
 */

import { test, expect } from "@playwright/test";

async function openJoinForm(page: import("@playwright/test").Page) {
  await page.goto("/");

  await page.getByRole("button", { name: /register your interest/i }).first().click();

  const modal = page.locator('[role="dialog"][aria-modal="true"]');
  await expect(modal).toBeVisible();

  await modal.getByRole("button", { name: /join the community/i }).click();

  await expect(modal.getByPlaceholder("Jane Smith")).toBeVisible({ timeout: 5000 });

  return modal;
}

/** Tick both required checkboxes: gdpr (0) and termsAccepted (3). */
async function checkRequiredBoxes(modal: import("@playwright/test").Locator) {
  const checkboxes = await modal.getByRole("checkbox").all();
  await checkboxes[0].scrollIntoViewIfNeeded();
  await checkboxes[0].check();  // gdpr — required
  await checkboxes[3].check();  // termsAccepted — required
}

test.describe("Registration form", () => {
  test("happy path: required fields + both required checkboxes → success", async ({ page }) => {
    await page.route("**/api/registrations", (route) =>
      route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    );

    const modal = await openJoinForm(page);

    await modal.getByPlaceholder("Jane Smith").fill("Playwright User");
    await modal.getByPlaceholder("jane@company.com").fill("playwright@e2e.test");
    await modal.getByPlaceholder("https://www.linkedin.com/in/yourname").fill("https://linkedin.com/in/playwright");

    await checkRequiredBoxes(modal);

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
    await modal.getByPlaceholder("https://www.linkedin.com/in/yourname").fill("https://linkedin.com/in/dup");

    await checkRequiredBoxes(modal);

    await modal.getByRole("button", { name: /register my interest/i }).click();

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
    await modal.getByPlaceholder("https://www.linkedin.com/in/yourname").fill("https://linkedin.com/in/err");

    await checkRequiredBoxes(modal);

    await modal.getByRole("button", { name: /register my interest/i }).click();

    await expect(modal.getByText(/internal server error|something went wrong/i)).toBeVisible({ timeout: 6000 });
  });
});
