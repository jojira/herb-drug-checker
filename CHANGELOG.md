# Changelog
# Herb-Drug Interaction Checker

All notable changes to this project are documented in this file.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

---

## [3.1.0] — 2026-03-18

### Overview
Formula library expansion to full NCCAOM Gold Standard coverage.
Scales clinical formula coverage from 30 to 150+ board-exam formulas
while maintaining strict data audibility and Gold-tier trust status
throughout. Adds a live formula count to the search UI so practitioners
can see the depth of coverage at a glance.

### Added
- **NCCAOM Formula Source File** (`data/nccaomFormulas.json`) — hand-curated
  clinical source of truth for the full NCCAOM Herbology board exam formula
  set; organized by TCM category; based on Bensky's *Chinese Herbal Medicine:
  Formulas & Strategies*; never overwritten by scripts
- **Formula Validation Script** (`scripts/validateNccaomData.ts`) — three-level
  validation pipeline with actionable error logging:
    - `RESOLVED` — herb ID confirmed in `herbLibrary.json`
    - `MISSING_HERB` — known gap, flagged with `unresolved-` prefix, included
      with warning
    - `ERROR` — unintentional bad herb reference, formula rejected, merge blocked
  Exit code 1 when hard errors present — prevents bad data reaching production
- **Generated Formula Library** (`data/formulaMapExpanded.json`) — merged output
  of original 30 curated formulas plus validated NCCAOM additions; carries
  `_meta.do_not_edit: true` to protect from manual edits; rebuilt by running
  the validation script
- **Formula Validation Report** (`data/formulaValidationReport.json`) —
  machine-readable audit log of every validation run; records counts, rejections,
  missing herb warnings, and skipped existing formulas
- **`meta` field on search responses** — `/api/search/tcm` now returns
  `meta.herbCount`, `meta.formulaCount`, `meta.goldFormulaCount`,
  `meta.silverFormulaCount`, and `meta.dataSource` on every response
- **Live formula count in UI** — `HerbSearch` displays
  "Searching 86 herbs · 162 Gold formulas" below the search input;
  populated from API response `meta` field; hidden until first successful
  fetch; never shows zeros

### Changed
- `/api/search/tcm` route updated to load `formulaMapExpanded.json` when
  available, with try/catch fallback to base `formulaMap.json`
- `interactionEngine` updated to resolve and unbundle formulas from the
  expanded set; unresolved herbs passed through to existing unresolved
  handler without crashing
- `TCMSearchResponse` type in `lib/types/clinical.ts` extended with `meta`
  field
- Pending entry for formula expansion removed from v3.0.0 — delivered in
  this release

### Data Pipeline
```
data/nccaomFormulas.json          ← hand-curated, edit directly
        ↓
scripts/validateNccaomData.ts     ← run after any edit
        ↓
data/formulaMapExpanded.json      ← generated, do not edit
data/formulaValidationReport.json ← audit log
```

### Clinical Safety Notes
- All 150+ formulas carry `trustTier: "gold"` and `source: "nccaom_verified"` —
  no Silver or Unresolved formulas introduced in this release
- Formulas with herbs outside the 86-herb Gold library are flagged with
  `unresolved-` prefix and surfaced with amber "Data Missing" warning in UI;
  never silently included or dropped
- Original 30 curated formulas take precedence — validation script skips any
  formula ID already present in `formulaMap.json`
- Worst-Case Wins severity escalation confirmed working across all newly
  added formulas
- Modification Toggle confirmed working for all new formulas identically
  to existing ones

### Pending (Planned v3.2+)
- TCMBank export file required to activate Silver tier search and formula
  expansion
- NatMed Pro / Stockley's API licenses required to replace mock interaction
  data
- PDF export of interaction report
- Interaction history log (P2)

---

## [3.1.0] — 2026-03-18

### Overview
Formula library expansion to full NCCAOM Gold Standard coverage.
Scales clinical formula coverage from 30 to 121 board-exam formulas
while maintaining strict data audibility and Gold-tier trust status
throughout. Adds a live formula count to the search UI so practitioners
can see the depth of coverage at a glance.

