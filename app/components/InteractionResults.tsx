"use client";

/**
 * InteractionResults.tsx
 *
 * Displays the full output of the /api/interactions route.
 * No herb datasets imported — all data comes from InteractionEngineResult.
 *
 * Sections:
 *   1. Summary banner — worst severity, modified-formula indicator, dataStatus badge
 *   2. Unresolved herbs notice — if hasUnresolvedHerbs
 *   3. Formula breakdown — every constituent herb with trust tier badges
 *   4. Modification summary — when exclusions are active
 *   5. Interaction cards — one per match, sorted worst-first
 *   6. Persistent disclaimer
 */
"use client";

/**
 * InteractionResults.tsx
 *
 * v3.2.0 - Server-Side Clinical Architecture + WCAG AA Accessibility
 * Complete replacement file.
 */

import { useState } from "react";
import type {
  InteractionEngineResult,
  InteractionMatch,
  SeverityLevel,
  FormulaHerbDetail,
  TrustTier,
} from "@/lib/types/clinical";
import {
  SEVERITY_LABELS,
  SEVERITY_STYLES,
  SEVERITY_ICONS,
} from "@/lib/severityUtils";

// ---------------------------------------------------------------------------
// Trust tier badge — WCAG Optimized
// ---------------------------------------------------------------------------

