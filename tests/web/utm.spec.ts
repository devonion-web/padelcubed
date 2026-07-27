/**
 * Web E2E — UTM parameter capture.
 *
 * The Home page reads URL utm_* params into sessionStorage under "p3_utms"
 * and includes them in the registration POST body.
 *
 * Tests:
 *   1. UTM params are written to sessionStorage on page load.
 *   2. The registration POST payload includes the captured UTM fields.
 *   3. A page with no UTM params produces no p3_utms entry.
 */

import { test, expect, type Route } from "@playwright/test";

test.describe("UTM capture", () => {
  test("utm_source + utm_campaign are stored in sessionStorage", async ({ page }) => {
    await page.goto("/?utm_source=test_source&utm_campaign=launch2026&utm_medium=email");

    const stored = await page.evaluate(() => {
      const raw = sessionStorage.getItem("p3_utms");
      return raw ? JSON.parse(raw) : null;
    });

    expect(stored).not.toBeNull();
    expect(stored.utmSource).toBe("test_source");
    expect(stored.utmCampaign).toBe("launch2026");
    expect(stored.utmMedium).toBe("email");
  });

  test("registration POST body includes UTM fields from sessionStorage", async ({ page }) => {
    let capturedBody: Record<string, unknown> | null = null;

    // Intercept the registration API and capture the request body
    await page.route("**/api/registrations", async (route: Route) => {
      const body = route.request().postDataJSON() as Record<string, unknown>;
      capturedBody = body;
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    });

    await page.goto("/?utm_source=playwright&utm_campaign=e2e_test&utm_medium=direct");

    await page.getByRole("button", { name: /register your interest/i }).first().click();
    const modal = page.locator('[role="dialog"][aria-modal="true"]');
    await expect(modal).toBeVisible();

    await modal.getByRole("button", { name: /join the community/i }).click();
    await expect(modal.getByPlaceholder("Jane Smith")).toBeVisible({ timeout: 5000 });

    // Fill all required fields
    await modal.getByPlaceholder("Jane Smith").fill("UTM Tester");
    await modal.getByPlaceholder("jane@company.com").fill("utm@example.com");
    await modal.getByPlaceholder("https://www.linkedin.com/in/yourname").fill("https://linkedin.com/in/utm");

    // Tick both required checkboxes: gdpr (0) and termsAccepted (3)
    const checkboxes = await modal.getByRole("checkbox").all();
    await checkboxes[0].scrollIntoViewIfNeeded();
    await checkboxes[0].check();
    await checkboxes[3].check();

    await modal.getByRole("button", { name: /register my interest/i }).click();

    // Wait for success state
    await expect(modal.getByText(/you're on the list/i)).toBeVisible({ timeout: 8000 });

    // Assert UTM fields were included in the POST body
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.utmSource).toBe("playwright");
    expect(capturedBody!.utmCampaign).toBe("e2e_test");
    expect(capturedBody!.utmMedium).toBe("direct");
  });

  test("no UTM params → sessionStorage has no p3_utms entry", async ({ page }) => {
    await page.goto("/");

    const stored = await page.evaluate(() => sessionStorage.getItem("p3_utms"));
    expect(stored).toBeNull();
  });
});
