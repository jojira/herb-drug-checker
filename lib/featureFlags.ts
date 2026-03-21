/**
 * lib/featureFlags.ts
 *
 * Single source of truth for all feature flags.
 * All flags read from environment variables at runtime.
 * Never import this in client components — server-side only.
 */

export type ClinicalDataSource = "mock" | "natmed" | "stockleys" | "combined";

export const FEATURE_FLAGS = {
  /**
   * Controls which data source the interaction engine uses.
   * mock      — uses data/mockInteractions.json (default, safe for development)
   * natmed    — uses NatMed Pro API exclusively
   * stockleys — uses Stockley's API exclusively
   * combined  — queries both, merges results, worst-case severity wins
   */
  clinicalDataSource: (
    process.env.CLINICAL_DATA_SOURCE ?? "mock"
  ) as ClinicalDataSource,

  /**
   * Cache TTL in seconds. Default 86400 (24 hours) per SPEC-004 Amendment 001.
   */
  cacheTtlSeconds: parseInt(
    process.env.CLINICAL_CACHE_TTL_SECONDS ?? "86400",
    10
  ),

  /**
   * Convenience booleans
   */
  get useMockData() {
    return this.clinicalDataSource === "mock";
  },
  get useLiveData() {
    return this.clinicalDataSource !== "mock";
  },
  get useNatMed() {
    return (
      this.clinicalDataSource === "natmed" ||
      this.clinicalDataSource === "combined"
    );
  },
  get useStockleys() {
    return (
      this.clinicalDataSource === "stockleys" ||
      this.clinicalDataSource === "combined"
    );
  },
} as const;
