/**
 * scripts/ingestTcmBank.ts
 *
 * TCMBank data ingestion pipeline.
 * Validates, normalizes, and classifies TCMBank herb/formula exports into
 * Gold (NCCAOM-verified) and Silver (research) trust tiers.
 *
 * Usage:
 *   npx ts-node scripts/ingestTcmBank.ts \
 *     --input ./tcmbank-export.json \
 *     --herb-output ./data/herbLibraryEnriched.json \
 *     --formula-output ./data/formulaMapEnriched.json \
 *     --report ./data/ingestionReport.json \
 *     --dry-run
 *
 * Requires ts-node: npm install -D ts-node
 */

import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type TrustTier = "gold" | "silver" | "unresolved";

type OutputHerb = {
  id: string;
  pinyin: string;
  latin: string;
  english: string;
  nccaom_code: string | null;
  trustTier: TrustTier;
  source: "nccaom_verified" | "tcmbank_research";
  tcmbank_id: string;
  active_constituent?: string;
  taste: string[];
  temperature: string | null;
  channels: string[];
  properties: string[];
  tcm_cautions: string | null;
  resolved: boolean;
  requires_review?: boolean;
};

type OutputFormula = {
  id: string;
  pinyin: string;
  english: string;
  trustTier: TrustTier;
  source: "nccaom" | "tcmbank_research";
  resolutionRate: number;
  herb_ids: string[];
};

type RejectedHerb = {
  tcmbank_id: string;
  name: string;
  reason: string;
};

type ProbableMatch = {
  tcmbank_id: string;
  tcmbank_name: string;
  matched_nccaom: string;
  match_type: "pinyin" | "latin";
};

type LowResFormula = {
  formula_name: string;
  resolution_rate: number;
  unresolved_herbs: string[];
};

type IngestionReport = {
  run_at: string;
  tcmbank_version: string;
  summary: {
    total_input: number;
    gold: number;
    silver: number;
    rejected: number;
    probable_matches: number;
    formulas_imported: number;
    formulas_excluded: number;
  };
  rejected_herbs: RejectedHerb[];
  probable_matches: ProbableMatch[];
  low_resolution_formulas: LowResFormula[];
  warnings: string[];
};

// Loose TCMBank input shape — actual format may vary
type TCMBankHerb = {
  Herb_id?: string;
  id?: string;
  Herb_pinyin_name?: string;
  pinyin?: string;
  Herb_latin_name?: string;
  latin?: string;
  Herb_english_name?: string;
  english?: string;
  Property?: string;
  Temperature?: string;
  Taste?: string | string[];
  Meridian_affinity?: string | string[];
  Meridians?: string | string[];
  Active_constituent?: string;
  [key: string]: unknown;
};

type TCMBankFormula = {
  Formula_id?: string;
  id?: string;
  Formula_name?: string;
  pinyin?: string;
  English_name?: string;
  english?: string;
  Herb_ids?: string[];
  herb_ids?: string[];
  [key: string]: unknown;
};

type TCMBankExport = {
  metadata?: { version?: string };
  version?: string;
  herbs?: TCMBankHerb[];
  formulas?: TCMBankFormula[];
};

// Gold library entry shape for matching
type GoldHerb = {
  id: string;
  pinyin: string;
  latin: string;
  english: string;
  nccaom_code: string;
};

// ---------------------------------------------------------------------------
// Pinyin normalization — exact function from spec
// ---------------------------------------------------------------------------

function normalizePinyin(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/[āáǎà]/g, "a")
    .replace(/[ēéěè]/g, "e")
    .replace(/[īíǐì]/g, "i")
    .replace(/[ōóǒò]/g, "o")
    .replace(/[ūúǔùǖǘǚǜ]/g, "u")
    .trim();
}

// ---------------------------------------------------------------------------
// Temperature normalization
// ---------------------------------------------------------------------------

const TEMPERATURE_MAP: Record<string, string> = {
  cold: "cold",
  cool: "cool",
  neutral: "neutral",
  warm: "warm",
  hot: "hot",
  "slightly warm": "warm",
  "slightly cool": "cool",
  "slightly cold": "cool",
  "mildly warm": "warm",
  "mildly cold": "cool",
};

function normalizeTemperature(raw: string): string | null {
  const lower = raw.trim().toLowerCase();
  return TEMPERATURE_MAP[lower] ?? null;
}

