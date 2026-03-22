/**
 * ingestBatchG.js — 20 herbs across 4 clinical clusters.
 * Resolves Ba Zheng San, Qing Gu San, Pu Ji Xiao Du Yin, Jin Suo Gu Jing Wan
 * and common clinical herbs.
 *
 * Run: node scripts/ingestBatchG.js
 */

const fs = require("fs");
const path = require("path");

const LIB_PATH      = path.resolve(__dirname, "../data/herbLibrary.json");
const FORMULAS_PATH = path.resolve(__dirname, "../data/nccaomFormulas.json");

// ── Herbs to add ─────────────────────────────────────────────────────────────
const NEW_HERBS = [

  // ── Group 1: Common clinical herbs (5) ─────────────────────────────────────
  {
    id: "ge-gen",
    pinyin: "Ge Gen",
    latin: "Pueraria lobata",
    english: "Kudzu Root",
    nccaom_code: "HB-266",
    category: "Release Exterior — Wind Heat",
    taste: ["sweet", "acrid"],
    temperature: "cool",
    channels: ["Spleen", "Stomach"],
    properties: [
      "Releases exterior and reduces fever",
      "Generates fluids and relieves thirst",
      "Lifts Spleen Yang and stops diarrhea",
      "Relieves stiff neck and upper back tension",
      "Vents measles rash",
    ],
    tcm_cautions:
      "Use with caution in patients with Cold in the Stomach or profuse sweating. " +
      "Generally well tolerated at standard dosage.",
  },
  {
    id: "ding-xiang",
    pinyin: "Ding Xiang",
    latin: "Syzygium aromaticum",
    english: "Cloves",
    nccaom_code: "HB-267",
    category: "Warm Interior / Expel Cold",
    taste: ["acrid"],
    temperature: "warm",
    channels: ["Spleen", "Stomach", "Kidney"],
    properties: [
      "Warms middle Jiao",
      "Redirects rebellious Qi downward",
      "Stops hiccough and vomiting",
      "Warms Kidney Yang",
    ],
    tcm_cautions:
      "Contraindicated in excess heat patterns or Yin deficiency with heat signs. " +
      "Incompatible with Yu Jin (Curcuma) — classical incompatibility, do not combine. " +
      "Use with caution in pregnancy.",
  },
  {
    id: "gua-lou-shi",
    pinyin: "Gua Lou Shi",
    latin: "Trichosanthes kirilowii (fruit)",
    english: "Trichosanthes Fruit (Whole)",
    nccaom_code: "HB-268",
    category: "Resolve Phlegm",
    taste: ["sweet", "slightly bitter"],
    temperature: "cold",
    channels: ["Lung", "Stomach", "Large Intestine"],
    properties: [
      "Clears Heat and transforms Phlegm",
      "Expands chest and dissipates nodules",
      "Moistens Lung and dissolves clumps",
      "Lubricates intestines",
    ],
    tcm_cautions:
      "Contraindicated in pregnancy. " +
      "Use with caution in Cold Phlegm patterns or Spleen deficiency with loose stools. " +
      "Incompatible with Wu Tou (Aconite). " +
      "Distinct from Gua Lou Ren (seed only) and Tian Hua Fen (root) — " +
      "whole fruit has broader action on chest and Phlegm.",
  },
  {
    // INTENTIONALLY distinct from dang-gui (whole root) — different processing,
    // different clinical emphasis (tail primarily moves and breaks stasis).
    id: "dang-gui-wei",
    pinyin: "Dang Gui Wei",
    latin: "Angelica sinensis (tail/tip)",
    english: "Angelica Root Tail",
    nccaom_code: "HB-269",
    category: "Regulate Blood / Invigorate Blood",
    taste: ["acrid", "sweet"],
    temperature: "warm",
    channels: ["Heart", "Liver", "Spleen"],
    properties: [
      "Invigorates Blood and breaks stasis",
      "Unblocks the channels",
      "Reduces swelling and alleviates pain",
      "Stronger blood-moving action than whole Dang Gui",
    ],
    tcm_cautions:
      "Contraindicated in pregnancy — stronger blood-moving action than whole root. " +
      "Use with caution in patients on anticoagulant therapy — significant additive anticoagulant risk. " +
      "Contraindicated in hemorrhagic conditions. " +
      "Distinct from Dang Gui (whole root) which both tonifies and moves Blood — " +
      "Wei (tail) primarily moves and breaks stasis.",
  },
  {
    id: "yi-tang",
    pinyin: "Yi Tang",
    latin: "Saccharum granorum",
    english: "Malt Sugar / Maltose",
    nccaom_code: "HB-270",
    category: "Tonify Qi",
    taste: ["sweet"],
    temperature: "slightly warm",
    channels: ["Spleen", "Stomach", "Lung"],
    properties: [
      "Tonifies middle Jiao",
      "Relieves urgency and alleviates pain",
      "Moistens Lung and stops cough",
      "Moderates harsh properties of other herbs",
    ],
    tcm_cautions:
      "Use with caution in patients with Dampness, Phlegm, or middle Jiao fullness. " +
      "Avoid in patients with diabetes or blood sugar regulation issues — dietary sugar content. " +
      "Generally used as a minor herb to moderate formula harshness.",
  },

  // ── Group 2: Cooling / clearing cluster (6) ─────────────────────────────────
  {
    id: "yin-chai-hu",
    pinyin: "Yin Chai Hu",
    latin: "Stellaria dichotoma",
    english: "Stellaria Root",
    nccaom_code: "HB-271",
    category: "Clear Heat",
    taste: ["sweet", "slightly bitter"],
    temperature: "slightly cold",
    channels: ["Liver", "Stomach"],
    properties: [
      "Clears Deficiency Heat",
      "Clears Heat from the nutritive level",
      "Reduces childhood nutritional impairment fever",
    ],
    tcm_cautions:
      "Use with caution in patients without Deficiency Heat patterns. " +
      "Not for excess Heat conditions — use Chai Hu instead for exterior Heat. " +
      "Generally well tolerated.",
  },
  {
    id: "hu-huang-lian",
    pinyin: "Hu Huang Lian",
    latin: "Picrorhiza scrophulariiflora",
    english: "Picrorhiza Rhizome",
    nccaom_code: "HB-272",
    category: "Clear Heat",
    taste: ["bitter"],
    temperature: "cold",
    channels: ["Heart", "Liver", "Stomach", "Large Intestine"],
    properties: [
      "Clears Deficiency Heat",
      "Clears Heat and dries dampness",
      "Reduces childhood nutritional impairment",
      "Cools Blood and stops dysentery",
    ],
    tcm_cautions:
      "Contraindicated in Spleen and Stomach Cold deficiency patterns. " +
      "Use with caution in patients with loose stools or diarrhea from Cold. " +
      "Bitter and cold — use minimum effective dose.",
  },
  {
    id: "di-gu-pi",
    pinyin: "Di Gu Pi",
    latin: "Lycium chinense (root bark)",
    english: "Wolfberry Root Bark / Cortex Lycii",
    nccaom_code: "HB-273",
    category: "Clear Heat",
    taste: ["sweet", "bland"],
    temperature: "cold",
    channels: ["Lung", "Liver", "Kidney"],
    properties: [
      "Clears Deficiency Heat and cools Blood",
      "Clears Lung Heat and stops cough",
      "Generates fluids",
      "Cools Blood and stops bleeding",
    ],
    tcm_cautions:
      "Use with caution in Spleen deficiency with loose stools or Cold patterns. " +
      "Avoid in exterior Wind Cold conditions.",
  },
  {
    id: "ban-lan-gen",
    pinyin: "Ban Lan Gen",
    latin: "Isatis indigotica (root)",
    english: "Isatis Root / Woad Root",
    nccaom_code: "HB-274",
    category: "Clear Heat",
    taste: ["bitter"],
    temperature: "cold",
    channels: ["Heart", "Stomach"],
    properties: [
      "Clears Heat and resolves Fire toxicity",
      "Cools Blood and benefits the throat",
      "Reduces swelling and disperses nodules",
      "Antiviral and antibacterial properties",
    ],
    tcm_cautions:
      "Contraindicated in patients without Heat toxin patterns. " +
      "Use with caution in Spleen and Stomach Cold deficiency. " +
      "Not for long-term use — bitter and cold.",
  },
  {
    id: "ma-bo",
    pinyin: "Ma Bo",
    latin: "Lasiosphaera fenzlii",
    english: "Puffball Mushroom",
    nccaom_code: "HB-275",
    category: "Clear Heat",
    taste: ["acrid"],
    temperature: "neutral",
    channels: ["Lung"],
    properties: [
      "Clears Heat and resolves Fire toxicity",
      "Benefits the throat",
      "Stops bleeding",
      "Used topically for throat and skin lesions",
    ],
    tcm_cautions:
      "Use with caution in patients without Heat toxin patterns or throat inflammation. " +
      "Topical use is common — internal use at standard dosage is generally well tolerated.",
  },
  {
    id: "jiang-can",
    pinyin: "Jiang Can",
    latin: "Bombyx mori (diseased silkworm)",
    english: "Silkworm / Stiff Silkworm",
    nccaom_code: "HB-276",
    category: "Expel Wind",
    taste: ["acrid", "salty"],
    temperature: "neutral",
    channels: ["Liver", "Lung", "Stomach"],
    properties: [
      "Extinguishes Wind and stops spasms",
      "Disperses Wind Heat",
      "Resolves Phlegm and dissipates nodules",
      "Benefits the throat",
    ],
    tcm_cautions:
      "Use with caution in patients with Blood deficiency generating Wind — address root cause. " +
      "Animal-derived substance — verify patient suitability. " +
      "Generally well tolerated at standard dosage.",
  },

  // ── Group 3: Drain dampness cluster — Ba Zheng San (4) ──────────────────────
  {
    id: "bian-xu",
    pinyin: "Bian Xu",
    latin: "Polygonum aviculare",
    english: "Knotgrass",
    nccaom_code: "HB-277",
    category: "Drain Dampness",
    taste: ["bitter"],
    temperature: "slightly cold",
    channels: ["Bladder"],
    properties: [
      "Promotes urination and drains dampness",
      "Clears Heat and unblocks painful urinary dysfunction",
      "Kills parasites and stops itching",
    ],
    tcm_cautions:
      "Use with caution in patients without Damp Heat in the Bladder. " +
      "Avoid in Kidney deficiency patterns. Not for long-term use.",
  },
  {
    id: "qu-mai",
    pinyin: "Qu Mai",
    latin: "Dianthus superbus",
    english: "Fringed Pink / Chinese Pink",
    nccaom_code: "HB-278",
    category: "Drain Dampness",
    taste: ["bitter"],
    temperature: "cold",
    channels: ["Heart", "Small Intestine", "Bladder"],
    properties: [
      "Promotes urination and drains dampness",
      "Clears Heat and unblocks painful urinary dysfunction",
      "Invigorates Blood and unblocks channels",
    ],
    tcm_cautions:
      "Contraindicated in pregnancy — invigorates Blood and may stimulate uterus. " +
      "Use with caution in Spleen deficiency without Damp Heat. " +
      "Not for long-term use.",
  },
  {
    id: "hua-shi",
    pinyin: "Hua Shi",
    latin: "Talcum",
    english: "Talc",
    nccaom_code: "HB-279",
    category: "Drain Dampness",
    taste: ["sweet", "bland"],
    temperature: "cold",
    channels: ["Stomach", "Bladder"],
    properties: [
      "Promotes urination and drains dampness",
      "Clears Heat and releases Summer Heat",
      "Absorbs dampness topically",
    ],
    tcm_cautions:
      "Use with caution in patients without Damp Heat or in patients with Spleen deficiency. " +
      "Contraindicated in pregnancy — use cautiously. " +
      "Mineral-derived substance. Not for long-term internal use.",
  },
  {
    id: "deng-xin-cao",
    pinyin: "Deng Xin Cao",
    latin: "Juncus effusus",
    english: "Rush Pith / Soft Rush",
    nccaom_code: "HB-280",
    category: "Drain Dampness",
    taste: ["sweet", "bland"],
    temperature: "slightly cold",
    channels: ["Heart", "Lung", "Small Intestine"],
    properties: [
      "Promotes urination and drains dampness",
      "Clears Heat from Heart",
      "Calms irritability and restlessness",
    ],
    tcm_cautions:
      "Use with caution in patients without Damp Heat or Heart Fire. " +
      "Generally very mild — well tolerated at standard dosage. " +
      "Often used as a minor guiding herb.",
  },

  // ── Group 4: Stabilize / bind cluster (5) ───────────────────────────────────
  {
    id: "sha-yuan-zi",
    pinyin: "Sha Yuan Zi",
    latin: "Astragalus complanatus (seed)",
    english: "Flattened Milkvetch Seed",
    nccaom_code: "HB-281",
    category: "Tonify Yang",
    taste: ["sweet"],
    temperature: "warm",
    channels: ["Liver", "Kidney"],
    properties: [
      "Tonifies Liver and Kidney",
      "Stabilizes Jing and stops leakage",
      "Brightens eyes",
      "Secures the uterus",
    ],
    tcm_cautions:
      "Use with caution in patterns of excess fire or Yin deficiency with heat signs. " +
      "Generally well tolerated at standard dosage.",
  },
  {
    id: "qian-shi",
    pinyin: "Qian Shi",
    latin: "Euryale ferox (seed)",
    english: "Euryale Seed / Fox Nut",
    nccaom_code: "HB-282",
    category: "Stabilize and Bind",
    taste: ["sweet", "astringent"],
    temperature: "neutral",
    channels: ["Spleen", "Kidney"],
    properties: [
      "Stabilizes Kidney and binds Jing",
      "Strengthens Spleen and stops diarrhea",
      "Resolves dampness and stops leukorrhea",
    ],
    tcm_cautions:
      "Use with caution in patients with constipation or abdominal distension from accumulation. " +
      "Avoid in excess patterns.",
  },
  {
    id: "lian-xu",
    pinyin: "Lian Xu",
    latin: "Nelumbo nucifera (stamen)",
    english: "Lotus Stamen",
    nccaom_code: "HB-283",
    category: "Stabilize and Bind",
    taste: ["sweet", "astringent"],
    temperature: "neutral",
    channels: ["Heart", "Kidney"],
    properties: [
      "Stabilizes Kidney and binds Jing",
      "Clears Heart Heat",
      "Stops bleeding",
      "Astringes and stops leukorrhea",
    ],
    tcm_cautions:
      "Use with caution in patients with constipation or in excess patterns. " +
      "Generally well tolerated at standard dosage.",
  },
  {
    id: "yi-zhi-ren",
    pinyin: "Yi Zhi Ren",
    latin: "Alpinia oxyphylla (fruit)",
    english: "Black Cardamom Fruit / Sharp-Leaf Galangal Fruit",
    nccaom_code: "HB-284",
    category: "Stabilize and Bind",
    taste: ["acrid"],
    temperature: "warm",
    channels: ["Spleen", "Kidney"],
    properties: [
      "Warms Kidney and stabilizes Jing",
      "Warms Spleen and stops diarrhea",
      "Controls salivation and urination",
    ],
    tcm_cautions:
      "Contraindicated in Yin deficiency with heat signs or excess heat patterns. " +
      "Use with caution in patients with hemorrhagic conditions.",
  },
  {
    id: "hai-piao-xiao",
    pinyin: "Hai Piao Xiao",
    latin: "Sepia esculenta (cuttlefish bone)",
    english: "Cuttlefish Bone",
    nccaom_code: "HB-285",
    category: "Stabilize and Bind",
    taste: ["salty", "astringent"],
    temperature: "slightly warm",
    channels: ["Liver", "Kidney"],
    properties: [
      "Stabilizes Jing and stops leukorrhea",
      "Controls acidity and alleviates pain",
      "Stops bleeding",
      "Resolves dampness and promotes healing",
    ],
    tcm_cautions:
      "Use with caution in patients with Yin deficiency Heat or constipation. " +
      "Animal-derived substance — verify patient suitability. " +
      "Generally well tolerated at standard dosage.",
  },
];

