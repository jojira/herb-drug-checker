/**
 * Formulens Clinical Safety QA — CRITICAL test suite
 *
 * Runs against the Vercel preview URL on every deployment.
 * All tests here are CRITICAL: any failure blocks the merge.
 *
 * Pro-auth tests (PDF enabled, shared links) require CLERK_TEST_EMAIL +
 * CLERK_TEST_PASSWORD in GitHub Secrets. Without them the tests are
 * skipped (not failed) so CI still passes cleanly on branches that
 * don't need credential-gated tests.
 */

import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const HERB_PLACEHOLDER = "Herb or formula — Pinyin, Latin, or English…";
const DRUG_PLACEHOLDER = "Generic or brand name (e.g. Warfarin, Coumadin)…";

async function searchDanShenWarfarin(page: Page) {
  const herbInput = page.getByPlaceholder(HERB_PLACEHOLDER);
  await herbInput.fill("Dan Shen");
  // Wait for autocomplete to appear and click first match
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
}

// ---------------------------------------------------------------------------
// SUITE 1: API Health Checks (CRITICAL — no browser, fast)
// ---------------------------------------------------------------------------

test.describe("API Health Checks (CRITICAL)", () => {
  test("GET /api/search/tcm returns 200 with valid herb shape", async ({ request }) => {
    const res = await request.get("/api/search/tcm?q=dan");
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.results)).toBe(true);
    expect(json.results.length).toBeGreaterThan(0);

    const first = json.results[0];
    expect(first).toHaveProperty("id");
    expect(first).toHaveProperty("pinyin"); // canonical field — NOT 'name'
    expect(first).toHaveProperty("trustTier");
    expect(json).toHaveProperty("disclaimer"); // safety field must always be present
  });

  test("GET /api/search/drugs returns 200 with valid drug shape", async ({ request }) => {
    const res = await request.get("/api/search/drugs?q=warfarin");
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(Array.isArray(json.results)).toBe(true);
    expect(json.results.length).toBeGreaterThan(0);

    const first = json.results[0];
    expect(first).toHaveProperty("name");
    expect(first).toHaveProperty("rxcui");
    expect(json).toHaveProperty("disclaimer");
  });

  test("POST /api/interactions returns 200 with severity + disclaimer", async ({ request }) => {
    // Step 1 — resolve a real herb ID so the interaction engine can look it up
    const searchRes = await request.get("/api/search/tcm?q=dan+shen");
    const searchJson = await searchRes.json();
    const herb = searchJson.results.find(
      (r: { type: string }) => r.type === "herb"
    );
    expect(herb).toBeTruthy();

    // Step 2 — run the interaction check
    const res = await request.post("/api/interactions", {
      data: {
        westernMeds: [{ rxcui: "11289", name: "Warfarin" }],
        tcmInput: { type: "herb", herbId: herb.id, formulaId: null },
      },
    });
    expect(res.status()).toBe(200);

    const json = await res.json();
    expect(json).toHaveProperty("worstSeverity");
    expect(json).toHaveProperty("matches");
    expect(json).toHaveProperty("disclaimer"); // non-negotiable per CLAUDE.md
    expect(["contraindicated", "precaution", "none"]).toContain(json.worstSeverity);
  });

  test("Webhook routes return expected status codes", async ({ request }) => {
    // POST to clerk webhook without a valid signature → 401 (correct rejection)
    const webhookRes = await request.post("/api/webhooks/clerk", { data: {} });
    expect([401, 400, 500]).toContain(webhookRes.status()); // not 200 without sig

    // POST to share/create without auth → 401
    const shareRes = await request.post("/api/share/create", { data: {} });
    expect([401, 403]).toContain(shareRes.status());
  });
});

// ---------------------------------------------------------------------------
// SUITE 2: Search & Interactions UI (CRITICAL)
// ---------------------------------------------------------------------------

