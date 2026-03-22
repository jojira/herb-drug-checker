/**
 * ingestBatchE.js — One-shot ingestion script for Batch E herbs.
 * Adds 22 herbs to herbLibrary.json. Skips any already present by id or latin.
 * Run: node scripts/ingestBatchE.js
 */

const fs = require("fs");
const path = require("path");

const LIB_PATH = path.resolve(__dirname, "../data/herbLibrary.json");

const NEW_HERBS = [
  // ── Tier 1 ──────────────────────────────────────────────────────────────
  {
    id: "qiang-huo",
    pinyin: "Qiang Huo",
    latin: "Notopterygium incisum",
    english: "Notopterygium Root",
    nccaom_code: "HB-241",
    category: "Release Exterior — Wind Cold",
    taste: ["acrid", "bitter"],
    temperature: "warm",
    channels: ["Bladder", "Kidney"],
    properties: [
      "Releases exterior",
      "Disperses Wind Cold",
      "Unblocks painful obstruction",
      "Alleviates pain",
      "Guides Qi to Tai Yang and Du Mai",
    ],
    tcm_cautions:
      "Use with caution in patients with Yin or Blood deficiency. " +
      "Strong dispersing action — avoid in deficiency patterns without exterior condition. " +
      "May cause nausea in sensitive individuals.",
  },
  {
    id: "ma-huang",
    pinyin: "Ma Huang",
    latin: "Ephedra sinica",
    english: "Ephedra",
    nccaom_code: "HB-242",
    category: "Release Exterior — Wind Cold",
    taste: ["acrid", "slightly bitter"],
    temperature: "warm",
    channels: ["Lung", "Bladder"],
    properties: [
      "Promotes sweating",
      "Releases exterior",
      "Disperses Lung Qi",
      "Stops wheezing",
      "Promotes urination",
      "Reduces edema",
    ],
    tcm_cautions:
      "Contraindicated in hypertension, heart disease, or insomnia. " +
      "Contraindicated in spontaneous sweating from deficiency. " +
      "Powerful diaphoretic — not for long-term use. " +
      "Drug interactions: MAOIs, cardiac stimulants, antihypertensives.",
  },
  {
    id: "sang-ye",
    pinyin: "Sang Ye",
    latin: "Morus alba",
    english: "Mulberry Leaf",
    nccaom_code: "HB-243",
    category: "Release Exterior — Wind Heat",
    taste: ["sweet", "bitter"],
    temperature: "cold",
    channels: ["Lung", "Liver"],
    properties: [
      "Disperses Wind Heat",
      "Clears Lung Heat",
      "Stops coughing",
      "Cools Liver",
      "Clears Liver Heat",
      "Brightens eyes",
    ],
    tcm_cautions:
      "Use with caution in Cold Lung patterns or Spleen deficiency with loose stools. " +
      "Generally well tolerated at standard dosage.",
  },

  // ── Tier 2 (previously thought to be in library) ─────────────────────────
  {
    id: "e-jiao",
    pinyin: "E Jiao",
    latin: "Equus asinus (hide gelatin)",
    english: "Donkey-Hide Gelatin",
    nccaom_code: "HB-244",
    category: "Blood Tonifying",
    taste: ["sweet"],
    temperature: "neutral",
    channels: ["Lung", "Liver", "Kidney"],
    properties: [
      "Tonifies and nourishes Blood",
      "Stops bleeding",
      "Nourishes Yin",
      "Moistens Lung",
    ],
    tcm_cautions:
      "Heavy and cloying — use with caution in Spleen deficiency with dampness or poor digestion. " +
      "May cause nausea. Dissolve separately in warm liquid or rice wine. " +
      "Animal-derived — verify patient suitability.",
  },
  {
    id: "ju-hua",
    pinyin: "Ju Hua",
    latin: "Chrysanthemum morifolium",
    english: "Chrysanthemum Flower",
    nccaom_code: "HB-245",
    category: "Release Exterior — Wind Heat",
    taste: ["sweet", "bitter"],
    temperature: "slightly cold",
    channels: ["Lung", "Liver"],
    properties: [
      "Disperses Wind Heat",
      "Clears Liver Heat",
      "Brightens eyes",
      "Calms Liver Yang",
      "Resolves toxicity",
    ],
    tcm_cautions:
      "Use with caution in Cold patterns, Qi deficiency, or Spleen deficiency with diarrhea. " +
      "Generally well tolerated at standard dosage.",
  },
  {
    id: "wu-zhu-yu",
    pinyin: "Wu Zhu Yu",
    latin: "Evodia rutaecarpa",
    english: "Evodia Fruit",
    nccaom_code: "HB-246",
    category: "Warm the Interior / Expel Cold",
    taste: ["acrid", "bitter"],
    temperature: "hot",
    channels: ["Liver", "Spleen", "Stomach", "Kidney"],
    properties: [
      "Warms middle Jiao",
      "Disperses Cold",
      "Redirects rebellious Qi downward",
      "Alleviates pain",
      "Dries dampness",
      "Stops vomiting",
    ],
    tcm_cautions:
      "Toxic in large doses — do not exceed recommended dosage. " +
      "Contraindicated in Yin deficiency with heat signs or excess heat patterns. " +
      "Prefer short-term use. Use with caution in pregnancy.",
  },
  {
    id: "ba-ji-tian",
    pinyin: "Ba Ji Tian",
    latin: "Morinda officinalis",
    english: "Morinda Root",
    nccaom_code: "HB-247",
    category: "Tonify Yang",
    taste: ["acrid", "sweet"],
    temperature: "slightly warm",
    channels: ["Kidney", "Liver"],
    properties: [
      "Tonifies Kidney Yang",
      "Strengthens sinews and bones",
      "Expels Wind Damp",
      "Alleviates pain",
    ],
    tcm_cautions:
      "Contraindicated in Yin deficiency with heat signs, excess fire, or damp-heat conditions. " +
      "Use with caution in patients without clear Kidney Yang deficiency pattern.",
  },

  // ── Tier 2 — New herbs ──────────────────────────────────────────────────
  {
    id: "bai-bian-dou",
    pinyin: "Bai Bian Dou",
    latin: "Dolichos lablab",
    english: "White Hyacinth Bean",
    nccaom_code: "HB-248",
    category: "Tonify Qi",
    taste: ["sweet"],
    temperature: "slightly warm",
    channels: ["Spleen", "Stomach"],
    properties: [
      "Tonifies Spleen",
      "Resolves dampness",
      "Harmonizes middle Jiao",
      "Clears Summer Heat",
    ],
    tcm_cautions:
      "Use with caution in patterns of cold and dampness. " +
      "Generally well tolerated at standard dosage.",
  },
  {
    id: "bei-sha-shen",
    pinyin: "Bei Sha Shen",
    latin: "Adenophora stricta",
    english: "Ladybell Root",
    nccaom_code: "HB-249",
    category: "Tonify Yin",
    taste: ["sweet", "slightly bitter"],
    temperature: "slightly cold",
    channels: ["Lung", "Stomach"],
    properties: [
      "Nourishes Lung Yin",
      "Clears Lung Heat",
      "Nourishes Stomach Yin",
      "Generates fluids",
    ],
    tcm_cautions:
      "Contraindicated in Wind Cold cough or Cold patterns. " +
      "Use with caution in Spleen deficiency with loose stools.",
  },
  {
    id: "chuan-lian-zi",
    pinyin: "Chuan Lian Zi",
    latin: "Melia toosendan",
    english: "Sichuan Pagoda Tree Fruit / Chinaberry",
    nccaom_code: "HB-250",
    category: "Regulate Qi",
    taste: ["bitter"],
    temperature: "cold",
    channels: ["Liver", "Small Intestine", "Bladder"],
    properties: [
      "Moves Liver Qi",
      "Alleviates pain",
      "Clears Heat",
      "Kills parasites",
    ],
    tcm_cautions:
      "Toxic — do not exceed recommended dosage. " +
      "Contraindicated in Cold patterns or Spleen and Stomach deficiency. " +
      "Not for long-term use. Use with caution in pregnancy.",
  },
  {
    id: "dan-nan-xing",
    pinyin: "Dan Nan Xing",
    latin: "Arisaema erubescens (bile-processed)",
    english: "Bile-Processed Arisaema",
    nccaom_code: "HB-251",
    category: "Resolve Phlegm",
    taste: ["bitter"],
    temperature: "cool",
    channels: ["Lung", "Liver", "Spleen"],
    properties: [
      "Clears Heat",
      "Transforms Phlegm",
      "Calms Wind",
      "Stops convulsions",
    ],
    tcm_cautions:
      "Use with caution in Cold Phlegm patterns or Spleen deficiency. " +
      "Prepared form only — raw Nan Xing is toxic. Verify processed form for internal use.",
  },
  {
    id: "gua-lou-ren",
    pinyin: "Gua Lou Ren",
    latin: "Trichosanthes kirilowii (seed)",
    english: "Trichosanthes Seed",
    nccaom_code: "HB-252",
    category: "Resolve Phlegm",
    taste: ["sweet"],
    temperature: "cold",
    channels: ["Lung", "Stomach", "Large Intestine"],
    properties: [
      "Clears Heat",
      "Transforms Phlegm",
      "Moistens Lung",
      "Lubricates intestines",
      "Reduces abscesses",
    ],
    tcm_cautions:
      "Contraindicated in pregnancy. " +
      "Use with caution in Spleen deficiency with loose stools or Cold Phlegm patterns. " +
      "Incompatible with Wu Tou (Aconite).",
  },
  {
    id: "lai-fu-zi",
    pinyin: "Lai Fu Zi",
    latin: "Raphanus sativus",
    english: "Radish Seed",
    nccaom_code: "HB-253",
    category: "Reduce Food Stagnation",
    taste: ["acrid", "sweet"],
    temperature: "neutral",
    channels: ["Spleen", "Stomach", "Lung"],
    properties: [
      "Reduces food stagnation",
      "Descends Qi",
      "Transforms Phlegm",
      "Reduces distension",
    ],
    tcm_cautions:
      "Avoid in Qi deficiency patterns — strongly moves and descends Qi. " +
      "Traditionally incompatible with Ren Shen (Ginseng) — do not combine.",
  },
  {
    id: "lian-zi",
    pinyin: "Lian Zi",
    latin: "Nelumbo nucifera (seed)",
    english: "Lotus Seed",
    nccaom_code: "HB-254",
    category: "Stabilize and Bind",
    taste: ["sweet", "astringent"],
    temperature: "neutral",
    channels: ["Heart", "Spleen", "Kidney"],
    properties: [
      "Tonifies Spleen",
      "Stops diarrhea",
      "Tonifies Kidney",
      "Stabilizes Jing",
      "Nourishes Heart",
      "Calms Shen",
    ],
    tcm_cautions:
      "Use with caution in patients with constipation or abdominal distension from excess patterns. " +
      "Generally well tolerated.",
  },
  {
    id: "mai-ya",
    pinyin: "Mai Ya",
    latin: "Hordeum vulgare (sprouted)",
    english: "Barley Sprout",
    nccaom_code: "HB-255",
    category: "Reduce Food Stagnation",
    taste: ["sweet"],
    temperature: "neutral",
    channels: ["Spleen", "Stomach", "Liver"],
    properties: [
      "Reduces food stagnation",
      "Harmonizes middle Jiao",
      "Inhibits lactation",
      "Smooths Liver Qi",
    ],
    tcm_cautions:
      "Contraindicated in breastfeeding mothers — strongly inhibits lactation. " +
      "Use with caution during pregnancy.",
  },
  {
    id: "mo-yao",
    pinyin: "Mo Yao",
    latin: "Commiphora myrrha",
    english: "Myrrh",
    nccaom_code: "HB-256",
    category: "Regulate Blood / Invigorate Blood",
    taste: ["bitter"],
    temperature: "neutral",
    channels: ["Heart", "Liver", "Spleen"],
    properties: [
      "Invigorates Blood",
      "Dispels stasis",
      "Alleviates pain",
      "Reduces swelling",
      "Generates flesh",
    ],
    tcm_cautions:
      "Contraindicated in pregnancy. " +
      "Contraindicated in patients without Blood stasis. " +
      "Use with caution in patients on anticoagulant therapy — additive blood-thinning risk.",
  },
  {
    id: "qian-hu",
    pinyin: "Qian Hu",
    latin: "Peucedanum praeruptorum",
    english: "Hogfennel Root",
    nccaom_code: "HB-257",
    category: "Resolve Phlegm",
    taste: ["bitter", "acrid"],
    temperature: "slightly cold",
    channels: ["Lung"],
    properties: [
      "Redirects Lung Qi downward",
      "Expels Phlegm",
      "Releases exterior",
      "Disperses Wind Heat",
    ],
    tcm_cautions:
      "Use with caution in patients without Phlegm Heat or in Cold cough patterns. " +
      "Generally well tolerated at standard dosage.",
  },
  {
    id: "ru-xiang",
    pinyin: "Ru Xiang",
    latin: "Boswellia carterii",
    english: "Frankincense / Olibanum",
    nccaom_code: "HB-258",
    category: "Regulate Blood / Invigorate Blood",
    taste: ["acrid", "bitter"],
    temperature: "warm",
    channels: ["Heart", "Liver", "Spleen"],
    properties: [
      "Invigorates Blood",
      "Moves Qi",
      "Alleviates pain",
      "Reduces swelling",
      "Generates flesh",
      "Relaxes sinews",
    ],
    tcm_cautions:
      "Contraindicated in pregnancy. " +
      "Use with caution in patients without Blood stasis or Qi stagnation. " +
      "Use with caution in patients on anticoagulant therapy.",
  },
  {
    id: "shan-zha",
    pinyin: "Shan Zha",
    latin: "Crataegus pinnatifida",
    english: "Hawthorn Fruit",
    nccaom_code: "HB-259",
    category: "Reduce Food Stagnation",
    taste: ["sour", "sweet"],
    temperature: "slightly warm",
    channels: ["Spleen", "Stomach", "Liver"],
    properties: [
      "Reduces food stagnation",
      "Transforms accumulations",
      "Invigorates Blood",
      "Disperses stasis",
      "Stops diarrhea",
    ],
    tcm_cautions:
      "Use with caution in Spleen deficiency without food stagnation. " +
      "Avoid on empty stomach. " +
      "Use with caution in patients on cardiac medications — may have additive cardiovascular effects.",
  },
  {
    id: "shui-niu-jiao",
    pinyin: "Shui Niu Jiao",
    latin: "Bubalus bubalis (horn)",
    english: "Water Buffalo Horn",
    nccaom_code: "HB-260",
    category: "Clear Heat",
    taste: ["bitter", "salty"],
    temperature: "cold",
    channels: ["Heart", "Liver"],
    properties: [
      "Clears Heat",
      "Cools Blood",
      "Resolves toxicity",
      "Calms Shen",
      "Extinguishes Wind",
    ],
    tcm_cautions:
      "Contraindicated in Cold patterns or Qi and Blood deficiency without heat signs. " +
      "Animal-derived substance — verify patient suitability. " +
      "Substitutes for Xi Jiao (Rhinoceros Horn) in all classical formulas.",
  },
  {
    id: "tian-hua-fen",
    pinyin: "Tian Hua Fen",
    latin: "Trichosanthes kirilowii (root)",
    english: "Trichosanthes Root",
    nccaom_code: "HB-261",
    category: "Clear Heat",
    taste: ["bitter", "sweet"],
    temperature: "cold",
    channels: ["Lung", "Stomach"],
    properties: [
      "Clears Heat",
      "Generates fluids",
      "Relieves toxicity",
      "Expels pus",
      "Reduces swelling",
    ],
    tcm_cautions:
      "Contraindicated in pregnancy — historically used as an abortifacient. " +
      "Do not use in Cold patterns or Spleen deficiency with diarrhea. " +
      "Incompatible with Wu Tou (Aconite).",
  },
  {
    id: "yu-jin",
    pinyin: "Yu Jin",
    latin: "Curcuma aromatica",
    english: "Curcuma Root / Turmeric Root",
    nccaom_code: "HB-262",
    category: "Regulate Blood / Invigorate Blood",
    taste: ["acrid", "bitter"],
    temperature: "cold",
    channels: ["Heart", "Liver", "Gallbladder"],
    properties: [
      "Invigorates Blood",
      "Dispels stasis",
      "Moves Qi",
      "Clears Heat",
      "Cools Blood",
      "Opens Orifices",
      "Clears Heart and calms Shen",
    ],
    tcm_cautions:
      "Contraindicated in pregnancy. " +
      "Use with caution in patients on anticoagulant therapy — may potentiate anticoagulant effects. " +
      "Incompatible with clove (Ding Xiang).",
  },
];

