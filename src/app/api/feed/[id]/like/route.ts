import { NextResponse } from "next/server";
import { likeFeedItem, unlikeFeedItem } from "@/lib/data-social";
import { getAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  _request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await getAuthUserId();
    if (userId instanceof NextResponse) return userId;
    const { id } = await context.params;
    await likeFeedItem(userId, id);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/feed/[id]/like failed:", err);
    const message = err instanceof Error ? err.message : "Failed to like";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await getAuthUserId();
    if (userId instanceof NextResponse) return userId;
    const { id } = await context.params;
    await unlikeFeedItem(userId, id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE /api/feed/[id]/like failed:", err);
    const message = err instanceof Error ? err.message : "Failed to unlike";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