// ---------------------------------------------------------------------------
// Meridian expansion
// ---------------------------------------------------------------------------

const VALID_MERIDIANS = new Set([
  "LU", "LI", "ST", "SP", "HT", "SI", "BL", "KD", "PC", "TH", "GB", "LR",
]);

const MERIDIAN_FULL_TO_CODE: Record<string, string> = {
  lung: "LU",
  "large intestine": "LI",
  stomach: "ST",
  spleen: "SP",
  heart: "HT",
  "small intestine": "SI",
  "urinary bladder": "BL",
  bladder: "BL",
  kidney: "KD",
  "pericardium": "PC",
  "triple heater": "TH",
  "triple warmer": "TH",
  "san jiao": "TH",
  "gallbladder": "GB",
  liver: "LR",
};

function expandMeridian(raw: string): string | null {
  const upper = raw.trim().toUpperCase();
  if (VALID_MERIDIANS.has(upper)) return upper;
  const lower = raw.trim().toLowerCase();
  return MERIDIAN_FULL_TO_CODE[lower] ?? null;
}

// ---------------------------------------------------------------------------
// Taste normalization
// ---------------------------------------------------------------------------

const VALID_TASTES = new Set([
  "bitter", "sweet", "acrid", "sour", "salty", "bland", "astringent",
]);

function normalizeTaste(raw: string): string | null {
  const lower = raw.trim().toLowerCase();
  return VALID_TASTES.has(lower) ? lower : null;
}

// ---------------------------------------------------------------------------
// Slug generation for IDs
// ---------------------------------------------------------------------------

function toSlug(s: string): string {
  return normalizePinyin(s)
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

function parseArgs(): {
  input: string;
  herbOutput: string;
  formulaOutput: string;
  report: string;
  dryRun: boolean;
} {
  const argv = process.argv.slice(2);
  let input = "";
  let herbOutput = "./data/herbLibraryEnriched.json";
  let formulaOutput = "./data/formulaMapEnriched.json";
  let report = "./data/ingestionReport.json";
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    switch (argv[i]) {
      case "--input":
        input = argv[++i] ?? "";
        break;
      case "--herb-output":
        herbOutput = argv[++i] ?? herbOutput;
        break;
      case "--formula-output":
        formulaOutput = argv[++i] ?? formulaOutput;
        break;
      case "--report":
        report = argv[++i] ?? report;
        break;
      case "--dry-run":
        dryRun = true;
        break;
    }
  }

  if (!input) {
    console.error("ERROR: --input is required");
    process.exit(1);
  }

  return { input, herbOutput, formulaOutput, report, dryRun };
}

// ---------------------------------------------------------------------------
// Main ingestion function
// ---------------------------------------------------------------------------