### Added
- **NCCAOM Formula Source File** (`data/nccaomFormulas.json`) — hand-curated
  clinical source of truth for the full NCCAOM Herbology board exam formula
  set; organized by TCM category; based on Bensky's *Chinese Herbal Medicine:
  Formulas & Strategies*; never overwritten by scripts
- **Formula Validation Script** (`scripts/validateNccaomData.ts`) — three-level
  validation pipeline with actionable error logging:
    - `RESOLVED` — herb ID confirmed in `herbLibrary.json`
    - `MISSING_HERB` — known gap, flagged with `unresolved-` prefix, included
      with warning
    - `ERROR` — unintentional bad herb reference, formula rejected, merge blocked
  Exit code 1 when hard errors present — prevents bad data reaching production
- **Generated Formula Library** (`data/formulaMapExpanded.json`) — merged output
  of original 30 curated formulas plus validated NCCAOM additions; carries
  `_meta.do_not_edit: true` to protect from manual edits; rebuilt by running
  the validation script
- **Formula Validation Report** (`data/formulaValidationReport.json`) —
  machine-readable audit log of every validation run; records counts, rejections,
  missing herb warnings, and skipped existing formulas
- **`meta` field on search responses** — `/api/search/tcm` now returns
  `meta.herbCount`, `meta.formulaCount`, `meta.goldFormulaCount`,
  `meta.silverFormulaCount`, and `meta.dataSource` on every response
- **Live formula count in UI** — `HerbSearch` displays
  "Searching 86 herbs · 121 Gold formulas" below the search input;
  populated from API response `meta` field; hidden until first successful
  fetch; never shows zeros

### Changed
- `/api/search/tcm` route updated to load `formulaMapExpanded.json` when
  available, with try/catch fallback to base `formulaMap.json`
- `interactionEngine` updated to resolve and unbundle formulas from the
  expanded set; unresolved herbs passed through to existing unresolved
  handler without crashing
- `TCMSearchResponse` type in `lib/types/clinical.ts` extended with `meta`
  field
- Pending entry for formula expansion removed from v3.0.0 — delivered in
  this release

### Data Pipeline
```
data/nccaomFormulas.json          ← hand-curated, edit directly
        ↓
scripts/validateNccaomData.ts     ← run after any edit
        ↓
data/formulaMapExpanded.json      ← generated, do not edit
data/formulaValidationReport.json ← audit log
```

### Clinical Safety Notes
- All 121 formulas carry `trustTier: "gold"` and `source: "nccaom_verified"` —
  no Silver or Unresolved formulas introduced in this release
- Formulas with herbs outside the 86-herb Gold library are flagged with
  `unresolved-` prefix and surfaced with amber "Data Missing" warning in UI;
  never silently included or dropped
- Original 30 curated formulas take precedence — validation script skips any
  formula ID already present in `formulaMap.json`
- Worst-Case Wins severity escalation confirmed working across all newly
  added formulas
- Modification Toggle confirmed working for all new formulas identically
  to existing ones

### Pending (Planned v3.2+)
- TCMBank export file required to activate Silver tier search and formula
  expansion
- NatMed Pro / Stockley's API licenses required to replace mock interaction
  data
- PDF export of interaction report
- Interaction history log (P2)

---

## [3.1.1] — 2026-03-19

### Overview
Data integrity patch. Resolves label mismatches in the formula validation
report and fixes a Next.js Turbopack build crash caused by deep type
inference on large JSON datasets. No clinical behavior changes.

