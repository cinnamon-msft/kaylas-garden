import { NextResponse } from "next/server";
import { updatePlant } from "@/lib/data";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(
  request: Request,
  context: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { nextWateringDate: string | null };
    const updated = await updatePlant(id, { nextWateringDate: body.nextWateringDate });
    return NextResponse.json(updated);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update watering date";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
