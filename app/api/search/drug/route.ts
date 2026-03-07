import { NextRequest, NextResponse } from "next/server";
import mockInteractions from "@/data/mockInteractions.json";

const DISCLAIMER =
  "This tool is for educational and professional reference only. " +
  "It does not replace clinical judgment or consultation with a pharmacist. " +
  "Interaction severity may vary based on dosage and herb-to-drug ratio. " +
  "Standard clinical dosages are assumed.";

type DrugResult = {
  rxcui: string;
  name: string;
  brand_names: string[];
  drug_class: string;
};

// RxNorm response types
type RxNormConceptProperty = {
  rxcui: string;
  name: string;
};

type RxNormConceptGroup = {
  conceptProperties?: RxNormConceptProperty[];
};

type RxNormResponse = {
  drugGroup?: {
    conceptGroup?: RxNormConceptGroup[];
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
// GET /api/search/drug?q={query}
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

    // ── Attempt live RxNorm lookup ─────────────────────────────────────────
    try {
      const rxNormUrl = `https://rxnav.nlm.nih.gov/REST/drugs.json?name=${encodeURIComponent(q)}`;
      const res = await fetch(rxNormUrl, {
        // Cache for 1 hour — drug names don't change frequently
        next: { revalidate: 3600 },
      });

      if (res.ok) {
        const data: RxNormResponse = await res.json();
        const conceptGroups = data?.drugGroup?.conceptGroup ?? [];

        const mapped: DrugResult[] = conceptGroups
          .flatMap((group) => group.conceptProperties ?? [])
          .filter((prop) => prop.rxcui && prop.name)
          .map((prop) => ({
            rxcui: prop.rxcui,
            name: prop.name,
            brand_names: [],
            drug_class: "",
          }));

        if (mapped.length > 0) {
          results = mapped;
          rxNormSucceeded = true;
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
    console.error("[/api/search/drug] Unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
