import { NextResponse } from "next/server";
import { getSettings } from "@/lib/data-social";
import { getAuthUserId } from "@/lib/auth-helpers";
import { buildPlantingCalendar } from "@/lib/planting-calendar";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const userId = await getAuthUserId();
    if (userId instanceof NextResponse) return userId;

    const settings = await getSettings(userId);

    if (!settings.frostDates) {
      return NextResponse.json(
        {
          error: "Location not set",
          code: "LOCATION_REQUIRED" as const,
          location: settings.location ?? "",
        },
        { status: 400 },
      );
    }

    // We do NOT block rendering when locationResolved is false — the user has
    // usable frost dates, so the calendar still computes. The page shows a
    // non-blocking "clarify" banner.
    const payload = buildPlantingCalendar(settings.frostDates, {
      locationDisplayLabel: settings.location,
    });

    return NextResponse.json({
      ...payload,
      locationResolved: settings.locationResolved,
      resolvedLocation: settings.resolvedLocation,
    });
  } catch (err: unknown) {
    console.error("GET /api/planting-calendar failed:", err);
    const message = err instanceof Error ? err.message : "Failed to build planting calendar";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
