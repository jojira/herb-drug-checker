import { query } from "../lib/db";

(async () => {
  await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_id TEXT");
  console.log("✅ partner_id column added to users");
  process.exit(0);
})().catch((err) => { console.error(err); process.exit(1); });