// ── Unresolved ID → real ID mapping ──────────────────────────────────────────
const RESOLVE_MAP = {
  "unresolved-ge-gen":        "ge-gen",
  "unresolved-ding-xiang":    "ding-xiang",
  "unresolved-gua-lou-shi":   "gua-lou-shi",
  "unresolved-dang-gui-wei":  "dang-gui-wei",
  "unresolved-yi-tang":       "yi-tang",
  "unresolved-yin-chai-hu":   "yin-chai-hu",
  "unresolved-hu-huang-lian": "hu-huang-lian",
  "unresolved-di-gu-pi":      "di-gu-pi",
  "unresolved-ban-lan-gen":   "ban-lan-gen",
  "unresolved-ma-bo":         "ma-bo",
  "unresolved-jiang-can":     "jiang-can",
  "unresolved-bian-xu":       "bian-xu",
  "unresolved-qu-mai":        "qu-mai",
  "unresolved-hua-shi":       "hua-shi",
  "unresolved-deng-xin-cao":  "deng-xin-cao",
  "unresolved-sha-yuan-zi":   "sha-yuan-zi",
  "unresolved-qian-shi":      "qian-shi",
  "unresolved-lian-xu":       "lian-xu",
  "unresolved-yi-zhi-ren":    "yi-zhi-ren",
  "unresolved-hai-piao-xiao": "hai-piao-xiao",
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
console.log(`\nHerbLibrary: +${herbsAdded} → total ${library.herbs.length}`);

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

  if (formula.unresolved_herbs) {
    const resolvedPinyins = new Set(
      Object.keys(RESOLVE_MAP).map((k) =>
        k.replace("unresolved-", "").replace(/-/g, " ")
      )
    );
    formula.unresolved_herbs = formula.unresolved_herbs.filter(
      (name) => !resolvedPinyins.has(name.toLowerCase())
    );
    if (formula.unresolved_herbs.length === 0) delete formula.unresolved_herbs;
  }
});

fs.writeFileSync(FORMULAS_PATH, JSON.stringify(formulas, null, 2) + "\n", "utf8");
console.log(`\nnccaomFormulas: ${refsResolved} references resolved`);
