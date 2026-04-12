/**
 * app/transparency/page.tsx
 *
 * Clinical Transparency & Data Integrity Policy page.
 * Deploy at /transparency route in Next.js App Router.
 * Light theme matching main app (bg-slate-50, white panels).
 */

export default function TransparencyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans">

      {/* ── Header ────────────────────────────────────────────────── */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-slate-700 hover:text-teal-600 transition-colors text-sm font-medium">
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Checker
          </a>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black uppercase tracking-widest text-teal-700 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded">
              v3.3.0 Live
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">
              March 24, 2026
            </span>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pt-12 pb-10">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-teal-600 mb-3">
          Clinical Decision Support Tool
        </p>
        <h1 className="text-4xl font-black text-slate-900 leading-tight mb-4">
          Clinical Transparency<br />
          <span className="text-teal-600">&amp; Data Integrity Policy</span>
        </h1>
        <p className="text-slate-700 text-base leading-relaxed max-w-2xl">
          This platform is built for licensed acupuncture and TCM practitioners.
          Every data source, trust tier, and validation status is documented here
          so clinicians can make informed decisions about the tool&rsquo;s evidence base.
        </p>
      </section>

      <div className="max-w-4xl mx-auto px-6 pb-20 space-y-12">

        {/* ── Section 1: Trust Hierarchy ────────────────────────────── */}
        <section>
          <SectionHeader number="1" title="Trust Hierarchy & Data Classification" />
          <p className="text-slate-700 text-sm leading-relaxed mb-6">
            Every herb and formula in the system carries a visible Trust Tier badge.
            Practitioners should interpret tier status before acting on any result.
          </p>
          <div className="grid gap-4">
            <TierCard
              tier="GOLD"
              label="NCCAOM Verified"
              status="Live"
              statusColor="teal"
              borderColor="border-yellow-300"
              bgColor="bg-white"
              badgeColor="bg-yellow-50 text-yellow-800 border-yellow-300"
              accentColor="bg-yellow-400"
              description="All 164 herbs and 121 formulas currently in the system are Gold Tier. Identity, energetics, and formula compositions are mapped directly to the NCCAOM board-standard library and verified against Bensky's Chinese Herbal Medicine: Formulas & Strategies."
              stats={[
                { label: "Herbs", value: "164" },
                { label: "Formulas", value: "121" },
                { label: "Source", value: "NCCAOM / Bensky" },
              ]}
            />
            <TierCard
              tier="SILVER"
              label="Research Foundation"
              status="Scaffolded — Pending"
              statusColor="slate"
              borderColor="border-slate-200"
              bgColor="bg-white"
              badgeColor="bg-slate-100 text-slate-600 border-slate-300"
              accentColor="bg-slate-300"
              description="Integration for the TCMBank research dataset is fully prepared in the codebase. This tier will activate automatically upon receipt of the TCMBank data export file. No code changes are required — the data pipeline is ready."
              stats={[
                { label: "Status", value: "Awaiting export" },
                { label: "Source", value: "TCMBank / TCMID" },
                { label: "Code", value: "Ready" },
              ]}
            />
            <TierCard
              tier="AMBER"
              label="Unresolved / Intentional Flag"
              status="Live — 30 permanent"
              statusColor="amber"
              borderColor="border-amber-300"
              bgColor="bg-white"
              badgeColor="bg-amber-50 text-amber-800 border-amber-300"
              accentColor="bg-amber-400"
              description="There are currently 30 permanent Amber warnings. These are intentional safety flags — not data gaps — for controlled substances (e.g. cinnabar, realgar), fresh juice preparations (ginger juice, bamboo juice), and obscure animal products not available as standard dried clinical herbs. Practitioners must verify these manually before prescribing."
              stats={[
                { label: "Count", value: "30" },
                { label: "Type", value: "Intentional flags" },
                { label: "Action", value: "Manual review" },
              ]}
            />
          </div>
        </section>

        {/* ── Section 2: API Integrations ───────────────────────────── */}
        <section>
          <SectionHeader number="2" title="Interaction Logic & API Integrations" />
          <p className="text-slate-700 text-sm leading-relaxed mb-6">
            The interaction engine uses a <strong className="text-slate-700">Worst-Case Wins</strong> severity
            model — when multiple interactions are present, the highest severity always surfaces first.
            Data sources are explicitly attributed on every result.
          </p>
          <div className="grid gap-4">
            <ApiCard
              icon="🏥"
              title="Drug Name Normalization"
              source="NIH RxNorm API"
              endpoint="rxnav.nlm.nih.gov/REST"
              status="Live"
              statusColor="teal"
              description="Resolves brand names to ingredient-level RxCUIs at the point of search. Coumadin → Warfarin (11289), Glucophage → Metformin (6809), Norvasc → Amlodipine (214354). Ensures interaction lookups match regardless of whether a practitioner enters brand or generic names."
            />
            <ApiCard
              icon="💊"
              title="Drug-Drug Interactions"
              source="US FDA — openFDA Drug Labels"
              endpoint="api.fda.gov/drug/label.json"
              status="Live"
              statusColor="teal"
              description="Queries official FDA-approved drug label text for known interactions between Western medications. When two or more drugs are entered, the system automatically checks for combinations flagged in the label's drug_interactions field. Severity defaults to Moderate — FDA labels do not provide structured severity ratings. Results are clearly attributed as FDA Drug Labels (openFDA) in the UI."
            />
            <ApiCard
              icon="🌿"
              title="Herb-Drug Interactions"
              source="Clinical Audit Baseline"
              endpoint="Internal — mockInteractions.json"
              status="Validation Phase"
              statusColor="amber"
              description="Currently using a verified mock-data baseline of 50 herb-drug interactions across 7 drug categories. A manual verification pathway is underway using the Memorial Sloan Kettering (MSK) About Herbs database. Active outreach is in progress for a formal data partnership with the MSK Integrative Medicine Service. IMgateway API (University of Sydney) is a secondary candidate. The mock data disclaimer remains active on all herb-drug results until the 50-case clinical audit is completed and signed off by the Clinical Lead."
            />
          </div>
        </section>

        {/* ── Section 3: Practitioner Sovereignty ───────────────────── */}
        <section>
          <SectionHeader number="3" title="Practitioner Sovereignty" />
          <div className="bg-white border border-teal-200 rounded-xl p-6 shadow-sm">
            <p className="text-slate-700 text-sm leading-relaxed mb-5">
              This tool is a <strong className="text-teal-700">Clinical Decision Support (CDS)</strong> system —
              not a diagnostic replacement. Final therapeutic authority always rests with the licensed professional.
            </p>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-black uppercase tracking-widest text-teal-600 mb-2">Modification Toggle</p>
                <p className="text-slate-700 text-xs leading-relaxed">
                  Practitioners can exclude individual herbs from a formula and recalculate interaction severity
                  in real time. The excluded herb remains visible but dimmed — never hidden.
                </p>
              </div>
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <p className="text-xs font-black uppercase tracking-widest text-teal-600 mb-2">Persistent Disclaimer</p>
                <p className="text-slate-700 text-xs leading-relaxed">
                  A clinical disclaimer is present on all result views and cannot be dismissed. It is a
                  permanent architectural feature, not an optional notice.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Section 4: Live Data Matrix ───────────────────────────── */}
        <section>
          <SectionHeader number="4" title="Live Data Matrix" />
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Data Function</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Source Authority</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                  <th className="text-left px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Cost</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Drug Identification", "NIH RxNorm", "Live", "Free", "teal"],
                  ["Drug-Drug Safety", "US FDA (openFDA)", "Live", "Free", "teal"],
                  ["Herb-Drug Safety", "Clinical Audit Baseline", "Validation", "N/A", "amber"],
                  ["Herb/Formula Identity", "NCCAOM Gold Library", "Live", "Included", "teal"],
                  ["Advanced Research", "TCMBank (Silver Tier)", "Pending", "TBD", "slate"],
                ].map(([fn, source, status, cost, color], i) => (
                  <tr key={i} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5 font-semibold text-slate-800">{fn}</td>
                    <td className="px-5 py-3.5 text-slate-700">{source}</td>
                    <td className="px-5 py-3.5">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${
                        color === "teal"
                          ? "bg-teal-50 text-teal-700 border-teal-200"
                          : color === "amber"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-500 border-slate-200"
                      }`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-700">{cost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ── Section 5: System Status ──────────────────────────────── */}
        <section>
          <SectionHeader number="5" title="System Status (v3.3.0)" />
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { label: "Production URL", value: "formulens.co", highlight: true },
              { label: "Herb Library", value: "164 Gold-tier NCCAOM verified herbs" },
              { label: "Formula Library", value: "121 Gold-tier board exam formulas" },
              { label: "Unresolved Warnings", value: "30 permanent amber (intentional flags)" },
              { label: "Clinical Audit", value: "Framework defined in SPEC-004 — execution pending" },
              { label: "Clinical Validation Pending", value: "Active on herb-drug results until audit complete", warning: true },
            ].map(({ label, value, highlight, warning }, i) => (
              <div key={i} className={`rounded-xl p-4 border shadow-sm ${
                warning
                  ? "bg-amber-50 border-amber-200"
                  : highlight
                  ? "bg-teal-50 border-teal-200"
                  : "bg-white border-slate-200"
              }`}>
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
                  warning ? "text-amber-600" : highlight ? "text-teal-600" : "text-slate-400"
                }`}>{label}</p>
                <p className={`text-sm font-semibold ${
                  warning ? "text-amber-800" : highlight ? "text-teal-800" : "text-slate-700"
                }`}>{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ────────────────────────────────────────────────── */}
        <footer className="border-t border-slate-200 pt-8 mt-8">
          <div className="flex flex-wrap items-start justify-between gap-6 mb-6">
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Document Version</p>
              <p className="text-slate-700 text-sm font-medium">v1.1.0 — Production Update</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Effective Date</p>
              <p className="text-slate-700 text-sm font-medium">March 24, 2026</p>
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">App Version</p>
              <p className="text-slate-700 text-sm font-medium">v3.3.0 — Live</p>
            </div>
          </div>
          <p className="text-slate-400 text-xs leading-relaxed">
            This tool is for educational and professional reference only. It does not replace clinical judgment
            or consultation with a pharmacist. Interaction severity may vary based on dosage and herb-to-drug ratio.
          </p>
        </footer>
      </div>
    </main>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <div className="flex items-center gap-4 mb-5">
      <span className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-xs font-black text-teal-600 shrink-0">
        {number}
      </span>
      <h2 className="text-lg font-black text-slate-900">{title}</h2>
    </div>
  );
}