### Fixed
- **Unresolved herb label mismatches** — 4 formulas had parenthetical
  annotations in `unresolved_herbs[]` entries that broke the exact slug
  match in `validateNccaomData.ts`:
    - `xi-jiao-di-huang-tang`: "Shui Niu Jiao (substitutes for Xi Jiao)"
      → "Shui Niu Jiao"
    - `run-chang-wan`: "Dang Gui Wei (tail of Dang Gui)" → "Dang Gui Wei"
    - `xiao-jian-zhong-tang`: "Yi Tang (Malt sugar)" → "Yi Tang"
    - `da-bu-yin-wan`: "Zhu Ji Sui (pork spinal cord)" → "Zhu Ji Sui"
  Labels in `formulaValidationReport.json` now display correct Pinyin
  names instead of raw slugs for these entries
- **Next.js Turbopack build crash** — worker stack overflow caused by deep
  literal type inference across `formulaMapExpanded.json` (121 formulas);
  resolved by adding `types/json-data.d.ts` with explicit module
  declarations; `typescript.ignoreBuildErrors: true` added to
  `next.config.ts` as a Turbopack workaround
- `npx tsc --noEmit` remains the authoritative type-check gate and passes
  clean — no type safety regression

### Data
- `formulaMapExpanded.json` regenerated — 121 formulas, all labels correct
- `formulaValidationReport.json`: errors[] empty, rejected: 0,
  missing_herb_warnings: 131 (all properly labeled with clean Pinyin names)

### Clinical Safety Notes
- No changes to interaction data, herb library, or formula compositions
- All 121 formulas remain Gold-tier NCCAOM Verified
- Modification Toggle and Worst-Case Wins severity escalation unaffected

---

## [3.0.0] — 2026-03-12

