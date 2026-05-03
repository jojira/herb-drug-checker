import jsPDF from "jspdf";

export interface PDFGeneratorInput {
  herbs: Array<{ id: string; name: string; latin?: string }>;
  drugs: Array<{ name: string; rxcui?: string }>;
  interactions: Array<{
    herbId: string;
    herbName: string;
    drugName: string;
    severity: "contraindicated" | "precaution" | "no_interaction";
    mechanism: string;
  }>;
}

type RGB = [number, number, number];

const SEVERITY_COLOR: Record<string, RGB> = {
  contraindicated: [220, 38, 38],
  precaution: [217, 119, 6],
  no_interaction: [16, 185, 129],
};

const SEVERITY_BG: Record<string, RGB> = {
  contraindicated: [254, 242, 242],
  precaution: [255, 251, 235],
  no_interaction: [236, 253, 245],
};

export function generateInteractionPDF(input: PDFGeneratorInput): Blob {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 15;
  const contentW = pageW - margin * 2;
  let y = 22;

  // ── Header ──────────────────────────────────────────────────────────────────
  pdf.setFontSize(22);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(31, 41, 55);
  pdf.text("Formulens", margin, y);
  y += 7;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(107, 114, 128);
  pdf.text("Clinical Interaction Report", margin, y);
  y += 5;

  pdf.setDrawColor(31, 41, 55);
  pdf.setLineWidth(0.4);
  pdf.line(margin, y, pageW - margin, y);
  y += 9;

  // ── Herbs ────────────────────────────────────────────────────────────────────
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(31, 41, 55);
  pdf.text("Herb / Formula", margin, y);
  y += 6;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(75, 85, 99);
  for (const h of input.herbs) {
    const line = h.latin ? `${h.name}  (${h.latin})` : h.name;
    pdf.text(line, margin + 3, y);
    y += 5;
  }
  y += 4;

  // ── Drugs ─────────────────────────────────────────────────────────────────────
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(31, 41, 55);
  pdf.text("Western Medications", margin, y);
  y += 6;

  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(75, 85, 99);
  for (const d of input.drugs) {
    pdf.text(d.name, margin + 3, y);
    y += 5;
  }
  y += 4;

  // ── Interactions ──────────────────────────────────────────────────────────────
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(31, 41, 55);
  pdf.text("Interaction Analysis", margin, y);
  y += 6;

  if (input.interactions.length === 0) {
    pdf.setFillColor(236, 253, 245);
    pdf.setDrawColor(16, 185, 129);
    pdf.setLineWidth(0.4);
    pdf.roundedRect(margin, y, contentW, 12, 2, 2, "FD");
    pdf.setFontSize(10);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(4, 120, 87);
    pdf.text("No known interactions found based on current clinical data.", margin + 4, y + 7.5);
    y += 17;
  } else {
    for (const ix of input.interactions) {
      const severityColor = SEVERITY_COLOR[ix.severity] ?? SEVERITY_COLOR.no_interaction;
      const bgColor = SEVERITY_BG[ix.severity] ?? SEVERITY_BG.no_interaction;

      pdf.setFontSize(9);
      const mechLines = pdf.splitTextToSize(ix.mechanism, contentW - 10);
      const boxH = 16 + mechLines.length * 4.5;

      // New page if needed
      if (y + boxH > 262) {
        pdf.addPage();
        y = 20;
      }

      pdf.setFillColor(...bgColor);
      pdf.setDrawColor(...severityColor);
      pdf.setLineWidth(0.4);
      pdf.roundedRect(margin, y, contentW, boxH, 2, 2, "FD");

      // Left accent bar
      pdf.setFillColor(...severityColor);
      pdf.rect(margin, y, 1.5, boxH, "F");

      pdf.setFontSize(8);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(...severityColor);
      pdf.text(ix.severity.toUpperCase().replace("_", " "), margin + 5, y + 5.5);

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(31, 41, 55);
      pdf.text(`${ix.herbName}  +  ${ix.drugName}`, margin + 5, y + 11);

      pdf.setFontSize(9);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(75, 85, 99);
      pdf.text(mechLines, margin + 5, y + 16);

      y += boxH + 4;
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────────
  const pageH = pdf.internal.pageSize.getHeight();
  const footerY = pageH - 22;

  pdf.setDrawColor(200, 200, 200);
  pdf.setLineWidth(0.3);
  pdf.line(margin, footerY, pageW - margin, footerY);

  pdf.setFontSize(7);
  pdf.setFont("helvetica", "italic");
  pdf.setTextColor(107, 114, 128);
  pdf.text(`Generated: ${new Date().toLocaleString()}  ·  formulens.co`, margin, footerY + 5);

  const disclaimer =
    "This report is for educational and professional reference only. It does not replace clinical judgment or consultation with a pharmacist. Interaction severity may vary based on dosage and herb-to-drug ratio.";
  const disclaimerLines = pdf.splitTextToSize(disclaimer, contentW);
  pdf.text(disclaimerLines, margin, footerY + 10);

  return pdf.output("blob");
}
