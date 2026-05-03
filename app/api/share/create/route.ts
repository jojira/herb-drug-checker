import { query } from "@/lib/db";
import { generateToken } from "@/lib/shareToken";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  if (!body?.searchState) {
    return NextResponse.json({ error: "searchState is required" }, { status: 400 });
  }

  try {
    // Upsert user into users table to get our internal UUID.
    // shared_links.user_id is a UUID FK — Clerk's string ID won't satisfy it.
    const { rows: userRows } = await query(
      `INSERT INTO users (clerk_id)
       VALUES ($1)
       ON CONFLICT (clerk_id) DO UPDATE SET updated_at = now()
       RETURNING id`,
      [userId]
    );
    const internalUserId: string = userRows[0].id;

    const token = generateToken();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://formulens.co";

    await query(
      `INSERT INTO shared_links (token, user_id, payload, expires_at)
       VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')`,
      [token, internalUserId, JSON.stringify(body.searchState)]
    );

    return NextResponse.json({
      success: true,
      token,
      shareUrl: `${appUrl}/share/${token}`,
    });
  } catch (error) {
    console.error("Error creating share link:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
