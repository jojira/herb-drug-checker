/**
 * ingestBatchI.js — 15 common NCCAOM clinical herbs.
 *
 * Categories:
 *   - Drain Dampness:     Yi Yi Ren, Di Fu Zi
 *   - Release Exterior:   Chan Tui
 *   - Tonify Yin:         Yu Zhu
 *   - Resolve Phlegm:     Sang Bai Pi, Chuan Bei Mu, Tian Zhu Huang
 *   - Regulate Blood:     Jiang Huang
 *   - Tonify Yang:        Bu Gu Zhi, Rou Cong Rong, Tu Si Zi*, Xu Duan
 *   - Clear Heat:         Bai Mao Gen, Lu Gen
 *   - Calm Shen:          Hu Po (modern substitute for Zhu Sha)
 *
 * * Tu Si Zi already in library — duplicate check will skip it.
 *
 * Run: node scripts/ingestBatchI.js
 */

const fs = require("fs");
const path = require("path");

const LIB_PATH      = path.resolve(__dirname, "../data/herbLibrary.json");
const FORMULAS_PATH = path.resolve(__dirname, "../data/nccaomFormulas.json");

// ── Herbs to add ──────────────────────────────────────────────────────────────
const NEW_HERBS = [

  // ── Drain Dampness ────────────────────────────────────────────────────────
  {
    id: "yi-yi-ren",
    pinyin: "Yi Yi Ren",
    latin: "Coix lacryma-jobi (seed)",
    english: "Job's Tears Seed / Coix Seed",
    nccaom_code: "HB-293",
    category: "Drain Dampness",
    taste: ["sweet", "bland"],
    temperature: "slightly cool",
    channels: ["Spleen", "Stomach", "Lung"],
    properties: [
      "Promotes urination and leaches out Dampness",
      "Strengthens Spleen and stops diarrhea",
      "Clears Heat and expels pus",
      "Clears Damp-Heat and alleviates Bi syndrome",
    ],
    tcm_cautions:
      "Use with caution in pregnancy — large doses may stimulate uterus. " +
      "Use with caution in Yin deficiency or excess dryness. " +
      "Generally considered a food-grade herb — well tolerated at standard dosage.",
  },
  {
    id: "di-fu-zi",
    pinyin: "Di Fu Zi",
    latin: "Kochia scoparia (fruit)",
    english: "Broom Cypress Fruit / Kochia Fruit",
    nccaom_code: "HB-294",
    category: "Drain Dampness",
    taste: ["bitter", "sweet"],
    temperature: "cold",
    channels: ["Kidney", "Urinary Bladder"],
    properties: [
      "Clears Heat and promotes urination",
      "Drains Damp-Heat from the Lower Jiao",
      "Stops itching",
      "Classically used for Damp-Heat dysuria and genital itching",
    ],
    tcm_cautions:
      "Use with caution in pregnancy. " +
      "Use with caution in patients without Damp-Heat pattern. " +
      "Generally well tolerated at standard dosage.",
  },

  // ── Release Exterior ──────────────────────────────────────────────────────
  {
    id: "chan-tui",
    pinyin: "Chan Tui",
    latin: "Cryptotympana pustulata (molting)",
    english: "Cicada Molting / Cicada Shell",
    nccaom_code: "HB-295",
    category: "Release Exterior Wind-Heat",
    taste: ["sweet", "salty"],
    temperature: "slightly cold",
    channels: ["Lung", "Liver"],
    properties: [
      "Disperses Wind-Heat and benefits the throat",
      "Vents rashes and relieves itching",
      "Calms Liver Wind and stops spasms",
      "Brightens eyes and removes superficial visual obstruction",
    ],
    tcm_cautions:
      "Use with caution in pregnancy — may cause uterine contractions in large doses. " +
      "Animal-derived substance (insect exuvia) — verify patient suitability. " +
      "Generally well tolerated at standard dosage.",
  },

  // ── Tonify Yin ────────────────────────────────────────────────────────────
  {
    id: "yu-zhu",
    pinyin: "Yu Zhu",
    latin: "Polygonatum odoratum (rhizome)",
    english: "Solomon's Seal Rhizome / Fragrant Solomon's Seal",
    nccaom_code: "HB-296",
    category: "Tonify Yin",
    taste: ["sweet"],
    temperature: "slightly cold",
    channels: ["Lung", "Stomach"],
    properties: [
      "Nourishes Yin and moistens dryness",
      "Nourishes Stomach Yin and generates fluids",
      "Clears Lung dryness-heat",
      "Used for Yin deficiency with exterior Wind pathogen",
    ],
    tcm_cautions:
      "Use with caution in patients with Spleen deficiency with Dampness or Phlegm. " +
      "May cause nausea or fullness if Spleen is deficient — combine with digestive herbs. " +
      "Avoid in Cold-Damp patterns. " +
      "Generally well tolerated.",
  },

  // ── Resolve Phlegm ────────────────────────────────────────────────────────
  {
    id: "sang-bai-pi",
    pinyin: "Sang Bai Pi",
    latin: "Morus alba (root bark)",
    english: "White Mulberry Root Bark",
    nccaom_code: "HB-297",
    category: "Resolve Phlegm and Stop Cough",
    taste: ["sweet"],
    temperature: "cold",
    channels: ["Lung"],
    properties: [
      "Drains Lung Heat and stops cough",
      "Calms wheezing and dyspnea",
      "Promotes urination and reduces edema",
      "Classically used for Lung Heat with cough and facial edema",
    ],
    tcm_cautions:
      "Contraindicated in Wind-Cold cough or Lung deficiency cold pattern. " +
      "Use with caution in patients without Heat pattern. " +
      "Generally well tolerated at standard dosage.",
  },
  {
    id: "chuan-bei-mu",
    pinyin: "Chuan Bei Mu",
    latin: "Fritillaria cirrhosa (bulb)",
    english: "Sichuan Fritillaria Bulb",
    nccaom_code: "HB-298",
    category: "Resolve Phlegm and Stop Cough",
    taste: ["bitter", "sweet"],
    temperature: "slightly cold",
    channels: ["Lung", "Heart"],
    properties: [
      "Clears Heat and transforms Phlegm",
      "Moistens Lung and stops cough",
      "Dissipates nodules and reduces swellings",
      "Used for chronic dry cough from Lung Yin deficiency",
    ],
    tcm_cautions:
      "Incompatible with Wu Tou (Aconite root) per classical 18 incompatibilities. " +
      "Do not combine with Wu Tou, Chuan Wu, or Cao Wu. " +
      "Distinguish from Zhe Bei Mu — Chuan Bei Mu is for deficiency Phlegm-Heat; " +
      "Zhe Bei Mu is stronger for excess Phlegm-Heat and nodules. " +
      "Generally well tolerated at standard dosage.",
  },
  {
    id: "tian-zhu-huang",
    pinyin: "Tian Zhu Huang",
    latin: "Bambusa textilis (secretion)",
    english: "Tabasheer / Bamboo Silica Concretion",
    nccaom_code: "HB-299",
    category: "Resolve Phlegm and Stop Cough",
    taste: ["sweet"],
    temperature: "cold",
    channels: ["Heart", "Liver"],
    properties: [
      "Clears Heat and transforms Phlegm",
      "Clears Heart and calms Shen",
      "Stops convulsions — used for Phlegm-Heat misting the Heart",
      "Pediatric use: febrile convulsions with Phlegm obstruction",
    ],
    tcm_cautions:
      "Use with caution in Cold or Spleen deficiency patterns. " +
      "Primarily for excess Phlegm-Heat — not for Phlegm-Cold. " +
      "Mineral/plant-derived substance — generally well tolerated.",
  },

  // ── Regulate Blood ────────────────────────────────────────────────────────
  {
    id: "jiang-huang",
    pinyin: "Jiang Huang",
    latin: "Curcuma longa (rhizome)",
    english: "Turmeric Rhizome",
    nccaom_code: "HB-300",
    category: "Regulate Blood",
    taste: ["acrid", "bitter"],
    temperature: "warm",
    channels: ["Spleen", "Liver"],
    properties: [
      "Invigorates Blood and unblocks menstruation",
      "Moves Qi and alleviates pain",
      "Expels Wind and promotes movement in the limbs",
      "Used for shoulder and arm pain from Wind-Damp-Blood stasis",
    ],
    tcm_cautions:
      "Contraindicated in pregnancy — strong Blood-moving action. " +
      "Caution with anticoagulants (warfarin, aspirin, heparin) — additive bleeding risk. " +
      "Monitor INR in patients on warfarin if combined. " +
      "Use with caution in Yin deficiency or Blood deficiency without stasis. " +
      "Distinguish from E Zhu (Curcuma zedoaria) — stronger Blood-breaking action.",
  },

  // ── Tonify Yang ───────────────────────────────────────────────────────────
  {
    id: "bu-gu-zhi",
    pinyin: "Bu Gu Zhi",
    latin: "Psoralea corylifolia (fruit)",
    english: "Psoralea Fruit / Babchi Fruit",
    nccaom_code: "HB-301",
    category: "Tonify Yang",
    taste: ["acrid", "bitter"],
    temperature: "very warm",
    channels: ["Kidney", "Spleen"],
    properties: [
      "Tonifies Kidney Yang and stabilizes Jing",
      "Warms Spleen Yang and stops diarrhea",
      "Warms Kidney and alleviates urinary frequency",
      "Used for dawn diarrhea (wu geng xie) from Kidney-Spleen Yang deficiency",
    ],
    tcm_cautions:
      "Contraindicated in Yin deficiency with Heat signs or excess Heat patterns. " +
      "Caution with photosensitizing drugs — psoralens in Bu Gu Zhi may increase photosensitivity. " +
      "Use with caution in patients on immunosuppressants. " +
      "Generally well tolerated at standard dosage in cold patterns.",
  },
  {
    id: "rou-cong-rong",
    pinyin: "Rou Cong Rong",
    latin: "Cistanche deserticola (stem)",
    english: "Cistanche Stem / Fleshy Stem of Broomrape",
    nccaom_code: "HB-302",
    category: "Tonify Yang",
    taste: ["sweet", "salty"],
    temperature: "warm",
    channels: ["Kidney", "Large Intestine"],
    properties: [
      "Tonifies Kidney Yang and augments Jing and Blood",
      "Moistens Intestines and unblocks bowels",
      "Used for Kidney Yang deficiency with constipation in elderly",
      "Gentle tonic — suitable for elderly or debilitated patients",
    ],
    tcm_cautions:
      "Contraindicated in Yin deficiency with Heat or excess Heat patterns. " +
      "Use with caution in diarrhea or loose stools. " +
      "Large doses may cause loose stools — monitor bowel function. " +
      "Generally well tolerated at standard dosage.",
  },
  // Tu Si Zi intentionally included — duplicate check will skip (already in library as id: tu-si-zi)
  {
    id: "tu-si-zi",
    pinyin: "Tu Si Zi",
    latin: "Cuscuta chinensis (seed)",
    english: "Chinese Dodder Seed",
    nccaom_code: "HB-303",
    category: "Tonify Yang",
    taste: ["acrid", "sweet"],
    temperature: "neutral",
    channels: ["Kidney", "Liver"],
    properties: [
      "Tonifies Kidney Yang and augments Yin",
      "Secures Jing and reduces urination",
      "Tonifies Liver and brightens eyes",
      "Calms fetus — used for threatened miscarriage from Kidney deficiency",
    ],
    tcm_cautions:
      "Use with caution in patients with excess Heat or Yin deficiency Heat. " +
      "Generally well tolerated — neutral temperature makes it suitable for both Yin and Yang tonification.",
  },
  {
    id: "xu-duan",
    pinyin: "Xu Duan",
    latin: "Dipsacus asper (root)",
    english: "Japanese Teasel Root",
    nccaom_code: "HB-304",
    category: "Tonify Yang",
    taste: ["bitter", "sweet", "acrid"],
    temperature: "slightly warm",
    channels: ["Kidney", "Liver"],
    properties: [
      "Tonifies Liver and Kidney, strengthens sinews and bones",
      "Stops uterine bleeding and calms the fetus",
      "Promotes movement of Blood and alleviates pain",
      "Used for traumatic injury, fractures, and ligament injuries",
    ],
    tcm_cautions:
      "Use with caution in patients with Yin deficiency or excess Heat. " +
      "Generally well tolerated at standard dosage. " +
      "Classic herb for musculoskeletal trauma and bone fracture support.",
  },

  // ── Clear Heat ────────────────────────────────────────────────────────────
  {
    id: "bai-mao-gen",
    pinyin: "Bai Mao Gen",
    latin: "Imperata cylindrica (rhizome)",
    english: "Woolly Grass Rhizome / Cogon Grass Rhizome",
    nccaom_code: "HB-305",
    category: "Clear Heat",
    taste: ["sweet"],
    temperature: "cold",
    channels: ["Lung", "Stomach", "Urinary Bladder"],
    properties: [
      "Cools Blood and stops bleeding",
      "Clears Heat and promotes urination",
      "Clears Stomach Heat and stops vomiting",
      "Used for hematemesis, hematuria, and epistaxis from Heat in Blood",
    ],
    tcm_cautions:
      "Use with caution in Cold patterns or Spleen deficiency with loose stools. " +
      "Caution in patients without Heat in Blood pattern. " +
      "Generally well tolerated at standard dosage.",
  },
  {
    id: "lu-gen",
    pinyin: "Lu Gen",
    latin: "Phragmites communis (rhizome)",
    english: "Reed Rhizome",
    nccaom_code: "HB-306",
    category: "Clear Heat",
    taste: ["sweet"],
    temperature: "cold",
    channels: ["Lung", "Stomach"],
    properties: [
      "Clears Heat and generates fluids",
      "Clears Stomach Heat and stops vomiting",
      "Clears Lung Heat and expels pus",
      "Promotes urination and reduces febrile thirst",
    ],
    tcm_cautions:
      "Use with caution in patients with Spleen deficiency or Cold Stomach patterns. " +
      "Generally well tolerated — a gentle, food-grade herb. " +
      "Standard dosage: 15–30g fresh, 9–15g dried.",
  },

  // ── Calm Shen ─────────────────────────────────────────────────────────────
  {
    id: "hu-po",
    pinyin: "Hu Po",
    latin: "Succinum (amber)",
    english: "Amber",
    nccaom_code: "HB-307",
    category: "Calm Shen",
    taste: ["sweet"],
    temperature: "neutral",
    channels: ["Heart", "Liver", "Urinary Bladder"],
    properties: [
      "Calms Shen and relieves fright and anxiety",
      "Invigorates Blood and dissipates stasis",
      "Promotes urination and unblocks Lin syndrome",
      "Modern substitute for Zhu Sha (cinnabar) — no mercury toxicity",
    ],
    tcm_cautions:
      "Use with caution in patients with Yin deficiency without excess patterns. " +
      "Generally well tolerated — safe modern substitute for Zhu Sha. " +
      "Mineral-derived (fossilized tree resin) — verify patient suitability. " +
      "Must be powdered and swallowed, not decocted.",
  },
];

