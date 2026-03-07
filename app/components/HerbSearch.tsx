"use client";

/**
 * HerbSearch.tsx
 *
 * Unified search input for TCM herbs and formulas.
 *
 * CLINICAL REQUIREMENT: Exact match logic only.
 * Partial string matching is intentionally excluded — a practitioner must
 * select a verified, NCCAOM-standard herb identity, not a guessed one.
 * Matching is case-insensitive across Pinyin, Latin, English, and NCCAOM code.
 *
 * A single input surfaces both herbs and formulas grouped in the dropdown.
 * No mode toggle required — practitioners shouldn't need to know in advance
 * whether their input is classified as a single herb or a formula.
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

export type HerbSearchSelection =
  | { mode: "herb"; value: HerbInput; display: HerbEntry }
  | { mode: "formula"; value: FormulaInput; display: FormulaEntry };

type Suggestions = { herbs: HerbEntry[]; formulas: FormulaEntry[] };

type Props = {
  onSelect: (selection: HerbSearchSelection) => void;
  onClear: () => void;
  disabled?: boolean;
};

// ---------------------------------------------------------------------------
// Match logic
// CLINICAL REQUIREMENT: Only surface a result when the query exactly matches
// one of the authoritative name fields. Prefix match is used only for the
// dropdown suggestions — the user must explicitly click to confirm.
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

function hasSuggestions(s: Suggestions) {
  return s.herbs.length > 0 || s.formulas.length > 0;
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
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestions>({ herbs: [], formulas: [] });
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<HerbSearchSelection | null>(null);
  const [exactMatchError, setExactMatchError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Recompute suggestions as query changes — always check both herbs and formulas
  useEffect(() => {
    if (selected || !query) {
      setSuggestions({ herbs: [], formulas: [] });
      setExactMatchError(false);
      return;
    }
    setSuggestions({
      herbs: prefixMatchHerbs(query),
      formulas: prefixMatchFormulas(query),
    });
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

  // On blur: if query exactly matches a single herb or formula, auto-confirm it.
  // If ambiguous or no match, show error.
  const handleBlur = useCallback(() => {
    setOpen(false);
    if (!selected && query.length > 0) {
      const exactHerbs = exactMatchHerbs(query);
      const exactFormulas = exactMatchFormulas(query);

      if (exactHerbs.length === 1 && exactFormulas.length === 0) {
        handleSelectHerb(exactHerbs[0]);
      } else if (exactFormulas.length === 1 && exactHerbs.length === 0) {
        handleSelectFormula(exactFormulas[0]);
      } else if (query.length >= 2) {
        setExactMatchError(true);
      }
    }
  }, [selected, query, handleSelectHerb, handleSelectFormula]);

  const handleClear = useCallback(() => {
    setQuery("");
    setSelected(null);
    setSuggestions({ herbs: [], formulas: [] });
    setExactMatchError(false);
    onClear();
    inputRef.current?.focus();
  }, [onClear]);

  const showDropdown = open && !selected && hasSuggestions(suggestions);
  const showNoResults = open && !selected && query.length >= 2 && !hasSuggestions(suggestions);

  return (
    <div ref={containerRef} className="w-full">
      {/* Input */}
      <div className={`
        relative rounded-lg border-2 transition-all bg-white
        ${exactMatchError ? "border-red-300" : selected ? "border-teal-500" : "border-slate-200 focus-within:border-teal-400"}
        ${disabled ? "opacity-50" : ""}
      `}>
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
            aria-label="Search for a TCM herb or formula"
            aria-expanded={showDropdown}
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

        {/* Dropdown — herbs and formulas grouped */}
        {showDropdown && (
          <div
            className="absolute z-50 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-80 overflow-y-auto"
            role="listbox"
            aria-label="Search suggestions"
          >
            {suggestions.herbs.length > 0 && (
              <>
                <SectionHeader label="Single Herbs" />
                {suggestions.herbs.map((h) => (
                  <HerbSuggestionRow key={h.id} herb={h} onSelect={() => handleSelectHerb(h)} />
                ))}
              </>
            )}
            {suggestions.formulas.length > 0 && (
              <>
                <SectionHeader label="Formulas" />
                {suggestions.formulas.map((f) => (
                  <FormulaSuggestionRow key={f.id} formula={f} onSelect={() => handleSelectFormula(f)} />
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