// ── Load library ──────────────────────────────────────────────────────────────
const library = JSON.parse(fs.readFileSync(LIB_PATH, "utf8"));
const existingIds     = new Set(library.herbs.map((h) => h.id));
const existingPinyins = new Set(library.herbs.map((h) => h.pinyin.toLowerCase()));
const existingLatins  = new Set(library.herbs.map((h) => h.latin.toLowerCase()));

let added = 0;
let skipped = 0;

for (const herb of NEW_HERBS) {
  // Exact match only — do NOT strip part qualifiers (seed/root/etc.)
  // Different plant parts of the same species are distinct herbs
  const isDupe =
    existingIds.has(herb.id) ||
    existingPinyins.has(herb.pinyin.toLowerCase()) ||
    existingLatins.has(herb.latin.toLowerCase());

  if (isDupe) {
    console.log(`SKIPPED: "${herb.pinyin}" already in library`);
    skipped++;
    continue;
  }

  library.herbs.push(herb);
  existingIds.add(herb.id);
  existingPinyins.add(herb.pinyin.toLowerCase());
  existingLatins.add(herb.latin.toLowerCase());
  console.log(`ADDED:   "${herb.pinyin}" (${herb.id})`);
  added++;
}

// ── Write back ────────────────────────────────────────────────────────────────
if (library._meta) {
  library._meta.last_updated = new Date().toISOString().split("T")[0];
}
fs.writeFileSync(LIB_PATH, JSON.stringify(library, null, 2) + "\n", "utf8");

console.log(`\nDone. Added: ${added}  Skipped: ${skipped}  Total herbs: ${library.herbs.length}`);
