import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/data-social";
import { getAuthUserId } from "@/lib/auth-helpers";
import type { UserSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getAuthUserId();
    if (userId instanceof NextResponse) return userId;
    const settings = await getSettings(userId);
    return NextResponse.json(settings);
  } catch (err: unknown) {
    console.error("GET /api/settings failed:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const userId = await getAuthUserId();
    if (userId instanceof NextResponse) return userId;
    const body = (await request.json()) as Partial<UserSettings>;
    const updated = await updateSettings(userId, body);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("PUT /api/settings failed:", err);
    const message = err instanceof Error ? err.message : "Failed to update settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
