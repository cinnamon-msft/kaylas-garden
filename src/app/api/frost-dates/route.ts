import { NextRequest, NextResponse } from "next/server";
import { updateSettings } from "@/lib/data";
import type { FrostDates } from "@/lib/types";

const FROST_DATA: Record<string, FrostDates> = {
  boston: { lastSpringFrost: "April 15", firstFallFrost: "October 15", growingSeasonDays: 183 },
  miami: { lastSpringFrost: "January 1", firstFallFrost: "December 31", growingSeasonDays: 365 },
  chicago: { lastSpringFrost: "April 20", firstFallFrost: "October 10", growingSeasonDays: 173 },
  denver: { lastSpringFrost: "May 5", firstFallFrost: "October 5", growingSeasonDays: 153 },
  seattle: { lastSpringFrost: "March 15", firstFallFrost: "November 15", growingSeasonDays: 245 },
  portland: { lastSpringFrost: "March 25", firstFallFrost: "November 10", growingSeasonDays: 230 },
  "new york": { lastSpringFrost: "April 10", firstFallFrost: "October 25", growingSeasonDays: 198 },
  "los angeles": { lastSpringFrost: "February 1", firstFallFrost: "December 15", growingSeasonDays: 317 },
  "san francisco": { lastSpringFrost: "February 10", firstFallFrost: "December 10", growingSeasonDays: 303 },
  atlanta: { lastSpringFrost: "March 20", firstFallFrost: "November 10", growingSeasonDays: 235 },
  dallas: { lastSpringFrost: "March 10", firstFallFrost: "November 20", growingSeasonDays: 255 },
  houston: { lastSpringFrost: "February 15", firstFallFrost: "December 5", growingSeasonDays: 293 },
  phoenix: { lastSpringFrost: "February 5", firstFallFrost: "December 15", growingSeasonDays: 313 },
  minneapolis: { lastSpringFrost: "May 1", firstFallFrost: "October 1", growingSeasonDays: 153 },
  detroit: { lastSpringFrost: "April 25", firstFallFrost: "October 10", growingSeasonDays: 168 },
  philadelphia: { lastSpringFrost: "April 5", firstFallFrost: "October 25", growingSeasonDays: 203 },
  "san diego": { lastSpringFrost: "January 15", firstFallFrost: "December 20", growingSeasonDays: 340 },
  nashville: { lastSpringFrost: "April 1", firstFallFrost: "October 25", growingSeasonDays: 207 },
  austin: { lastSpringFrost: "March 1", firstFallFrost: "November 25", growingSeasonDays: 269 },
  "salt lake city": { lastSpringFrost: "May 5", firstFallFrost: "October 10", growingSeasonDays: 158 },
};

const DEFAULT_FROST: FrostDates = {
  lastSpringFrost: "April 15",
  firstFallFrost: "October 15",
  growingSeasonDays: 183,
};

function findFrostDates(location: string): FrostDates {
  const query = location.toLowerCase().trim();

  // Exact match
  if (FROST_DATA[query]) {
    return FROST_DATA[query];
  }

  // Partial / fuzzy match
  for (const [city, data] of Object.entries(FROST_DATA)) {
    if (query.includes(city) || city.includes(query)) {
      return data;
    }
  }

  return DEFAULT_FROST;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const location = searchParams.get("location");

    if (!location) {
      return NextResponse.json(
        { error: "Missing 'location' query parameter" },
        { status: 400 },
      );
    }

    const frostDates = findFrostDates(location);

    await updateSettings({ location, frostDates });

    return NextResponse.json({ location, frostDates });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to look up frost dates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
