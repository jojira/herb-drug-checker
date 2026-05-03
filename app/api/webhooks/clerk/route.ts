import { Webhook } from "svix";
import { query } from "@/lib/db";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

export async function POST(req: Request) {
  const payload = await req.text();
  const headersList = await headers();

  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
  }

  const wh = new Webhook(secret);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let evt: any;
  try {
    evt = wh.verify(payload, Object.fromEntries(headersList));
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (evt.type === "user.created") {
    const { id: clerkId, email_addresses, unsafe_metadata } = evt.data;
    const email: string | null = email_addresses[0]?.email_address ?? null;

    // partner_id is written to unsafeMetadata by the sign-up page after the
    // cookie is read. It may not be present yet if the webhook fires first
    // (race condition) — the sign-up page also calls /api/user/set-partner
    // as a fallback so attribution is never permanently lost.
    const partnerId: string | null = (unsafe_metadata?.partner_id as string) ?? null;

    try {
      const { rows } = await query(
        `INSERT INTO users (clerk_id, email, partner_id)
         VALUES ($1, $2, $3)
         ON CONFLICT (clerk_id) DO UPDATE
           SET email = EXCLUDED.email, updated_at = now()
         RETURNING id`,
        [clerkId, email, partnerId]
      );

      if (partnerId) {
        await query(
          `INSERT INTO attribution_events (partner_code, event_type, user_id)
           VALUES ($1, $2, $3)`,
          [partnerId, "sign_up", rows[0].id]
        );
      }

      console.log(`✅ User ${clerkId} created — partner: ${partnerId ?? "none"}`);
      return NextResponse.json({ success: true });
    } catch (error) {
      console.error("Error processing user.created:", error);
      return NextResponse.json({ error: String(error) }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
