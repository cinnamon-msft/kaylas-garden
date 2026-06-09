import { NextRequest, NextResponse } from "next/server";
import { updateSettings } from "@/lib/data-social";
import { getAuthUserId } from "@/lib/auth-helpers";
import {
  resolveLocation,
  resolveByCoordinates,
  type RegionalFrostData,
} from "@/lib/server/location-lookup";
import { geocodeWithNominatim } from "@/lib/server/geocoding";

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

async function persistMatch(
  userId: string,
  match: RegionalFrostData,
): Promise<void> {
  const frostDatesWithZone = {
    ...match.frostDates,
    hardinessZone: match.hardinessZone,
  };
  await updateSettings(userId, {
    location: match.displayLabel,
    frostDates: frostDatesWithZone,
    locationResolved: true,
    resolvedLocation: match.key,
  });
}

function matchedResponseBody(match: RegionalFrostData) {
  return {
    status: "matched" as const,
    location: match.displayLabel,
    resolvedLocation: match.key,
    frostDates: { ...match.frostDates, hardinessZone: match.hardinessZone },
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userId = await getAuthUserId();
    if (userId instanceof NextResponse) return userId;

    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");
    const latParam = searchParams.get("lat");
    const lonParam = searchParams.get("lon");

    // Geolocation path: resolve the nearest known climate region.
    if (latParam !== null && lonParam !== null) {
      const lat = Number(latParam);
      const lon = Number(lonParam);
      if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
        return NextResponse.json(
          { error: "Invalid 'lat'/'lon' coordinates" },
          { status: 400 },
        );
      }
      const nearest = resolveByCoordinates(lat, lon);
      if (!nearest) {
        return NextResponse.json({
          status: "unmatched",
          location: "",
        });
      }
      await persistMatch(userId, nearest.match);
      return NextResponse.json({
        ...matchedResponseBody(nearest.match),
        approximate: nearest.distanceKm > 80,
        distanceKm: Math.round(nearest.distanceKm),
      });
    }

    if (!location || location.trim().length === 0) {
      return NextResponse.json(
        { error: "Missing 'location' query parameter" },
        { status: 400 },
      );
    }

    const result = resolveLocation(location);

    if (result.status === "matched") {
      await persistMatch(userId, result.match);
      return NextResponse.json(matchedResponseBody(result.match));
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

    // Unmatched against the bundled table — try Nominatim as a geocoding
    // fallback, then snap to the nearest known region. This lets users type
    // any city (e.g., "Memphis, TN") and still get approximate frost data.
    const geocoded = await geocodeWithNominatim(location);
    if (geocoded) {
      const nearest = resolveByCoordinates(geocoded.lat, geocoded.lon);
      if (nearest) {
        await persistMatch(userId, nearest.match);
        return NextResponse.json({
          ...matchedResponseBody(nearest.match),
          approximate: true,
          viaGeocoding: true,
          geocodedFrom: location.trim(),
          geocodedName: geocoded.displayName,
          distanceKm: Math.round(nearest.distanceKm),
        });
      }
    }

    // True unmatched. Do not persist; the user's existing settings (if any)
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
