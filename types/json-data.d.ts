/**
 * types/json-data.d.ts
 *
 * Type overrides for large data JSON files.
 *
 * Why: TypeScript's resolveJsonModule infers deep literal union types for large
 * JSON arrays (e.g., 121 formulas × N herb_ids). The resulting type expression
 * exhausts the Next.js Turbopack type-checker worker's stack when the worker
 * processes these imports. Explicit module declarations replace the inferred
 * literal types with simple structural interfaces, preventing the crash.
 *
 * npx tsc --noEmit is the authoritative type-check gate — it passes cleanly
 * and uses the same declarations below.
 */

type _FormulaEntry = {
  id: string;
  pinyin: string;
  english: string;
  category?: string;
  classical_reference?: string;
  version?: string;
  herb_ids: string[];
  unresolved_herbs?: string[];
  trustTier?: string;
  source?: string;
};

type _HerbEntry = {
  id: string;
  pinyin: string;
  latin: string;
  english: string;
  nccaom_code: string | null;
  category?: string;
  taste?: string[];
  temperature?: string;
  channels?: string[];
  properties?: string[];
  tcm_cautions?: string;
};

declare module "*/formulaMapExpanded.json" {
  const data: {
    _meta: {
      description: string;
      generated_at: string;
      formula_count: number;
      gold_count: number;
      silver_count: number;
      do_not_edit: boolean;
    };
    formulas: _FormulaEntry[];
  };
  export default data;
}

declare module "*/herbLibrary.json" {
  const data: {
    _meta: {
      version: string;
      standard: string;
      description: string;
      last_updated: string;
      total_herbs: number;
    };
    herbs: _HerbEntry[];
  };
  export default data;
}
