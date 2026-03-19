/**
 * scripts/validateNccaomData.ts
 *
 * Clinical audit tool for the NCCAOM formula library.
 * Validates nccaomFormulas.json against herbLibrary.json and formulaMap.json,
 * then merges validated formulas into formulaMapExpanded.json.
 *
 * Usage:
 *   npx ts-node scripts/validateNccaomData.ts \
 *     --input ./data/nccaomFormulas.json \
 *     --herb-library ./data/herbLibrary.json \
 *     --formula-map ./data/formulaMap.json \
 *     --output ./data/formulaMapExpanded.json \
 *     --report ./data/formulaValidationReport.json \
 *     --dry-run
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function getArg(flag: string, defaultVal: string): string {
  const idx = process.argv.indexOf(flag);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return defaultVal;
}

const INPUT_FILE   = getArg("--input",        "./data/nccaomFormulas.json");
const HERB_LIB     = getArg("--herb-library", "./data/herbLibrary.json");
const FORMULA_MAP  = getArg("--formula-map",  "./data/formulaMap.json");
const OUTPUT_FILE  = getArg("--output",       "./data/formulaMapExpanded.json");
const REPORT_FILE  = getArg("--report",       "./data/formulaValidationReport.json");
const DRY_RUN      = process.argv.includes("--dry-run");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FormulaEntry {
  id: string;
  pinyin: string;
  english: string;
  category?: string;
  classical_reference?: string;
  version?: string;
  herb_ids: string[];
  unresolved_herbs?: string[];
  trustTier?: string;
  source?: string;
}

interface NccaomInput {
  _meta: {
    version: string;
    formula_count: number;
    status: string;
  };
  formulas: FormulaEntry[];
}

interface HerbLibrary {
  herbs: { id: string }[];
}

interface FormulaMap {
  formulas: FormulaEntry[];
}

interface ValidationError {
  formula_id: string;
  pinyin: string;
  message: string;
}

interface MissingHerbWarning {
  formula_pinyin: string;
  herb_id: string;
  message: string;
}

interface ValidationReport {
  run_at: string;
  dry_run: boolean;
  input_file: string;
  summary: {
    total_input: number;
    validated_and_merged: number;
    skipped_existing: number;
    rejected: number;
    missing_herb_warnings: number;
    output_total: number;
  };
  errors: ValidationError[];
  missing_herb_warnings: MissingHerbWarning[];
  skipped_existing: string[];
  exit_code: number;
}

// ---------------------------------------------------------------------------
// NCCAOM category sort order
// ---------------------------------------------------------------------------

const CATEGORY_ORDER: Record<string, number> = {
  "Release Exterior — Wind Cold":       1,
  "Release Exterior — Wind Heat":       2,
  "Clear Heat":                         3,
  "Drain Downward":                     4,
  "Harmonize":                          5,
  "Warm Interior / Expel Cold":         6,
  "Resolve Phlegm":                     7,
  "Calm Shen":                          8,
  "Regulate Qi":                        9,
  "Regulate Blood / Invigorate Blood": 10,
  "Tonify Qi":                         11,
  "Tonify Blood":                      12,
  "Tonify Yin":                        13,
  "Tonify Yang":                       14,
  "Stabilize and Bind":                15,
  "Reduce Food Stagnation":            16,
  "Expel Wind":                        17,
  "Treat Dryness":                     18,
  "Open Orifices":                     19,
};

// ---------------------------------------------------------------------------
// Load helpers
// ---------------------------------------------------------------------------

function loadJson<T>(filePath: string, label: string): T {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) {
    console.error(`ERROR: Cannot find ${label} at ${abs}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(abs, "utf-8")) as T;
}

// ---------------------------------------------------------------------------
// LOAD PHASE
// ---------------------------------------------------------------------------

console.log("\nLoading data files…");

const inputData   = loadJson<NccaomInput>(INPUT_FILE,  "nccaomFormulas.json");
const herbLib     = loadJson<HerbLibrary>(HERB_LIB,    "herbLibrary.json");
const formulaMap  = loadJson<FormulaMap>(FORMULA_MAP,  "formulaMap.json");

const herbIdSet: Set<string>    = new Set(herbLib.herbs.map((h) => h.id));
const existingIds: Set<string>  = new Set(formulaMap.formulas.map((f) => f.id));

console.log(
  `Loaded ${herbIdSet.size} herbs, ${existingIds.size} existing formulas`
);

// ---------------------------------------------------------------------------
// VALIDATE PHASE
// ---------------------------------------------------------------------------

const errors: ValidationError[]               = [];
const missingHerbWarnings: MissingHerbWarning[] = [];
const skippedExisting: string[]               = [];
const validatedFormulas: FormulaEntry[]       = [];
const seenIds = new Set<string>();

for (const formula of inputData.formulas) {
  const id     = formula.id     ?? "";
  const pinyin = formula.pinyin ?? "";
  let rejected = false;

  // CHECK 1 — Required fields
  const requiredFields: (keyof FormulaEntry)[] = [
    "id", "pinyin", "english", "category", "herb_ids",
  ];
  for (const field of requiredFields) {
    if (!formula[field]) {
      errors.push({
        formula_id: id,
        pinyin,
        message: `missing field: ${field}`,
      });
      console.error(
        `ERROR: Formula "${pinyin}" [${id}] — missing field: ${field}`
      );
      rejected = true;
    }
  }

  // CHECK 2 — Minimum herb count
  if (!rejected && (!Array.isArray(formula.herb_ids) || formula.herb_ids.length < 2)) {
    errors.push({
      formula_id: id,
      pinyin,
      message: `only ${formula.herb_ids?.length ?? 0} herb(s) listed`,
    });
    console.error(
      `ERROR: Formula "${pinyin}" [${id}] — only ${formula.herb_ids?.length ?? 0} herb(s) listed`
    );
    rejected = true;
  }

  if (rejected) continue;

  // CHECK 3 — Duplicate IDs within input file
  if (seenIds.has(id)) {
    errors.push({
      formula_id: id,
      pinyin,
      message: `Duplicate id "${id}" — keeping first occurrence`,
    });
    console.error(`ERROR: Duplicate id "${id}" — keeping first occurrence`);
    continue;
  }
  seenIds.add(id);

  // CHECK 4 — Herb ID resolution
  let hasDataError = false;
  for (const herbId of formula.herb_ids) {
    if (herbIdSet.has(herbId)) {
      // RESOLVED — no log needed
      continue;
    }

    if (herbId.startsWith("unresolved-")) {
      // KNOWN GAP — intentional
      const label = formula.unresolved_herbs?.find((u) =>
        u.toLowerCase().replace(/\s+/g, "-").startsWith(
          herbId.slice("unresolved-".length).split("-")[0]
        )
      ) ?? herbId;
      const msg = `Formula [${pinyin}] requires [${label}] — flagged for clinical review`;
      missingHerbWarnings.push({ formula_pinyin: pinyin, herb_id: herbId, message: msg });
      console.warn(`MISSING_HERB: ${msg}`);
      continue;
    }

    // DATA ERROR — unintentional bad reference
    errors.push({
      formula_id: id,
      pinyin,
      message: `unknown herb_id "${herbId}" (not in library, not flagged as unresolved)`,
    });
    console.error(
      `ERROR: Formula "${pinyin}" [${id}] — unknown herb_id "${herbId}" (not in library, not flagged as unresolved)`
    );
    hasDataError = true;
  }

  if (hasDataError) continue;

  // CHECK 5 — Existing formula precedence
  if (existingIds.has(id)) {
    skippedExisting.push(id);
    console.info(`SKIPPED: "${id}" exists in formulaMap.json — preserved`);
    continue;
  }

  // Passed all checks — annotate and queue for merge
  validatedFormulas.push({
    ...formula,
    trustTier: "gold",
    source: "nccaom",
  });
}

// ---------------------------------------------------------------------------
// Summary accounting
// ---------------------------------------------------------------------------

const totalInput      = inputData.formulas.length;
const rejected        = totalInput - seenIds.size + errors.filter(
  (e) => !e.message.startsWith("Duplicate")
).length;
// Simple count: total - skipped - errors-that-caused-rejection
const validatedCount  = validatedFormulas.length;
const skippedCount    = skippedExisting.length;
const rejectedCount   = totalInput - validatedCount - skippedCount;
const outputTotal     = formulaMap.formulas.length + validatedCount;
const exitCode        = errors.length > 0 ? 1 : 0;

// ---------------------------------------------------------------------------
// MERGE PHASE
// ---------------------------------------------------------------------------

if (!DRY_RUN && exitCode === 0) {
  // Sort new formulas by category order, then pinyin
  validatedFormulas.sort((a, b) => {
    const catA = CATEGORY_ORDER[a.category ?? ""] ?? 99;
    const catB = CATEGORY_ORDER[b.category ?? ""] ?? 99;
    if (catA !== catB) return catA - catB;
    return (a.pinyin ?? "").localeCompare(b.pinyin ?? "");
  });

  const merged = [...formulaMap.formulas, ...validatedFormulas];

  const expandedOutput = {
    _meta: {
      description: "Merged NCCAOM formula library — generated file",
      generated_at: new Date().toISOString(),
      source_version: inputData._meta.version,
      formula_count: merged.length,
      gold_count: merged.filter((f) => (f as FormulaEntry & { trustTier?: string }).trustTier === "gold" || !("trustTier" in f)).length,
      silver_count: merged.filter((f) => (f as FormulaEntry & { trustTier?: string }).trustTier === "silver").length,
      do_not_edit: true,
    },
    formulas: merged,
  };

  fs.writeFileSync(
    path.resolve(OUTPUT_FILE),
    JSON.stringify(expandedOutput, null, 2),
    "utf-8"
  );
  console.log(`\n✓ Written: ${OUTPUT_FILE} (${merged.length} formulas)`);
} else if (!DRY_RUN && exitCode === 1) {
  console.error(
    "\n✗ Merge skipped — errors present. Fix errors and re-run."
  );
}

// ---------------------------------------------------------------------------
// VALIDATION REPORT
// ---------------------------------------------------------------------------

const report: ValidationReport = {
  run_at: new Date().toISOString(),
  dry_run: DRY_RUN,
  input_file: INPUT_FILE,
  summary: {
    total_input: totalInput,
    validated_and_merged: validatedCount,
    skipped_existing: skippedCount,
    rejected: rejectedCount,
    missing_herb_warnings: missingHerbWarnings.length,
    output_total: outputTotal,
  },
  errors,
  missing_herb_warnings: missingHerbWarnings,
  skipped_existing: skippedExisting,
  exit_code: exitCode,
};

fs.writeFileSync(
  path.resolve(REPORT_FILE),
  JSON.stringify(report, null, 2),
  "utf-8"
);
console.log(`✓ Report: ${REPORT_FILE}`);

// ---------------------------------------------------------------------------
// CONSOLE SUMMARY
// ---------------------------------------------------------------------------

const divider  = "═".repeat(39);
const subdiv   = "─".repeat(39);

console.log(`\n${divider}`);
console.log("NCCAOM Formula Validation Report");
console.log(divider);
console.log(`Input formulas:        ${String(totalInput).padStart(4)}`);
console.log(`Validated & merged:    ${String(validatedCount).padStart(4)}`);
console.log(`Skipped (existing):    ${String(skippedCount).padStart(4)}`);
console.log(`Rejected:              ${String(rejectedCount).padStart(4)}`);
console.log(`Missing herb warnings: ${String(missingHerbWarnings.length).padStart(4)}`);
console.log(subdiv);
console.log(`Output formula count:  ${String(outputTotal).padStart(4)}`);
if (exitCode === 0 && missingHerbWarnings.length > 0) {
  console.log(`Exit code: 0 (warnings present — review report)`);
} else if (exitCode === 0) {
  console.log(`Exit code: 0 ✓`);
} else {
  console.log(`Exit code: 1 ✗ (errors present — merge blocked)`);
}
console.log(`${divider}\n`);

process.exit(exitCode);