function main() {
  const { input, herbOutput, formulaOutput, report: reportPath, dryRun } = parseArgs();

  console.log(`\n=== TCMBank Ingestion Script ===`);
  console.log(`Input:    ${input}`);
  console.log(`Dry run:  ${dryRun ? "yes — no files will be written" : "no"}\n`);

  // ── Load input ─────────────────────────────────────────────────────────────
  let rawExport: TCMBankExport;
  try {
    const contents = fs.readFileSync(path.resolve(input), "utf-8");
    rawExport = JSON.parse(contents) as TCMBankExport;
  } catch (err) {
    console.error(`ERROR: Failed to read input file: ${String(err)}`);
    process.exit(1);
  }

  // ── Load Gold herb library for matching ────────────────────────────────────
  const goldLibPath = path.resolve("./data/herbLibrary.json");
  let goldHerbs: GoldHerb[] = [];
  try {
    const goldContents = fs.readFileSync(goldLibPath, "utf-8");
    const goldData = JSON.parse(goldContents) as { herbs?: GoldHerb[] };
    goldHerbs = goldData.herbs ?? [];
  } catch {
    console.warn("WARNING: Could not load data/herbLibrary.json — Gold matching disabled");
  }

  // Build lookup maps for fast matching
  const goldByPinyin = new Map<string, GoldHerb>();
  const goldByLatin = new Map<string, GoldHerb>();
  for (const herb of goldHerbs) {
    goldByPinyin.set(normalizePinyin(herb.pinyin), herb);
    const latinKey = herb.latin.toLowerCase().split(" ").slice(0, 2).join(" ");
    goldByLatin.set(latinKey, herb);
  }

  const tcmbankVersion =
    rawExport.metadata?.version ?? rawExport.version ?? "unknown";
  const inputHerbs = rawExport.herbs ?? [];
  const inputFormulas = rawExport.formulas ?? [];

  // ── Ingestion report accumulators ─────────────────────────────────────────
  const rejectedHerbs: RejectedHerb[] = [];
  const probableMatches: ProbableMatch[] = [];
  const lowResFormulas: LowResFormula[] = [];
  const warnings: string[] = [];
  const outputHerbs: OutputHerb[] = [];
  const seenPinyinNormalized = new Set<string>();

  // ── Process herbs ──────────────────────────────────────────────────────────
  console.log(`Processing ${inputHerbs.length} herbs...`);

  for (const rawHerb of inputHerbs) {
    const tcmbank_id = String(rawHerb.Herb_id ?? rawHerb.id ?? "unknown");
    const pinyinRaw = rawHerb.Herb_pinyin_name ?? rawHerb.pinyin ?? "";
    const latinRaw = rawHerb.Herb_latin_name ?? rawHerb.latin ?? "";
    const englishRaw = rawHerb.Herb_english_name ?? rawHerb.english ?? "";

    const rejectWith = (reason: string, value: unknown) => {
      const logLine = `REJECTED: ID [${tcmbank_id}] "${pinyinRaw || englishRaw || tcmbank_id}" — ${reason}: [${String(value)}]`;
      console.log(logLine);
      rejectedHerbs.push({ tcmbank_id, name: pinyinRaw || englishRaw, reason: logLine });
    };

    // Validation: MISSING_PINYIN
    if (!pinyinRaw.trim()) {
      rejectWith("MISSING_PINYIN", "");
      continue;
    }

    // Validation: MISSING_LATIN
    if (!latinRaw.trim()) {
      rejectWith("MISSING_LATIN", "");
      continue;
    }

    // Normalize temperature / property
    const temperatureRaw = String(rawHerb.Property ?? rawHerb.Temperature ?? "");
    let temperature: string | null = null;
    if (temperatureRaw.trim()) {
      temperature = normalizeTemperature(temperatureRaw);
      if (temperature === null) {
        rejectWith("INVALID_PROPERTY", temperatureRaw);
        continue;
      }
    }

    // Normalize meridians
    const meridianRaw = rawHerb.Meridian_affinity ?? rawHerb.Meridians ?? [];
    const meridianList: string[] = Array.isArray(meridianRaw)
      ? meridianRaw.map(String)
      : String(meridianRaw)
          .split(/[,;/]/)
          .map((m) => m.trim())
          .filter(Boolean);

    const validMeridians: string[] = [];
    for (const m of meridianList) {
      const expanded = expandMeridian(m);
      if (expanded) {
        validMeridians.push(expanded);
      } else {
        warnings.push(
          `WARNING: ID [${tcmbank_id}] "${pinyinRaw}" — invalid meridian: [${m}]`
        );
      }
    }

    if (meridianList.length > 0 && validMeridians.length === 0) {
      rejectWith("INVALID_MERIDIAN", meridianList.join(", "));
      continue;
    }

    // Normalize tastes
    const tasteRaw = rawHerb.Taste ?? [];
    const tasteList: string[] = Array.isArray(tasteRaw)
      ? tasteRaw.map(String)
      : String(tasteRaw)
          .split(/[,;/]/)
          .map((t) => t.trim())
          .filter(Boolean);

    const validTastes: string[] = [];
    for (const t of tasteList) {
      const normalized = normalizeTaste(t);
      if (normalized) {
        validTastes.push(normalized);
      } else {
        warnings.push(
          `WARNING: ID [${tcmbank_id}] "${pinyinRaw}" — invalid taste: [${t}]`
        );
      }
    }

    // Duplicate check
    const normalizedPinyin = normalizePinyin(pinyinRaw);
    if (seenPinyinNormalized.has(normalizedPinyin)) {
      rejectWith("DUPLICATE_PINYIN", pinyinRaw);
      continue;
    }
    seenPinyinNormalized.add(normalizedPinyin);

    // ── Trust tier assignment ───────────────────────────────────────────────
    let trustTier: TrustTier = "silver";
    let source: "nccaom_verified" | "tcmbank_research" = "tcmbank_research";
    let nccaom_code: string | null = null;
    let requiresReview = false;

    const goldByPinyinMatch = goldByPinyin.get(normalizedPinyin);
    if (goldByPinyinMatch) {
      trustTier = "gold";
      source = "nccaom_verified";
      nccaom_code = goldByPinyinMatch.nccaom_code;
    } else {
      // Latin binomial match (first two words, case-insensitive)
      const latinKey = latinRaw.toLowerCase().split(" ").slice(0, 2).join(" ");
      const goldByLatinMatch = goldByLatin.get(latinKey);
      if (goldByLatinMatch) {
        trustTier = "gold";
        source = "nccaom_verified";
        nccaom_code = goldByLatinMatch.nccaom_code;
        requiresReview = true;
        const matchRecord: ProbableMatch = {
          tcmbank_id,
          tcmbank_name: pinyinRaw,
          matched_nccaom: goldByLatinMatch.pinyin,
          match_type: "latin",
        };
        probableMatches.push(matchRecord);
        console.log(
          `PROBABLE_MATCH: [${tcmbank_id}] "${pinyinRaw}" → "${goldByLatinMatch.pinyin}" (latin: ${latinRaw})`
        );
      }
    }

    const herbId =
      trustTier === "gold" && goldByPinyin.get(normalizedPinyin)
        ? goldByPinyin.get(normalizedPinyin)!.id
        : toSlug(pinyinRaw);

    const outputHerb: OutputHerb = {
      id: herbId,
      pinyin: pinyinRaw,
      latin: latinRaw,
      english: englishRaw,
      nccaom_code,
      trustTier,
      source,
      tcmbank_id,
      active_constituent: String(rawHerb.Active_constituent ?? "").trim() || undefined,
      taste: validTastes,
      temperature,
      channels: validMeridians,
      properties: [],
      tcm_cautions: null,
      resolved: true,
      ...(requiresReview ? { requires_review: true } : {}),
    };

    outputHerbs.push(outputHerb);
  }

  console.log(
    `\nHerbs: ${outputHerbs.length} accepted, ${rejectedHerbs.length} rejected\n`
  );

  // Build output herb ID set for formula resolution
  const outputHerbIds = new Set(outputHerbs.map((h) => h.id));

  // ── Process formulas ───────────────────────────────────────────────────────
  const MIN_RESOLUTION = 0.6;
  console.log(`Processing ${inputFormulas.length} formulas...`);

  const outputFormulas: OutputFormula[] = [];
  let formulasExcluded = 0;

  for (const rawFormula of inputFormulas) {
    const pinyinRaw = String(rawFormula.Formula_name ?? rawFormula.pinyin ?? "");
    const englishRaw = String(rawFormula.English_name ?? rawFormula.english ?? "");
    const rawHerbIds: string[] = Array.isArray(rawFormula.Herb_ids ?? rawFormula.herb_ids)
      ? [...((rawFormula.Herb_ids ?? rawFormula.herb_ids) as string[])]
      : [];

    if (!pinyinRaw.trim() || rawHerbIds.length === 0) {
      warnings.push(`WARNING: Skipping formula "${pinyinRaw || "unnamed"}" — missing name or empty herb list`);
      continue;
    }

    const resolvedIds: string[] = [];
    const unresolvedNames: string[] = [];

    for (const herbRef of rawHerbIds) {
      const slug = toSlug(herbRef);
      if (outputHerbIds.has(slug)) {
        resolvedIds.push(slug);
      } else {
        // Check if it matches a Gold herb
        const normalizedRef = normalizePinyin(herbRef);
        const goldMatch = goldByPinyin.get(normalizedRef);
        if (goldMatch) {
          resolvedIds.push(goldMatch.id);
        } else {
          const unresolvedId = `unresolved-${toSlug(herbRef) || slug}`;
          resolvedIds.push(unresolvedId);
          unresolvedNames.push(herbRef);
        }
      }
    }

    const resolutionRate = rawHerbIds.length > 0
      ? resolvedIds.filter((id) => !id.startsWith("unresolved-")).length / rawHerbIds.length
      : 1.0;

    if (resolutionRate < MIN_RESOLUTION) {
      const logLine = {
        formula_name: pinyinRaw,
        resolution_rate: Math.round(resolutionRate * 100) / 100,
        unresolved_herbs: unresolvedNames,
      };
      lowResFormulas.push(logLine);
      console.log(
        `LOW_RESOLUTION_FORMULA: "${pinyinRaw}" — ${Math.round(resolutionRate * 100)}% (${unresolvedNames.join(", ")})`
      );
      formulasExcluded++;
      continue;
    }

    const formulaId = toSlug(pinyinRaw);
    const outputFormula: OutputFormula = {
      id: formulaId,
      pinyin: pinyinRaw,
      english: englishRaw,
      trustTier: "silver",
      source: "tcmbank_research",
      resolutionRate: Math.round(resolutionRate * 100) / 100,
      herb_ids: resolvedIds,
    };

    outputFormulas.push(outputFormula);
  }

  console.log(
    `\nFormulas: ${outputFormulas.length} imported, ${formulasExcluded} excluded (below ${MIN_RESOLUTION * 100}% resolution)\n`
  );

  // ── Print warnings ─────────────────────────────────────────────────────────
  if (warnings.length > 0) {
    console.log(`Warnings (${warnings.length}):`);
    warnings.forEach((w) => console.log(`  ${w}`));
    console.log();
  }

  // ── Build ingestion report ─────────────────────────────────────────────────
  const goldCount = outputHerbs.filter((h) => h.trustTier === "gold").length;
  const silverCount = outputHerbs.filter((h) => h.trustTier === "silver").length;

  const reportData: IngestionReport = {
    run_at: new Date().toISOString(),
    tcmbank_version: tcmbankVersion,
    summary: {
      total_input: inputHerbs.length,
      gold: goldCount,
      silver: silverCount,
      rejected: rejectedHerbs.length,
      probable_matches: probableMatches.length,
      formulas_imported: outputFormulas.length,
      formulas_excluded: formulasExcluded,
    },
    rejected_herbs: rejectedHerbs,
    probable_matches: probableMatches,
    low_resolution_formulas: lowResFormulas,
    warnings,
  };

  // ── Write output files ─────────────────────────────────────────────────────
  if (dryRun) {
    console.log("=== DRY RUN — no files written ===");
    console.log(JSON.stringify(reportData.summary, null, 2));
    return;
  }

  const herbEnrichedOutput = {
    _meta: {
      version: "1.0",
      generated_at: new Date().toISOString(),
      tcmbank_version: tcmbankVersion,
      total_herbs: outputHerbs.length,
      gold: goldCount,
      silver: silverCount,
      note: "Generated by scripts/ingestTcmBank.ts — do not edit manually.",
    },
    herbs: outputHerbs,
  };

  const formulaEnrichedOutput = {
    _meta: {
      version: "1.0",
      generated_at: new Date().toISOString(),
      tcmbank_version: tcmbankVersion,
      total_formulas: outputFormulas.length,
      note: "Generated by scripts/ingestTcmBank.ts — do not edit manually.",
    },
    formulas: outputFormulas,
  };

  try {
    fs.writeFileSync(
      path.resolve(herbOutput),
      JSON.stringify(herbEnrichedOutput, null, 2),
      "utf-8"
    );
    console.log(`✓ Wrote herb library: ${herbOutput}`);
  } catch (err) {
    console.error(`ERROR: Failed to write ${herbOutput}: ${String(err)}`);
    process.exit(1);
  }

  try {
    fs.writeFileSync(
      path.resolve(formulaOutput),
      JSON.stringify(formulaEnrichedOutput, null, 2),
      "utf-8"
    );
    console.log(`✓ Wrote formula map: ${formulaOutput}`);
  } catch (err) {
    console.error(`ERROR: Failed to write ${formulaOutput}: ${String(err)}`);
    process.exit(1);
  }

  try {
    fs.writeFileSync(
      path.resolve(reportPath),
      JSON.stringify(reportData, null, 2),
      "utf-8"
    );
    console.log(`✓ Wrote ingestion report: ${reportPath}`);
  } catch (err) {
    console.error(`ERROR: Failed to write ${reportPath}: ${String(err)}`);
    process.exit(1);
  }

  console.log("\n=== Ingestion complete ===");
  console.log(JSON.stringify(reportData.summary, null, 2));
}

main();
