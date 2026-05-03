import { query } from "../lib/db";

(async () => {
  try {
    const result = await query("SELECT NOW() as current_time");
    console.log("✅ Database connection successful");
    console.log("Current time:", result.rows[0].current_time);

    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log("\n📋 Tables found:");
    tables.rows.forEach((row: { table_name: string }) => {
      console.log(`  - ${row.table_name}`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Connection failed:", error);
    process.exit(1);
  }
})();
