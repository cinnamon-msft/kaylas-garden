import { NextResponse } from "next/server";
import { getPlants, createPlant } from "@/lib/data";
import type { Plant } from "@/lib/types";

export async function GET(): Promise<NextResponse> {
  try {
    const plants = await getPlants();
    return NextResponse.json(plants);
  } catch (err: unknown) {
    console.error("GET /api/plants failed:", err);
    const message = err instanceof Error ? err.message : "Failed to fetch plants";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as Omit<Plant, "id" | "dateAdded" | "entries">;
    const plant = await createPlant(body);
    return NextResponse.json(plant, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/plants failed:", err);
    const message = err instanceof Error ? err.message : "Failed to create plant";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
