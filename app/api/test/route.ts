import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await query("SELECT NOW() as current_time, version() as db_version");

    const tables = await query(`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);

    return NextResponse.json({
      success: true,
      message: "Database connection from Vercel to Railway successful ✅",
      timestamp: result.rows[0].current_time,
      db_version: result.rows[0].db_version,
      tables_created: parseInt(tables.rows[0].table_count),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: String(error),
      },
      { status: 500 }
    );
  }
}
