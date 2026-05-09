# Formulens QA Specification (SPEC-QA v1.0)

## Overview

Automated test specification for Formulens v4.0. The QA agent runs on every
Vercel deployment and validates clinical safety, Pro feature integrity, and
mobile UX before changes reach production.

**Pipeline:** Git push → Vercel deploy → `deployment_status` event → GitHub Actions
→ Playwright tests → PR comment with results → Critical failures block merge.

---

## Failure Policy

| Category | Definition | Action |
|----------|------------|--------|
| **CRITICAL** | Any failure | Workflow fails — merge blocked |
| **WARNING** | Mobile / non-blocking | Flagged in PR comment — merge allowed |

---

## Test Suite 1 — API Health (CRITICAL)

Fast checks with no browser. Run first.

| Test | Endpoint | Assertion |
|------|----------|-----------|
| TCM search | `GET /api/search/tcm?q=dan` | 200, `results[0].pinyin` exists, `disclaimer` present |
| Drug search | `GET /api/search/drugs?q=warfarin` | 200, `results[0].name` + `rxcui` exist |
| Interactions | `POST /api/interactions` | 200, `worstSeverity` ∈ {contraindicated, precaution, none}, `disclaimer` present |
| Webhook rejection | `POST /api/webhooks/clerk` (no sig) | 401 or 400 — correctly rejects unsigned requests |
| Share auth guard | `POST /api/share/create` (no session) | 401 or 403 — correctly rejects unauthenticated requests |

**Response shape contract (interactions):**
```
Request body: { westernMeds: [{ rxcui, name }], tcmInput: { type, herbId, formulaId } }
Response: { worstSeverity, matches[], disclaimer, dataStatus, dataFreshness? }
```

---

## Test Suite 2 — Search & Interactions UI (CRITICAL)

| Test | Steps | Expected |
|------|-------|----------|
| TCM autocomplete | Type "dan" in herb input | Dropdown shows "Dan Shen" within 8s |
| Drug autocomplete | Type "warfarin" in drug input | Dropdown shows "Warfarin" within 8s |
| Severity display | Dan Shen + Warfarin → Check | "CONTRAINDICATED RISK" visible |
| Disclaimer always present | Load any page | Text "educational and professional reference only" visible |

**Selector contract:**
- Herb input: `placeholder="Herb or formula — Pinyin, Latin, or English…"`
- Drug input: `placeholder="Generic or brand name (e.g. Warfarin, Coumadin)…"`
- Autocomplete items: `[role="option"]`

---

## Test Suite 3 — Authentication & Entitlements (CRITICAL)

| Test | Condition | Expected |
|------|-----------|----------|
| PDF button disabled | Unauthenticated | Button is `disabled`, "Pro" badge visible |
| Sign-in/Sign-up links | Unauthenticated | Both links visible in header |
| Guest search limit | 5 completed searches, then 6th | Soft wall: "You've used all 5 free searches" |
| PDF button enabled | Pro user via `?ref=asa` *(requires CLERK_TEST_EMAIL secret)* | Button is `enabled` (blue) |
| PDF download filename | Click Export PDF as Pro user | `formulens-report-YYYY-MM-DD.pdf` |

**Note:** Pro-auth tests are skipped (not failed) when `CLERK_TEST_EMAIL` /
`CLERK_TEST_PASSWORD` GitHub Secrets are not set. Configure Clerk test-mode
credentials and add them as secrets to enable full end-to-end coverage.

---

## Test Suite 4 — Sign-Up Page Branding (CRITICAL)

| Test | Expected |
|------|----------|
| Heading | "Sign up to Formulens" visible on `/sign-up` |
| Pitch copy | "Create a free account to unlock Pro features" visible |
| Clerk form | Email input renders (confirms component mounted) |

---

## Test Suite 5 — Mobile UX at 375px (WARNINGS)

Run in iPhone 12 Playwright profile.

| Test | Threshold | Severity |
|------|-----------|----------|
| No horizontal overflow | `body.scrollWidth ≤ viewport.width` | WARNING |
| "Validation Pending" badge fully visible | `x + width ≤ 375px` | WARNING |
| "Check Interactions" button height | ≥ 44px | WARNING |
| "Reset" button height | ≥ 44px | WARNING |
| "Export PDF" button height | ≥ 44px | WARNING |
| Disclaimer readable | `width > 100px` (not collapsed) | WARNING |

---

## Test Execution Order

1. **API health** — fast, headless, no browser spin-up
2. **Search & Interactions UI** — validates core clinical feature
3. **Auth & Entitlements** — validates safety gate and Pro access
4. **Sign-Up Branding** — validates conversion path for ASA launch
5. **Mobile UX** — polish checks (parallel with suite 4)

---

## CI Configuration

**Trigger:** `deployment_status` event from Vercel GitHub integration.
Tests run after Vercel marks the deployment as `success` — no race conditions.

**Required GitHub Secrets (optional — enables auth tests):**
```
CLERK_TEST_EMAIL     — email for Clerk test account (e.g. test+qa@yourdomain.com)
CLERK_TEST_PASSWORD  — password for Clerk test account
```

**Artifacts:** Playwright HTML + JSON report uploaded for 14 days per run.

**PR comment:** Auto-posted with pass/fail table + preview URL link.

---

## Known Limitations (v1.0)

- **Shared link test** — not yet implemented. `ShareButton` component not present
  in current UI. Will be added when the Share feature is wired into results.
- **Search history DB validation** — requires direct DB access from CI (not yet
  set up). Manual validation: `npm run report:daily`.
- **Pro auth E2E** — requires Clerk test-mode credentials. Skipped in CI until
  `CLERK_TEST_EMAIL` secret is configured.
