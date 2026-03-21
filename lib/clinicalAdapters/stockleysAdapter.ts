/**
 * lib/clinicalAdapters/stockleysAdapter.ts
 *
 * Adapter for Stockley's Herbal Medicines Interactions (Pharmaceutical Press).
 * API docs: to be confirmed on license acquisition.
 *
 * STATUS: Scaffolded — awaiting API license.
 * All methods return mock-passthrough until STOCKLEYS_API_KEY is set.
 */

import type { ClinicalAdapter } from "./types";
import type { InteractionMatch, WesternMed, HerbIdentity } from "@/lib/types/clinical";
import { ClinicalAdapterError } from "./types";

const BASE_URL =
  process.env.STOCKLEYS_API_BASE_URL ??
  "https://api.pharmpress.com/stockleys/v1";
const API_KEY = process.env.STOCKLEYS_API_KEY ?? "";

export const stockleysAdapter: ClinicalAdapter = {
  name: "stockleys",

  async isAvailable(): Promise<boolean> {
    if (!API_KEY) return false;
    try {
      const res = await fetch(`${BASE_URL}/health`, {
        headers: { "x-api-key": API_KEY },
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
      const params = new URLSearchParams({
        herb_latin: herb.latin,
        drug_rxcui: drug.rxcui,
      });

      const res = await fetch(
        `${BASE_URL}/herb-drug-interactions?${params.toString()}`,
        {
          headers: {
            "x-api-key": API_KEY,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(10000),
        }
      );

      if (!res.ok) {
        throw new ClinicalAdapterError(
          "stockleys",
          res.status,
          `API returned ${res.status}: ${res.statusText}`
        );
      }

      const data = await res.json();

      // TODO: Map Stockley's response schema to InteractionMatch[]
      // This mapping must be implemented once API docs are confirmed
      // and a test account is available.
      console.warn("[stockleysAdapter] Response mapping not yet implemented");
      return mapStockleysResponse(data, herb, drug);
    } catch (err) {
      if (err instanceof ClinicalAdapterError) throw err;
      throw new ClinicalAdapterError(
        "stockleys",
        null,
        err instanceof Error ? err.message : "Unknown error"
      );
    }
  },
};

/**
 * mapStockleysResponse
 *
 * Maps Stockley's API response to InteractionMatch[].
 * STUB — implement once API license and docs are available.
 * Returns empty array until implemented to fail safely.
 */
function mapStockleysResponse(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _data: any,
  _herb: HerbIdentity,
  _drug: WesternMed
): InteractionMatch[] {
  // TODO: implement mapping
  // Expected Stockley's fields (verify against docs):
  //   data.interactions[].severity_rating → map to SeverityLevel
  //   data.interactions[].mechanism       → mechanism field
  //   data.interactions[].summary         → clinicalSummary field
  //   data.interactions[].references[]    → citations field
  return [];
}
