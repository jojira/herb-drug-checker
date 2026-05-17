# Formulens (Herb-Drug Checker) — Development Context

**Last updated:** May 17, 2026  
**Brand:** Formulens | **Domain:** formulens.co  
**Status:** MVP shipped. Post-MVP features in progress.

---

## What Is Formulens

A Next.js web application for licensed acupuncturists and TCM practitioners to cross-reference Western pharmaceuticals with Traditional Chinese Medicine herbs and formulas. Surfaces herb-drug interactions at the point of care.

**Deployed on:** Vercel  
**Auth:** Clerk (5 searches for guests, unlimited for authenticated users)

---

## What Was Built (MVP + Post-MVP)

### MVP Core
- Herb/formula search via Fuse.js (`/api/search/tcm`) — Gold (NCCAOM) + Silver (TCMBank) cascade
- Drug autocomplete via RxNorm public API (`/api/search/drugs`, `/api/search/drug`)
- Interaction check engine (`lib/interactionEngine.ts`) — server-only, never imported on client
- Results UI with trust tier badges, severity color coding, formula breakdown expand
- Clinical disclaimer (non-dismissible, appears on every result)
- **Status:** ✅ Shipped

### Post-MVP Features (Shipped)
- **Clerk authentication** — sign-in/sign-up, soft wall at 5 searches for guests
- **SoftWallModal** — prompts unauthenticated users to sign up after 5 checks
- **Drug-drug interactions** — `DrugDrugPanel.tsx` + `/api/interactions/drug-drug`
- **Share results** — create/retrieve shareable links via token (`/api/share/create`, `/api/share/[token]`)
- **Search history** — save + retrieve past checks (`/api/search-history/`)
- **Feedback widget** — `FeedbackWidget.tsx` + `/api/feedback` → Google Sheets or email webhook
- **PDF export** — `ExportPDFButton.tsx`
- **Partner user system** — `/api/user/set-partner` for white-label or affiliate accounts
- **Transparency page** — `/transparency` — data sources, methodology, limitations
- **Status:** ✅ Shipped

### v4.0 Clinical Data Middleware
- Feature flag: `CLINICAL_DATA_SOURCE` env var (`mock` | `natmed` | `stockleys` | `combined`)
- Files: `lib/featureFlags.ts`, `lib/clinicalCache.ts`, `lib/clinicalDataService.ts`
- Adapters: `lib/clinicalAdapters/natmedAdapter.ts`, `lib/clinicalAdapters/stockleysAdapter.ts`
- Cache: in-memory, 24hr TTL (SPEC-004 Amend 001)
- **Status:** ✅ Infrastructure built; stubs awaiting license keys

---

## How to Use

### Local Dev
```bash
npm run dev           # http://localhost:3000
npm run build         # Production build
npm run lint          # ESLint
```

### Data Ingestion
```bash
npx ts-node scripts/ingestTcmBank.ts    # Regenerates herbLibraryEnriched.json + formulaMapEnriched.json
```

### Test Interaction Engine (quick smoke test)
```bash
node -e "
const { checkInteractions } = require('./lib/interactionEngine');
// Note: checkInteractions() is now async
"
```

---

## Architecture

### Data Flow
```
User (tablet/mobile)
  └── page.tsx
        ├── HerbSearch.tsx → GET /api/search/tcm  → Fuse.js server-side
        ├── DrugSearch.tsx → GET /api/search/drugs → RxNorm public API
        └── POST /api/interactions
              └── lib/interactionEngine.ts (server-only)
                    ├── formulaMap.json (expand formula → constituent herbs)
                    ├── herbLibrary.json (Gold — NCCAOM)
                    ├── herbLibraryEnriched.json (Silver — TCMBank)
                    └── mockInteractions.json → severity lookup
```

### Trust Hierarchy
| Tier | Source | Badge |
|------|--------|-------|
| Gold | `herbLibrary.json` — NCCAOM verified | Gold badge |
| Silver | `herbLibraryEnriched.json` — TCMBank research | [Research Data] |
| Unresolved | Data gap | Amber warning — always shown, never hidden |

### Severity Rules
- `contraindicated` > `precaution` > `none` — worst-case always wins
- Contraindicated cards auto-expand; Precaution cards start collapsed
- Unresolved herbs excluded from lookup but shown in UI with warning

---

## File Structure

