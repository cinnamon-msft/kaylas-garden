import { NextResponse } from "next/server";
import { searchUsers } from "@/lib/data-social";
import { getAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const userId = await getAuthUserId();
    if (userId instanceof NextResponse) return userId;

    const url = new URL(request.url);
    const query = url.searchParams.get("q") || "";

    const results = await searchUsers(query, userId);
    return NextResponse.json(results);
  } catch (err: unknown) {
    console.error("GET /api/users/search failed:", err);
    const message = err instanceof Error ? err.message : "Failed to search users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
