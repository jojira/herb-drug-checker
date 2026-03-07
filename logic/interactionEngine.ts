/**
 * interactionEngine.ts
 *
 * Core logic for the Herb-Drug Interaction Checker.
 * Accepts a list of western medications and a TCM input (single herb or formula),
 * resolves formulas to constituent herbs, cross-references against the interaction
 * database, and returns structured severity results.
 *
 * NOTE: This tool assumes standard clinical dosages. Interaction severity may vary
 * based on dosage and herb-to-drug ratio. This tool is for professional reference
 * only and does not replace clinical judgment.
 */

import interactionData from "@/data/mockInteractions.json";
import formulaData from "@/data/formulaMap.json";
import herbLibraryData from "@/data/herbLibrary.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SeverityLevel = "contraindicated" | "precaution" | "none";
export type SeverityColor = "red" | "yellow" | "green";
export type EvidenceLevel = "high" | "medium" | "low";
export type ConfidenceLevel = "high" | "medium" | "low";
export type DataSource = "natmed" | "stockleys";

export type HerbIdentity = {
  id: string;
  pinyin: string;
  latin: string;
  english: string;
  nccaom_code: string;
  active_constituent?: string;
};

export type DrugIdentity = {
  rxcui: string;
  name: string;
  brand_names: string[];
  drug_class: string;
};

export type Citation = {
  title: string;
  journal?: string;
  year?: number;
  url?: string;
};

/** A single matched interaction between one herb and one drug */
export type InteractionMatch = {
  interactionId: string;
  herb: HerbIdentity;
  drug: DrugIdentity;
  severity: SeverityLevel;
  severityColor: SeverityColor;
  mechanism: string;
  clinicalSummary: string;
  evidenceLevel: EvidenceLevel;
  evidenceNotes: string;
  citations: Citation[];
  sources: DataSource[];
  confidence: ConfidenceLevel;
  /** True when this herb came from formula expansion (not input directly) */
  fromFormula: boolean;
  /** The formula that contained this herb, if applicable */
  sourceFormula?: FormulaIdentity;
};

export type FormulaIdentity = {
  id: string;
  pinyin: string;
  english: string;
};

/** Describes a constituent herb within a formula, including whether it triggered an alert */
export type FormulaHerbDetail = {
  herbId: string;
  pinyin: string;
  latin: string;
  english: string;
  nccaom_code: string;
  hasInteraction: boolean;
  interactions: InteractionMatch[];
};

/** Full engine response */
export type InteractionEngineResult = {
  /** The highest severity found across all results */
  worstSeverity: SeverityLevel;
  worstSeverityColor: SeverityColor;
  /** All matched interactions, sorted by severity (worst first) */
  matches: InteractionMatch[];
  /** Present only when input was a formula — enables expand-to-see-ingredient UI */
  formulaBreakdown?: {
    formula: FormulaIdentity;
    herbs: FormulaHerbDetail[];
    flaggedHerbCount: number;
    totalHerbCount: number;
  };
  /** Herb IDs that were checked against all drugs and had no interactions */
  checkedWithNoInteraction: string[];
  /**
   * RxCUIs that were submitted but have no records in the interaction database.
   * These are NOT errors — the engine returns "no known interactions" for them.
   * The UI should surface this distinction so practitioners know the absence of
   * an alert reflects a data gap, not a confirmed safe combination.
   */
  unrecognizedRxcuis: string[];
  checkedAt: string;
  disclaimer: string;
}

// Input types
export type WesternMed = {
  rxcui: string;
  name: string;
};

export type HerbInput = {
  type: "herb";
  herbId: string;
};

export type FormulaInput = {
  type: "formula";
  formulaId: string;
};

export type TCMInput = HerbInput | FormulaInput;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITY_RANK: Record<SeverityLevel, number> = {
  contraindicated: 2,
  precaution: 1,
  none: 0,
};

const DISCLAIMER =
  "This tool is for educational and professional reference only. " +
  "It does not replace clinical judgment or consultation with a pharmacist. " +
  "Interaction severity may vary based on dosage and herb-to-drug ratio. " +
  "Standard clinical dosages are assumed.";

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Resolves a formula ID to its constituent herb IDs.
 * Returns null if the formula is not found.
 */
