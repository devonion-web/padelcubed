/**
 * Web E2E — legal pages render correctly.
 *
 * Tests:
 *   1. /privacy renders the Privacy Notice heading.
 *   2. /terms renders the Terms of Use heading.
 *   3. /terms-of-sale renders the Terms of Sale heading.
 */

import { test, expect } from "@playwright/test";

test.describe("Legal pages", () => {
  test("/privacy renders Privacy Notice heading", async ({ page }) => {
    await page.goto("/privacy");
    await expect(page.getByRole("heading", { name: /privacy notice/i })).toBeVisible({ timeout: 8000 });
    // Confirm last-updated date is shown
    await expect(page.getByText(/27 july 2026/i)).toBeVisible();
  });

  test("/terms renders Terms of Use heading", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByRole("heading", { name: /terms of use/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/27 july 2026/i)).toBeVisible();
  });

  test("/terms-of-sale renders Terms of Sale heading", async ({ page }) => {
    await page.goto("/terms-of-sale");
    await expect(page.getByRole("heading", { name: /terms of sale/i })).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/27 july 2026/i)).toBeVisible();
  });

  test("footer contains links to all three legal pages", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer.getByRole("link", { name: /privacy notice/i })).toBeVisible();
    await expect(footer.getByRole("link", { name: /terms of use/i })).toBeVisible();
    await expect(footer.getByRole("link", { name: /terms of sale/i })).toBeVisible();
  });
});