function TrustTierBadge({
  tier,
  nccaomCode,
}: {
  tier: TrustTier;
  nccaomCode: string | null;
}) {
  if (tier === "gold" && nccaomCode) {
    return (
      <span className="inline-flex items-center gap-1.5 font-mono text-[11px] px-2 py-0.5 rounded border-2 text-teal-950 bg-white border-teal-600 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-teal-600" aria-hidden="true" />
        {nccaomCode}
      </span>
    );
  }
  if (tier === "silver") {
    return (
      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border-2 text-slate-700 bg-slate-50 border-slate-400">
        Research
      </span>
    );
  }
  if (tier === "unresolved") {
    return (
      <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border-2 text-orange-900 bg-orange-50 border-orange-500">
        Data Missing
      </span>
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// TcmEnergeticsPanel — Enhanced Visual Hierarchy
// ---------------------------------------------------------------------------

function TemperatureBadge({ temp }: { temp: string }) {
  const lower = temp.toLowerCase();
  let colorClass = "bg-slate-100 text-slate-900 border-slate-400";
  if (lower === "hot" || lower === "warm") {
    colorClass = "bg-red-50 text-red-950 border-red-300";
  } else if (lower === "cold" || lower === "cool") {
    colorClass = "bg-blue-50 text-blue-950 border-blue-300";
  }
  return (
    <span className={`inline-flex items-center text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${colorClass}`}>
      {temp}
    </span>
  );
}

function TcmEnergeticsPanel({ herb }: { herb: FormulaHerbDetail }) {
  const { taste, temperature, channels, properties, tcm_cautions } = herb;
  const hasData = !!(taste?.length || temperature || channels?.length || properties?.length || tcm_cautions);
  if (!hasData) return null;

  return (
    <div className="mt-4 space-y-4 pl-3 border-l-4 border-slate-200 ml-1 pb-2">
      <div className="flex flex-wrap items-center gap-2">
        {temperature && <TemperatureBadge temp={temperature} />}
        {taste?.map((t) => (
          <span key={t} className="text-[10px] font-bold px-2 py-1 rounded bg-slate-200 text-slate-800 border border-slate-300 capitalize">
            {t}
          </span>
        ))}
      </div>

      {channels && channels.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Target:</span>
          {channels.map((ch) => (
            <span key={ch} className="text-[10px] px-2 py-0.5 rounded bg-teal-950 text-white font-medium">
              {ch}
            </span>
          ))}
        </div>
      )}

      {properties && properties.length > 0 && (
        <div className="space-y-1">
          <span className="text-[10px] font-black text-slate-500 uppercase">Clinical Actions</span>
          <ul className="list-disc pl-4 space-y-1">
            {properties.map((p, i) => (
              <li key={i} className="text-xs text-slate-800 leading-snug font-medium italic">{p}</li>
            ))}
          </ul>
        </div>
      )}

      {tcm_cautions && (
        <div className="bg-orange-100 border-l-4 border-orange-600 rounded-r p-3 mt-2">
          <p className="text-xs text-orange-950 leading-relaxed font-semibold">
            <span className="uppercase tracking-widest mr-2 underline">TCM Caution:</span> {tcm_cautions}
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Herb Row component
// ---------------------------------------------------------------------------

function HerbDetailRow({
  herb,
  onToggle
}: {
  herb: FormulaHerbDetail;
  onToggle: (id: string, excluded: boolean) => void;
}) {
  const [showEnergetics, setShowEnergetics] = useState(false);
  const isExcluded = herb.excluded;
  const isUnresolved = herb.trustTier === "unresolved";

  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${isExcluded ? "bg-slate-100 border-slate-200 grayscale opacity-75" : "bg-white border-slate-200 shadow-md hover:border-teal-400"}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-2 mb-1.5">
            <h4 className={`text-base font-black ${isExcluded ? "text-slate-500 line-through" : "text-slate-950"}`}>
              {herb.pinyin}
            </h4>
            <TrustTierBadge tier={herb.trustTier} nccaomCode={herb.nccaom_code} />
          </div>
          <p className="text-xs text-slate-700 font-medium mb-3">{herb.latin || "Botanical data pending"}</p>
          
          {!isExcluded && !isUnresolved && (
            <button 
              onClick={() => setShowEnergetics(!showEnergetics)}
              aria-expanded={showEnergetics}
              className="text-xs font-bold text-teal-900 hover:text-teal-700 underline underline-offset-4 decoration-2 transition-all flex items-center gap-1.5"
            >
              {showEnergetics ? "Collapse Clinical Info ▲" : "Clinical Energetics ▼"}
            </button>
          )}
        </div>

        <button
          onClick={() => onToggle(herb.herbId, !isExcluded)}
          aria-label={isExcluded ? `Include ${herb.pinyin}` : `Exclude ${herb.pinyin}`}
          className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all shadow-sm ${
            isExcluded 
              ? "bg-teal-800 text-white hover:bg-teal-950" 
              : "bg-slate-200 text-slate-800 hover:bg-slate-300 border border-slate-400"
          }`}
        >
          {isExcluded ? "Add Back" : "Remove"}
        </button>
      </div>

      {showEnergetics && !isExcluded && <TcmEnergeticsPanel herb={herb} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Supporting Sub-Components
// ---------------------------------------------------------------------------

function FormulaBreakdown({
  breakdown,
  onHerbToggle,
}: {
  breakdown: FormulaHerbDetail[];
  onHerbToggle: (id: string, excluded: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 px-1">
        Formula Composition
      </h3>
      <div className="grid gap-3">
        {breakdown.map((herb) => (
          <HerbDetailRow
            key={herb.herbId}
            herb={herb}
            onToggle={onHerbToggle}
          />
        ))}
      </div>
    </div>
  );
}

function InteractionCard({
  match,
  defaultExpanded = false,
}: {
  match: InteractionMatch;
  defaultExpanded?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const style = SEVERITY_STYLES[match.severity];
  const Icon = SEVERITY_ICONS[match.severity];

  return (
    <div className={`rounded-xl border-2 overflow-hidden transition-all shadow-md ${style.border} ${style.bg}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-start gap-3 p-4 text-left"
        aria-expanded={isExpanded}
      >
        <div className={`mt-0.5 rounded p-1 ${style.text}`}>
          <Icon size={20} strokeWidth={3} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border-2 ${style.text} ${style.border}`}>
              {SEVERITY_LABELS[match.severity]}
            </span>
          </div>
          <h4 className={`text-base font-black leading-tight mb-1 ${style.text}`}>
            {match.herb.pinyin} + {match.drug.name}
          </h4>
          <p className={`text-xs font-bold leading-relaxed line-clamp-2 ${style.text} opacity-90`}>
            {match.clinicalSummary}
          </p>
        </div>
      </button>

      {isExpanded && (
        <div className={`px-4 pb-4 pt-0 space-y-4 border-t-2 ${style.border} bg-white/50`}>
          <div className="space-y-2">
            <h5 className={`text-[10px] font-black uppercase tracking-widest ${style.text}`}>Clinical Assessment</h5>
            <p className="text-xs text-slate-900 leading-relaxed font-medium">{match.clinicalSummary}</p>
          </div>
          {match.evidenceNotes && (
            <div className="space-y-2 p-3 rounded-lg bg-white border border-slate-200">
              <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Evidence Notes</h5>
              <p className="text-xs text-slate-700 leading-relaxed italic">{match.evidenceNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Entry Point
// ---------------------------------------------------------------------------

export default function InteractionResults({
  result,
  onHerbToggle,
  excludedHerbIds,
  originalResult,
  onRestoreFormula,
}: {
  result: InteractionEngineResult;
  onHerbToggle: (id: string, excluded: boolean) => void;
  excludedHerbIds: string[];
  originalResult?: InteractionEngineResult;
  onRestoreFormula?: () => void;
}) {
  const isModified = excludedHerbIds.length > 0;
  const severityStyle = SEVERITY_STYLES[result.worstSeverity];
  const SummaryIcon = SEVERITY_ICONS[result.worstSeverity];

  return (
    <div className="space-y-8 pb-10">
      {/* 1. Summary Banner */}
      <div className={`rounded-2xl border-2 p-5 shadow-lg ${severityStyle.bg} ${severityStyle.border}`}>
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white ${severityStyle.text}`}>
              <SummaryIcon size={28} strokeWidth={3} />
            </div>
            <div>
              <h2 className={`text-lg font-black leading-none ${severityStyle.text} uppercase tracking-tight`}>
                {SEVERITY_LABELS[result.worstSeverity]} RISK
              </h2>
              {isModified && (
                <span className="text-[10px] font-bold bg-white/40 px-2 py-0.5 rounded-full mt-1 inline-block uppercase tracking-wider">
                  Modified Formula
                </span>
              )}
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Status</span>
            <span className="text-[11px] font-bold px-2 py-1 rounded-lg bg-white border-2 border-slate-300 text-slate-700 whitespace-nowrap">
              {result.dataStatus === "mock_unverified" ? "Review Required" : "Verified Data"}
            </span>
            {result.dataFreshness && (
              <p className="text-[10px] text-slate-500 mt-1">
                {result.dataFreshness.lastUpdatedDisplay}
              </p>
            )}
          </div>
        </div>
        
        <p className={`text-sm font-bold leading-relaxed ${severityStyle.text}`}>
          {result.matches.length === 0 
            ? "No known clinically significant interactions detected for this combination."
            : `Detected ${result.matches.length} interaction${result.matches.length > 1 ? "s" : ""} requiring attention.`
          }
        </p>
      </div>

      {/* 2. Degraded Mode Warning */}
      {result.dataFreshness?.degradedMode && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 flex gap-3">
          <div className="text-amber-600 mt-0.5">⚠️</div>
          <div>
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight mb-1">
              Clinical Data Temporarily Unavailable
            </h4>
            <p className="text-xs text-amber-800 leading-relaxed font-medium">
              Interaction data may be outdated. The clinical database could not
              be reached. Verify with a pharmacist before prescribing.
            </p>
          </div>
        </div>
      )}

      {/* 3. Unresolved Herbs Notice */}
      {result.hasUnresolvedHerbs && (
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex gap-3">
          <div className="text-orange-600 mt-1">⚠️</div>
          <div>
            <h4 className="text-sm font-black text-orange-900 uppercase tracking-tight mb-1">Limited Data Coverage</h4>
            <p className="text-xs text-orange-800 leading-relaxed font-medium">
              One or more ingredients in this formula could not be cross-referenced against our clinical interaction database. 
              Interaction potential remains unknown for these items.
            </p>
          </div>
        </div>
      )}

      {/* 4. Formula Breakdown */}
      {result.formulaBreakdown?.herbs && result.formulaBreakdown.herbs.length > 0 && (
        <FormulaBreakdown
          breakdown={result.formulaBreakdown.herbs}
          onHerbToggle={onHerbToggle}
        />
      )}

      {/* 5. Interaction Detail Cards */}
      {result.matches.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 px-1">
            Clinical Interaction Details
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

      {/* 6. Persistent Disclaimer */}
      <div className="rounded-xl border-2 border-slate-200 bg-slate-100 p-5">
        <p className="text-xs text-slate-700 leading-relaxed font-medium">
          <span className="font-black text-slate-900 uppercase tracking-widest mr-2 underline decoration-2 decoration-slate-400">Disclaimer:</span>
          {result.disclaimer}
        </p>
      </div>
    </div>
  );
}