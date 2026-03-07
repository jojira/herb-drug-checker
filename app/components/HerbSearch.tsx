"use client";

/**
 * HerbSearch.tsx
 *
 * Search input for TCM herbs and formulas.
 *
 * CLINICAL REQUIREMENT: Exact match logic only.
 * Partial string matching is intentionally excluded — a practitioner must
 * select a verified, NCCAOM-standard herb identity, not a guessed one.
 * Matching is case-insensitive across Pinyin, Latin, English, and NCCAOM code.
 *
 * Input mode toggles between single herb and formula.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import herbLibrary from "@/data/herbLibrary.json";
import formulaMap from "@/data/formulaMap.json";
import type { HerbInput, FormulaInput } from "@/logic/interactionEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type HerbEntry = (typeof herbLibrary.herbs)[number];
type FormulaEntry = (typeof formulaMap.formulas)[number];
type SearchMode = "herb" | "formula";

export type HerbSearchSelection =
  | { mode: "herb"; value: HerbInput; display: HerbEntry }
  | { mode: "formula"; value: FormulaInput; display: FormulaEntry };

type Props = {
  onSelect: (selection: HerbSearchSelection) => void;
  onClear: () => void;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// Exact match logic
// CLINICAL REQUIREMENT: Only surface a result when the query exactly matches
// one of the four authoritative name fields. No fuzzy, no partial, no prefix.
// ---------------------------------------------------------------------------

function normalise(s: string) {
  return s.trim().toLowerCase();
}

function exactMatchHerbs(query: string): HerbEntry[] {
  const q = normalise(query);
  if (!q) return [];
  return herbLibrary.herbs.filter(
    (h) =>
      normalise(h.pinyin) === q ||
      normalise(h.latin) === q ||
      normalise(h.english) === q ||
      normalise(h.nccaom_code) === q
  );
}

function exactMatchFormulas(query: string): FormulaEntry[] {
  const q = normalise(query);
  if (!q) return [];
  return formulaMap.formulas.filter(
    (f) =>
      normalise(f.pinyin) === q ||
      normalise(f.english) === q ||
      normalise(f.id) === q
  );
}

// Prefix match for suggestions (shows options while typing, but does not
// auto-select — the user must explicitly click a suggestion to confirm).
function prefixMatchHerbs(query: string): HerbEntry[] {
  const q = normalise(query);
  if (q.length < 2) return [];
  return herbLibrary.herbs
    .filter(
      (h) =>
        normalise(h.pinyin).startsWith(q) ||
        normalise(h.latin).startsWith(q) ||
        normalise(h.english).startsWith(q) ||
        normalise(h.nccaom_code).startsWith(q)
    )
    .slice(0, 8);
}

function prefixMatchFormulas(query: string): FormulaEntry[] {
  const q = normalise(query);
  if (q.length < 2) return [];
  return formulaMap.formulas
    .filter(
      (f) =>
        normalise(f.pinyin).startsWith(q) ||
        normalise(f.english).startsWith(q)
    )
    .slice(0, 6);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function HerbSuggestionRow({ herb, onSelect }: { herb: HerbEntry; onSelect: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors group"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-slate-800 text-sm group-hover:text-teal-700 transition-colors">
          {herb.pinyin}
        </span>
        <span className="text-xs font-mono text-slate-400 flex-shrink-0">{herb.nccaom_code}</span>
      </div>
      <div className="flex items-baseline gap-2 mt-0.5">
        <span className="text-xs italic text-slate-500">{herb.latin}</span>
        <span className="text-xs text-slate-400">·</span>
        <span className="text-xs text-slate-400">{herb.english}</span>
      </div>
      <span className="inline-block mt-1 text-[10px] font-medium tracking-wide uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
        {herb.category}
      </span>
    </button>
  );
}

function FormulaSuggestionRow({ formula, onSelect }: { formula: FormulaEntry; onSelect: () => void }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onSelect(); }}
      className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors group"
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-semibold text-slate-800 text-sm group-hover:text-teal-700 transition-colors">
          {formula.pinyin}
        </span>
        <span className="text-xs text-slate-400 flex-shrink-0">{formula.herb_ids.length} herbs</span>
      </div>
      <span className="text-xs text-slate-500">{formula.english}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function HerbSearch({ onSelect, onClear, disabled = false }: Props) {
  const [mode, setMode] = useState<SearchMode>("herb");
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<HerbEntry[] | FormulaEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<HerbSearchSelection | null>(null);
  const [exactMatchError, setExactMatchError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Recompute suggestions as query changes
  useEffect(() => {
    if (selected || !query) {
      setSuggestions([]);
      setExactMatchError(false);
      return;
    }
    if (mode === "herb") {
      setSuggestions(prefixMatchHerbs(query));
    } else {
      setSuggestions(prefixMatchFormulas(query));
    }
  }, [query, mode, selected]);

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

  const handleModeSwitch = useCallback((newMode: SearchMode) => {
    setMode(newMode);
    setQuery("");
    setSuggestions([]);
    setSelected(null);
    setExactMatchError(false);
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  const handleSelectHerb = useCallback((herb: HerbEntry) => {
    setSelected({ mode: "herb", value: { type: "herb", herbId: herb.id }, display: herb });
    setQuery(herb.pinyin);
    setOpen(false);
    setExactMatchError(false);
    onSelect({ mode: "herb", value: { type: "herb", herbId: herb.id }, display: herb });
  }, [onSelect]);

  const handleSelectFormula = useCallback((formula: FormulaEntry) => {
    setSelected({ mode: "formula", value: { type: "formula", formulaId: formula.id }, display: formula });
    setQuery(formula.pinyin);
    setOpen(false);
    setExactMatchError(false);
    onSelect({ mode: "formula", value: { type: "formula", formulaId: formula.id }, display: formula });
  }, [onSelect]);

  // On blur: if query doesn't exactly match anything, show error and clear
  const handleBlur = useCallback(() => {
    setOpen(false);
    if (!selected && query.length > 0) {
      const exactHerbs = mode === "herb" ? exactMatchHerbs(query) : [];
      const exactFormulas = mode === "formula" ? exactMatchFormulas(query) : [];

      if (mode === "herb" && exactHerbs.length === 1) {
        handleSelectHerb(exactHerbs[0]);
      } else if (mode === "formula" && exactFormulas.length === 1) {
        handleSelectFormula(exactFormulas[0]);
      } else if (query.length >= 2) {
        setExactMatchError(true);
      }
    }
  }, [selected, query, mode, handleSelectHerb, handleSelectFormula]);

  const handleClear = useCallback(() => {
    setQuery("");
    setSelected(null);
    setSuggestions([]);
    setExactMatchError(false);
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  const isHerb = (s: HerbEntry | FormulaEntry): s is HerbEntry => "nccaom_code" in s;

  return (
    <div ref={containerRef} className="w-full">
      {/* Mode toggle */}
      <div className="flex gap-1 mb-2">
        {(["herb", "formula"] as SearchMode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => handleModeSwitch(m)}
            disabled={disabled}
            className={`
              px-3 py-1 rounded text-xs font-semibold tracking-wide uppercase transition-all
              ${mode === m
                ? "bg-teal-700 text-white shadow-sm"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }
              disabled:opacity-40 disabled:cursor-not-allowed
            `}
          >
            {m === "herb" ? "Single Herb" : "Formula"}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className={`
        relative rounded-lg border-2 transition-all bg-white
        ${exactMatchError ? "border-red-300" : selected ? "border-teal-500" : "border-slate-200 focus-within:border-teal-400"}
        ${disabled ? "opacity-50" : ""}
      `}>
        <div className="flex items-center px-3 gap-2">
          {/* Icon */}
          <span className="text-slate-400 text-base flex-shrink-0" aria-hidden>
            {mode === "formula" ? "⬡" : "🌿"}
          </span>

          <input
            ref={inputRef}
            type="text"
            value={query}
            disabled={disabled}
            placeholder={
              mode === "herb"
                ? "Pinyin, Latin, or English name…"
                : "Formula name (Pinyin or English)…"
            }
            onChange={(e) => {
              setQuery(e.target.value);
              setSelected(null);
              setOpen(true);
              setExactMatchError(false);
            }}
            onFocus={() => { if (!selected) setOpen(true); }}
            onBlur={handleBlur}
            aria-label={mode === "herb" ? "Search for a TCM herb" : "Search for a TCM formula"}
            aria-expanded={open && suggestions.length > 0}
            aria-autocomplete="list"
            className="flex-1 py-3 bg-transparent text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
          />

          {/* Selected badge OR clear button */}
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

        {/* Selected herb/formula pill */}
        {selected && (
          <div className="px-3 pb-2.5 pt-0">
            {selected.mode === "herb" ? (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
                <span className="font-mono text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded">
                  {selected.display.nccaom_code}
                </span>
                <span className="italic text-slate-500">{selected.display.latin}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-500">{selected.display.english}</span>
              </div>
            ) : (
              <div className="text-xs text-slate-500">
                {(selected.display as FormulaEntry).herb_ids.length} constituent herbs ·{" "}
                <span className="italic">{(selected.display as FormulaEntry).english}</span>
              </div>
            )}
          </div>
        )}

        {/* Dropdown */}
        {open && !selected && suggestions.length > 0 && (
          <div
            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-72 overflow-y-auto"
            role="listbox"
            aria-label="Search suggestions"
          >
            {suggestions.map((s) =>
              isHerb(s) ? (
                <HerbSuggestionRow key={s.id} herb={s} onSelect={() => handleSelectHerb(s)} />
              ) : (
                <FormulaSuggestionRow key={s.id} formula={s as FormulaEntry} onSelect={() => handleSelectFormula(s as FormulaEntry)} />
              )
            )}
          </div>
        )}

        {/* No suggestions hint */}
        {open && !selected && query.length >= 2 && suggestions.length === 0 && (
          <div className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg px-4 py-3">
            <p className="text-xs text-slate-500">
              No {mode === "herb" ? "herbs" : "formulas"} found. Try Pinyin, Latin, or English name.
            </p>
          </div>
        )}
      </div>

      {/* Exact match error */}
      {exactMatchError && (
        <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1" role="alert">
          <span aria-hidden>⚠</span>
          Please select a verified herb from the list. Free-text entries are not accepted for clinical safety.
        </p>
      )}

      {/* Mode hint */}
      {!selected && !exactMatchError && (
        <p className="mt-1.5 text-xs text-slate-400">
          {mode === "herb"
            ? "Exact match required — select from suggestions to confirm."
            : "Selecting a formula will expand all constituent herbs for checking."}
        </p>
      )}
    </div>
  );
}
