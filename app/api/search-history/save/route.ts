import { auth } from "@clerk/nextjs/server";
import { saveSearch } from "@/lib/searchHistoryService";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { herbs?: unknown; drugs?: unknown; severity?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const herbs = Array.isArray(body.herbs) ? (body.herbs as string[]) : [];
  const drugs = Array.isArray(body.drugs) ? (body.drugs as string[]) : [];
  const severity = typeof body.severity === "string" ? body.severity : null;

  if (herbs.length === 0 && drugs.length === 0) {
    return NextResponse.json({ error: "herbs or drugs are required" }, { status: 400 });
  }

  await saveSearch(userId, { herbs, drugs, severity });

  return NextResponse.json({ success: true });
}
