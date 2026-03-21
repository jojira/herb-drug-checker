/**
 * lib/clinicalDataService.ts
 *
 * Orchestrates clinical data retrieval based on feature flag.
 * Single entry point for all interaction data — the engine
 * calls this service, never individual adapters directly.
 *
 * Data source selection:
 *   mock      → reads mockInteractions.json (current behavior)
 *   natmed    → NatMed adapter + cache
 *   stockleys → Stockley's adapter + cache
 *   combined  → both adapters, worst-case severity wins, merged citations
 */

import { FEATURE_FLAGS } from "@/lib/featureFlags";
import { getCached, setCached, getCacheKey, buildFreshness } from "@/lib/clinicalCache";
import { natmedAdapter } from "@/lib/clinicalAdapters/natmedAdapter";
import { stockleysAdapter } from "@/lib/clinicalAdapters/stockleysAdapter";
import { ClinicalAdapterError } from "@/lib/clinicalAdapters/types";
import type {
  InteractionMatch,
  WesternMed,
  HerbIdentity,
  DataFreshness,
  SeverityLevel,
  EvidenceLevel,
  DrugIdentity,
  Citation,
  DataSource,
} from "@/lib/types/clinical";

// Mock data import — only used when flag is "mock"
import mockInteractionsRaw from "@/data/mockInteractions.json";

const SEVERITY_RANK: Record<SeverityLevel, number> = {
  contraindicated: 3,
  precaution: 2,
  none: 1,
};

export type ClinicalLookupResult = {
  matches: InteractionMatch[];
  freshness: DataFreshness;
};

export async function lookupInteraction(
  herb: HerbIdentity,
  drug: WesternMed
): Promise<ClinicalLookupResult> {

  // ── Mock path (default) ──────────────────────────────────────
  if (FEATURE_FLAGS.useMockData) {
    const matches = lookupMock(herb, drug);
    return {
      matches,
      freshness: buildFreshness(null, "bypassed", false, "mock"),
    };
  }

  // ── Live API path ────────────────────────────────────────────
  const cacheKey = getCacheKey(drug.rxcui, herb.latin);
  const cached = getCached(cacheKey);

  if (cached) {
    return {
      matches: cached.matches,
      freshness: buildFreshness(cached, "hit", false, cached.source),
    };
  }

  // Cache miss — fetch from live adapters
  const adapters = [];
  if (FEATURE_FLAGS.useNatMed) adapters.push(natmedAdapter);
  if (FEATURE_FLAGS.useStockleys) adapters.push(stockleysAdapter);

  let allMatches: InteractionMatch[] = [];
  let successSource = "";

  for (const adapter of adapters) {
    try {
      const results = await adapter.fetchInteraction(herb, drug);
      allMatches = mergeMatches(allMatches, results);
      successSource = successSource
        ? `${successSource}+${adapter.name}`
        : adapter.name;
    } catch (err) {
      if (err instanceof ClinicalAdapterError) {
        console.error(
          `[clinicalDataService] ${adapter.name} failed:`,
          err.message
        );
      }
    }
  }

  // If all adapters failed — degrade gracefully
  const degradedMode = successSource === "";
  if (degradedMode) {
    console.warn(
      "[clinicalDataService] All adapters failed — returning empty result"
    );
    return {
      matches: [],
      freshness: buildFreshness(null, "expired", true, "combined"),
    };
  }

  // Cache successful result
  setCached(cacheKey, allMatches, successSource);
  const newEntry = getCached(cacheKey);

  return {
    matches: allMatches,
    freshness: buildFreshness(newEntry, "miss", false, successSource),
  };
}

// ---------------------------------------------------------------------------
// Mock lookup — unchanged from original interactionEngine.ts pattern
// Extracted here so it can be deprecated cleanly in v4.0.
// ---------------------------------------------------------------------------

type MockRecord = {
  id: string;
  herb: {
    id: string;
    pinyin: string;
    latin: string;
    english: string;
    nccaom_code: string | null;
  };
  drug: DrugIdentity;
  severity: string;
  severity_color: string;
  mechanism: string;
  clinical_summary: string;
  evidence_level: string;
  evidence_notes: string;
  citations: Citation[];
  sources: string[];
  confidence: string;
};

function lookupMock(
  herb: HerbIdentity,
  drug: WesternMed
): InteractionMatch[] {
  const records = (
    mockInteractionsRaw as { interactions: MockRecord[] }
  ).interactions;

  return records
    .filter((r) => r.herb.id === herb.id && r.drug.rxcui === drug.rxcui)
    .map((r): InteractionMatch => ({
      interactionId: r.id,
      herb,
      drug: r.drug,
      severity: r.severity as SeverityLevel,
      severityColor: r.severity_color as "red" | "yellow" | "green",
      mechanism: r.mechanism,
      clinicalSummary: r.clinical_summary,
      evidenceLevel: r.evidence_level as EvidenceLevel,
      evidenceNotes: r.evidence_notes,
      citations: r.citations,
      sources: r.sources as DataSource[],
      confidence: r.confidence as "high" | "medium" | "low",
      fromFormula: false,
    }));
}

// ---------------------------------------------------------------------------
// mergeMatches — combines results from multiple adapters
// For duplicate herb+drug pairs, worst-case severity wins.
// Citations from both sources are merged.
// ---------------------------------------------------------------------------

function mergeMatches(
  existing: InteractionMatch[],
  incoming: InteractionMatch[]
): InteractionMatch[] {
  const merged = [...existing];
  for (const match of incoming) {
    const existingIdx = merged.findIndex(
      (m) =>
        m.herb.id === match.herb.id && m.drug.rxcui === match.drug.rxcui
    );
    if (existingIdx === -1) {
      merged.push(match);
    } else {
      const existingMatch = merged[existingIdx];
      if (
        SEVERITY_RANK[match.severity] >
        SEVERITY_RANK[existingMatch.severity]
      ) {
        merged[existingIdx] = {
          ...match,
          citations: [...existingMatch.citations, ...match.citations],
        };
      } else {
        merged[existingIdx] = {
          ...existingMatch,
          citations: [...existingMatch.citations, ...match.citations],
        };
      }
    }
  }
  return merged;
}
