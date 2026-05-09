/**
 * Formulens Clinical Safety QA — CRITICAL test suite
 *
 * Runs against the Vercel preview URL on every deployment.
 * All tests here are CRITICAL: any failure blocks the merge.
 *
 * Pro-auth tests require CLERK_TEST_EMAIL + CLERK_TEST_PASSWORD in GitHub
 * Secrets. Without them the tests are skipped (not failed).
 *
 * Autocomplete DOM contract (from HerbSearch.tsx / DrugSearch.tsx):
 *   - Listbox: <div id="herb-search-listbox" role="listbox"> / #drug-search-listbox
 *   - Items:   <button> elements inside the listbox (portal-rendered at document.body)
 *   - Debounce: 350ms herb / 280ms drug — waitFor handles this automatically
 */

import { test, expect, type Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const HERB_PLACEHOLDER = "Herb or formula — Pinyin, Latin, or English…";
const DRUG_PLACEHOLDER = "Generic or brand name (e.g. Warfarin, Coumadin)…";

async function selectHerb(page: Page, query: string, pickText: string) {
  await page.getByPlaceholder(HERB_PLACEHOLDER).fill(query);
  const listbox = page.locator("#herb-search-listbox");
  await listbox.waitFor({ timeout: 8_000 });
  await listbox.locator("button").filter({ hasText: pickText }).first().click();
}

async function selectDrug(page: Page, query: string, pickText: string) {
  await page.getByPlaceholder(DRUG_PLACEHOLDER).fill(query);
  const listbox = page.locator("#drug-search-listbox");
  await listbox.waitFor({ timeout: 8_000 });
  await listbox.locator("button").filter({ hasText: pickText }).first().click();
}

async function searchDanShenWarfarin(page: Page) {
  await selectHerb(page, "Dan Shen", "Dan Shen");
  await selectDrug(page, "Warfarin", "Warfarin");
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
    // Step 1 — resolve a real herb ID via search
    const searchRes = await request.get("/api/search/tcm?q=dan+shen");
    expect(searchRes.status()).toBe(200);
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

  test("Webhook route correctly rejects unsigned requests", async ({ request }) => {
    // Without valid svix signature → 401 (not 200)
    const res = await request.post("/api/webhooks/clerk", { data: {} });
    expect([400, 401, 500]).toContain(res.status());
  });

  test("Share/create route requires authentication", async ({ request }) => {
    const res = await request.post("/api/share/create", { data: {} });
    expect([401, 403]).toContain(res.status());
  });
});

// ---------------------------------------------------------------------------
// SUITE 2: Search & Interactions UI (CRITICAL)
// ---------------------------------------------------------------------------

test.describe("Search & Interactions UI (CRITICAL)", () => {
  test("TCM autocomplete shows Dan Shen for query 'dan'", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(HERB_PLACEHOLDER).fill("dan");

    const listbox = page.locator("#herb-search-listbox");
    await listbox.waitFor({ timeout: 8_000 });
    await expect(listbox.locator("button").filter({ hasText: "Dan Shen" }).first()).toBeVisible();
  });

  test("Drug autocomplete shows Warfarin", async ({ page }) => {
    await page.goto("/");
    await page.getByPlaceholder(DRUG_PLACEHOLDER).fill("warfarin");

    const listbox = page.locator("#drug-search-listbox");
    await listbox.waitFor({ timeout: 8_000 });
    await expect(listbox.locator("button").filter({ hasText: /Warfarin/i }).first()).toBeVisible();
  });

  test("Dan Shen + Warfarin returns CONTRAINDICATED with disclaimer", async ({ page }) => {
    await page.goto("/");
    await searchDanShenWarfarin(page);

    await expect(page.getByText("CONTRAINDICATED RISK")).toBeVisible();
    // Disclaimer must be visible in the result area
    await expect(page.locator('[role="note"]')).toBeVisible();
  });

  test("Disclaimer is present on every page load", async ({ page }) => {
    await page.goto("/");
    // role="note" wraps the amber disclaimer block — present before any search
    const disclaimer = page.locator('[role="note"]');
    await expect(disclaimer).toBeVisible();
    await expect(disclaimer).toContainText("educational and professional reference only");
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
    await expect(pdfButton.getByText("Pro")).toBeVisible();
  });

  test("Unauthenticated user sees Sign in + Sign up links in header", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" })).toBeVisible();
  });

  test("Guest search limit: soft wall appears after 5 completed searches", async ({ page }) => {
    await page.goto("/");

    for (let i = 0; i < 5; i++) {
      await searchDanShenWarfarin(page);
      await page.getByRole("button", { name: "Reset" }).click();
    }

    // 6th attempt — soft wall should intercept
    await selectHerb(page, "Dan Shen", "Dan Shen");
    await selectDrug(page, "Warfarin", "Warfarin");
    await page.getByRole("button", { name: "Check Interactions" }).click();

    await expect(
      page.getByText("You've used all 5 free searches")
    ).toBeVisible({ timeout: 10_000 });
  });

  // ---------------------------------------------------------------------------
  // Pro-auth tests — skipped unless Clerk test credentials are in GitHub Secrets
  // ---------------------------------------------------------------------------

  test("Pro user (via ?ref=asa) sees PDF button enabled", async ({ page }) => {
    test.skip(
      !process.env.CLERK_TEST_EMAIL || !process.env.CLERK_TEST_PASSWORD,
      "Skipped: CLERK_TEST_EMAIL / CLERK_TEST_PASSWORD secrets not set."
    );

    await page.goto("/?ref=asa");
    await page.getByRole("link", { name: "Sign up" }).click();

    const domain = process.env.CLERK_TEST_EMAIL!.split("@")[1];
    const email = `test+qa${Date.now()}@${domain}`;
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(process.env.CLERK_TEST_PASSWORD!);
    await page.getByRole("button", { name: /continue|sign up/i }).click();
    await page.waitForURL("/", { timeout: 30_000 });

    await searchDanShenWarfarin(page);

    const pdfButton = page.getByRole("button", { name: /Export PDF/i });
    await expect(pdfButton).toBeEnabled({ timeout: 10_000 });
  });

  test("Pro user PDF download has correct filename", async ({ page }) => {
    test.skip(
      !process.env.CLERK_TEST_EMAIL || !process.env.CLERK_TEST_PASSWORD,
      "Skipped: Clerk test credentials not set."
    );

    await page.goto("/?ref=asa");
    await page.getByRole("link", { name: "Sign up" }).click();

    const domain = process.env.CLERK_TEST_EMAIL!.split("@")[1];
    const email = `test+qa${Date.now()}@${domain}`;
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

test.describe("Sign-Up Page Branding (CRITICAL)", () => {
  test("Sign-up page shows Formulens heading", async ({ page }) => {
    await page.goto("/sign-up");
    await expect(
      page.getByRole("heading", { name: "Sign up to Formulens" })
    ).toBeVisible();
    await expect(
      page.getByText("Create a free account to unlock Pro features")
    ).toBeVisible();
  });

  test("Sign-up page renders Clerk email input", async ({ page }) => {
    await page.goto("/sign-up");
    // Clerk mounts its form — presence of the email input confirms it loaded
    await expect(page.getByLabel(/email/i).first()).toBeVisible({ timeout: 10_000 });
  });
});
