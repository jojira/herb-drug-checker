"use client";

import { useEffect, useState } from "react";

interface LandingHeroProps {
  searchesRemaining: number | null;
}

export default function LandingHero({ searchesRemaining }: LandingHeroProps) {
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("formulens_ref="))
      ?.split("=")[1];
    setRefCode(cookie ?? null);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[480px] px-6 py-12 text-center max-w-lg mx-auto">

      {/* ASA campaign banner */}
      {refCode === "asa" && (
        <div className="w-full mb-6 px-4 py-3 rounded-lg bg-teal-50 border border-teal-200">
          <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide">
            Welcome, ASA Members
          </p>
          <p className="text-[11px] text-teal-700 mt-1 leading-relaxed">
            You arrived via the American Society of Acupuncturists partnership link.
            Create a free account for unlimited interaction checks.
          </p>
        </div>
      )}

      {/* Value prop */}
      <h2 className="text-lg font-bold text-slate-900 leading-snug mb-3">
        Bridge the Gap Between TCM and Western Pharmacology
      </h2>
      <p className="text-sm text-slate-600 leading-relaxed mb-8">
        Cross-reference herb-drug interactions in seconds. Built for licensed
        acupuncturists and TCM practitioners who need clinical-grade safety data
        at the point of care.
      </p>

      {/* Trust signals */}
      <div className="w-full grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-4">
          <p className="text-lg font-bold text-teal-700">164</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">
            Gold-Tier Herbs
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">NCCAOM verified</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-4">
          <p className="text-lg font-bold text-teal-700">121</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">
            TCM Formulas
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Constituent-level</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white px-3 py-4">
          <p className="text-lg font-bold text-teal-700">3-Tier</p>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mt-1">
            Trust System
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Gold / Silver / Amber</p>
        </div>
      </div>

      {/* Data sources */}
      <div className="w-full flex items-center justify-center gap-4 mb-8">
        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
          Data Sources
        </span>
        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          NIH RxNorm
        </span>
        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          FDA openFDA
        </span>
      </div>

      {/* CTA */}
      <div className="w-full space-y-3">
        <p className="text-xs text-slate-500">
          {searchesRemaining !== null && searchesRemaining > 0
            ? `Try it now — ${searchesRemaining} free ${searchesRemaining === 1 ? "search" : "searches"} without an account.`
            : "Search the panel on the left to get started."}
        </p>
        <a
          href="/sign-up"
          className="inline-flex items-center justify-center min-h-[44px] px-6 rounded-lg text-sm font-semibold text-white bg-teal-700 hover:bg-teal-800 transition-colors"
        >
          Create Free Account — Unlimited Search
        </a>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          No credit card. No paywall. Signing up removes the 5-search guest limit.
        </p>
        <p className="text-[10px] text-slate-400 leading-relaxed mt-2 italic">
          Formulens Pro (coming soon): PDF export, shareable results, and search
          history for your practice.
        </p>
      </div>
    </div>
  );
}
