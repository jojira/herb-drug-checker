import { auth } from "@clerk/nextjs/server";
import { getSearchHistory } from "@/lib/searchHistoryService";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);

  const history = await getSearchHistory(userId, limit, offset);

  return NextResponse.json(history);
}
