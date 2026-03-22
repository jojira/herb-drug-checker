/**
 * ingestBatchH.js — Restricted and toxic substance herbs.
 *
 * Special handling:
 *   - Xi Jiao: NOT added as herb entry — unresolved-xi-jiao redirected to
 *     existing shui-niu-jiao (accepted clinical substitute, already in library)
 *   - Zhu Sha / Xiong Huang: discontinued: true (heavy metal toxicity)
 *   - She Xiang / Ling Yang Jiao: restricted: true (CITES)
 *   - Niu Huang / Long Chi / Zhen Zhu: standard animal/mineral entries
 *
 * Run: node scripts/ingestBatchH.js
 */

const fs = require("fs");
const path = require("path");

const LIB_PATH      = path.resolve(__dirname, "../data/herbLibrary.json");
const FORMULAS_PATH = path.resolve(__dirname, "../data/nccaomFormulas.json");

// ── Herbs to add (xi-jiao intentionally excluded) ────────────────────────────
const NEW_HERBS = [

  // ── Category 1: Heavy metal compounds (discontinued) ─────────────────────
  {
    id: "zhu-sha",
    pinyin: "Zhu Sha",
    latin: "Cinnabaris (mercuric sulfide)",
    english: "Cinnabar",
    nccaom_code: "HB-286",
    category: "Calm Shen",
    discontinued: true,
    taste: ["sweet"],
    temperature: "cold",
    channels: ["Heart"],
    properties: [
      "Clears Heat and calms Shen",
      "Sedates and relieves anxiety",
      "Resolves Fire toxicity",
      "Classically used for palpitations and insomnia",
    ],
    tcm_cautions:
      "DISCONTINUED IN MODERN PRACTICE. " +
      "Contains mercury sulfide — cumulative heavy metal toxicity with repeated use. " +
      "Banned or restricted in many jurisdictions including the USA, EU, and Canada. " +
      "Do not prescribe internally. Included for formula composition reference only. " +
      "Modern substitutes: Hu Po (amber) or Long Gu (fossil bone) for Shen-calming action.",
  },
  {
    id: "xiong-huang",
    pinyin: "Xiong Huang",
    latin: "Realgar (arsenic disulfide)",
    english: "Realgar / Arsenic Disulfide",
    nccaom_code: "HB-287",
    category: "Clear Heat",
    discontinued: true,
    taste: ["acrid"],
    temperature: "warm",
    channels: ["Liver", "Large Intestine", "Stomach"],
    properties: [
      "Resolves Fire toxicity",
      "Kills parasites",
      "Dries dampness",
      "Classically used for skin lesions and abscesses",
    ],
    tcm_cautions:
      "DISCONTINUED IN MODERN PRACTICE. " +
      "Contains arsenic — highly toxic with cumulative heavy metal poisoning risk. " +
      "Banned or restricted in most jurisdictions for internal use. " +
      "Do not prescribe internally. Included for formula composition reference only. " +
      "External topical use under specialist supervision only.",
  },

  // ── Category 2: CITES restricted ─────────────────────────────────────────
  {
    id: "she-xiang",
    pinyin: "She Xiang",
    latin: "Moschus berezovskii (musk)",
    english: "Musk",
    nccaom_code: "HB-288",
    category: "Open Orifices",
    restricted: true,
    taste: ["acrid"],
    temperature: "warm",
    channels: ["Heart", "Liver", "Spleen"],
    properties: [
      "Opens Orifices and revives consciousness",
      "Invigorates Blood and disperses stasis",
      "Alleviates pain",
      "Reduces swelling and resolves toxicity",
    ],
    tcm_cautions:
      "CITES restricted — natural musk from Moschus species is internationally controlled. " +
      "Verify legal status in your jurisdiction before prescribing. " +
      "Contraindicated in pregnancy — strong Blood-moving action. " +
      "Modern clinical practice uses synthetic musk (artificial She Xiang) as the accepted " +
      "substitute — confirm with supplier that synthetic form is being used.",
  },
  {
    id: "ling-yang-jiao",
    pinyin: "Ling Yang Jiao",
    latin: "Saiga tatarica (horn)",
    english: "Antelope Horn",
    nccaom_code: "HB-289",
    category: "Extinguish Wind and Stop Tremors",
    restricted: true,
    taste: ["salty"],
    temperature: "cold",
    channels: ["Liver", "Heart"],
    properties: [
      "Extinguishes Liver Wind and stops tremors",
      "Clears Liver Heat and brightens eyes",
      "Clears Heat and resolves toxicity",
      "Calms Shen and relieves convulsions",
    ],
    tcm_cautions:
      "CITES Appendix II restricted — Saiga antelope is endangered. " +
      "Verify legal status and sourcing in your jurisdiction. " +
      "Accepted substitute: Shan Yang Jiao (goat horn) for non-critical formulas. " +
      "Use with caution in Cold patterns or without Liver Heat and Wind.",
  },

  // ── Category 3: Standard animal/mineral products ──────────────────────────
  {
    id: "niu-huang",
    pinyin: "Niu Huang",
    latin: "Bos taurus (gallstone)",
    english: "Cattle Gallstone / Bezoar",
    nccaom_code: "HB-290",
    category: "Open Orifices",
    taste: ["bitter"],
    temperature: "cool",
    channels: ["Heart", "Liver"],
    properties: [
      "Opens Orifices and revives consciousness",
      "Clears Heat and resolves Fire toxicity",
      "Extinguishes Wind and stops tremors",
      "Reduces swelling",
    ],
    tcm_cautions:
      "Contraindicated in pregnancy. " +
      "Use with caution in patients without Heat toxin or excess patterns. " +
      "Animal-derived substance — verify patient suitability. " +
      "Natural Niu Huang is scarce — confirm authentic sourcing. " +
      "Synthetic Niu Huang (Ren Gong Niu Huang) is widely used as a substitute.",
  },
  {
    id: "long-chi",
    pinyin: "Long Chi",
    latin: "Dens Draconis (fossil teeth)",
    english: "Dragon Teeth / Fossilized Teeth",
    nccaom_code: "HB-291",
    category: "Calm Shen",
    taste: ["astringent", "sweet"],
    temperature: "cool",
    channels: ["Heart", "Liver"],
    properties: [
      "Calms Shen and relieves anxiety",
      "Settles and calms the Heart",
      "Stronger Shen-calming action than Long Gu",
      "Anchors floating Yang",
    ],
    tcm_cautions:
      "Use with caution in exterior pathogenic conditions — may trap pathogens. " +
      "Animal/mineral-derived substance (fossilized). " +
      "Often used interchangeably with Long Gu but with stronger sedating action. " +
      "Generally well tolerated at standard dosage.",
  },
  {
    id: "zhen-zhu",
    pinyin: "Zhen Zhu",
    latin: "Pteria martensii (pearl)",
    english: "Pearl",
    nccaom_code: "HB-292",
    category: "Calm Shen",
    taste: ["sweet", "salty"],
    temperature: "cold",
    channels: ["Heart", "Liver"],
    properties: [
      "Calms Shen and relieves anxiety",
      "Clears Liver Heat and brightens eyes",
      "Clears Heat and resolves toxicity",
      "Promotes healing of skin lesions (topical)",
    ],
    tcm_cautions:
      "Use with caution in Cold patterns or Spleen deficiency. " +
      "Animal-derived substance (mollusk). " +
      "Generally well tolerated at standard dosage. " +
      "Use prepared/powdered form — unprepared pearl is not bioavailable.",
  },
];

