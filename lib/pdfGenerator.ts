import jsPDF from "jspdf";
import type { SeverityLevel, Citation } from "@/lib/types/clinical";

// ---------------------------------------------------------------------------
// Input contract
// ---------------------------------------------------------------------------

export interface PDFGeneratorInput {
  tcm: {
    name: string;           // pinyin of the selected herb or formula
    latin?: string;         // present for single-herb inputs
    isFormula: boolean;
    constituentHerbs?: Array<{
      id: string;
      name: string;         // pinyin
      latin: string;
      hasInteraction: boolean;
      excluded?: boolean;
    }>;
  };
  drugs: Array<{ name: string; rxcui?: string }>;
  interactions: Array<{
    herbId: string;
    herbName: string;       // pinyin
    herbLatin?: string;
    drugName: string;
    severity: SeverityLevel;
    mechanism: string;
    citations?: Citation[];
  }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type RGB = [number, number, number];

const COLOR: Record<SeverityLevel, { fg: RGB; bg: RGB; bar: RGB }> = {
  contraindicated: {
    fg:  [220,  38,  38],
    bg:  [254, 242, 242],
    bar: [220,  38,  38],
  },
  precaution: {
    fg:  [180,  83,   9],
    bg:  [255, 251, 235],
    bar: [217, 119,   6],
  },
  none: {
    fg:  [  4, 120,  87],
    bg:  [236, 253, 245],
    bar: [ 16, 185, 129],
  },
};

const LABEL: Record<SeverityLevel, string> = {
  contraindicated: "CONTRAINDICATED",
  precaution:      "PRECAUTION",
  none:            "NO INTERACTION",
};

const TEAL:       RGB = [  5, 150, 105];
const SLATE_900:  RGB = [ 15,  23,  42];
const SLATE_600:  RGB = [ 71,  85, 105];
const SLATE_400:  RGB = [148, 163, 184];
const SLATE_200:  RGB = [226, 232, 240];
const WHITE:      RGB = [255, 255, 255];

const PAGE_W  = 210;        // A4 mm
const MARGIN  = 14;
const CONTENT = PAGE_W - MARGIN * 2;
const PAGE_H  = 297;
const FOOTER  = PAGE_H - 24; // top of footer zone

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sectionTitle(pdf: jsPDF, text: string, y: number): number {
  pdf.setFontSize(7.5);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...TEAL);
  pdf.text(text.toUpperCase(), MARGIN, y);
  y += 1;
  pdf.setDrawColor(...TEAL);
  pdf.setLineWidth(0.3);
  pdf.line(MARGIN, y, MARGIN + CONTENT, y);
  return y + 4;
}

