"use client";

/**
 * InteractionResults.tsx
 *
 * Displays the output of checkInteractions() from interactionEngine.ts.
 * - Shows a summary severity banner
 * - Renders each interaction as an expandable card
 * - When the input was a formula, shows an expandable ingredient breakdown
 *   so the practitioner can see exactly which constituent herb triggered the alert
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: SeverityLevel }) {
  const styles = SEVERITY_STYLES[severity];
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium border ${styles.bg} ${styles.text} ${styles.border}`}
    >
      {SEVERITY_ICONS[severity]} {SEVERITY_LABELS[severity]}
    </span>
  );
}

function CitationList({ citations }: { citations: InteractionMatch["citations"] }) {
  if (!citations || citations.length === 0) return null;
  return (
    <ul className="mt-2 space-y-1">
      {citations.map((c, i) => (
        <li key={i} className="text-xs text-gray-500">
          {c.url ? (
            <a
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline hover:text-gray-700"
            >
              {c.title}
            </a>
          ) : (
            c.title
          )}
          {c.journal && ` — ${c.journal}`}
          {c.year && ` (${c.year})`}
        </li>
      ))}
    </ul>
  );
}

function SourceBadge({ source }: { source: "natmed" | "stockleys" }) {
  const label = source === "natmed" ? "NatMed Pro" : "Stockley's";
  return (
    <span className="inline-block text-xs bg-gray-100 text-gray-600 rounded px-2 py-0.5 border border-gray-200">
      {label}
    </span>
  );
}

/** Single interaction card with expandable mechanism + citations */
function InteractionCard({
  match,
  defaultExpanded = false,
}: {
  match: InteractionMatch;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const styles = SEVERITY_STYLES[match.severity];

  return (
    <div className={`rounded-lg border ${styles.border} ${styles.bg} overflow-hidden`}>
      {/* Card header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-start justify-between gap-3"
        aria-expanded={expanded}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <SeverityBadge severity={match.severity} />
            <span className="text-xs text-gray-500 font-medium uppercase tracking-wide">
              {match.evidenceLevel} evidence
            </span>
          </div>
          <p className={`font-semibold ${styles.text}`}>
            {match.herb.pinyin}{" "}
            <span className="font-normal text-gray-500">({match.herb.english})</span>
            {" "}+{" "}
            {match.drug.name}
            {match.drug.brand_names.length > 0 && (
              <span className="font-normal text-gray-500 text-sm">
                {" "}({match.drug.brand_names.join(", ")})
              </span>
            )}
          </p>
          {/* Mechanism preview — truncated when collapsed */}
          {!expanded && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {match.mechanism}
            </p>
          )}
        </div>
        <span className="text-gray-400 text-lg flex-shrink-0 mt-0.5">
          {expanded ? "▲" : "▼"}
        </span>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-200 pt-3 space-y-3">
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Mechanism of Action
            </h4>
            <p className="text-sm text-gray-700">{match.mechanism}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Clinical Summary
            </h4>
            <p className="text-sm text-gray-700">{match.clinicalSummary}</p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Herb Details
            </h4>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Pinyin:</span> {match.herb.pinyin} ·{" "}
              <span className="font-medium">Latin:</span>{" "}
              <span className="italic">{match.herb.latin}</span> ·{" "}
              <span className="font-medium">NCCAOM:</span> {match.herb.nccaom_code}
              {match.herb.active_constituent && (
                <> · <span className="font-medium">Active constituent:</span>{" "}
                  {match.herb.active_constituent}
                </>
              )}
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              Evidence Notes
            </h4>
            <p className="text-sm text-gray-600 italic">{match.evidenceNotes}</p>
          </div>

          {match.citations.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Citations
              </h4>
              <CitationList citations={match.citations} />
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 pt-1">
            {match.sources.map((s) => (
              <SourceBadge key={s} source={s} />
            ))}
            <span className="text-xs text-gray-400 self-center ml-1">
              Confidence: {match.confidence}
            </span>
          </div>

          {match.fromFormula && match.sourceFormula && (
            <p className="text-xs text-gray-400 italic">
              ↳ Constituent of {match.sourceFormula.pinyin} ({match.sourceFormula.english})
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Formula ingredient breakdown — shows all herbs, highlights offenders */
function FormulaBreakdown({
  breakdown,
}: {
  breakdown: NonNullable<InteractionEngineResult["formulaBreakdown"]>;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-center justify-between"
        aria-expanded={expanded}
      >
        <div>
          <p className="font-semibold text-blue-800">
            {breakdown.formula.pinyin}{" "}
            <span className="font-normal text-blue-600">
              — {breakdown.formula.english}
            </span>
          </p>
          <p className="text-sm text-blue-700 mt-0.5">
            {breakdown.totalHerbCount} constituent herbs ·{" "}
            {breakdown.flaggedHerbCount > 0 ? (
              <span className="font-medium text-red-600">
                {breakdown.flaggedHerbCount} flagged
              </span>
            ) : (
              <span className="text-green-600">none flagged</span>
            )}
            {" "}· Click to {expanded ? "collapse" : "expand"} ingredient list
          </p>
        </div>
        <span className="text-blue-400 text-lg">{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-blue-200 px-4 py-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-600 mb-2">
            Constituent Herbs
          </h4>
          <ul className="space-y-1.5">
            {breakdown.herbs.map((herb) => (
              <HerbRow key={herb.herbId} herb={herb} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Single row in the formula ingredient breakdown */
function HerbRow({ herb }: { herb: FormulaHerbDetail }) {
  const worstSeverity = herb.interactions.reduce<SeverityLevel>(
    (worst, m) => {
      const rank = { contraindicated: 2, precaution: 1, none: 0 };
      return rank[m.severity] > rank[worst] ? m.severity : worst;
    },
    "none"
  );

  return (
    <li className="flex items-start gap-2 text-sm">
      <span className="flex-shrink-0 mt-0.5">
        {herb.hasInteraction ? SEVERITY_ICONS[worstSeverity] : "🟢"}
      </span>
      <span>
        <span className={`font-medium ${herb.hasInteraction ? "text-gray-900" : "text-gray-600"}`}>
          {herb.pinyin || herb.herbId}
        </span>
        {herb.english && (
          <span className="text-gray-500"> ({herb.english})</span>
        )}
        {herb.latin && (
          <span className="text-gray-400 italic text-xs"> — {herb.latin}</span>
        )}
        {herb.hasInteraction && (
          <span className="ml-1 text-xs font-medium text-red-600">
            ← interaction detected
          </span>
        )}
      </span>
    </li>
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
  const hasMatches = result.matches.length > 0;
  const summaryStyles = SEVERITY_STYLES[result.worstSeverity];

  return (
    <div className="space-y-4">
      {/* ── Summary banner ── */}
      <div
        className={`rounded-lg border-2 ${summaryStyles.border} ${summaryStyles.bg} px-4 py-3 flex items-center gap-3`}
      >
        <span className="text-2xl">{SEVERITY_ICONS[result.worstSeverity]}</span>
        <div>
          <p className={`font-bold text-lg ${summaryStyles.text}`}>
            {hasMatches
              ? `${result.matches.length} interaction${result.matches.length > 1 ? "s" : ""} found`
              : "No known interactions found"}
          </p>
          <p className="text-sm text-gray-600">
            Overall severity: <strong>{SEVERITY_LABELS[result.worstSeverity]}</strong>
          </p>
        </div>
      </div>

      {/* ── Formula breakdown (only when input was a formula) ── */}
      {result.formulaBreakdown && (
        <FormulaBreakdown breakdown={result.formulaBreakdown} />
      )}

      {/* ── Interaction cards ── */}
      {hasMatches && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500">
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

      {/* ── Disclaimer ── */}
      <p className="text-xs text-gray-400 italic border-t border-gray-100 pt-3">
        ⚠️ {result.disclaimer}
      </p>
    </div>
  );
}
