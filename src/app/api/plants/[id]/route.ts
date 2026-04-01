import { NextResponse } from "next/server";
import { getPlant, updatePlant, deletePlant } from "@/lib/data";
import type { Plant } from "@/lib/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  _request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const plant = await getPlant(id);
    if (!plant) {
      return NextResponse.json({ error: "Plant not found" }, { status: 404 });
    }
    return NextResponse.json(plant);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch plant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as Partial<Plant>;
    const updated = await updatePlant(id, body);
    return NextResponse.json(updated);
  } catch (err: unknown) {
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
    const { id } = await context.params;
    await deletePlant(id);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete plant";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