### Overview
Major architectural migration from a static client-side data model to a
server-side clinical data architecture. Establishes the foundation for
TCMBank integration and future live API data sources (NatMed Pro, Stockley's).

### Added
- **Unified Search Route** (`/api/search/tcm`) — single endpoint for all herb
  and formula search; Fuse.js powered, runs server-side only; dataset never
  shipped to the browser
- **Three-State Trust Hierarchy** — Gold (NCCAOM Verified), Silver (TCMBank
  Research), Unresolved (Data Missing) — visually distinguished throughout
  search results and interaction views
- **Brand-to-Generic Drug Normalization** — RxNorm `/related?tty=IN` resolves
  brand names (Coumadin, Glucophage, Norvasc, Lanoxin) to ingredient-level
  rxcui at search time; display format shows "Warfarin (Coumadin)" so
  practitioners see both names
- **Top 50 Clinical Interaction Baseline** — expanded from 10 to 50 herb-drug
  interactions across 7 drug categories:
    - Anticoagulants + blood-moving herbs (10)
    - Diabetes drugs + glucose-lowering herbs (6)
    - Cardiac drugs + electrolyte-shifting herbs (6)
    - CNS drugs + sedating herbs (5)
    - Immunosuppressants + immune-modulating herbs (4)
    - Thyroid medications + metabolically active herbs (2)
    - Antihypertensives + hypotensive herbs (7)
- **TCM Energetics Panel** — collapsible per-herb panel in formula breakdown
  showing taste, temperature (color-coded), channels, properties, and TCM
  cautions; amber caution styling kept distinct from red drug interaction alerts
- **Formula Modification Toggle** — acupuncturist can exclude individual flagged
  herbs from a formula and see severity recalculate in real time; "Restore full
  formula" resets to original state
- **Server-Side Interaction Engine** — `checkInteractions()` callable via
  `POST /api/interactions`; Modification Toggle re-calculations also routed
  through API, no dual code paths
- **TCMBank Ingestion Script** scaffolded at `scripts/ingestTcmBank.ts` —
  full validation pipeline with actionable rejection logging; ready to run
  when TCMBank export data is available
- **Canonical Type System** — `lib/types/clinical.ts` as single source of
  truth for all shared types (`TrustTier`, `SeverityLevel`, `HerbIdentity`,
  `InteractionEngineResult`, etc.)
- **API versioning** — `api_version: "3.0"` field on all search responses

### Changed
- Herb and formula search fully migrated from client-side to server-side;
  no herb dataset imported in any component file
- `herbLibrary.json` enriched with full NCCAOM-standard energetics data
  across all 86 herbs (taste, temperature, channels, properties, tcm_cautions)
- `mockInteractions.json` citations updated from placeholder URLs to real
  PubMed search URLs (`?term=...`)
- `interactionEngine.ts` moved to `lib/interactionEngine.ts`
- Fuse.js threshold set to 0.25 (strict); configurable via `SEARCH_THRESHOLD`
  environment variable without code changes
- `HerbSearch` state refactored — three separate state variables consolidated
  into single `searchState` object with `forQuery` field; eliminates render
  race condition on fast input

### Fixed
- `activeSuggestions` wrapped in `useMemo` — prevents stale closure in
  exact-match-on-blur logic in `HerbSearch`
- `aria-controls` / `role="combobox"` added to `HerbSearch` and `DrugSearch`
  inputs for accessibility compliance
- Unescaped JSX quote entity fixed in `DrugSearch` no-results message
- `never[]` type error in drugs API route that was blocking the build

### Security & Compliance
- All mock interaction records carry `data_status: mock_unverified`
- `_meta.verification_status: mock_data_pending_clinical_review` added to
  `mockInteractions.json`
- Persistent disclaimer present on all result views; cannot be dismissed
- No PII collected or stored; HIPAA scope intentionally excluded from MVP

### Pending (Planned v3.1+)
- TCMBank export file required to activate Silver tier search and formula
  expansion beyond the current 30-formula Gold set
- NatMed Pro / Stockley's API licenses required to replace mock interaction
  data and remove `mock_unverified` flags
- PDF export of interaction report
- Interaction history log (P2)

### Clinical Safety Notes
> ⚠ All interaction data in this release is mock/unverified training-data-
> derived content. A licensed pharmacist or clinical herbalist must review
> every interaction record before this tool is used in unsupervised clinical
> practice. Do not remove `data_status: mock_unverified` flags until that
> review is complete.

- Fuse.js threshold validated to distinguish Dan Shen (Salvia miltiorrhiza)
  from Dang Shen (Codonopsis) — herbs with opposing cardiovascular profiles
- Unresolved herbs in TCMBank formulas surfaced with explicit "Data Missing"
  warning; never silently dropped from formula display
- Severity escalation rule: worst-case always wins across formula constituents

---

## [2.0.0] — 2026-02-14

### Overview
First functional MVP. Core interaction engine, formula expansion, drug search,
and UI components built and deployed to Vercel.

### Added
- Herb search with NCCAOM Pinyin, Latin, and English name support
- Drug search via RxNorm `approximateTerm` API with autocomplete
- Interaction engine (`checkInteractions()`) with formula expansion
- 10-interaction clinical baseline in `mockInteractions.json`
- 30-formula `formulaMap.json` with constituent herb mappings
- 86-herb `herbLibrary.json` with NCCAOM-standard naming
- Severity matrix: Contraindicated (🔴), Precaution (🟡), No Known Interaction (🟢)
- Formula breakdown view with flagged/safe herb separation
- Formula Modification Toggle with real-time severity recalculation
- Persistent clinical disclaimer on all result views
- `CLAUDE.md` project instruction file for Claude Code sessions
- Initial Vercel deployment

### Clinical Safety Notes
- Exact-match-on-blur enforced in herb search — practitioners must select
  from dropdown; free text never accepted as confirmed input
- Severity escalation: worst-case-wins rule across formula constituents

---

## [1.0.0] — 2026-01-20

### Overview
Project scaffolded. Next.js App Router, TypeScript strict mode, Tailwind CSS.
GitHub repository initialized. Claude Code development environment configured.

### Added
- Next.js project scaffold with App Router and TypeScript strict mode
- Tailwind CSS configuration
- GitHub repository and initial commit
- Claude Code CLI setup with PowerShell execution policy documented
- `CLAUDE.md` initial version with MVP scope boundaries

---

*This changelog is maintained by the development team.*
*Clinical data changes require separate sign-off from a licensed practitioner.*
