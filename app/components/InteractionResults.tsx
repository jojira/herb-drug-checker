"use client";

/**
 * InteractionResults.tsx
 *
 * Displays the full output of checkInteractions().
 *
 * Sections:
 *   1. Summary banner — worst severity at a glance
 *   2. Formula breakdown — expandable, shows every constituent herb with
 *      full NCCAOM identity (Pinyin, Latin, English, code, category)
 *      whether or not it triggered an alert. Safe herbs are shown in full,
 *      not as bare IDs. Flagged herbs are visually prominent.
 *   3. Interaction cards — one per match, sorted worst-first, with
 *      mechanism, clinical summary, citations, source badges
 *   4. Persistent disclaimer
 */

import { useState } from "react";
import type {
  InteractionEngineResult,
  InteractionMatch,
  SeverityLevel,
  FormulaHerbDetail,
} from "@/logic/interactionEngine";
import {
  SEVERITY_LABELS,
  SEVERITY_STYLES,
  SEVERITY_ICONS,
} from "@/logic/interactionEngine";
import herbLibrary from "@/data/herbLibrary.json";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type HerbLibraryEntry = (typeof herbLibrary.herbs)[number];

function getHerbCategory(herbId: string): string | null {
  const entry = herbLibrary.herbs.find((h) => h.id === herbId) as HerbLibraryEntry | undefined;
  return entry?.category ?? null;
}

const EVIDENCE_LABELS: Record<string, string> = {
  high: "High Evidence",
  medium: "Moderate Evidence",
  low: "Low Evidence",
};

const EVIDENCE_STYLES: Record<string, string> = {
  high: "bg-slate-800 text-white",
  medium: "bg-slate-200 text-slate-700",
  low: "bg-slate-100 text-slate-500",
};

// ---------------------------------------------------------------------------
// SeverityBadge
// ---------------------------------------------------------------------------