function resolveFormula(formulaId: string): { formula: FormulaIdentity; herbIds: string[] } | null {
  const formula = formulaData.formulas.find((f) => f.id === formulaId);
  if (!formula) return null;
  return {
    formula: {
      id: formula.id,
      pinyin: formula.pinyin,
      english: formula.english,
    },
    herbIds: formula.herb_ids,
  };
}

/**
 * Returns true if the rxcui exists anywhere in the interaction database.
 * Used to distinguish "no interaction found" from "drug not in database at all."
 */
function isRxcuiKnown(rxcui: string): boolean {
  return interactionData.interactions.some((i) => i.drug.rxcui === rxcui);
}

/**
 * Looks up a single herb-drug pair in the interaction database.
 * Matching is done by herbId AND rxcui — both must match exactly.
 * Returns null when no interaction record exists; never throws.
 * A null result means "no known interaction", not an error.
 */
function lookupInteraction(herbId: string, rxcui: string): InteractionMatch | null {
  const record = interactionData.interactions.find(
    (i) => i.herb.id === herbId && i.drug.rxcui === rxcui
  );
  if (!record) return null;

  return {
    interactionId: record.id,
    herb: record.herb as HerbIdentity,
    drug: record.drug as DrugIdentity,
    severity: record.severity as SeverityLevel,
    severityColor: record.severity_color as SeverityColor,
    mechanism: record.mechanism,
    clinicalSummary: record.clinical_summary,
    evidenceLevel: record.evidence_level as EvidenceLevel,
    evidenceNotes: record.evidence_notes,
    citations: record.citations as Citation[],
    sources: record.sources as DataSource[],
    confidence: record.confidence as ConfidenceLevel,
    fromFormula: false, // caller sets this if needed
  };
}

/**
 * Looks up full herb identity from the central herbLibrary.
 * This is the authoritative source for herb names — used for formula
 * breakdown so every constituent herb (flagged or not) gets its full
 * Pinyin / Latin / English / NCCAOM data, not just the ones with matches.
 * Returns null if the herb ID isn't in the library.
 */
function lookupHerbById(herbId: string): HerbIdentity | null {
  const entry = herbLibraryData.herbs.find((h) => h.id === herbId);
  if (!entry) return null;
  return {
    id: entry.id,
    pinyin: entry.pinyin,
    latin: entry.latin,
    english: entry.english,
    nccaom_code: entry.nccaom_code,
    active_constituent: (entry as { active_constituent?: string }).active_constituent,
  };
}

/**
 * Returns the higher-severity level of two severity values.
 */
function escalateSeverity(a: SeverityLevel, b: SeverityLevel): SeverityLevel {
  return SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;
}

function severityToColor(severity: SeverityLevel): SeverityColor {
  switch (severity) {
    case "contraindicated": return "red";
    case "precaution":      return "yellow";
    case "none":            return "green";
  }
}

// ---------------------------------------------------------------------------
// Main engine function
// ---------------------------------------------------------------------------

/**
 * Runs a full herb-drug interaction check.
 *
 * @param westernMeds - Array of western medications the patient is taking
 * @param tcmInput    - Either a single herb or a TCM formula to check against
 * @returns           - Structured InteractionEngineResult
 *
 * @example
 * // Check a single herb
 * checkInteractions(
 *   [{ rxcui: "11289", name: "Warfarin" }],
 *   { type: "herb", herbId: "dan-shen" }
 * );
 *
 * @example
 * // Check a formula (auto-expands to constituent herbs)
 * checkInteractions(
 *   [{ rxcui: "11289", name: "Warfarin" }],
 *   { type: "formula", formulaId: "xiao-yao-san" }
 * );
 */
