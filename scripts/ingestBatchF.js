/**
 * ingestBatchF.js — Targeted fix for 3 herbs that were incorrectly skipped
 * in Batch E due to over-broad latin matching (different plant parts).
 *
 * Run: node scripts/ingestBatchF.js
 */

const fs = require("fs");
const path = require("path");

const LIB_PATH      = path.resolve(__dirname, "../data/herbLibrary.json");
const FORMULAS_PATH = path.resolve(__dirname, "../data/nccaomFormulas.json");

// ── Herbs to add ─────────────────────────────────────────────────────────────
// These are INTENTIONALLY distinct from existing entries that share the same
// species but differ by plant part:
//   rou-gui  (bark)  ≠  gui-zhi  (twig)   — Cinnamomum cassia
//   zi-su-ye (leaf)  ≠  su-zi    (seed)   — Perilla frutescens
const NEW_HERBS = [
  {
    id: "rou-gui",
    pinyin: "Rou Gui",
    latin: "Cinnamomum cassia (bark)",
    english: "Cinnamon Bark",
    nccaom_code: "HB-263",
    category: "Warm Interior / Expel Cold",
    taste: ["acrid", "sweet"],
    temperature: "hot",
    channels: ["Kidney", "Spleen", "Heart", "Liver"],
    properties: [
      "Warms Kidney Yang and Ming Men Fire",
      "Warms the middle and disperses Cold",
      "Warms and unblocks the channels",
      "Leads fire back to its source",
      "Encourages generation of Qi and Blood",
    ],
    tcm_cautions:
      "Contraindicated in pregnancy. " +
      "Contraindicated in Yin deficiency with heat signs, excess heat patterns, " +
      "or hemorrhagic conditions. " +
      "Use with caution in patients on anticoagulant therapy — may have additive " +
      "blood-thinning effects. " +
      "Distinct from Gui Zhi (cinnamon twig) — different part, stronger warming " +
      "action, deeper clinical reach.",
  },
  {
    id: "zi-su-ye",
    pinyin: "Zi Su Ye",
    latin: "Perilla frutescens (leaf)",
    english: "Perilla Leaf",
    nccaom_code: "HB-264",
    category: "Release Exterior — Wind Cold",
    taste: ["acrid"],
    temperature: "warm",
    channels: ["Lung", "Spleen"],
    properties: [
      "Releases exterior Wind Cold",
      "Promotes Qi movement in middle Jiao",
      "Calms restless fetus",
      "Harmonizes Stomach",
      "Resolves seafood toxicity",
    ],
    tcm_cautions:
      "Use with caution in exterior deficiency with spontaneous sweating. " +
      "Not for long-term use. " +
      "Distinct from Su Zi (Perilla seed) — different part, different primary " +
      "action (Su Zi descends Qi and transforms Phlegm; Zi Su Ye releases exterior).",
  },
  {
    id: "bai-zhi",
    pinyin: "Bai Zhi",
    latin: "Angelica dahurica",
    english: "Dahurian Angelica Root",
    nccaom_code: "HB-265",
    category: "Release Exterior — Wind Cold",
    taste: ["acrid"],
    temperature: "warm",
    channels: ["Lung", "Stomach", "Large Intestine"],
    properties: [
      "Expels Wind and releases exterior",
      "Opens nasal passages",
      "Alleviates pain",
      "Reduces swelling and expels pus",
      "Expels dampness",
    ],
    tcm_cautions:
      "Use with caution in Yin deficiency or Blood deficiency patterns. " +
      "Avoid in patterns with excess sweating or without Wind Cold.",
  },
];

// ── Unresolved ID → real ID mapping for formula patching ─────────────────────
const RESOLVE_MAP = {
  "unresolved-rou-gui":   "rou-gui",
  "unresolved-zi-su-ye":  "zi-su-ye",
  "unresolved-bai-zhi":   "bai-zhi",
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
  console.log(`ADDED:   "${herb.pinyin}" (${herb.id}) [${herb.nccaom_code}]`);
  herbsAdded++;
}

if (library._meta) {
  library._meta.last_updated = new Date().toISOString().split("T")[0];
}
fs.writeFileSync(LIB_PATH, JSON.stringify(library, null, 2) + "\n", "utf8");
console.log(`\nHerbLibrary: +${herbsAdded} herbs → total ${library.herbs.length}`);

// ── 2. Patch formula references ───────────────────────────────────────────────
const formulas = JSON.parse(fs.readFileSync(FORMULAS_PATH, "utf8"));
let refsResolved = 0;

formulas.formulas.forEach((formula) => {
  formula.herb_ids = (formula.herb_ids || []).map((id) => {
    const realId = RESOLVE_MAP[id];
    if (!realId) return id;
    refsResolved++;
    console.log(`  RESOLVED: ${id} → ${realId} [${formula.pinyin}]`);
    return realId;
  });

  // Clean unresolved_herbs list for resolved entries
  if (formula.unresolved_herbs) {
    const resolvedNames = new Set(
      Object.keys(RESOLVE_MAP).map((k) => k.replace("unresolved-", "").replace(/-/g, " "))
    );
    formula.unresolved_herbs = formula.unresolved_herbs.filter(
      (name) => !resolvedNames.has(name.toLowerCase())
    );
    if (formula.unresolved_herbs.length === 0) delete formula.unresolved_herbs;
  }
});

fs.writeFileSync(FORMULAS_PATH, JSON.stringify(formulas, null, 2) + "\n", "utf8");
console.log(`\nnccaomFormulas: ${refsResolved} references resolved`);
