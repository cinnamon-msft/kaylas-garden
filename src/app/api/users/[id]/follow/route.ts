import { NextResponse } from "next/server";
import { followUser, unfollowUser, isFollowing, getUserProfile } from "@/lib/data-social";
import { getAuthUserId } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await getAuthUserId();
    if (userId instanceof NextResponse) return userId;
    const { id } = await context.params;
    const following = await isFollowing(userId, id);
    return NextResponse.json({ following });
  } catch (err: unknown) {
    console.error("GET /api/users/[id]/follow failed:", err);
    const message = err instanceof Error ? err.message : "Failed to check follow status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(
  _request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await getAuthUserId();
    if (userId instanceof NextResponse) return userId;
    const { id } = await context.params;
    await followUser(userId, id);
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/users/[id]/follow failed:", err);
    const message = err instanceof Error ? err.message : "Failed to follow";
    const status = message.includes("yourself") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
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
    await unfollowUser(userId, id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE /api/users/[id]/follow failed:", err);
    const message = err instanceof Error ? err.message : "Failed to unfollow";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
