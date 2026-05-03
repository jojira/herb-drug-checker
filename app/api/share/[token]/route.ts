import { query } from "@/lib/db";
import { isValidTokenFormat } from "@/lib/shareToken";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!isValidTokenFormat(token)) {
    return NextResponse.json({ error: "Invalid token format" }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT id, payload, expires_at, view_count
       FROM shared_links
       WHERE token = $1`,
      [token]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: "Share link not found" }, { status: 404 });
    }

    const link = result.rows[0];

    if (link.expires_at && new Date(link.expires_at) < new Date()) {
      await query("DELETE FROM shared_links WHERE token = $1", [token]);
      return NextResponse.json({ error: "Share link has expired" }, { status: 410 });
    }

    await query(
      `UPDATE shared_links
       SET view_count = view_count + 1, last_accessed_at = NOW()
       WHERE token = $1`,
      [token]
    );

    return NextResponse.json({
      success: true,
      searchState: link.payload,
      viewCount: link.view_count + 1,
    });
  } catch (error) {
    console.error("Error fetching share link:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