// ── Unresolved ID → real ID mapping ──────────────────────────────────────────
const RESOLVE_MAP = {
  "unresolved-yi-yi-ren":      "yi-yi-ren",
  "unresolved-di-fu-zi":       "di-fu-zi",
  "unresolved-chan-tui":        "chan-tui",
  "unresolved-yu-zhu":         "yu-zhu",
  "unresolved-sang-bai-pi":    "sang-bai-pi",
  "unresolved-chuan-bei-mu":   "chuan-bei-mu",
  "unresolved-tian-zhu-huang": "tian-zhu-huang",
  "unresolved-jiang-huang":    "jiang-huang",
  "unresolved-bu-gu-zhi":      "bu-gu-zhi",
  "unresolved-rou-cong-rong":  "rou-cong-rong",
  "unresolved-tu-si-zi":       "tu-si-zi",
  "unresolved-xu-duan":        "xu-duan",
  "unresolved-bai-mao-gen":    "bai-mao-gen",
  "unresolved-lu-gen":         "lu-gen",
  "unresolved-hu-po":          "hu-po",
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
    const resolvedNames = new Set(
      Object.keys(RESOLVE_MAP).map((k) =>
        k.replace("unresolved-", "").replace(/-/g, " ")
      )
    );
    formula.unresolved_herbs = formula.unresolved_herbs.filter(
      (name) => !resolvedNames.has(name.toLowerCase())
    );
    if (formula.unresolved_herbs.length === 0) delete formula.unresolved_herbs;
  }
});

fs.writeFileSync(FORMULAS_PATH, JSON.stringify(formulas, null, 2) + "\n", "utf8");
console.log(`\nnccaomFormulas: ${refsResolved} references resolved`);
