// lib/severityUtils.ts
// Severity display constants — safe to import in client components.
// Contains no herb data or server-only modules.

import type { SeverityLevel } from "@/lib/types/clinical";

/** Human-readable label for each severity level */
export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  contraindicated: "Contraindicated",
  precaution: "Monitor Closely",
  none: "No Known Interaction",
};

/** Tailwind CSS color classes for severity badges */
export const SEVERITY_STYLES: Record<
  SeverityLevel,
  { bg: string; text: string; border: string }
> = {
  contraindicated: {
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
  },
  precaution: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  none: {
    bg: "bg-green-50",
    text: "text-green-700",
    border: "border-green-200",
  },
};

/** Emoji icon for each severity level */
export const SEVERITY_ICONS: Record<SeverityLevel, string> = {
  contraindicated: "🔴",
  precaution: "🟡",
  none: "🟢",
};
