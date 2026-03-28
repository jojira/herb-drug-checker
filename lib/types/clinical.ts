// lib/types/clinical.ts
// Single source of truth for all shared types.
// Import from here everywhere — do not redefine types in individual files.

export type TrustTier = "gold" | "silver" | "unresolved";

export type DataSource = "natmed" | "stockleys" | "mock";

export type SeverityLevel = "contraindicated" | "precaution" | "none";

export type EvidenceLevel = "high" | "medium" | "low";

// ── Herb Identity ──────────────────────────────────────────────

export type HerbIdentity = {
  id: string;
  pinyin: string;
  latin: string;
  english: string;
  nccaom_code: string | null;    // null for Silver and Unresolved
  trustTier: TrustTier;
  source: "nccaom_verified" | "tcmbank_research" | "unresolved";
  tcmbank_id?: string;           // TCMBank internal ID if applicable
  active_constituent?: string;
  // Energetics — present for Gold, partial for Silver, absent for Unresolved
  taste?: string[];
  temperature?: string;
  channels?: string[];
  properties?: string[];
  tcm_cautions?: string;
  discontinued?: boolean;        // true = discontinued in modern practice (e.g. heavy metals)
  restricted?: boolean;          // true = CITES restricted or controlled substance
  // Resolution metadata
  resolved: boolean;
  tcmbank_name?: string;         // original name if unresolved
};

// ── Drug Identity ──────────────────────────────────────────────

export type DrugIdentity = {
  rxcui: string;
  name: string;
  brand_names: string[];
  drug_class: string;
};

// ── Formula Identity ───────────────────────────────────────────

export type FormulaIdentity = {
  id: string;
  pinyin: string;
  english: string;
  source: "nccaom" | "tcmbank_research";
  trustTier: TrustTier;
  resolutionRate: number;        // 0.0–1.0, always 1.0 for Gold
  herb_ids: string[];
};

// ── Search API Contract ────────────────────────────────────────

export type TCMSearchResultItem = {
  type: "herb" | "formula";
  id: string;
  pinyin: string;
  english: string;
  latin?: string;                // herbs only
  nccaom_code: string | null;
  trustTier: TrustTier;
  source: string;
  score: number;                 // Fuse.js score, lower = better match
  // Herb-specific
  active_constituent?: string;
  // Formula-specific
  herb_count?: number;
  resolution_rate?: number;
};

export type TCMSearchResponse = {
  api_version: "3.0";
  results: TCMSearchResultItem[];
  searchedFallback: boolean;
  query: string;
  total: number;
  meta: {
    herbCount: number;
    formulaCount: number;
    goldFormulaCount: number;
    silverFormulaCount: number;
    dataSource: "base" | "expanded";
  };
  disclaimer: string;
};

// ── Interaction Types ──────────────────────────────────────────

export type Citation = {
  title: string;
  journal?: string;
  year?: number;
  url?: string;
};

export type InteractionMatch = {
  interactionId: string;
  herb: HerbIdentity;
  drug: DrugIdentity;
  severity: SeverityLevel;
  severityColor: "red" | "yellow" | "green";
  mechanism: string;
  clinicalSummary: string;
  evidenceLevel: EvidenceLevel;
  evidenceNotes: string;
  citations: Citation[];
  sources: DataSource[];
  confidence: "high" | "medium" | "low";
  fromFormula: boolean;
  sourceFormula?: FormulaIdentity;
};

export type FormulaHerbDetail = {
  herbId: string;
  pinyin: string;
  latin: string;
  english: string;
  nccaom_code: string | null;
  trustTier: TrustTier;
  resolved: boolean;
  hasInteraction: boolean;
  interactions: InteractionMatch[];
  tcmbank_name?: string;
  // Energetics for TCM panel
  taste?: string[];
  temperature?: string;
  channels?: string[];
  properties?: string[];
  tcm_cautions?: string;
  /**
   * True when this herb has been excluded from the formula check via the
   * Modification Toggle. Excluded herbs are shown in the UI but not counted
   * toward severity or matches.
   */
  excluded?: boolean;
};

export type InteractionEngineResult = {
  worstSeverity: SeverityLevel;
  worstSeverityColor: "red" | "yellow" | "green";
  /** All matched interactions, sorted by severity (worst first) */
  matches: InteractionMatch[];
  /** Herbs with trustTier "unresolved" — identity unknown, no interaction data */
  unresolvedHerbs: FormulaHerbDetail[];
  hasUnresolvedHerbs: boolean;
  /** Present only when input was a formula */
  formulaBreakdown?: {
    formula: FormulaIdentity;
    herbs: FormulaHerbDetail[];
    flaggedHerbCount: number;
    totalHerbCount: number;
    unresolvedCount: number;
  };
  /** Herb IDs that were checked and had no interactions */
  checkedWithNoInteraction: string[];
  checkedAt: string;
  disclaimer: string;
  dataStatus: "mock_unverified" | "verified";
  dataFreshness?: DataFreshness;
};

// ── Engine Input Types ─────────────────────────────────────────

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

export type CheckInteractionsOptions = {
  excludedHerbIds?: string[];
};

// ── Drug-Drug Interaction Types ────────────────────────────────

export type DrugDrugInteraction = {
  severity: "high" | "moderate" | "low";
  description: string;
  drug1: { rxcui: string; name: string };
  drug2: { rxcui: string; name: string };
  source: "rxnorm" | "fda_label";
};

export type DrugDrugCheckResult = {
  interactions: DrugDrugInteraction[];
  checkedAt: string;
  pairsChecked: number;
  source: "rxnorm" | "fda_label";
  disclaimer: string;
};

// ── Feedback Widget ────────────────────────────────────────────

export type FeedbackType =
  | "data_accuracy"
  | "ui_bug"
  | "feature_request"
  | "general_praise";

export type FeedbackPayload = {
  type: FeedbackType;
  message: string;
  context: {
    url: string;
    timestamp: string;
    activeRxcuis: string[];    // rxcuis of current selected drugs
    activeHerbId: string | null;  // current selected herb/formula id
    appVersion: string;
  };
};

// ── Live API Data Freshness ─────────────────────────────────────

export type ClinicalDataSourceName =
  "mock" | "natmed" | "stockleys" | "combined";

export type CacheStatus = "hit" | "miss" | "expired" | "bypassed";

export type DataFreshness = {
  source: ClinicalDataSourceName;
  cachedAt: string | null;        // ISO 8601, null if not cached
  expiresAt: string | null;       // ISO 8601, null if not cached
  cacheStatus: CacheStatus;
  degradedMode: boolean;          // true if cache expired + API unreachable
  lastUpdatedDisplay: string;     // human-readable: "Updated 2 hours ago"
};
