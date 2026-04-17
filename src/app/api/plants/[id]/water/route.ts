import { NextResponse } from "next/server";
import { waterPlant } from "@/lib/data";

interface WaterRequestBody {
  date: string;
  note: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;
    const body = (await request.json()) as WaterRequestBody;
    const event = await waterPlant(id, {
      date: body.date || new Date().toISOString(),
      note: body.note || "",
    });
    return NextResponse.json(event, { status: 201 });
  } catch (err: unknown) {
    console.error("POST /api/plants/[id]/water failed:", err);
    const message = err instanceof Error ? err.message : "Failed to log watering";
    const status = message.includes("not found") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
