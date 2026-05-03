"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface SharePayload {
  herbs?: Array<{ id: string; name: string; latin?: string }>;
  drugs?: Array<{ name: string; rxcui?: string }>;
  [key: string]: unknown;
}

export default function SharePage() {
  const params = useParams();
  const token = params.token as string;

  const [payload, setPayload] = useState<SharePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (!data.success) {
          setError(data.error ?? "Unable to load shared search");
          return;
        }
        setPayload(data.searchState);
      })
      .catch(() => setError("Failed to load shared search"))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500 text-sm">Loading shared search…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-red-600 font-semibold">{error}</p>
          <Link href="/" className="text-teal-600 hover:underline text-sm">
            ← Start a new search
          </Link>
        </div>
      </div>
    );
  }

  const herbs = payload?.herbs ?? [];
  const drugs = payload?.drugs ?? [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shared Interaction Check</h1>
          <p className="text-slate-500 text-sm mt-1">
            A colleague shared this herb–drug interaction check with you.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          {herbs.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Herb / Formula
              </p>
              <ul className="space-y-1">
                {herbs.map((h) => (
                  <li key={h.id} className="text-sm text-slate-800">
                    {h.name}
                    {h.latin && (
                      <span className="text-slate-400 italic ml-1.5">({h.latin})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {drugs.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">
                Western Medications
              </p>
              <ul className="space-y-1">
                {drugs.map((d, i) => (
                  <li key={d.rxcui ?? i} className="text-sm text-slate-800">
                    {d.name}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {herbs.length === 0 && drugs.length === 0 && (
            <p className="text-sm text-slate-500">No search details available.</p>
          )}
        </div>

        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-teal-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
        >
          Run this check yourself →
        </Link>

        <p className="text-xs text-slate-400">
          This tool is for educational and professional reference only. It does not replace
          clinical judgment or consultation with a pharmacist.
        </p>
      </div>
    </div>
  );
}