export function checkInteractions(
  westernMeds: WesternMed[],
  tcmInput: TCMInput
): InteractionEngineResult {
  const matches: InteractionMatch[] = [];
  const checkedWithNoInteraction: string[] = [];
  let formulaBreakdown: InteractionEngineResult["formulaBreakdown"] | undefined;

  // ── Step 1: Identify drugs not in the interaction database ────────────────
  // These are not errors — the engine will return "no known interactions" for
  // them. We surface them separately so the UI can inform the practitioner
  // that the absence of an alert may reflect a data gap, not a safe combo.
  const unrecognizedRxcuis = westernMeds
    .filter((med) => !isRxcuiKnown(med.rxcui))
    .map((med) => med.rxcui);

  // ── Step 2: Resolve herb IDs to check ────────────────────────────────────
  let herbIdsToCheck: string[];
  let resolvedFormula: FormulaIdentity | undefined;

  if (tcmInput.type === "herb") {
    herbIdsToCheck = [tcmInput.herbId];
  } else {
    const resolved = resolveFormula(tcmInput.formulaId);
    if (!resolved) {
      // Unknown formula — return empty result with explanation
      return {
        worstSeverity: "none",
        worstSeverityColor: "green",
        matches: [],
        checkedWithNoInteraction: [],
        unrecognizedRxcuis,
        checkedAt: new Date().toISOString(),
        disclaimer: DISCLAIMER,
      };
    }
    resolvedFormula = resolved.formula;
    herbIdsToCheck = resolved.herbIds;
  }

  // ── Step 3: Cross-reference each herb against each western med ────────────
  // Build a lookup map of herb → its interactions, for formula breakdown
  const herbInteractionMap: Map<string, InteractionMatch[]> = new Map();

  for (const herbId of herbIdsToCheck) {
    const herbMatches: InteractionMatch[] = [];

    for (const med of westernMeds) {
      const match = lookupInteraction(herbId, med.rxcui);
      if (match) {
        const enriched: InteractionMatch = {
          ...match,
          fromFormula: tcmInput.type === "formula",
          sourceFormula: resolvedFormula,
        };
        herbMatches.push(enriched);
        matches.push(enriched);
      }
    }

    if (herbMatches.length === 0) {
      checkedWithNoInteraction.push(herbId);
    }

    herbInteractionMap.set(herbId, herbMatches);
  }

  // ── Step 4: Sort matches — worst severity first, then by evidence level ──
  const evidenceRank: Record<EvidenceLevel, number> = { high: 2, medium: 1, low: 0 };
  matches.sort((a, b) => {
    const severityDiff = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    if (severityDiff !== 0) return severityDiff;
    return evidenceRank[b.evidenceLevel] - evidenceRank[a.evidenceLevel];
  });

  // ── Step 5: Determine worst overall severity ───────────────────────────
  const worstSeverity = matches.reduce<SeverityLevel>(
    (worst, m) => escalateSeverity(worst, m.severity),
    "none"
  );

  // ── Step 6: Build formula breakdown (enables expand-to-see-ingredient UI) ─
  if (tcmInput.type === "formula" && resolvedFormula) {
    const herbs: FormulaHerbDetail[] = herbIdsToCheck.map((herbId) => {
      const herbMatches = herbInteractionMap.get(herbId) ?? [];

      // Primary source: herbLibrary — guarantees full data for every herb,
      // including safe ones that have no interaction match.
      // Fallback chain: herbLibrary → interaction record → bare id string.
      const libraryHerb = lookupHerbById(herbId);
      const richHerb = libraryHerb ?? herbMatches[0]?.herb ?? null;

      return {
        herbId,
        pinyin:      richHerb?.pinyin      ?? herbId,
        latin:       richHerb?.latin       ?? "",
        english:     richHerb?.english     ?? "",
        nccaom_code: richHerb?.nccaom_code ?? "",
        hasInteraction: herbMatches.length > 0,
        interactions: herbMatches,
      };
    });

    const flaggedHerbCount = herbs.filter((h) => h.hasInteraction).length;

    formulaBreakdown = {
      formula: resolvedFormula,
      herbs,
      flaggedHerbCount,
      totalHerbCount: herbs.length,
    };
  }

  return {
    worstSeverity,
    worstSeverityColor: severityToColor(worstSeverity),
    matches,
    formulaBreakdown,
    checkedWithNoInteraction,
    unrecognizedRxcuis,
    checkedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };
}

// ---------------------------------------------------------------------------
// Utility exports (for use in UI components)
// ---------------------------------------------------------------------------

/** Human-readable label for each severity level */
export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  contraindicated: "Contraindicated",
  precaution: "Monitor Closely",
  none: "No Known Interaction",
};

/** Tailwind CSS color classes for severity badges */
export const SEVERITY_STYLES: Record<SeverityLevel, { bg: string; text: string; border: string }> = {
  contraindicated: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  precaution: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  none: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
};

/** Emoji icon for each severity level */
export const SEVERITY_ICONS: Record<SeverityLevel, string> = {
  contraindicated: "🔴",
  precaution: "🟡",
  none: "🟢",
};
