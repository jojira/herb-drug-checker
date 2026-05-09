import { auth, clerkClient } from "@clerk/nextjs/server";
import { cookies } from "next/headers";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cookieStore = await cookies();
  const partnerId = cookieStore.get("formulens_ref")?.value ?? null;

  if (!partnerId) {
    return NextResponse.json({ error: "No referral cookie" }, { status: 400 });
  }

  const client = await clerkClient();
  await client.users.updateUserMetadata(userId, {
    publicMetadata: { partner_id: partnerId },
  });

  // Upsert attribution record — idempotent (DO NOTHING on conflict)
  try {
    const { rows } = await query(
      `SELECT id FROM users WHERE clerk_id = $1`,
      [userId]
    );
    if (rows.length > 0) {
      await query(
        `INSERT INTO attribution_events (partner_code, event_type, user_id)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING`,
        [partnerId, "sign_up", rows[0].id]
      );
    }
  } catch (err) {
    // Non-fatal — metadata is already set; DB attribution is best-effort
    console.error("Attribution DB write failed (non-fatal):", err);
  }

  return NextResponse.json({ success: true, partnerId });
}
