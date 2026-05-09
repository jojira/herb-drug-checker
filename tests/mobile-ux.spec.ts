/**
 * Formulens Mobile UX — WARNING test suite
 *
 * Runs in Playwright's iPhone 12 profile (390 × 844).
 * Failures are flagged in the PR comment but do NOT block merge.
 *
 * Autocomplete DOM contract:
 *   - #herb-search-listbox / #drug-search-listbox (portal at document.body)
 *   - Items are <button> elements inside each listbox
 */

import { test, expect } from "@playwright/test";

const HERB_PLACEHOLDER = "Herb or formula — Pinyin, Latin, or English…";
const DRUG_PLACEHOLDER = "Generic or brand name (e.g. Warfarin, Coumadin)…";

test.describe("Mobile UX at 375px (WARNINGS)", () => {
  test("Page renders without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = page.viewportSize()!.width;
    expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth + 1); // 1px tolerance
  });

  test("'Validation Pending' badge is fully within viewport", async ({ page }) => {
    await page.goto("/");
    const badge = page.getByText("Validation Pending").first();
    await expect(badge).toBeVisible();

    const box = await badge.boundingBox();
    const vw = page.viewportSize()!.width;
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(vw + 1);
  });

  test("Primary action buttons meet 44px touch target", async ({ page }) => {
    await page.goto("/");

    for (const name of ["Check Interactions", "Reset"]) {
      const btn = page.getByRole("button", { name });
      await expect(btn).toBeVisible();
      const box = await btn.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });

  test("Export PDF button meets 44px touch target", async ({ page }) => {
    await page.goto("/");

    // Set up a search result so the PDF button renders.
    // Tap first to scroll/focus the input (mobile requires explicit focus before fill).
    const herbInput = page.getByPlaceholder(HERB_PLACEHOLDER);
    await herbInput.tap();
    await herbInput.fill("Dan Shen");
    const herbListbox = page.locator("#herb-search-listbox");
    await herbListbox.waitFor({ timeout: 12_000 });
    await herbListbox.locator("button").filter({ hasText: "Dan Shen" }).first().tap();

    const drugInput = page.getByPlaceholder(DRUG_PLACEHOLDER);
    await drugInput.tap();
    await drugInput.fill("Warfarin");
    const drugListbox = page.locator("#drug-search-listbox");
    await drugListbox.waitFor({ timeout: 12_000 });
    await drugListbox.locator("button").filter({ hasText: /Warfarin/i }).first().tap();

    await page.getByRole("button", { name: "Check Interactions" }).click();
    await page.waitForSelector("text=CONTRAINDICATED", { timeout: 20_000 });

    const pdfButton = page.getByRole("button", { name: /Export PDF/i });
    await expect(pdfButton).toBeVisible();
    const box = await pdfButton.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.height).toBeGreaterThanOrEqual(44);
  });

  test("Disclaimer block is visible and not collapsed", async ({ page }) => {
    await page.goto("/");
    const disclaimer = page.locator('[role="note"]');
    await expect(disclaimer).toBeVisible();
    const box = await disclaimer.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(100);
  });
});
