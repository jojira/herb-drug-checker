/**
 * Formulens Mobile UX — WARNING test suite
 *
 * Runs in Playwright's iPhone 12 profile (375 × 812).
 * Failures are flagged in the PR comment but do NOT block merge.
 */

import { test, expect } from "@playwright/test";

const HERB_PLACEHOLDER = "Herb or formula — Pinyin, Latin, or English…";
const DRUG_PLACEHOLDER = "Generic or brand name (e.g. Warfarin, Coumadin)…";

test.describe("Mobile UX at 375px (WARNINGS)", () => {
  test("Page renders without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1); // +1px tolerance
  });

  test("'Validation Pending' badge is fully within viewport", async ({ page }) => {
    await page.goto("/");
    const badge = page.getByText("Validation Pending").first();
    await expect(badge).toBeVisible();

    const box = await badge.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
  });

  test("Primary action buttons meet 44px touch target minimum", async ({ page }) => {
    await page.goto("/");

    // Only check intentional action buttons, not every element on the page
    // (Clerk UserButton, autocomplete dismiss buttons, etc. are intentionally small)
    const primaryButtons = [
      page.getByRole("button", { name: "Check Interactions" }),
      page.getByRole("button", { name: "Reset" }),
    ];

    for (const btn of primaryButtons) {
      await expect(btn).toBeVisible();
      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("Export PDF button meets 44px touch target", async ({ page }) => {
    await page.goto("/");

    const herbInput = page.getByPlaceholder(HERB_PLACEHOLDER);
    await herbInput.fill("Dan Shen");
    const herbOption = page.locator('[role="option"]').filter({ hasText: "Dan Shen" }).first();
    await herbOption.waitFor({ timeout: 8_000 });
    await herbOption.click();

    const drugInput = page.getByPlaceholder(DRUG_PLACEHOLDER);
    await drugInput.fill("Warfarin");
    const drugOption = page.locator('[role="option"]').filter({ hasText: /Warfarin/i }).first();
    await drugOption.waitFor({ timeout: 8_000 });
    await drugOption.click();

    await page.getByRole("button", { name: "Check Interactions" }).click();
    await page.waitForSelector("text=CONTRAINDICATED", { timeout: 20_000 });

    const pdfButton = page.getByRole("button", { name: /Export PDF/i });
    await expect(pdfButton).toBeVisible();
    const box = await pdfButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("Disclaimer text is readable on mobile", async ({ page }) => {
    await page.goto("/");
    const disclaimer = page.getByText("educational and professional reference only");
    await expect(disclaimer).toBeVisible();

    const box = await disclaimer.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100); // not collapsed
  });
});
