import { NextRequest, NextResponse } from "next/server";
import type { DrugDrugInteraction, DrugDrugCheckResult } from "@/lib/types/clinical";

const DISCLAIMER =
  "Drug interaction data sourced from FDA drug labels via openFDA. " +
  "Severity ratings are not graded — consult a pharmacist for complete interaction assessment.";

// ---------------------------------------------------------------------------
// OpenFDA drug label response types
// ---------------------------------------------------------------------------

type FdaLabelResult = {
  drug_interactions?: string[];
  openfda?: {
    generic_name?: string[];
    brand_name?: string[];
  };
};

type FdaLabelResponse = {
  results?: FdaLabelResult[];
  error?: { code: string; message: string };
};

// ---------------------------------------------------------------------------
// Step 1: Resolve a display name from RxNorm properties endpoint.
// Returns null if unreachable — callers fall back to raw rxcui string.
// ---------------------------------------------------------------------------

type RxNormProperties = {
  properties?: { name?: string };
};

async function resolveNameFromRxNorm(rxcui: string): Promise<string | null> {
  try {
    const url = `https://rxnav.nlm.nih.gov/REST/rxcui/${encodeURIComponent(rxcui)}/properties.json`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data: RxNormProperties = await res.json();
    return data.properties?.name ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Step 2: Fetch the FDA label for a drug by its RxCUI.
// Returns null if not found or API unreachable.
// ---------------------------------------------------------------------------

async function fetchFdaLabel(rxcui: string): Promise<FdaLabelResult | null> {
  try {
    const url = `https://api.fda.gov/drug/label.json?search=openfda.rxcui:${encodeURIComponent(rxcui)}&limit=1`;
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const data: FdaLabelResponse = await res.json();
    return data.results?.[0] ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Extract the first ~300-char snippet of drug_interactions text that
// contains the target drug name (case-insensitive).
// Returns null if not found.
// ---------------------------------------------------------------------------

function extractInteractionSnippet(
  label: FdaLabelResult | null,
  targetName: string
): string | null {
  const interactionText = label?.drug_interactions?.[0];
  if (!interactionText) return null;

  const lower = interactionText.toLowerCase();
  const idx = lower.indexOf(targetName.toLowerCase());
  if (idx === -1) return null;

  const start = Math.max(0, idx - 50);
  const raw = interactionText.slice(start, start + 300).trim();
  return raw.length < interactionText.length ? raw + "…" : raw;
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

  const ids = rxcuis as string[];
  const pairsChecked = (ids.length * (ids.length - 1)) / 2;
  const interactions: DrugDrugInteraction[] = [];

  // Step 1: resolve all names from RxNorm in parallel
  const resolvedNames = await Promise.all(ids.map(resolveNameFromRxNorm));
  const names = ids.map((id, i) => resolvedNames[i] ?? id);

  // Step 2: fetch FDA labels for all drugs in parallel (by rxcui)
  const labels = await Promise.all(ids.map(fetchFdaLabel));

  // Step 3: check each ordered pair — drug2 name in drug1's interactions text
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const snippet = extractInteractionSnippet(labels[i], names[j]);
      if (snippet) {
        interactions.push({
          severity: "moderate",
          description: snippet,
          drug1: { rxcui: ids[i], name: names[i] },
          drug2: { rxcui: ids[j], name: names[j] },
          source: "fda_label",
        });
      }
    }
  }

  const result: DrugDrugCheckResult = {
    interactions,
    checkedAt: new Date().toISOString(),
    pairsChecked,
    source: "fda_label",
    disclaimer:
      interactions.length === 0
        ? "No interactions detected in FDA drug label text. This does not exclude all clinically significant interactions — consult a pharmacist."
        : DISCLAIMER,
  };

  return NextResponse.json(result);
}
