import type { DrugDrugCheckResult, DrugDrugInteraction } from "@/lib/types/clinical";

// ---------------------------------------------------------------------------
// Severity badge
// ---------------------------------------------------------------------------

function SeverityBadge({ severity }: { severity: DrugDrugInteraction["severity"] }) {
  const styles: Record<DrugDrugInteraction["severity"], string> = {
    high:     "bg-red-100 text-red-800 border-red-300",
    moderate: "bg-amber-100 text-amber-800 border-amber-300",
    low:      "bg-slate-100 text-slate-700 border-slate-300",
  };
  const labels: Record<DrugDrugInteraction["severity"], string> = {
    high:     "High",
    moderate: "Moderate",
    low:      "Low",
  };
  return (
    <span
      className={`inline-block text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${styles[severity]}`}
      aria-label={`Severity: ${labels[severity]}`}
    >
      {labels[severity]}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single interaction card
// ---------------------------------------------------------------------------

function InteractionCard({ ix }: { ix: DrugDrugInteraction }) {
  const borderColor =
    ix.severity === "high"
      ? "border-red-200"
      : ix.severity === "moderate"
      ? "border-amber-200"
      : "border-slate-200";

  return (
    <div className={`rounded-xl border-2 bg-white p-4 shadow-sm ${borderColor}`}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <p className="text-sm font-black text-slate-900 leading-snug">
          {ix.drug1.name}
          <span className="mx-1.5 font-normal text-slate-400">+</span>
          {ix.drug2.name}
        </p>
        <SeverityBadge severity={ix.severity} />
      </div>
      {ix.description && (
        <p className="text-xs text-slate-700 leading-relaxed font-medium">
          {ix.description}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main panel — only renders when interactions are present
// ---------------------------------------------------------------------------

export default function DrugDrugPanel({ result }: { result: DrugDrugCheckResult }) {
  if (result.interactions.length === 0) return null;

  return (
    <section
      aria-labelledby="drug-drug-panel-heading"
      className="rounded-2xl border-2 border-blue-200 bg-blue-50 p-5 shadow-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2
          id="drug-drug-panel-heading"
          className="text-sm font-black text-blue-950 uppercase tracking-tight"
        >
          Drug–Drug Interactions Detected
        </h2>
        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border-2 border-blue-300 bg-white text-blue-700">
          FDA Drug Labels (openFDA)
        </span>
      </div>

      {/* Interaction cards */}
      <div className="space-y-3">
        {result.interactions.map((ix, i) => (
          <InteractionCard key={i} ix={ix} />
        ))}
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-[11px] text-slate-500 leading-relaxed">
        {result.disclaimer}
      </p>
    </section>
  );
}
