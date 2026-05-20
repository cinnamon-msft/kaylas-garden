import { NextResponse } from "next/server";
import { getFeed } from "@/lib/data-social";
import { getAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const userId = await getAuthUserId();
    if (userId instanceof NextResponse) return userId;

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "50", 10);
    const offset = parseInt(url.searchParams.get("offset") || "0", 10);

    const feed = await getFeed(userId, limit, offset);
    return NextResponse.json(feed);
  } catch (err: unknown) {
    console.error("GET /api/feed failed:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch feed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