function SeverityBadge({
  severity,
  size = "sm",
}: {
  severity: SeverityLevel;
  size?: "sm" | "lg";
}) {
  const styles = SEVERITY_STYLES[severity];
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-semibold rounded-full border
        ${size === "lg" ? "px-4 py-1.5 text-base" : "px-2.5 py-0.5 text-xs"}
        ${styles.bg} ${styles.text} ${styles.border}
      `}
      aria-label={`Severity: ${SEVERITY_LABELS[severity]}`}
    >
      {SEVERITY_ICONS[severity]} {SEVERITY_LABELS[severity]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// FormulaBreakdown
// ---------------------------------------------------------------------------

function HerbDetailRow({ herb }: { herb: FormulaHerbDetail }) {
  const worstSeverity: SeverityLevel = herb.interactions.reduce<SeverityLevel>(
    (worst, m) => {
      const rank: Record<SeverityLevel, number> = { contraindicated: 2, precaution: 1, none: 0 };
      return rank[m.severity] > rank[worst] ? m.severity : worst;
    },
    "none"
  );

  const category = getHerbCategory(herb.herbId);
  const isFlagged = herb.hasInteraction;

  return (
    <li
      className={`
        flex items-start gap-3 px-4 py-3 border-b border-slate-100 last:border-0
        ${isFlagged ? "bg-white" : "bg-slate-50/50"}
      `}
    >
      <span
        className="flex-shrink-0 text-base mt-0.5"
        aria-label={isFlagged ? SEVERITY_LABELS[worstSeverity] : "No known interaction"}
      >
        {isFlagged ? SEVERITY_ICONS[worstSeverity] : "🟢"}
      </span>

      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className={`font-semibold text-sm ${isFlagged ? "text-slate-900" : "text-slate-600"}`}>
            {herb.pinyin || herb.herbId}
          </span>
          {herb.nccaom_code && (
            <span className="font-mono text-[10px] text-teal-600 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">
              {herb.nccaom_code}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-baseline gap-x-1.5 mt-0.5">
          {herb.latin && (
            <span className="text-xs italic text-slate-500">{herb.latin}</span>
          )}
          {herb.latin && herb.english && (
            <span className="text-xs text-slate-300">·</span>
          )}
          {herb.english && (
            <span className="text-xs text-slate-500">{herb.english}</span>
          )}
        </div>
        {category && (
          <span className="inline-block mt-1 text-[10px] font-medium tracking-wide uppercase text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
            {category}
          </span>
        )}
      </div>

      {isFlagged && (
        <div className="flex-shrink-0 text-right">
          <span
            className={`
              inline-block text-xs font-semibold px-2 py-0.5 rounded-full
              ${worstSeverity === "contraindicated"
                ? "bg-red-100 text-red-700"
                : "bg-amber-100 text-amber-700"
              }
            `}
          >
            {herb.interactions.length} alert{herb.interactions.length > 1 ? "s" : ""}
          </span>
        </div>
      )}
    </li>
  );
}

function FormulaBreakdown({
  breakdown,
}: {
  breakdown: NonNullable<InteractionEngineResult["formulaBreakdown"]>;
}) {
  const [expanded, setExpanded] = useState(false);

  const flaggedHerbs = breakdown.herbs.filter((h) => h.hasInteraction);
  const safeHerbs = breakdown.herbs.filter((h) => !h.hasInteraction);

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-5 py-4 bg-slate-800 hover:bg-slate-700 transition-colors flex items-start justify-between gap-4"
        aria-expanded={expanded}
      >
        <div>
          <span className="text-[10px] font-semibold tracking-widest uppercase text-slate-400 block mb-1">
            Formula Breakdown
          </span>
          <p className="font-bold text-white text-base leading-tight">
            {breakdown.formula.pinyin}
          </p>
          <p className="text-slate-400 text-sm mt-0.5">{breakdown.formula.english}</p>
          <div className="flex flex-wrap gap-2 mt-2.5">
            <span className="text-xs text-slate-400 bg-slate-700 px-2 py-0.5 rounded-full">
              {breakdown.totalHerbCount} herbs
            </span>
            {breakdown.flaggedHerbCount > 0 ? (
              <span className="text-xs font-semibold text-red-300 bg-red-900/40 px-2 py-0.5 rounded-full">
                {breakdown.flaggedHerbCount} flagged
              </span>
            ) : (
              <span className="text-xs font-semibold text-green-300 bg-green-900/40 px-2 py-0.5 rounded-full">
                All clear
              </span>
            )}
          </div>
        </div>
        <span className="text-slate-400 text-xl flex-shrink-0 mt-1">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="bg-white">
          {flaggedHerbs.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-red-50 border-b border-red-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                  ⚠ Flagged Ingredients ({flaggedHerbs.length})
                </p>
              </div>
              <ul>
                {flaggedHerbs.map((herb) => (
                  <HerbDetailRow key={herb.herbId} herb={herb} />
                ))}
              </ul>
            </div>
          )}

          {safeHerbs.length > 0 && (
            <div>
              <div className="px-4 py-2 bg-slate-50 border-b border-t border-slate-100">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  No Interaction Detected ({safeHerbs.length})
                </p>
              </div>
              <ul>
                {safeHerbs.map((herb) => (
                  <HerbDetailRow key={herb.herbId} herb={herb} />
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InteractionCard
// ---------------------------------------------------------------------------

function CitationList({ citations }: { citations: InteractionMatch["citations"] }) {
  if (!citations?.length) return null;
  return (
    <ul className="space-y-1.5">
      {citations.map((c, i) => (
        <li key={i} className="text-xs text-slate-500 leading-snug">
          {c.url ? (
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-teal-600 transition-colors"
            >
              {c.title}
            </a>
          ) : (
            <span>{c.title}</span>
          )}
          {c.journal && <span className="text-slate-400"> — {c.journal}</span>}
          {c.year && <span className="text-slate-400"> ({c.year})</span>}
        </li>
      ))}
    </ul>
  );
}

function InteractionCard({
  match,
  defaultExpanded = false,
}: {
  match: InteractionMatch;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [showCitations, setShowCitations] = useState(false);
  const styles = SEVERITY_STYLES[match.severity];

  return (
    <div
      className={`rounded-xl border-2 overflow-hidden shadow-sm transition-shadow hover:shadow-md ${styles.border}`}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`w-full text-left px-5 py-4 ${styles.bg} flex items-start justify-between gap-4`}
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <SeverityBadge severity={match.severity} />
            <span
              className={`text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded ${EVIDENCE_STYLES[match.evidenceLevel]}`}
            >
              {EVIDENCE_LABELS[match.evidenceLevel]}
            </span>
          </div>

          <p className={`font-bold text-base leading-tight ${styles.text}`}>
            {match.herb.pinyin}
            <span className="font-normal text-sm ml-1 opacity-70">
              ({match.herb.english})
            </span>
            <span className="mx-2 opacity-40">+</span>
            {match.drug.name}
            {match.drug.brand_names?.length > 0 && (
              <span className="font-normal text-sm ml-1 opacity-60">
                ({match.drug.brand_names[0]})
              </span>
            )}
          </p>

          {!expanded && (
            <p className="text-sm text-slate-600 mt-2 line-clamp-2 leading-relaxed">
              {match.mechanism}
            </p>
          )}
        </div>
        <span className={`${styles.text} opacity-60 text-lg flex-shrink-0 mt-1`}>
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {expanded && (
        <div className="bg-white divide-y divide-slate-100">
          <div className="px-5 py-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Mechanism of Action
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">{match.mechanism}</p>
          </div>

          <div className="px-5 py-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Clinical Summary
            </h4>
            <p className="text-sm text-slate-700 leading-relaxed">{match.clinicalSummary}</p>
          </div>

          <div className="px-5 py-4 bg-slate-50">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Herb Identity
            </h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              <span>
                <span className="text-slate-400">Pinyin </span>
                <span className="font-medium text-slate-700">{match.herb.pinyin}</span>
              </span>
              <span>
                <span className="text-slate-400">Latin </span>
                <span className="font-medium italic text-slate-700">{match.herb.latin}</span>
              </span>
              <span>
                <span className="text-slate-400">NCCAOM </span>
                <span className="font-mono font-medium text-teal-700">{match.herb.nccaom_code}</span>
              </span>
              {match.herb.active_constituent && (
                <span>
                  <span className="text-slate-400">Active constituent </span>
                  <span className="font-medium text-slate-700">{match.herb.active_constituent}</span>
                </span>
              )}
            </div>
          </div>

          <div className="px-5 py-4">
            <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
              Evidence Notes
            </h4>
            <p className="text-xs italic text-slate-500 leading-relaxed">{match.evidenceNotes}</p>
          </div>

          <div className="px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex gap-1.5 flex-wrap items-center">
                {match.sources.map((s) => (
                  <span
                    key={s}
                    className="text-xs font-semibold bg-slate-800 text-white px-2 py-0.5 rounded"
                  >
                    {s === "natmed" ? "NatMed Pro" : "Stockley's"}
                  </span>
                ))}
                <span className="text-xs text-slate-400">
                  Confidence:{" "}
                  <span className="font-medium text-slate-600">{match.confidence}</span>
                </span>
              </div>

              {match.citations?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowCitations((v) => !v)}
                  className="text-xs text-teal-600 hover:text-teal-800 font-medium underline underline-offset-2 transition-colors"
                >
                  {showCitations ? "Hide" : "Show"} {match.citations.length} citation
                  {match.citations.length > 1 ? "s" : ""}
                </button>
              )}
            </div>

            {showCitations && <CitationList citations={match.citations} />}
          </div>

          {match.fromFormula && match.sourceFormula && (
            <div className="px-5 py-3 bg-blue-50 border-t border-blue-100">
              <p className="text-xs text-blue-600">
                ↳ Constituent of{" "}
                <span className="font-semibold">{match.sourceFormula.pinyin}</span>{" "}
                <span className="text-blue-400">({match.sourceFormula.english})</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary banner
// ---------------------------------------------------------------------------

function SummaryBanner({ result }: { result: InteractionEngineResult }) {
  const styles = SEVERITY_STYLES[result.worstSeverity];
  const hasMatches = result.matches.length > 0;
  const contraCount = result.matches.filter((m) => m.severity === "contraindicated").length;
  const precautionCount = result.matches.filter((m) => m.severity === "precaution").length;

  return (
    <div className={`rounded-xl border-2 ${styles.border} ${styles.bg} px-5 py-4`}>
      <div className="flex items-start gap-4">
        <span className="text-3xl flex-shrink-0" aria-hidden>
          {SEVERITY_ICONS[result.worstSeverity]}
        </span>
        <div className="flex-1 min-w-0">
          <p className={`font-bold text-lg leading-tight ${styles.text}`}>
            {hasMatches
              ? `${result.matches.length} Interaction${result.matches.length > 1 ? "s" : ""} Found`
              : "No Known Interactions Found"}
          </p>
          <p className="text-sm text-slate-600 mt-0.5">
            Overall severity:{" "}
            <strong className={styles.text}>{SEVERITY_LABELS[result.worstSeverity]}</strong>
          </p>
          {hasMatches && (
            <div className="flex flex-wrap gap-3 mt-2.5 text-xs text-slate-600">
              {contraCount > 0 && (
                <span className="flex items-center gap-1">
                  🔴{" "}
                  <span className="font-semibold text-red-700">
                    {contraCount} contraindicated
                  </span>
                </span>
              )}
              {precautionCount > 0 && (
                <span className="flex items-center gap-1">
                  🟡{" "}
                  <span className="font-semibold text-amber-700">
                    {precautionCount} precaution
                  </span>
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      {!hasMatches && (
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          No interactions found in the current database for this combination. Absence of evidence is not evidence of absence.
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function InteractionResults({
  result,
}: {
  result: InteractionEngineResult;
}) {
  return (
    <div className="space-y-5" aria-live="polite" aria-label="Interaction check results">
      <SummaryBanner result={result} />

      {result.formulaBreakdown && (
        <FormulaBreakdown breakdown={result.formulaBreakdown} />
      )}

      {result.matches.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 px-1">
            Interaction Details
          </h3>
          {result.matches.map((match) => (
            <InteractionCard
              key={match.interactionId}
              match={match}
              defaultExpanded={match.severity === "contraindicated"}
            />
          ))}
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-xs text-slate-500 leading-relaxed">
          <span className="font-semibold text-slate-600">⚠ Clinical Disclaimer: </span>
          {result.disclaimer}
        </p>
      </div>
    </div>
  );
}