// ── Unresolved ID → real ID mapping ──────────────────────────────────────────
// Xi Jiao is handled separately (redirect to substitute, not a new entry)
const RESOLVE_MAP = {
  "unresolved-xi-jiao":        "shui-niu-jiao",  // redirect to accepted substitute
  "unresolved-zhu-sha":        "zhu-sha",
  "unresolved-xiong-huang":    "xiong-huang",
  "unresolved-she-xiang":      "she-xiang",
  "unresolved-ling-yang-jiao": "ling-yang-jiao",
  "unresolved-niu-huang":      "niu-huang",
  "unresolved-long-chi":       "long-chi",
  "unresolved-zhen-zhu":       "zhen-zhu",
};

// ── 1. Add herbs to library ───────────────────────────────────────────────────
const library = JSON.parse(fs.readFileSync(LIB_PATH, "utf8"));
const existingIds = new Set(library.herbs.map((h) => h.id));

let herbsAdded = 0;
for (const herb of NEW_HERBS) {
  if (existingIds.has(herb.id)) {
    console.log(`SKIPPED: "${herb.pinyin}" — id "${herb.id}" already exists`);
    continue;
  }
  library.herbs.push(herb);
  existingIds.add(herb.id);
  const flags = [
    herb.discontinued ? "discontinued:true" : null,
    herb.restricted   ? "restricted:true"   : null,
  ].filter(Boolean).join(" ");
  console.log(`ADDED:   "${herb.pinyin}" (${herb.id}) [${herb.nccaom_code}]${flags ? " — " + flags : ""}`);
  herbsAdded++;
}

if (library._meta) {
  library._meta.last_updated = new Date().toISOString().split("T")[0];
}
fs.writeFileSync(LIB_PATH, JSON.stringify(library, null, 2) + "\n", "utf8");
console.log(`\nHerbLibrary: +${herbsAdded} → total ${library.herbs.length}`);

// ── 2. Patch formula references (including xi-jiao → shui-niu-jiao) ──────────
const formulas = JSON.parse(fs.readFileSync(FORMULAS_PATH, "utf8"));
let refsResolved = 0;

formulas.formulas.forEach((formula) => {
  formula.herb_ids = (formula.herb_ids || []).map((id) => {
    const realId = RESOLVE_MAP[id];
    if (!realId) return id;
    refsResolved++;
    const note = id === "unresolved-xi-jiao" ? " [REDIRECT → substitute]" : "";
    console.log(`  RESOLVED: ${id} → ${realId} [${formula.pinyin}]${note}`);
    return realId;
  });

  if (formula.unresolved_herbs) {
    const resolvedNames = new Set(
      Object.keys(RESOLVE_MAP).map((k) =>
        k.replace("unresolved-", "").replace(/-/g, " ")
      )
    );
    // Also catch "xi jiao" variant
    resolvedNames.add("xi jiao");
    formula.unresolved_herbs = formula.unresolved_herbs.filter(
      (name) => !resolvedNames.has(name.toLowerCase())
    );
    if (formula.unresolved_herbs.length === 0) delete formula.unresolved_herbs;
  }
});

fs.writeFileSync(FORMULAS_PATH, JSON.stringify(formulas, null, 2) + "\n", "utf8");
console.log(`\nnccaomFormulas: ${refsResolved} references resolved`);
console.log("NOTE: xi-jiao → shui-niu-jiao (no xi-jiao herb entry created)");
