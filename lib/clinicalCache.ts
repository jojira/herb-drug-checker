/**
 * lib/clinicalCache.ts
 *
 * Server-side in-memory cache for clinical interaction data.
 * Keyed by "{rxcui}:{latin_binomial}" pairs.
 * TTL controlled by CLINICAL_CACHE_TTL_SECONDS env var.
 *
 * In production this should be replaced with Redis or similar.
 * For v4.0 preview, in-memory is sufficient for single-instance deploy.
 */

import type {
  InteractionMatch,
  DataFreshness,
  ClinicalDataSourceName,
  CacheStatus,
} from "@/lib/types/clinical";
import { FEATURE_FLAGS } from "@/lib/featureFlags";

type CacheEntry = {
  matches: InteractionMatch[];
  cachedAt: number;               // Date.now() timestamp
  source: string;
};

// Module-level cache — persists across requests in Next.js
const cache = new Map<string, CacheEntry>();

export function getCacheKey(rxcui: string, latinBinomial: string): string {
  return `${rxcui}:${latinBinomial.toLowerCase().replace(/\s+/g, "_")}`;
}

export function getCached(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  const ttlMs = FEATURE_FLAGS.cacheTtlSeconds * 1000;
  if (Date.now() - entry.cachedAt > ttlMs) {
    cache.delete(key);
    return null;
  }
  return entry;
}

export function setCached(
  key: string,
  matches: InteractionMatch[],
  source: string
): void {
  cache.set(key, { matches, cachedAt: Date.now(), source });
}

export function buildFreshness(
  cacheEntry: CacheEntry | null,
  cacheStatus: CacheStatus,
  degradedMode: boolean,
  source: string
): DataFreshness {
  const now = Date.now();
  const ttlMs = FEATURE_FLAGS.cacheTtlSeconds * 1000;

  let cachedAt: string | null = null;
  let expiresAt: string | null = null;
  let lastUpdatedDisplay = "Not yet fetched";

  if (cacheEntry) {
    cachedAt = new Date(cacheEntry.cachedAt).toISOString();
    expiresAt = new Date(cacheEntry.cachedAt + ttlMs).toISOString();
    const ageMs = now - cacheEntry.cachedAt;
    const ageMinutes = Math.floor(ageMs / 60000);
    const ageHours = Math.floor(ageMs / 3600000);
    if (ageMinutes < 1) lastUpdatedDisplay = "Updated just now";
    else if (ageMinutes < 60) lastUpdatedDisplay = `Updated ${ageMinutes}m ago`;
    else lastUpdatedDisplay = `Updated ${ageHours}h ago`;
  }

  return {
    source: source as ClinicalDataSourceName,
    cachedAt,
    expiresAt,
    cacheStatus,
    degradedMode,
    lastUpdatedDisplay,
  };
}

export type { CacheEntry };

export function clearCache(): void {
  cache.clear();
}
