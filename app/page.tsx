"use client";

import { useState, useCallback, useEffect } from "react";
import HerbSearch from "@/app/components/HerbSearch";
import type { HerbSearchSelection } from "@/app/components/HerbSearch";
import DrugSearch from "@/app/components/DrugSearch";
import InteractionResults from "@/app/components/InteractionResults";
import { checkInteractions } from "@/logic/interactionEngine";
import type { WesternMed, InteractionEngineResult } from "@/logic/interactionEngine";

// ---------------------------------------------------------------------------
// Disclaimer — non-negotiable per CLAUDE.md
// ---------------------------------------------------------------------------

const DISCLAIMER =
  "This tool is for educational and professional reference only. " +
  "It does not replace clinical judgment or consultation with a pharmacist. " +
  "Interaction severity may vary based on dosage and herb-to-drug ratio. " +
  "Standard clinical dosages are assumed.";

// ---------------------------------------------------------------------------
// Skeleton loader — three placeholder cards while isChecking
// ---------------------------------------------------------------------------

function SkeletonLoader() {
  return (
    <div
      className="space-y-4 p-6"
      aria-busy="true"
      aria-label="Loading interaction results"
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-slate-200 overflow-hidden bg-white"
        >
          <div className="h-16 bg-slate-200 animate-pulse" />
          <div className="px-5 py-4 space-y-2">
            <div className="h-3.5 bg-slate-100 animate-pulse rounded w-2/3" />
            <div className="h-3 bg-slate-100 animate-pulse rounded w-1/2" />
            <div className="h-3 bg-slate-100 animate-pulse rounded w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[480px] px-8 py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-teal-50 border-2 border-teal-100 flex items-center justify-center mb-5">
        <span className="text-2xl" aria-hidden>
          🌿
        </span>
      </div>
      <h2 className="text-sm font-semibold text-slate-700 mb-2">
        No interaction check run yet
      </h2>
      <p className="text-sm text-slate-500 leading-relaxed max-w-xs mb-6">
        Add at least one medication and select an herb or formula, then press{" "}
        <span className="font-medium text-slate-600">Check Interactions</span>.
      </p>
      <ol className="text-left space-y-3 max-w-xs w-full">
        {[
          "Search for a Western medication by generic or brand name.",
          "Select a TCM herb by Pinyin, Latin, or English — or choose a formula.",
          "Press Check Interactions to run the cross-reference.",
        ].map((step, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 text-slate-500 font-bold text-[10px] flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span className="text-xs text-slate-500 leading-relaxed">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function HomePage() {
  const [selectedTCM, setSelectedTCM] = useState<HerbSearchSelection | null>(null);
  const [westernMeds, setWesternMeds] = useState<WesternMed[]>([]);
  // originalResult — the result from the last full Check Interactions run
  const [originalResult, setOriginalResult] = useState<InteractionEngineResult | null>(null);
  // modifiedResult — re-run of the engine with herb exclusions applied; null when no exclusions
  const [modifiedResult, setModifiedResult] = useState<InteractionEngineResult | null>(null);
  // excludedHerbIds — set of formula herb IDs the practitioner has unchecked
  const [excludedHerbIds, setExcludedHerbIds] = useState<Set<string>>(new Set());
  const [isChecking, setIsChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Incrementing this key forces HerbSearch and DrugSearch to fully remount on reset
  const [resetKey, setResetKey] = useState(0);

  const canCheck = selectedTCM !== null && westernMeds.length > 0;

  // Re-run the engine whenever herb exclusions change.
  // checkInteractions() is synchronous so no skeleton needed here — the toggle
  // response should feel instant.
  useEffect(() => {
    if (!originalResult || !selectedTCM) return;
    if (excludedHerbIds.size === 0) {
      setModifiedResult(null);
      return;
    }
    const modified = checkInteractions(
      westernMeds,
      selectedTCM.value,
      Array.from(excludedHerbIds)
    );
    setModifiedResult(modified);
  }, [excludedHerbIds, originalResult, selectedTCM, westernMeds]);

  const handleTCMSelect = useCallback((selection: HerbSearchSelection) => {
    setSelectedTCM(selection);
    setOriginalResult(null);
    setModifiedResult(null);
    setExcludedHerbIds(new Set());
    setError(null);
  }, []);

  const handleTCMClear = useCallback(() => {
    setSelectedTCM(null);
    setOriginalResult(null);
    setModifiedResult(null);
    setExcludedHerbIds(new Set());
    setError(null);
  }, []);

  const handleMedsChange = useCallback((meds: WesternMed[]) => {
    setWesternMeds(meds);
    setOriginalResult(null);
    setModifiedResult(null);
    setExcludedHerbIds(new Set());
    setError(null);
  }, []);

  const handleCheck = useCallback(() => {
    if (!canCheck || !selectedTCM) return;
    setIsChecking(true);
    setError(null);
    setOriginalResult(null);
    setModifiedResult(null);
    setExcludedHerbIds(new Set());
    // checkInteractions() is synchronous. Defer via setTimeout so the skeleton
    // renders before the engine runs, giving the UI a visible busy state.
    setTimeout(() => {
      try {
        const engineResult = checkInteractions(westernMeds, selectedTCM.value);
        setOriginalResult(engineResult);
      } catch (err) {
        console.error("Interaction engine error:", err);
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setIsChecking(false);
      }
    }, 0);
  }, [canCheck, selectedTCM, westernMeds]);

  const handleHerbToggle = useCallback((herbId: string, excluded: boolean) => {
    setExcludedHerbIds((prev) => {
      const next = new Set(prev);
      if (excluded) next.add(herbId);
      else next.delete(herbId);
      return next;
    });
  }, []);

  // Clears all exclusions; the useEffect above detects size === 0 and clears modifiedResult
  const handleRestoreFormula = useCallback(() => {
    setExcludedHerbIds(new Set());
  }, []);

  const handleReset = useCallback(() => {
    setSelectedTCM(null);
    setWesternMeds([]);
    setOriginalResult(null);
    setModifiedResult(null);
    setExcludedHerbIds(new Set());
    setError(null);
    setResetKey((k) => k + 1);
  }, []);

  // Show the modified result when exclusions are active; fall back to the original
  const displayResult = modifiedResult ?? originalResult;

  return (
    // App shell: stacked on mobile, side-by-side on md+
    <div className="min-h-screen bg-slate-100 md:flex md:h-screen md:overflow-hidden">

      {/* ================================================================ */}
      {/* LEFT COLUMN — sticky input panel                                  */}
      {/* ================================================================ */}
      <aside className="w-full md:w-[400px] md:flex-shrink-0 md:h-screen md:overflow-y-auto bg-white border-b md:border-b-0 md:border-r border-slate-200 flex flex-col">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 leading-snug">
                Herb–Drug Interaction Checker
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                Clinical reference tool for TCM practitioners — NCCAOM standard
              </p>
            </div>
            <span className="flex-shrink-0 text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full whitespace-nowrap">
              MVP · Mock Data
            </span>
          </div>
        </div>

        {/* Disclaimer — persistent, never hidden */}
        <div
          className="px-6 py-3 bg-amber-50 border-b border-amber-100"
          role="note"
          aria-label="Clinical disclaimer"
        >
          <p className="text-[11px] text-amber-800 leading-relaxed">
            <span className="font-semibold">Disclaimer: </span>
            {DISCLAIMER}
          </p>
        </div>

        {/* Search inputs */}
        <div className="flex-1 px-6 py-5 space-y-7 overflow-y-auto">

          <section aria-labelledby="drug-section-label">
            <h2
              id="drug-section-label"
              className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3"
            >
              Western Medications
            </h2>
            <DrugSearch
              key={`drug-${resetKey}`}
              onMedsChange={handleMedsChange}
              disabled={isChecking}
            />
          </section>

          <section aria-labelledby="tcm-section-label">
            <h2
              id="tcm-section-label"
              className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3"
            >
              TCM Herb or Formula
            </h2>
            <HerbSearch
              key={`herb-${resetKey}`}
              onSelect={handleTCMSelect}
              onClear={handleTCMClear}
              disabled={isChecking}
            />
          </section>

        </div>

        {/* Action buttons + status */}
        <div className="px-6 py-5 border-t border-slate-100 space-y-2.5">
          <button
            type="button"
            onClick={handleCheck}
            disabled={!canCheck || isChecking}
            aria-disabled={!canCheck || isChecking}
            className="
              w-full py-3 px-6 rounded-lg font-semibold text-sm transition-all
              bg-teal-700 text-white shadow-sm
              hover:bg-teal-600 active:bg-teal-800
              disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none
            "
          >
            {isChecking ? "Checking…" : "Check Interactions"}
          </button>

          <button
            type="button"
            onClick={handleReset}
            aria-label="Reset all inputs and results"
            className="
              w-full py-2.5 px-6 rounded-lg font-medium text-sm transition-all
              bg-slate-100 text-slate-600
              hover:bg-slate-200 active:bg-slate-300
            "
          >
            Reset
          </button>

          {error && (
            <p
              className="text-xs text-red-600 flex items-start gap-1.5 pt-0.5"
              role="alert"
            >
              <span aria-hidden className="flex-shrink-0 mt-0.5">&#9888;</span>
              {error}
            </p>
          )}

          {!canCheck && !isChecking && !error && (
            <p className="text-xs text-slate-400 text-center leading-relaxed pt-0.5">
              {selectedTCM === null && westernMeds.length === 0
                ? "Add a medication and select an herb or formula to begin."
                : selectedTCM === null
                ? "Select an herb or formula to continue."
                : "Add at least one medication to continue."}
            </p>
          )}
        </div>

      </aside>

      {/* ================================================================ */}
      {/* RIGHT COLUMN — results                                            */}
      {/* ================================================================ */}
      <main
        className="flex-1 md:h-screen md:overflow-y-auto bg-slate-50"
        aria-live="polite"
        aria-label="Interaction results"
      >
        {isChecking && <SkeletonLoader />}
        {!isChecking && displayResult && (
          <div className="p-6">
            <InteractionResults
              result={displayResult}
              originalResult={originalResult ?? undefined}
              excludedHerbIds={excludedHerbIds}
              onHerbToggle={handleHerbToggle}
              onRestoreFormula={handleRestoreFormula}
            />
          </div>
        )}
        {!isChecking && !displayResult && <EmptyState />}
      </main>

    </div>
  );
}
