import { query } from "../lib/db";

(async () => {
  await query("ALTER TABLE shared_links ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ");
  console.log("✅ last_accessed_at column added to shared_links");
  process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
