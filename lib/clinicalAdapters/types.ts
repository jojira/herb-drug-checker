/**
 * lib/clinicalAdapters/types.ts
 *
 * Adapter interface that every clinical data source must implement.
 * NatMed Pro and Stockley's adapters both satisfy this interface.
 * The engine calls the adapter — never the raw API directly.
 */

import type { InteractionMatch, WesternMed, HerbIdentity } from "@/lib/types/clinical";

export interface ClinicalAdapter {
  name: string;

  /**
   * Fetch interactions for a single herb-drug pair.
   * Must return empty array (never throw) if no interaction found.
   * Must throw ClinicalAdapterError on API failure.
   */
  fetchInteraction(
    herb: HerbIdentity,
    drug: WesternMed
  ): Promise<InteractionMatch[]>;

  /**
   * Health check — returns true if the API is reachable.
   * Must resolve within 3 seconds.
   */
  isAvailable(): Promise<boolean>;
}

export class ClinicalAdapterError extends Error {
  constructor(
    public readonly adapterName: string,
    public readonly statusCode: number | null,
    message: string
  ) {
    super(`[${adapterName}] ${message}`);
    this.name = "ClinicalAdapterError";
  }
}