```
herb-drug-checker/
├── app/
│   ├── page.tsx                          # Main search page
│   ├── layout.tsx                        # Root layout (Clerk provider, disclaimer)
│   ├── transparency/page.tsx             # Data sources transparency page
│   ├── sign-in/[[...sign-in]]/page.tsx   # Clerk sign-in
│   ├── sign-up/[[...sign-up]]/page.tsx   # Clerk sign-up
│   ├── share/[token]/page.tsx            # Shared result viewer
│   ├── components/
│   │   ├── InteractionResults.tsx        # Results UI (trust badges, formula breakdown)
│   │   ├── HerbSearch.tsx                # Herb/formula autocomplete
│   │   ├── DrugSearch.tsx                # Drug autocomplete
│   │   ├── DrugDrugPanel.tsx             # Drug-drug interaction UI
│   │   ├── SoftWallModal.tsx             # Unauthenticated guest limit modal
│   │   ├── FeedbackWidget.tsx            # In-app feedback form
│   │   └── ExportPDFButton.tsx           # PDF export button
│   └── api/
│       ├── search/tcm/route.ts           # Herb + formula search (Fuse.js)
│       ├── search/drugs/route.ts         # Drug autocomplete (RxNorm)
│       ├── search/drug/route.ts          # Single drug lookup
│       ├── interactions/route.ts         # Herb-drug interaction check (POST)
│       ├── interactions/drug-drug/route.ts  # Drug-drug interaction check
│       ├── feedback/route.ts             # Feedback submission
│       ├── share/create/route.ts         # Create shareable link
│       ├── share/[token]/route.ts        # Retrieve shared result
│       ├── search-history/route.ts       # Get search history
│       ├── search-history/save/route.ts  # Save search to history
│       ├── user/set-partner/route.ts     # Set partner tier on user
│       └── webhooks/clerk/route.ts       # Clerk webhook handler
│
├── lib/
│   ├── types/clinical.ts                 # CANONICAL type definitions — import from here
│   ├── interactionEngine.ts              # Core engine — server-only
│   ├── severityUtils.ts                  # Severity labels/styles — safe for client
│   ├── featureFlags.ts                   # CLINICAL_DATA_SOURCE feature flag
│   ├── clinicalCache.ts                  # 24hr in-memory cache
│   ├── clinicalDataService.ts            # Mock/live orchestration
│   └── clinicalAdapters/
│       ├── types.ts                      # ClinicalAdapter interface
│       ├── natmedAdapter.ts              # NatMed Pro stub
│       └── stockleysAdapter.ts           # Stockley's stub
│
├── data/
│   ├── mockInteractions.json             # 50 fixture interactions (mock_unverified)
│   ├── herbLibrary.json                  # 86 Gold herbs (NCCAOM standard) — curated
│   ├── formulaMap.json                   # 29 Gold formulas → constituent herb IDs
│   ├── herbLibraryEnriched.json          # Generated by ingest (Silver tier)
│   └── formulaMapEnriched.json           # Generated by ingest
│
├── scripts/
│   └── ingestTcmBank.ts                  # TCMBank data pipeline (ts-node)
│
├── proxy.ts                              # Clerk middleware (clerkMiddleware())
├── CLAUDE.md                             # Canonical project reference
└── .env.local                            # Secrets — never commit
```

---

## Configuration

**`.env.local` (gitignored, local only):**
```
# Clerk auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Clinical data (leave blank until license acquired)
NATMED_API_KEY=
STOCKLEYS_API_KEY=
CLINICAL_DATA_SOURCE=mock        # mock | natmed | stockleys | combined

# App
NEXT_PUBLIC_APP_ENV=development
FEEDBACK_WEBHOOK_URL=            # Google Sheets Apps Script URL or custom endpoint
SEARCH_THRESHOLD=0.25            # Fuse.js threshold (0.0–0.4, default 0.25)
```

---

## Known Issues & Workarounds

| Issue | Workaround |
|-------|-----------|
| `mockInteractions.json` is unverified training data | Never remove `data_status: "mock_unverified"` flag; pharmacist review required before going live |
| `checkInteractions()` is async after v4.0 | All callers must `await` it; API routes already updated |
| JS in Python-style string escaping trap (historical bug) | See CLAUDE.md "Known Gotcha" section — use double quotes in onclick attrs |
| Clerk deprecated components | Never use `<SignedIn>` / `<SignedOut>` — use `<Show when="signed-in">` |

---

## Critical Rules (from CLAUDE.md)

1. **Never import `lib/interactionEngine.ts` in a client component** — it imports JSON data and is server-only
2. **All shared types come from `lib/types/clinical.ts`** — never redefine `TrustTier`, `SeverityLevel`, or `InteractionEngineResult`
3. **Disclaimer is non-negotiable** — appears on every page and every result, never dismissible
4. **Never move search to the client** — Fuse.js runs server-side only
5. **NCCAOM naming standard** — every Gold herb must have `pinyin`, `latin`, `english`, `nccaom_code`

---

## Next Steps

See `NEXT.md` for the roadmap toward live clinical data integration.
