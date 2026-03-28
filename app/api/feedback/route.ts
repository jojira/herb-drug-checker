import { NextRequest, NextResponse } from "next/server";
import type { FeedbackPayload } from "@/lib/types/clinical";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const payload = body as Partial<FeedbackPayload>;

  if (!payload.type || !payload.message) {
    return NextResponse.json(
      { error: "Missing required fields: type and message" },
      { status: 400 }
    );
  }

  const webhookUrl = process.env.FEEDBACK_WEBHOOK_URL;

  if (!webhookUrl) {
    // Dev mode — log to console, still return success so the UI shows "Thank you"
    console.log("[Feedback — dev mode]", JSON.stringify(payload, null, 2));
    return NextResponse.json({ success: true, dev: true });
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Webhook responded ${res.status}`);
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Feedback webhook error]", message);
    // Never 500 to the client — practitioner must always see the thank you message
    return NextResponse.json({ success: false, error: message });
  }
}
