"use client";

/**
 * DrugSearch.tsx
 *
 * Autocomplete search for Western pharmaceutical medications.
 * Calls the /api/search/drugs route, which proxies to RxNorm and falls
 * back to mock data when the API is unavailable.
 *
 * Supports adding multiple medications to a list (patients often take
 * several drugs — checking one at a time is insufficient clinically).
 */

import { useState, useRef, useEffect, useCallback } from "react";
import type { WesternMed } from "@/lib/types/clinical";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type DrugSuggestion = {
  rxcui: string;
  name: string;
  brand_names: string[];
  drug_class?: string;
};

type Props = {
  onMedsChange: (meds: WesternMed[]) => void;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DrugSuggestionRow({
  drug,
  onSelect,
}: {
  drug: DrugSuggestion;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors group"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-slate-800 text-sm group-hover:text-teal-700 transition-colors">
          {drug.name}
        </span>
        {drug.drug_class && (
          <span className="text-[10px] font-medium tracking-wide uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded flex-shrink-0">
            {drug.drug_class}
          </span>
        )}
      </div>
      {drug.brand_names.length > 0 && (
        <p className="text-xs text-slate-500 mt-0.5">
          {drug.brand_names.join(", ")}
        </p>
      )}
      <p className="text-[10px] font-mono text-slate-400 mt-0.5">RxCUI: {drug.rxcui}</p>
    </button>
  );
}

function MedPill({
  med,
  onRemove,
  disabled,
}: {
  med: WesternMed & { brand_names?: string[]; drug_class?: string };
  onRemove: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-800 text-white text-xs rounded-full pl-3 pr-1.5 py-1 group">
      <span className="font-medium">{med.name}</span>
      {med.brand_names && med.brand_names.length > 0 && (
        <span className="text-slate-400 text-[10px]">({med.brand_names[0]})</span>
      )}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove ${med.name}`}
        className="ml-0.5 w-4 h-4 flex items-center justify-center rounded-full bg-slate-600 hover:bg-red-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span aria-hidden className="text-[10px] leading-none">×</span>
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DrugSearch({ onMedsChange, disabled = false }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<DrugSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [meds, setMeds] = useState<(WesternMed & { brand_names: string[]; drug_class?: string })[]>([]);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSuggestions([]);
      setError(null);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/search/drugs?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();
        setSuggestions(data.results ?? []);
        setOpen(true);
      } catch {
        setError("Unable to reach drug database. Check your connection.");
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 280);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleSelect = useCallback((drug: DrugSuggestion) => {
    // Don't add duplicates
    if (meds.some((m) => m.rxcui === drug.rxcui)) {
      setQuery("");
      setOpen(false);
      return;
    }
    const updated = [
      ...meds,
      { rxcui: drug.rxcui, name: drug.name, brand_names: drug.brand_names, drug_class: drug.drug_class },
    ];
    setMeds(updated);
    onMedsChange(updated.map(({ rxcui, name }) => ({ rxcui, name })));
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  }, [meds, onMedsChange]);

  const handleRemove = useCallback((rxcui: string) => {
    const updated = meds.filter((m) => m.rxcui !== rxcui);
    setMeds(updated);
    onMedsChange(updated.map(({ rxcui, name }) => ({ rxcui, name })));
  }, [meds, onMedsChange]);

  const maxReached = meds.length >= 10;

  return (
    <div ref={containerRef} className="w-full">
      {/* Current med pills */}
      {meds.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2.5" role="list" aria-label="Selected medications">
          {meds.map((med) => (
            <div key={med.rxcui} role="listitem">
              <MedPill
                med={med}
                onRemove={() => handleRemove(med.rxcui)}
                disabled={disabled}
              />
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className={`
        relative rounded-lg border-2 transition-all bg-white
        ${error ? "border-red-300" : "border-slate-200 focus-within:border-teal-400"}
        ${disabled || maxReached ? "opacity-50" : ""}
      `}>
        <div className="flex items-center px-3 gap-2">
          <span className="text-slate-400 text-base flex-shrink-0" aria-hidden>
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-slate-300 border-t-teal-500 rounded-full animate-spin" />
            ) : "💊"}
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled || maxReached}
            placeholder={
              maxReached
                ? "Maximum 10 medications reached"
                : meds.length > 0
                ? "Add another medication…"
                : "Generic or brand name (e.g. Warfarin, Coumadin)…"
            }
            onChange={(e) => {
              setQuery(e.target.value);
              if (!e.target.value) setOpen(false);
            }}
            onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
            role="combobox"
            aria-label="Search for a western medication"
            aria-expanded={open && suggestions.length > 0}
            aria-controls="drug-search-listbox"
            aria-autocomplete="list"
            className="flex-1 py-3 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />

          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setSuggestions([]); setOpen(false); }}
              aria-label="Clear drug search"
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 text-lg leading-none transition-colors"
            >
              ×
            </button>
          )}
        </div>

        {/* Dropdown */}
        {open && suggestions.length > 0 && (
          <div
            id="drug-search-listbox"
            className="absolute z-[100] left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-72 overflow-y-auto"
            role="listbox"
            aria-label="Drug search results"
          >
            {suggestions.map((drug) => {
              const alreadyAdded = meds.some((m) => m.rxcui === drug.rxcui);
              return (
                <div key={drug.rxcui} className={alreadyAdded ? "opacity-40 pointer-events-none" : ""}>
                  <DrugSuggestionRow drug={drug} onSelect={() => handleSelect(drug)} />
                </div>
              );
            })}
          </div>
        )}

        {/* No results */}
        {open && !loading && query.length >= 2 && suggestions.length === 0 && !error && (
          <div className="absolute z-[100] left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3">
            <p className="text-xs text-slate-500">
              No medications found for &ldquo;{query}&rdquo;. Try the generic name.
            </p>
          </div>
        )}
      </div>

      {/* Error state */}
      {error && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1" role="alert">
          <span aria-hidden>⚠</span> {error}
        </p>
      )}

      {/* Helper text */}
      {!error && (
        <p className="mt-1.5 text-xs text-slate-400">
          {meds.length === 0
            ? "Search by generic or brand name. Multiple medications can be added."
            : `${meds.length} medication${meds.length > 1 ? "s" : ""} added. All will be cross-referenced.`}
        </p>
      )}
    </div>
  );
}
