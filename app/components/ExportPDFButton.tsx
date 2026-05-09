"use client";

import { useState } from "react";
import { generateInteractionPDF, type PDFGeneratorInput } from "@/lib/pdfGenerator";
import type { UserEntitlements } from "@/lib/entitlements";

interface ExportPDFButtonProps {
  data: PDFGeneratorInput;
  entitlements: UserEntitlements;
  disabled?: boolean;
}

export default function ExportPDFButton({
  data,
  entitlements,
  disabled = false,
}: ExportPDFButtonProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!entitlements.canExportPDF) {
    return (
      <button
        disabled
        aria-disabled="true"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-slate-100 text-slate-400 rounded-lg font-medium text-sm cursor-not-allowed border border-slate-200"
      >
        Export PDF
        <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded">
          Pro
        </span>
      </button>
    );
  }

  async function handleExport() {
    setError(null);
    setIsGenerating(true);
    try {
      const blob = generateInteractionPDF(data);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `formulens-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("PDF generation failed:", err);
      setError("PDF generation failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        onClick={handleExport}
        disabled={isGenerating || disabled}
        aria-label="Export interaction report as PDF"
        className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] bg-teal-700 text-white rounded-lg font-medium text-sm hover:bg-teal-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
      >
        {isGenerating ? "Generating…" : "Export PDF"}
      </button>
      {error && (
        <p className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