function TierCard({
  tier, label, status, statusColor, borderColor, bgColor,
  badgeColor, accentColor, description, stats,
}: {
  tier: string; label: string; status: string; statusColor: string;
  borderColor: string; bgColor: string; badgeColor: string; accentColor: string;
  description: string;
  stats: { label: string; value: string }[];
}) {
  return (
    <div className={`rounded-xl border ${borderColor} ${bgColor} shadow-sm overflow-hidden relative`}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentColor}`} />
      <div className="p-5 pl-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <span className={`text-[11px] font-black uppercase tracking-widest px-2.5 py-1 rounded border ${badgeColor}`}>
              {tier}
            </span>
            <span className="text-slate-700 font-semibold text-sm">{label}</span>
          </div>
          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 ${
            statusColor === "teal"
              ? "bg-teal-50 text-teal-700 border-teal-200"
              : statusColor === "amber"
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-slate-100 text-slate-500 border-slate-200"
          }`}>
            {status}
          </span>
        </div>
        <p className="text-slate-700 text-xs leading-relaxed mb-4">{description}</p>
        <div className="flex flex-wrap gap-6">
          {stats.map(({ label: l, value: v }) => (
            <div key={l}>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-700">{l}</p>
              <p className="text-slate-700 text-xs font-semibold">{v}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ApiCard({
  icon, title, source, endpoint, status, statusColor, description,
}: {
  icon: string; title: string; source: string; endpoint: string;
  status: string; statusColor: string; description: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{icon}</span>
          <div>
            <p className="font-black text-slate-800 text-sm">{title}</p>
            <p className="text-slate-400 text-xs font-mono mt-0.5">{endpoint}</p>
          </div>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border shrink-0 ${
          statusColor === "teal"
            ? "bg-teal-50 text-teal-700 border-teal-200"
            : "bg-amber-50 text-amber-700 border-amber-200"
        }`}>
          {status}
        </span>
      </div>
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-700 mb-1">{source}</p>
      <p className="text-slate-700 text-xs leading-relaxed">{description}</p>
    </div>
  );
}
