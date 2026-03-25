import { NextRequest, NextResponse } from "next/server";
import type { DrugDrugInteraction, DrugDrugCheckResult } from "@/lib/types/clinical";

const DISCLAIMER =
  "Drug-drug interaction data sourced from NIH RxNorm. " +
  "This does not replace clinical pharmacist review.";

// ---------------------------------------------------------------------------
// RxNorm response types
// ---------------------------------------------------------------------------

type RxNormMinConcept = {
  rxcui: string;
  name: string;
};

type RxNormInteractionConcept = {
  minConceptItem: RxNormMinConcept;
};

type RxNormInteractionPair = {
  interactionConcept?: RxNormInteractionConcept[];
  severity?: string;
  description?: string;
};

type RxNormFullInteractionType = {
  interactionPair?: RxNormInteractionPair[];
};

type RxNormFullInteractionTypeGroup = {
  fullInteractionType?: RxNormFullInteractionType[];
};

type RxNormInteractionListResponse = {
  fullInteractionTypeGroup?: RxNormFullInteractionTypeGroup[];
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mapSeverity(raw?: string): "high" | "moderate" | "low" {
  if (!raw) return "low";
  const lower = raw.toLowerCase();
  if (lower === "high") return "high";
  if (lower === "moderate") return "moderate";
  return "low"; // "N/A" or anything else
}

// ---------------------------------------------------------------------------
// POST /api/interactions/drug-drug
// Body: { rxcuis: string[] }
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON in request body" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const { rxcuis } = body as { rxcuis?: unknown };

  if (!Array.isArray(rxcuis) || rxcuis.length < 2) {
    return NextResponse.json(
      { error: "rxcuis must be an array of at least 2 RxCUI strings" },
      { status: 400 }
    );
  }

  if (rxcuis.length > 10) {
    return NextResponse.json(
      { error: "rxcuis must contain 10 or fewer RxCUI strings" },
      { status: 400 }
    );
  }

  const pairsChecked = (rxcuis.length * (rxcuis.length - 1)) / 2;
  const interactions: DrugDrugInteraction[] = [];

  try {
    const joined = (rxcuis as string[]).join("+");
    const url = `https://rxnav.nlm.nih.gov/REST/interaction/list.json?rxcuis=${joined}`;

    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (res.ok) {
      const data: RxNormInteractionListResponse = await res.json();

      const groups = data.fullInteractionTypeGroup ?? [];
      for (const group of groups) {
        const types = group.fullInteractionType ?? [];
        for (const type of types) {
          const pairs = type.interactionPair ?? [];
          for (const pair of pairs) {
            const concepts = pair.interactionConcept ?? [];
            const c0 = concepts[0]?.minConceptItem;
            const c1 = concepts[1]?.minConceptItem;
            if (!c0 || !c1) continue;

            interactions.push({
              severity: mapSeverity(pair.severity),
              description: pair.description ?? "",
              drug1: { rxcui: c0.rxcui, name: c0.name },
              drug2: { rxcui: c1.rxcui, name: c1.name },
              source: "rxnorm",
            });
          }
        }
      }
    }
    // If !res.ok, fall through with empty interactions — degrade gracefully
  } catch {
    // RxNorm unreachable — return empty interactions, not a 500
  }

  const result: DrugDrugCheckResult = {
    interactions,
    checkedAt: new Date().toISOString(),
    pairsChecked,
    source: "rxnorm",
    disclaimer:
      interactions.length === 0
        ? "Drug-drug check unavailable or no interactions found in NIH RxNorm database."
        : DISCLAIMER,
  };

  return NextResponse.json(result);
}
