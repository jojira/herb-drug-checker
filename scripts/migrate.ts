import * as fs from "fs";
import * as path from "path";
import { Client } from "pg";

async function migrate() {
  const url = process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("❌  DATABASE_PUBLIC_URL or DATABASE_URL not set in environment");
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });

  const schemaPath = path.join(process.cwd(), "db/schema.sql");
  const sql = fs.readFileSync(schemaPath, "utf8");

  console.log("🔌  Connecting to database…");
  await client.connect();

  console.log("📐  Running schema migration…");
  await client.query(sql);

  console.log("✅  Schema applied successfully");

  const { rows } = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);
  console.log("📋  Tables:", rows.map((r) => r.table_name).join(", "));

  await client.end();
}

migrate().catch((err) => {
  console.error("❌  Migration failed:", err.message);
  process.exit(1);
});
