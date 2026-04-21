import { NextResponse } from "next/server";
import { getSettings, updateSettings } from "@/lib/data";
import type { UserSettings } from "@/lib/types";

export async function GET(): Promise<NextResponse> {
  try {
    const settings = await getSettings();
    return NextResponse.json(settings);
  } catch (err: unknown) {
    console.error("GET /api/settings failed:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Partial<UserSettings>;
    const updated = await updateSettings(body);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("PUT /api/settings failed:", err);
    const message = err instanceof Error ? err.message : "Failed to update settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
