import { NextRequest, NextResponse } from "next/server";
import { updateSettings } from "@/lib/data-social";
import { getAuthUserId } from "@/lib/auth-helpers";
import { resolveLocation, type RegionalFrostData } from "@/lib/server/location-lookup";

export const dynamic = "force-dynamic";

interface CandidateDto {
  key: string;
  displayLabel: string;
  region: string;
  country: "US" | "CA";
  frostDates: RegionalFrostData["frostDates"];
}

function toCandidate(entry: RegionalFrostData): CandidateDto {
  return {
    key: entry.key,
    displayLabel: entry.displayLabel,
    region: entry.region,
    country: entry.country,
    frostDates: entry.frostDates,
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getAuthUserId();
    if (userId instanceof NextResponse) return userId;

    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");

    if (!location || location.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing 'location' query parameter" },
        { status: 400 },
      );
    }

    const result = resolveLocation(location);

    if (result.status === "matched") {
      const match = result.match;
      // Persist canonical fields so future page loads short-circuit the prompt.
      await updateSettings(userId, {
        location: match.displayLabel,
        frostDates: match.frostDates,
        locationResolved: true,
        resolvedLocation: match.key,
      });
      return NextResponse.json({
        status: "matched",
        location: match.displayLabel,
        resolvedLocation: match.key,
        frostDates: match.frostDates,
      });
    }

    if (result.status === "ambiguous") {
      // Do NOT persist on ambiguity: leaving previously-resolved settings
      // intact avoids overwriting valid frost dates with stale data while
      // the user is mid-clarification. The chooser is page-level state.
      return NextResponse.json({
        status: "ambiguous",
        location: location.trim(),
        candidates: result.candidates.map(toCandidate),
      });
    }

    // Unmatched: also no persistence. The user's existing settings (if any)
    // remain authoritative until they pick a known location.
    return NextResponse.json({
      status: "unmatched",
      location: location.trim(),
    });
  } catch (err: unknown) {
    console.error("GET /api/frost-dates failed:", err);
    const message = err instanceof Error ? err.message : "Failed to look up frost dates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
