import { NextResponse } from "next/server";
import { getPlant, updatePlant, deletePlant } from "@/lib/data-social";
import { getAuthUserId } from "@/lib/auth-helpers";
import type { Plant } from "@/lib/types";

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
    const plant = await getPlant(userId, id);
    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }
    return NextResponse.json(plant);
  } catch (err: unknown) {
    console.error("GET /api/plants/[id] failed:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch plant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const userId = await getAuthUserId();
    if (userId instanceof NextResponse) return userId;
    const { id } = await context.params;
    const body = (await request.json()) as Partial<Plant>;
    const updated = await updatePlant(userId, id, body);
    return NextResponse.json(updated);
  } catch (err: unknown) {
    console.error("PUT /api/plants/[id] failed:", err);
    const message = err instanceof Error ? err.message : "Failed to update plant";
    const status = message.includes("not found") ? 404 : 500;
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
    await deletePlant(userId, id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("DELETE /api/plants/[id] failed:", err);
    const message = err instanceof Error ? err.message : "Failed to delete plant";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
