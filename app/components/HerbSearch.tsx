"use client";

/**
 * HerbSearch.tsx
 *
 * Unified search input for TCM herbs and formulas.
 * Fetches from /api/search/tcm — no herb datasets imported on the client.
 *
 * CLINICAL REQUIREMENT: Exact match logic only.
 * Partial string matching is intentionally excluded — a practitioner must
 * select a verified herb identity, not a guessed one.
 */

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import type { HerbInput, FormulaInput, TCMSearchResultItem, TrustTier } from "@/lib/types/clinical";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HerbSearchSelection =
  | { mode: "herb"; value: HerbInput; display: TCMSearchResultItem }
  | { mode: "formula"; value: FormulaInput; display: TCMSearchResultItem };

type Props = {
  onSelect: (selection: HerbSearchSelection) => void;
  onClear: () => void;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// Trust tier badge
// ---------------------------------------------------------------------------

function TrustBadge({ tier, nccaomCode }: { tier: TrustTier; nccaomCode: string | null }) {
  if (tier === "gold" && nccaomCode) {
    return (
      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border text-teal-600 bg-teal-50 border-teal-100">
        {nccaomCode}
      </span>
    );
  }
  if (tier === "silver") {
    return (
      <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border text-slate-500 bg-slate-100 border-slate-200">
        Research
      </span>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="px-4 py-1.5 bg-slate-50 border-b border-slate-100">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</span>
    </div>
  );
}

function HerbSuggestionRow({
  item,
  onSelect,
}: {
  item: TCMSearchResultItem;
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
          {item.pinyin}
        </span>
        <TrustBadge tier={item.trustTier} nccaomCode={item.nccaom_code} />
      </div>
      <div className="flex items-baseline gap-2 mt-0.5">
        {item.latin && <span className="text-xs italic text-slate-500">{item.latin}</span>}
        {item.latin && item.english && <span className="text-xs text-slate-400">·</span>}
        {item.english && <span className="text-xs text-slate-400">{item.english}</span>}
      </div>
    </button>
  );
}

function FormulaSuggestionRow({
  item,
  onSelect,
}: {
  item: TCMSearchResultItem;
  onSelect: () => void;
}) {
  const herbCount = item.herb_count ?? 0;
  const resolutionRate = item.resolution_rate ?? 1.0;
  const showResolution = resolutionRate < 1.0 && herbCount > 0;

  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors group"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-slate-800 text-sm group-hover:text-teal-700 transition-colors">
          {item.pinyin}
        </span>
        <div className="flex items-center gap-1.5">
          {item.trustTier === "silver" && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border text-slate-500 bg-slate-100 border-slate-200">
              Research
            </span>
          )}
          <span className="text-xs text-slate-400 flex-shrink-0">
            {showResolution
              ? `${Math.round(resolutionRate * herbCount)} of ${herbCount} herbs`
              : `${herbCount} herbs`}
          </span>
        </div>
      </div>
      <span className="text-xs text-slate-500">{item.english}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HerbSearch({ onSelect, onClear, disabled = false }: Props) {
  const [query, setQuery] = useState("");
  const [searchState, setSearchState] = useState<{
    suggestions: TCMSearchResultItem[];
    searchedFallback: boolean;
    fetchError: boolean;
    forQuery: string;
  }>({ suggestions: [], searchedFallback: false, fetchError: false, forQuery: "" });
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<HerbSearchSelection | null>(null);
  const [exactMatchError, setExactMatchError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Results are fresh only when the query hasn't changed and no item is selected.
  // Deriving this avoids synchronous setState calls in the effect early-return.
  // useMemo stabilizes the array reference so it doesn't invalidate useCallback deps each render.
  const isResultFresh = !selected && query.length >= 2 && searchState.forQuery === query;
  const activeSuggestions = useMemo(
    () => (isResultFresh ? searchState.suggestions : []),
    [isResultFresh, searchState.suggestions]
  );
  const activeSearchedFallback = isResultFresh ? searchState.searchedFallback : false;
  const activeFetchError = isResultFresh ? searchState.fetchError : false;

  // Debounced fetch — 350ms to reduce server load
  useEffect(() => {
    if (selected || query.length < 2) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (abortRef.current) abortRef.current.abort();

    debounceRef.current = setTimeout(() => {
      const controller = new AbortController();
      abortRef.current = controller;

      fetch(`/api/search/tcm?q=${encodeURIComponent(query)}`, {
        signal: controller.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error("Search error");
          return res.json() as Promise<{
            results: TCMSearchResultItem[];
            searchedFallback: boolean;
          }>;
        })
        .then((data) => {
          setSearchState({
            suggestions: data.results ?? [],
            searchedFallback: data.searchedFallback ?? false,
            fetchError: false,
            forQuery: query,
          });
        })
        .catch((err: Error) => {
          if (err.name !== "AbortError") {
            setSearchState({
              suggestions: [],
              searchedFallback: false,
              fetchError: true,
              forQuery: query,
            });
          }
        });
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const handleSelectItem = useCallback(
    (item: TCMSearchResultItem) => {
      const selection: HerbSearchSelection =
        item.type === "herb"
          ? {
              mode: "herb",
              value: { type: "herb", herbId: item.id },
              display: item,
            }
          : {
              mode: "formula",
              value: { type: "formula", formulaId: item.id },
              display: item,
            };
      setSelected(selection);
      setQuery(item.pinyin);
      setOpen(false);
      setExactMatchError(false);
      onSelect(selection);
    },
    [onSelect]
  );

  // On blur: if exactly one suggestion is present and the query matches any of
  // its name fields (case-insensitive), auto-confirm. Otherwise show error.
  const handleBlur = useCallback(() => {
    setOpen(false);
    if (!selected && query.length >= 2) {
      const q = query.trim().toLowerCase();
      const exactMatch = activeSuggestions.find(
        (item) =>
          item.pinyin.toLowerCase() === q ||
          (item.latin ?? "").toLowerCase() === q ||
          item.english.toLowerCase() === q ||
          (item.nccaom_code ?? "").toLowerCase() === q ||
          item.id.toLowerCase() === q
      );
      if (exactMatch) {
        handleSelectItem(exactMatch);
      } else if (activeSuggestions.length === 1) {
        // Single result — auto-confirm (practitioner typed the full name)
        handleSelectItem(activeSuggestions[0]);
      } else {
        setExactMatchError(true);
      }
    }
  }, [selected, query, activeSuggestions, handleSelectItem]);

  const handleClear = useCallback(() => {
    setQuery("");
    setSelected(null);
    setSearchState({ suggestions: [], searchedFallback: false, fetchError: false, forQuery: "" });
    setExactMatchError(false);
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  const herbSuggestions = activeSuggestions.filter((s) => s.type === "herb");
  const formulaSuggestions = activeSuggestions.filter((s) => s.type === "formula");
  const hasSuggestions = activeSuggestions.length > 0;
  const showDropdown = open && !selected && hasSuggestions;
  const showNoResults =
    open && !selected && query.length >= 2 && !hasSuggestions && !activeFetchError;

  return (
    <div ref={containerRef} className="w-full">
      {/* Input */}
      <div
        className={`
          relative rounded-lg border-2 transition-all bg-white
          ${exactMatchError ? "border-red-300" : selected ? "border-teal-500" : "border-slate-200 focus-within:border-teal-400"}
          ${disabled ? "opacity-50" : ""}
        `}
      >
        <div className="flex items-center px-3 gap-2">
          <span className="text-slate-400 text-base flex-shrink-0" aria-hidden>
            {selected?.mode === "formula" ? "⬡" : "🌿"}
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled}
            placeholder="Herb or formula — Pinyin, Latin, or English…"
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setOpen(true);
              setExactMatchError(false);
            }}
            onFocus={() => { if (!selected) setOpen(true); }}
            onBlur={handleBlur}
            role="combobox"
            aria-label="Search for a TCM herb or formula"
            aria-expanded={showDropdown}
            aria-controls="herb-search-listbox"
            aria-autocomplete="list"
            className="flex-1 py-3 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />

          {selected && (
            <button
              type="button"
              onClick={handleClear}
              aria-label="Clear selection"
              className="flex-shrink-0 text-slate-400 hover:text-slate-600 text-lg leading-none transition-colors"
            >
              ×
            </button>
          )}
        </div>

        {/* Selected pill */}
        {selected && (
          <div className="px-3 pb-2.5 pt-0">
            {selected.mode === "herb" ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                {selected.display.nccaom_code ? (
                  <span className="font-mono text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                    {selected.display.nccaom_code}
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                    Research
                  </span>
                )}
                {selected.display.latin && (
                  <span className="italic text-slate-500">{selected.display.latin}</span>
                )}
                {selected.display.latin && selected.display.english && (
                  <span className="text-slate-400">·</span>
                )}
                <span className="text-slate-500">{selected.display.english}</span>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                {selected.display.herb_count ?? 0} constituent herbs ·{" "}
                <span className="italic">{selected.display.english}</span>
              </div>
            )}
          </div>
        )}

        {/* Dropdown — herbs and formulas grouped */}
        {showDropdown && (
          <div
            id="herb-search-listbox"
            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-80 overflow-y-auto"
            role="listbox"
            aria-label="Search suggestions"
          >
            {/* Fallback notice */}
            {activeSearchedFallback && (
              <div className="px-4 py-2 bg-amber-50 border-b border-amber-100">
                <p className="text-[10px] text-amber-700">
                  ⚠ No NCCAOM-verified result found. Showing TCMBank research data.
                </p>
              </div>
            )}

            {herbSuggestions.length > 0 && (
              <>
                <SectionHeader label="Single Herbs" />
                {herbSuggestions.map((item) => (
                  <HerbSuggestionRow
                    key={item.id}
                    item={item}
                    onSelect={() => handleSelectItem(item)}
                  />
                ))}
              </>
            )}
            {formulaSuggestions.length > 0 && (
              <>
                <SectionHeader label="Formulas" />
                {formulaSuggestions.map((item) => (
                  <FormulaSuggestionRow
                    key={item.id}
                    item={item}
                    onSelect={() => handleSelectItem(item)}
                  />
                ))}
              </>
            )}
          </div>
        )}

        {/* No results */}
        {showNoResults && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3">
            <p className="text-xs text-slate-500">
              No herbs or formulas found. Try Pinyin, Latin, or English name.
            </p>
          </div>
        )}

        {/* Fetch error */}
        {activeFetchError && open && !selected && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-red-200 rounded-lg shadow-lg px-4 py-3">
            <p className="text-xs text-red-500">
              Search unavailable. Please check your connection and try again.
            </p>
          </div>
        )}
      </div>

      {/* Exact match error */}
      {exactMatchError && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1" role="alert">
          <span aria-hidden>⚠</span>
          Please select a verified herb or formula from the list. Free-text entries are not accepted for clinical safety.
        </p>
      )}

      {/* Hint */}
      {!selected && !exactMatchError && (
        <p className="mt-1.5 text-xs text-slate-400">
          Select from suggestions to confirm. Formulas will expand all constituent herbs.
        </p>
      )}
    </div>
  );
}
