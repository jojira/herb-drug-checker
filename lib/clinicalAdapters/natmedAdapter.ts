/**
 * lib/clinicalAdapters/natmedAdapter.ts
 *
 * Adapter for Natural Medicines Comprehensive Database (NatMed Pro).
 * API docs: https://naturalmedicines.therapeuticresearch.com/api
 *
 * STATUS: Scaffolded — awaiting API license.
 * All methods return mock-passthrough until NATMED_API_KEY is set.
 */

import type { ClinicalAdapter } from "./types";
import type { InteractionMatch, WesternMed, HerbIdentity } from "@/lib/types/clinical";
import { ClinicalAdapterError } from "./types";

const BASE_URL =
  process.env.NATMED_API_BASE_URL ??
  "https://api.naturalmedicines.therapeuticresearch.com/v1";
const API_KEY = process.env.NATMED_API_KEY ?? "";

export const natmedAdapter: ClinicalAdapter = {
  name: "natmed",

  async isAvailable(): Promise<boolean> {
    if (!API_KEY) return false;
    try {
      const res = await fetch(`${BASE_URL}/health`, {
        headers: { Authorization: `Bearer ${API_KEY}` },
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async fetchInteraction(
    herb: HerbIdentity,
    drug: WesternMed
  ): Promise<InteractionMatch[]> {
    if (!API_KEY) {
      // License not yet obtained — return empty, engine uses mock fallback
      return [];
    }

    try {
      // NatMed Pro interaction endpoint
      // Query by latin binomial (herb) and rxcui (drug)
      // Actual endpoint path to be confirmed against NatMed API docs
      const params = new URLSearchParams({
        herb_latin: herb.latin,
        drug_rxcui: drug.rxcui,
        format: "json",
      });

      const res = await fetch(
        `${BASE_URL}/interactions?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!res.ok) {
        throw new ClinicalAdapterError(
          "natmed",
          res.status,
          `API returned ${res.status}: ${res.statusText}`
        );
      }

      const data = await res.json();

      // TODO: Map NatMed response schema to InteractionMatch[]
      // This mapping must be implemented once API docs are confirmed
      // and a test account is available.
      console.warn("[natmedAdapter] Response mapping not yet implemented");
      return mapNatMedResponse(data, herb, drug);
    } catch (err) {
      if (err instanceof ClinicalAdapterError) throw err;
      throw new ClinicalAdapterError(
        "natmed",
        null,
        err instanceof Error ? err.message : "Unknown error"
      );
    }
  },
};

/**
 * mapNatMedResponse
 *
 * Maps NatMed Pro API response to InteractionMatch[].
 * STUB — implement once API license and docs are available.
 * Returns empty array until implemented to fail safely.
 */
function mapNatMedResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _data: any,
  _herb: HerbIdentity,
  _drug: WesternMed
): InteractionMatch[] {
  // TODO: implement mapping
  // Expected NatMed fields (verify against docs):
  //   data.interactions[].severity     → map to SeverityLevel
  //   data.interactions[].mechanism    → mechanism field
  //   data.interactions[].description  → clinicalSummary field
  //   data.interactions[].references[] → citations field
  //   data.interactions[].rating       → evidenceLevel field
  return [];
}
