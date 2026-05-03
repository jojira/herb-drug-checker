import { Pool, QueryResult } from "pg";

const pool = new Pool({
  // Vercel can't reach Railway's internal network — prefer the public URL.
  // DATABASE_URL (internal) is only reachable from within Railway itself.
  connectionString: process.env.DATABASE_PUBLIC_URL ?? process.env.DATABASE_URL,
  // SSL required for Railway
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export async function query(
  text: string,
  params?: unknown[]
): Promise<QueryResult> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (duration > 100) {
      console.warn(`Slow query (${duration}ms): ${text.substring(0, 50)}...`);
    }
    return result;
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

export async function getClient() {
  return pool.connect();
}

export async function close() {
  await pool.end();
}
