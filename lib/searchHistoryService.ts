import { query } from "@/lib/db";

export interface SearchSavePayload {
  herbs: string[];
  drugs: string[];
  severity?: string | null;
}

export interface SearchHistoryEntry {
  id: string;
  clerk_id: string;
  herbs: string[];
  drugs: string[];
  result_severity: string | null;
  searched_at: string;
}

export interface SearchHistoryResponse {
  entries: SearchHistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export async function saveSearch(
  clerkId: string,
  payload: SearchSavePayload
): Promise<void> {
  try {
    await query(
      `INSERT INTO search_history (clerk_id, herbs, drugs, result_severity)
       VALUES ($1, $2, $3, $4)`,
      [clerkId, payload.herbs, payload.drugs, payload.severity ?? null]
    );
  } catch (error) {
    // Non-critical — never let logging break the main flow
    console.error("Failed to save search history:", error);
  }
}

export async function getSearchHistory(
  clerkId: string,
  limit = 50,
  offset = 0
): Promise<SearchHistoryResponse> {
  try {
    const countResult = await query(
      "SELECT COUNT(*) as total FROM search_history WHERE clerk_id = $1",
      [clerkId]
    );
    const total = parseInt(countResult.rows[0].total, 10);

    const result = await query(
      `SELECT id, clerk_id, herbs, drugs, result_severity, searched_at
       FROM search_history
       WHERE clerk_id = $1
       ORDER BY searched_at DESC
       LIMIT $2 OFFSET $3`,
      [clerkId, limit, offset]
    );

    return { entries: result.rows, total, limit, offset };
  } catch (error) {
    console.error("Failed to retrieve search history:", error);
    return { entries: [], total: 0, limit, offset };
  }
}
