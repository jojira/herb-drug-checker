import { NextRequest, NextResponse } from "next/server";
import mockInteractions from "@/data/mockInteractions.json";

const DISCLAIMER =
  "This tool is for educational and professional reference only. " +
  "It does not replace clinical judgment or consultation with a pharmacist. " +
  "Interaction severity may vary based on dosage and herb-to-drug ratio. " +
  "Standard clinical dosages are assumed.";

const RXNORM_BASE = "https://rxnav.nlm.nih.gov/REST";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DrugResult = {
  rxcui: string;
  name: string;
  brand_names: string[];
  drug_class: string;
};

// RxNorm approximateTerm response
type ApproximateCandidate = {
  rxcui: string;
  rxaui: string;
  score: string;
  rank: string;
};

type ApproximateTermResponse = {
  approximateGroup?: {
    inputTerm?: string;
    candidate?: ApproximateCandidate[];
  };
};

// RxNorm properties response
type RxNormPropertiesResponse = {
  properties?: {
    rxcui: string;
    name: string;
    synonym: string;
    tty: string;
    language: string;
    suppress: string;
    umlscui: string;
  };
};

// ---------------------------------------------------------------------------
// Mock fallback — filters mockInteractions.json by name or brand name
// ---------------------------------------------------------------------------

function mockFallback(q: string): DrugResult[] {
  const lower = q.toLowerCase();
  const seen = new Set<string>();
  const results: DrugResult[] = [];

  for (const interaction of mockInteractions.interactions) {
    const { drug } = interaction;
    const matches =
      drug.name.toLowerCase().includes(lower) ||
      drug.brand_names.some((b) => b.toLowerCase().includes(lower));

    if (matches && !seen.has(drug.rxcui)) {
      seen.add(drug.rxcui);
      results.push({
        rxcui: drug.rxcui,
        name: drug.name,
        brand_names: drug.brand_names,
        drug_class: drug.drug_class,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// GET /api/search/drugs?q={query}
//
// Uses RxNorm approximateTerm for fuzzy/prefix autocomplete, then enriches
// each candidate with its display name via the properties endpoint.
// Falls back to mock data if RxNorm is unreachable or returns nothing.
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json(
      { error: "Missing required parameter: q" },
      { status: 400 }
    );
  }

  try {
    let results: DrugResult[] = [];
    let rxNormSucceeded = false;

    // ── Attempt live RxNorm approximateTerm lookup ─────────────────────────
    try {
      const approxUrl = `${RXNORM_BASE}/approximateTerm.json?term=${encodeURIComponent(q)}&maxEntries=10`;
      const approxRes = await fetch(approxUrl, {
        next: { revalidate: 3600 },
      });

      if (approxRes.ok) {
        const approxData: ApproximateTermResponse = await approxRes.json();
        const candidates = approxData?.approximateGroup?.candidate ?? [];

        // Deduplicate by rxcui, preserve rank order
        const seen = new Set<string>();
        const uniqueRxcuis: string[] = [];
        for (const candidate of candidates) {
          if (candidate.rxcui && !seen.has(candidate.rxcui)) {
            seen.add(candidate.rxcui);
            uniqueRxcuis.push(candidate.rxcui);
          }
        }

        if (uniqueRxcuis.length > 0) {
          // Enrich each rxcui with its display name in parallel
          const propertyResults = await Promise.all(
            uniqueRxcuis.map(async (rxcui) => {
              const propRes = await fetch(
                `${RXNORM_BASE}/rxcui/${encodeURIComponent(rxcui)}/properties.json`,
                { next: { revalidate: 3600 } }
              );
              if (!propRes.ok) return null;
              const propData: RxNormPropertiesResponse = await propRes.json();
              const props = propData?.properties;
              if (!props?.rxcui || !props?.name) return null;
              return {
                rxcui: props.rxcui,
                name: props.name,
                brand_names: [] as string[],
                drug_class: props.tty ?? "",
              } satisfies DrugResult;
            })
          );

          const enriched = propertyResults.filter(
            (r): r is DrugResult => r !== null
          );

          if (enriched.length > 0) {
            results = enriched;
            rxNormSucceeded = true;
          }
        }
      }
    } catch {
      // RxNorm unreachable — fall through to mock
    }

    // ── Fall back to mock data if RxNorm failed or returned empty ──────────
    if (!rxNormSucceeded) {
      results = mockFallback(q);
    }

    return NextResponse.json({ results, disclaimer: DISCLAIMER });
  } catch (err) {
    console.error("[/api/search/drugs] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