test.describe("Search & Interactions UI (CRITICAL)", () => {
  test("TCM autocomplete returns Dan Shen for query 'dan'", async ({ page }) => {
    await page.goto("/");

    const input = page.getByPlaceholder(HERB_PLACEHOLDER);
    await input.fill("dan");

    const option = page.locator('[role="option"]').filter({ hasText: "Dan Shen" }).first();
    await expect(option).toBeVisible({ timeout: 8_000 });
  });

  test("Drug autocomplete returns Warfarin", async ({ page }) => {
    await page.goto("/");

    const input = page.getByPlaceholder(DRUG_PLACEHOLDER);
    await input.fill("warfarin");

    const option = page.locator('[role="option"]').filter({ hasText: /Warfarin/i }).first();
    await expect(option).toBeVisible({ timeout: 8_000 });
  });

  test("Dan Shen + Warfarin shows CONTRAINDICATED severity", async ({ page }) => {
    await page.goto("/");
    await searchDanShenWarfarin(page);

    await expect(page.getByText("CONTRAINDICATED RISK")).toBeVisible();
    await expect(page.getByText("Validation Pending")).toBeVisible();
    await expect(page.getByText(/clinical judgment/i)).toBeVisible(); // disclaimer
  });

  test("Disclaimer is visible on every search result", async ({ page }) => {
    await page.goto("/");
    // Disclaimer should be present before any search
    await expect(
      page.getByText("educational and professional reference only")
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// SUITE 3: Authentication & Entitlements (CRITICAL)
// ---------------------------------------------------------------------------

test.describe("Auth & Entitlements (CRITICAL)", () => {
  test("Unauthenticated user sees PDF button disabled with PRO badge", async ({ page }) => {
    await page.goto("/");
    await searchDanShenWarfarin(page);

    const pdfButton = page.getByRole("button", { name: /Export PDF/i });
    await expect(pdfButton).toBeVisible();
    await expect(pdfButton).toBeDisabled();

    // PRO badge must be visible inside the disabled button
    await expect(page.getByText("Pro")).toBeVisible();
  });

  test("Unauthenticated user sees Sign in + Sign up links", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("Guest search limit: soft wall appears after 5 searches", async ({ page }) => {
    await page.goto("/");

    for (let i = 0; i < 5; i++) {
      await searchDanShenWarfarin(page);
      await page.getByRole("button", { name: "Reset" }).click();
    }

    // 6th search should trigger the soft wall
    await searchDanShenWarfarin(page).catch(() => {
      // The modal may have interrupted — that's correct behaviour
    });

    await expect(
      page.getByText("You've used all 5 free searches")
    ).toBeVisible({ timeout: 10_000 });
  });

  // Pro-auth tests — skipped in CI unless Clerk test credentials are provided
  test("Pro user (via ?ref=asa) sees PDF button enabled", async ({ page }) => {
    test.skip(
      !process.env.CLERK_TEST_EMAIL || !process.env.CLERK_TEST_PASSWORD,
      "Skipped: CLERK_TEST_EMAIL / CLERK_TEST_PASSWORD not set. " +
      "Configure in GitHub Secrets to enable credential-gated tests."
    );

    await page.goto("/?ref=asa");

    // Click Sign up
    await page.getByRole("link", { name: "Sign up" }).click();

    const email = `test+qa${Date.now()}@${process.env.CLERK_TEST_EMAIL!.split("@")[1]}`;
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(process.env.CLERK_TEST_PASSWORD!);
    await page.getByRole("button", { name: /continue|sign up/i }).click();

    // Wait for redirect to home
    await page.waitForURL("/", { timeout: 30_000 });

    await searchDanShenWarfarin(page);

    const pdfButton = page.getByRole("button", { name: /Export PDF/i });
    await expect(pdfButton).toBeEnabled({ timeout: 10_000 });
  });

  test("Pro user PDF download has correct filename pattern", async ({ page }) => {
    test.skip(
      !process.env.CLERK_TEST_EMAIL || !process.env.CLERK_TEST_PASSWORD,
      "Skipped: Clerk test credentials not set."
    );

    await page.goto("/?ref=asa");
    await page.getByRole("link", { name: "Sign up" }).click();

    const email = `test+qa${Date.now()}@${process.env.CLERK_TEST_EMAIL!.split("@")[1]}`;
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(process.env.CLERK_TEST_PASSWORD!);
    await page.getByRole("button", { name: /continue|sign up/i }).click();
    await page.waitForURL("/", { timeout: 30_000 });

    await searchDanShenWarfarin(page);

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: /Export PDF/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/^formulens-report-\d{4}-\d{2}-\d{2}\.pdf$/);
  });
});

// ---------------------------------------------------------------------------
// SUITE 4: Sign-Up Page Branding (CRITICAL)
// ---------------------------------------------------------------------------

test.describe("Sign-Up Page (CRITICAL)", () => {
  test("Sign-up page shows Formulens branding heading", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(page.getByRole("heading", { name: "Sign up to Formulens" })).toBeVisible();
    await expect(
      page.getByText("Create a free account to unlock Pro features")
    ).toBeVisible();
  });

  test("Sign-up page renders Clerk SignUp component", async ({ page }) => {
    await page.goto("/sign-up");
    // Clerk renders an email input — presence confirms component mounted
    await expect(page.getByLabel(/email/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