function ensureSpace(pdf: jsPDF, y: number, needed: number): number {
  if (y + needed > FOOTER) {
    pdf.addPage();
    return 18;
  }
  return y;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function generateInteractionPDF(input: PDFGeneratorInput): Blob {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = 16;

  // ── Report header ─────────────────────────────────────────────────────────

  pdf.setFontSize(15);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...TEAL);
  pdf.text("Formulens", MARGIN, y);

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(...SLATE_600);
  pdf.text("Clinical Interaction Report", MARGIN + 31, y);
  y += 4.5;

  pdf.setFontSize(7.5);
  pdf.setTextColor(...SLATE_400);
  pdf.text(
    `Patient chart documentation  ·  Generated ${new Date().toLocaleString()}  ·  formulens.co`,
    MARGIN,
    y
  );
  y += 2;

  pdf.setDrawColor(...SLATE_200);
  pdf.setLineWidth(0.4);
  pdf.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 6;

  // ── Severity summary banner ───────────────────────────────────────────────

  const worst: SeverityLevel = input.interactions.length === 0
    ? "none"
    : input.interactions.some(i => i.severity === "contraindicated")
      ? "contraindicated"
      : "precaution";

  const bannerColors = COLOR[worst];
  const bannerH = 10;
  pdf.setFillColor(...bannerColors.bg);
  pdf.setDrawColor(...bannerColors.bar);
  pdf.setLineWidth(0.5);
  pdf.roundedRect(MARGIN, y, CONTENT, bannerH, 1.5, 1.5, "FD");

  pdf.setFillColor(...bannerColors.bar);
  pdf.rect(MARGIN, y, 2, bannerH, "F");

  pdf.setFontSize(9);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...bannerColors.fg);
  pdf.text(
    worst === "contraindicated" ? "⚠  CONTRAINDICATED RISK" :
    worst === "precaution"      ? "⚠  PRECAUTION REQUIRED" :
                                  "✓  NO KNOWN INTERACTIONS",
    MARGIN + 5,
    y + 6.5
  );

  pdf.setFontSize(8);
  pdf.setFont("helvetica", "normal");
  const summaryRight =
    worst === "contraindicated" ? "Critical herb-drug interaction detected" :
    worst === "precaution"      ? "Monitor patient closely" :
                                  "Based on current clinical data";
  pdf.text(summaryRight, PAGE_W - MARGIN - pdf.getTextWidth(summaryRight), y + 6.5);

  y += bannerH + 6;

  // ── TCM herb / formula ────────────────────────────────────────────────────

  y = sectionTitle(pdf, "TCM Herb / Formula", y);

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(...SLATE_900);
  pdf.text(input.tcm.name, MARGIN, y);
  y += 5;

  if (!input.tcm.isFormula && input.tcm.latin) {
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(...SLATE_600);
    pdf.text(input.tcm.latin, MARGIN, y);
    y += 5;
  }

  if (input.tcm.isFormula && input.tcm.constituentHerbs && input.tcm.constituentHerbs.length > 0) {
    const herbs = input.tcm.constituentHerbs;

    pdf.setFontSize(7.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...SLATE_600);
    pdf.text(`Constituent herbs (${herbs.length}):`, MARGIN, y);
    y += 4;

    for (const h of herbs) {
      y = ensureSpace(pdf, y, 5);

      // Interaction marker
      if (h.hasInteraction && !h.excluded) {
        pdf.setFontSize(7);
        pdf.setTextColor(...COLOR.contraindicated.fg);
        pdf.text("⚠", MARGIN + 2, y);
      } else if (h.excluded) {
        pdf.setFontSize(7);
        pdf.setTextColor(...SLATE_400);
        pdf.text("–", MARGIN + 2, y);
      } else {
        pdf.setFontSize(7);
        pdf.setTextColor(...COLOR.none.fg);
        pdf.text("•", MARGIN + 2, y);
      }

      pdf.setFontSize(8);
      pdf.setFont("helvetica", h.excluded ? "normal" : "normal");
      pdf.setTextColor(h.excluded ? SLATE_400[0] : SLATE_900[0], h.excluded ? SLATE_400[1] : SLATE_900[1], h.excluded ? SLATE_400[2] : SLATE_900[2]);
      const herbLine = `${h.name}`;
      pdf.text(herbLine, MARGIN + 6, y);

      pdf.setFontSize(7.5);
      pdf.setFont("helvetica", "italic");
      pdf.setTextColor(...SLATE_600);
      const latinX = MARGIN + 6 + pdf.getTextWidth(herbLine) + 2;
      pdf.text(h.latin, latinX, y);

      if (h.excluded) {
        pdf.setFontSize(6.5);
        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...SLATE_400);
        pdf.text("(excluded)", latinX + pdf.getTextWidth(h.latin) + 2, y);
      }

      y += 4;
    }
    y += 2;
  }

  // ── Western medications ───────────────────────────────────────────────────

  y = ensureSpace(pdf, y, 20);
  y = sectionTitle(pdf, "Western Medications", y);

  for (const d of input.drugs) {
    y = ensureSpace(pdf, y, 5);
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...SLATE_900);
    pdf.text(`• ${d.name}`, MARGIN, y);
    if (d.rxcui) {
      pdf.setFontSize(7);
      pdf.setTextColor(...SLATE_400);
      pdf.text(`RxCUI ${d.rxcui}`, PAGE_W - MARGIN - pdf.getTextWidth(`RxCUI ${d.rxcui}`), y);
    }
    y += 5;
  }
  y += 3;

  // ── Interaction details ───────────────────────────────────────────────────

  y = ensureSpace(pdf, y, 20);
  y = sectionTitle(pdf, "Interaction Analysis", y);

  if (input.interactions.length === 0) {
    pdf.setFillColor(...COLOR.none.bg);
    pdf.setDrawColor(...COLOR.none.bar);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(MARGIN, y, CONTENT, 11, 1.5, 1.5, "FD");
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(...COLOR.none.fg);
    pdf.text("No clinically significant interactions detected for this combination.", MARGIN + 4, y + 7);
    y += 16;
  } else {
    // Sort: contraindicated first, then precaution
    const sorted = [...input.interactions].sort((a, b) => {
      const order = { contraindicated: 0, precaution: 1, none: 2 };
      return order[a.severity] - order[b.severity];
    });

    for (const ix of sorted) {
      const colors = COLOR[ix.severity];

      pdf.setFontSize(8.5);
      const mechLines = pdf.splitTextToSize(ix.mechanism, CONTENT - 12);

      // Citations (render up to 3)
      const cites = (ix.citations ?? []).filter(c => c.title).slice(0, 3);
      const citeLines = cites.map((c, i) =>
        `[${i + 1}] ${c.title}${c.journal ? ` · ${c.journal}` : ""}${c.year ? `, ${c.year}` : ""}`
      );
      const allCiteText = citeLines.flatMap(l => pdf.splitTextToSize(l, CONTENT - 14));

      const boxH = 7 + mechLines.length * 4.2 + (cites.length > 0 ? 3 + allCiteText.length * 3.5 : 0) + 3;

      y = ensureSpace(pdf, y, boxH + 4);

      // Card background
      pdf.setFillColor(...colors.bg);
      pdf.setDrawColor(...colors.bar);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(MARGIN, y, CONTENT, boxH, 1.5, 1.5, "FD");

      // Left accent bar
      pdf.setFillColor(...colors.bar);
      pdf.rect(MARGIN, y, 2, boxH, "F");

      // Severity label
      pdf.setFontSize(7);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...colors.fg);
      pdf.text(LABEL[ix.severity], MARGIN + 4, y + 4.5);

      // Herb + drug pairing
      pdf.setFontSize(9.5);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...SLATE_900);
      pdf.text(`${ix.herbName}  +  ${ix.drugName}`, MARGIN + 4, y + 10);

      let cardY = y + 15;

      // Mechanism
      pdf.setFontSize(8);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(...SLATE_600);
      pdf.text(mechLines, MARGIN + 4, cardY);
      cardY += mechLines.length * 4.2 + 2;

      // Citations
      if (cites.length > 0) {
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "italic");
        pdf.setTextColor(...SLATE_400);
        pdf.text("References:", MARGIN + 4, cardY);
        cardY += 3.5;
        pdf.text(allCiteText, MARGIN + 4, cardY);
      }

      y += boxH + 4;
    }
  }

  // ── Footer (last page) ────────────────────────────────────────────────────

  const totalPages = (pdf.internal as { getNumberOfPages?: () => number }).getNumberOfPages?.() ?? 1;
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setDrawColor(...SLATE_200);
    pdf.setLineWidth(0.3);
    pdf.line(MARGIN, FOOTER, PAGE_W - MARGIN, FOOTER);

    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "italic");
    pdf.setTextColor(...SLATE_400);
    pdf.text(
      `Generated ${new Date().toLocaleString()}  ·  formulens.co  ·  Page ${p} of ${totalPages}`,
      MARGIN,
      FOOTER + 4.5
    );

    const disclaimer =
      "Educational and professional reference only. Does not replace clinical judgment or pharmacist consultation. " +
      "Severity may vary by dosage and herb-to-drug ratio. Standard clinical dosages assumed.";
    pdf.setFontSize(6.5);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(...SLATE_400);
    const dLines = pdf.splitTextToSize(disclaimer, CONTENT);
    pdf.text(dLines, MARGIN, FOOTER + 9);
  }

  return pdf.output("blob");
}
