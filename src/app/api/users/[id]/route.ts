import { NextResponse } from "next/server";
import { getUserProfile, getPlants } from "@/lib/data-social";
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
    const profile = await getUserProfile(id);
    if (!profile) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    // Include their plants (public garden view)
    const plants = await getPlants(id);
    return NextResponse.json({ ...profile, plants });
  } catch (err: unknown) {
    console.error("GET /api/users/[id] failed:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
