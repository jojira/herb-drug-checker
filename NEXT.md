# Formulens — Next Steps Roadmap

**Current state:** MVP + post-MVP features shipped. Clinical data middleware built (stubs). Awaiting license keys.

---

## Immediate: License Acquisition (Blocker)

Both live data sources require paid licenses before the stubs can be activated:

| Source | Provider | Est. Cost | Env Var |
|--------|----------|-----------|---------|
| NatMed Pro | Natural Medicines database | ~$300–500/yr | `NATMED_API_KEY` |
| Stockley's | Pharmaceutical Press | ~$500–800/yr | `STOCKLEYS_API_KEY` |

**Activation steps (once keys obtained):**
1. Add keys to `.env.local` and Vercel environment variables
2. Set `CLINICAL_DATA_SOURCE=natmed` (or `stockleys` or `combined`)
3. Implement response mapping in adapter's `map()` function
4. Run 3 regression cases before deploying
5. Monitor for 2 weeks — if stable, remove mock data

---

## Phase A: Live Clinical Data Integration

**Goal:** Replace `mockInteractions.json` with real NatMed Pro and/or Stockley's data.

### A.1 — NatMed Adapter Implementation
File: `lib/clinicalAdapters/natmedAdapter.ts`
- Map NatMed Pro API response to `InteractionEngineResult` shape
- Handle: severity levels, citation fields, `dataFreshness` metadata
- Test: 3 regression cases (Dan Shen + Warfarin, Gan Cao + Digoxin, Huang Qi + Cyclosporine)

### A.2 — Stockley's Adapter Implementation
File: `lib/clinicalAdapters/stockleysAdapter.ts`
- Same mapping pattern as NatMed adapter
- `combined` mode: both APIs queried, worst-case severity wins

### A.3 — Deprecation Path (once live data confirmed)
1. Set `CLINICAL_DATA_SOURCE=combined` in production
2. Monitor 2 weeks
3. Remove mock data import from `clinicalDataService.ts`
4. Delete `data/mockInteractions.json`
5. Update CHANGELOG, bump to v4.0.0

---

## Phase B: QA & Testing Infrastructure

**Goal:** Systematic regression tests before any data source change.

### B.1 — Clinical Regression Suite
New file: `tests/clinical.test.ts`

Minimum 3 required test cases:
- `Dan Shen + Warfarin` → must be `contraindicated`
- `Gan Cao + Digoxin` → must be `contraindicated`
- `Huang Qi + Cyclosporine` → must be `contraindicated`

All tests run against mock data first, then live data after activation.

### B.2 — Interaction Engine Unit Tests
File: `tests/interactionEngine.test.ts`
- Formula expansion: verify formula → constituent herb IDs
- Severity escalation: worst-case wins
- Unresolved herb handling: appears in UI, excluded from lookup

---

## Phase C: Growth & Monetization

### C.1 — Subscription Tiers (via Clerk + Stripe)
| Tier | Limit | Price |
|------|-------|-------|
| Guest | 5 checks total | Free |
| Practitioner | Unlimited | ~$9–15/mo |
| Partner | White-label, bulk | Custom |

**Files to create:**
- `lib/stripe.ts` — Stripe client
- `app/api/billing/checkout/route.ts` — create checkout session
- `app/api/billing/portal/route.ts` — customer portal

### C.2 — Formula Library Expansion
Current: 29 Gold formulas. Target: 100+.
Process: Edit `data/formulaMap.json` directly — no ingest script needed for Gold data.
Each formula: `{ id, name, herbs: string[] }` where `herbs` is an array of herb IDs from `herbLibrary.json`.

### C.3 — Herb Library Expansion
Current: 86 Gold herbs. Target: 200+ (full NCCAOM herb list).
Process: Edit `data/herbLibrary.json` directly.
Required fields per herb: `id`, `pinyin`, `latin`, `english`, `nccaom_code`, `trustTier: "gold"`.

---

## Phase D: Clinical Intelligence (Long-term)

### D.1 — Practitioner Dashboard
- Saved formulas / patient profiles (HIPAA considerations apply)
- Frequency heatmap: which herbs checked most often
- Alert history: flagged interactions over time

### D.2 — Multi-herb Combination Analysis
Currently: one herb/formula at a time vs one drug.
Target: check N herbs simultaneously vs M drugs (full combination matrix).

### D.3 — Dose-Aware Interactions
Currently: standard clinical dosages assumed.
Target: integrate dose modifiers from NatMed Pro (if licensed).

---

## Testing Checklist for Phase A

- [ ] NatMed adapter `map()` function handles all severity levels correctly
- [ ] `combined` mode returns worst-case severity when sources disagree
- [ ] Cache hit rate > 90% on repeated searches (24hr TTL)
- [ ] Dan Shen + Warfarin → contraindicated (required regression)
- [ ] Gan Cao + Digoxin → contraindicated (required regression)
- [ ] Huang Qi + Cyclosporine → contraindicated (required regression)
- [ ] `dataFreshness` field populated in every response
- [ ] Fallback to mock gracefully if API key missing or API down

---

## How to Continue

When starting Phase A in a new chat:

1. Paste this file + `CONTEXT.md` as context
2. Have NatMed Pro API docs open — ask for the endpoint reference
3. Reference: `lib/clinicalAdapters/types.ts` for the `ClinicalAdapter` interface
4. Reference: `lib/types/clinical.ts` for `InteractionEngineResult` shape
5. Start with `natmedAdapter.ts` — implement the `map()` function
6. Test with the 3 required regression cases before any deploy
