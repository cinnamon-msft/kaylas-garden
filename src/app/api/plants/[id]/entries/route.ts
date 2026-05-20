import { NextResponse } from "next/server";
import { addPlantEntry } from "@/lib/data-social";
import { getAuthUserId } from "@/lib/auth-helpers";
import type { PlantEntry } from "@/lib/types";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await getAuthUserId();
    if (userId instanceof NextResponse) return userId;
    const { id } = await context.params;
    const body = (await request.json()) as Omit<PlantEntry, "id">;
    const entry = await addPlantEntry(userId, id, body);
    return NextResponse.json(entry, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/plants/[id]/entries failed:", err);
    const message = err instanceof Error ? err.message : "Failed to add entry";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
