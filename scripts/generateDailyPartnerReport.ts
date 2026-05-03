import { query } from "../lib/db";
import * as fs from "fs";
import * as path from "path";

interface PartnerMetrics {
  partner_code: string;
  sign_ups: number;
  first_searches: number;
  pdf_exports: number;
  shares: number;
  total_events: number;
}

interface DailyReport {
  report_date: string;
  generated_at: string;
  partners: PartnerMetrics[];
  summary: {
    total_partners: number;
    total_sign_ups: number;
    total_events: number;
  };
}

async function generateDailyPartnerReport(dateStr?: string): Promise<DailyReport> {
  const date = dateStr ? new Date(dateStr) : new Date();
  if (!dateStr) date.setDate(date.getDate() - 1); // default: yesterday

  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  console.log(`📊 Generating report for ${startOfDay.toISOString().split("T")[0]}...`);

  const result = await query(
    `SELECT partner_code, event_type, COUNT(*) as count
     FROM attribution_events
     WHERE occurred_at >= $1 AND occurred_at < $2
     GROUP BY partner_code, event_type
     ORDER BY partner_code, event_type`,
    [startOfDay, endOfDay]
  );

  const partnerMap = new Map<string, PartnerMetrics>();

  for (const row of result.rows) {
    const code: string = row.partner_code;
    if (!partnerMap.has(code)) {
      partnerMap.set(code, {
        partner_code: code,
        sign_ups: 0,
        first_searches: 0,
        pdf_exports: 0,
        shares: 0,
        total_events: 0,
      });
    }
    const m = partnerMap.get(code)!;
    const count = parseInt(row.count, 10);
    switch (row.event_type) {
      case "sign_up":       m.sign_ups        += count; break;
      case "first_search":  m.first_searches  += count; break;
      case "pdf_export":    m.pdf_exports      += count; break;
      case "share":         m.shares           += count; break;
    }
    m.total_events += count;
  }

  const partners = [...partnerMap.values()].sort((a, b) => b.total_events - a.total_events);

  return {
    report_date: startOfDay.toISOString().split("T")[0],
    generated_at: new Date().toISOString(),
    partners,
    summary: {
      total_partners: partners.length,
      total_sign_ups: partners.reduce((s, p) => s + p.sign_ups, 0),
      total_events:   partners.reduce((s, p) => s + p.total_events, 0),
    },
  };
}

function toCSV(report: DailyReport): string {
  const headers = ["Partner Code", "Sign Ups", "First Searches", "PDF Exports", "Shares", "Total Events"];
  const rows = report.partners.map((p) => [
    p.partner_code,
    p.sign_ups,
    p.first_searches,
    p.pdf_exports,
    p.shares,
    p.total_events,
  ].join(","));
  return [headers.join(","), ...rows].join("\n");
}

async function main() {
  const dateArg = process.argv[2];

  const report = await generateDailyPartnerReport(dateArg);

  console.log("\n📋 Report (JSON):");
  console.log(JSON.stringify(report, null, 2));

  const csv = toCSV(report);
  console.log("\n📋 Report (CSV):");
  console.log(csv);

  const reportsDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });

  const filepath = path.join(reportsDir, `partner-report-${report.report_date}.json`);
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  console.log(`\n✅ Saved to ${filepath}`);

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Report generation failed:", err);
  process.exit(1);
});
