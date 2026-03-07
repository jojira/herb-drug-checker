# CLAUDE.md — Herb-Drug Interaction Checker

This file is the source of truth for Claude Code. Read it fully before making any changes to this project.

---

## Project Overview

A Next.js web application for licensed acupuncturists and TCM practitioners to cross-reference Western pharmaceuticals with Traditional Chinese Medicine (TCM) herbs and formulas. The goal is to surface herb-drug interactions quickly and safely at the point of care.

**MVP constraint:** This is a search-only tool. No patient data, no authentication, no database. This is intentional — it keeps us out of HIPAA scope during the MVP phase.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) |
| Language | TypeScript — strict mode, no `any` |
| Styling | Tailwind CSS — utility classes only, no custom CSS files |
| Deployment | Vercel |
| Package manager | npm |

---

## Project Structure

```
/app
  /api
    /search/herb/route.ts       # Herb name lookup
    /search/drug/route.ts       # Drug autocomplete via RxNorm
    /search/formula/route.ts    # Formula → constituent herb expansion
    /interactions/route.ts      # Core interaction check endpoint
  /components
    InteractionResults.tsx      # Main results UI with expandable cards
    HerbSearch.tsx              # Herb autocomplete input
    DrugSearch.tsx              # Drug autocomplete input
    SeverityBadge.tsx           # Reusable severity indicator
    DisclaimerBanner.tsx        # Persistent legal disclaimer — never omit
  page.tsx                      # Main search page

/logic
  interactionEngine.ts          # Core engine — checkInteractions()

/data
  mockInteractions.json         # Fixture data (used until real APIs are licensed)
  formulaMap.json               # Top 30 TCM formulas → constituent herb IDs
  herbLibrary.json              # Central herb identity reference (NCCAOM standard, 85 herbs)
```

---

## Naming Standards — CRITICAL

All herb names must follow the **NCCAOM (National Certification Commission for Acupuncture and Oriental Medicine)** standard.

Every herb object must include all three name forms:
- `pinyin` — e.g. "Dan Shen" (capitalized, space-separated)
- `latin` — e.g. "Salvia miltiorrhiza" (italicized in UI)
- `english` — e.g. "Red Sage Root"
- `nccaom_code` — e.g. "HB-045"

Search must match on any of the three name forms. Never store or display herb names in any non-NCCAOM format without explicit instruction.

---

## Core Engine — `checkInteractions()`

Located at `/logic/interactionEngine.ts`. This is the heart of the application.

**Signature:**
```typescript
checkInteractions(westernMeds: WesternMed[], tcmInput: TCMInput): InteractionEngineResult
```

**Rules:**
- If `tcmInput.type === "formula"`, expand it to constituent herbs via `formulaMap.json` before checking
- Cross-reference every herb against every western med
- Severity escalation rule: **worst-case always wins** — never downgrade
- Return a `formulaBreakdown` object whenever input is a formula, so the UI can show which specific ingredient triggered the alert
- Always include the disclaimer string in every result object

**Severity hierarchy (high → low):**
```
contraindicated → precaution → none
```

---

## Data Sources

**MVP uses fixture data only.** Real API integrations are pending license acquisition.

| Source | Status | Env var |
|---|---|---|
| NatMed Pro | Pending license | `NATMED_API_KEY` |
| Stockley's | Pending license | `STOCKLEYS_API_KEY` |
| RxNorm | Free, public | No key required |

When building API route handlers, stub the NatMed and Stockley's calls with a fallback to `mockInteractions.json`. Use the env vars to detect when real keys are present and switch to live calls.

RxNorm base URL: `https://rxnav.nlm.nih.gov/REST`

---

## UI Rules

### Disclaimer — Non-Negotiable
This text must appear persistently on every page and in every result. Never remove it, hide it, or make it dismissible:

> "This tool is for educational and professional reference only. It does not replace clinical judgment or consultation with a pharmacist. Interaction severity may vary based on dosage and herb-to-drug ratio. Standard clinical dosages are assumed."

### Severity Visual Treatment

| Severity | Color | Tailwind classes | Icon |
|---|---|---|---|
| Contraindicated | Red | `bg-red-50 text-red-700 border-red-200` | 🔴 |
| Precaution | Amber | `bg-amber-50 text-amber-700 border-amber-200` | 🟡 |
| No Interaction | Green | `bg-green-50 text-green-700 border-green-200` | 🟢 |

### Formula Expand Feature
When a formula is checked, the UI must allow the practitioner to expand the formula and see every constituent herb listed, with an indicator on which specific herb(s) triggered the alert. This is not optional — it is a core clinical requirement so practitioners understand exactly which ingredient is the problem.

### Contraindicated cards auto-expand by default. Precaution cards start collapsed.

### Mobile-First
Practitioners use tablets and phones between treatment rooms. Design for a single-column mobile layout first. Tablet/desktop gets a two-column layout (input left, results right).

---

## What NOT to Build (MVP Scope Boundary)

Do not build any of the following unless explicitly instructed:

- User authentication or accounts
- Patient profiles or saved medication lists
- PDF report export
- Interaction history / session log
- Any form that collects PII (names, DOB, contact info)
- HIPAA compliance infrastructure
- Payment or subscription logic

If a feature request seems to cross into any of these areas, flag it and ask before proceeding.

---

## Code Standards

- **TypeScript strict mode** — no `any`, no `ts-ignore` without a comment explaining why
- **No inline styles** — Tailwind classes only
- **Server Components by default** — only add `"use client"` when the component genuinely needs interactivity (useState, event handlers)
- **API routes return consistent shape** — always include a `disclaimer` field in interaction responses
- **Error states** — every search input and API call must have a visible error state in the UI
- **Loading states** — use skeleton loaders, not spinners, for search results
- **Accessible** — all interactive elements need aria labels; severity badges need aria-describedby

---

## Environment Variables

```bash
# .env.local — never commit this file
NATMED_API_KEY=           # leave blank until license acquired
STOCKLEYS_API_KEY=        # leave blank until license acquired
NEXT_PUBLIC_APP_ENV=development   # set to "production" on Vercel
```

---

## Key Clinical Context (Read This)

This tool is used by licensed practitioners, not patients. Assume the user understands medical terminology. Do not oversimplify clinical language in the UI.

The most dangerous interactions in TCM+Western medicine involve:
- **Anticoagulants** (Warfarin) + blood-moving herbs (Dan Shen, Dang Gui, Hong Hua)
- **Cardiac glycosides** (Digoxin) + herbs that cause electrolyte shifts (Gan Cao)
- **Immunosuppressants** (Cyclosporine) + immune-tonifying herbs (Huang Qi)
- **Hypoglycemics** (Insulin, Metformin) + glucose-lowering herbs (Huang Lian, Ren Shen)

These should always be surfaced as 🔴 Contraindicated when detected.
