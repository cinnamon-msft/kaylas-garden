import { NextResponse } from "next/server";
import { getSettings } from "@/lib/data";
import type { WeatherDayForecast, WeatherForecast } from "@/lib/types";

// Keep this intentionally small so "will it rain enough to skip watering?" errs on the conservative side.
const MIN_MEANINGFUL_RAIN_MM = 1;
const MAX_LOCATION_LENGTH = 100;
const LOCATION_PATTERN = /^[\p{L}\p{N}\s,.'-]+$/u;

interface GeocodingResult {
  latitude: number;
  longitude: number;
  name: string;
  country?: string;
}

interface GeocodingResponse {
  results?: GeocodingResult[];
}

interface ForecastResponse {
  daily?: {
    time?: string[];
    precipitation_sum?: number[];
  };
}

function buildDisplayLocation(result: GeocodingResult): string {
  return result.country ? `${result.name}, ${result.country}` : result.name;
}

export async function GET(): Promise<NextResponse<WeatherForecast | { error: string }>> {
  try {
    const settings = await getSettings();
    const location = settings.location?.trim();

    if (!location) {
      return NextResponse.json({ location: null, days: [], nextRain: null });
    }
    if (location.length > MAX_LOCATION_LENGTH || !LOCATION_PATTERN.test(location)) {
      return NextResponse.json({ location, days: [], nextRain: null });
    }

    const geocodeRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`,
      { next: { revalidate: 3600 } },
    );

    if (!geocodeRes.ok) {
      return NextResponse.json({ location, days: [], nextRain: null });
    }

    const geocodeData = (await geocodeRes.json()) as GeocodingResponse;
    const geocode = geocodeData.results?.[0];

    if (!geocode) {
      return NextResponse.json({ location, days: [], nextRain: null });
    }

    const forecastRes = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${geocode.latitude}&longitude=${geocode.longitude}&daily=precipitation_sum&forecast_days=7&timezone=auto`,
      { next: { revalidate: 3600 } },
    );

    if (!forecastRes.ok) {
      return NextResponse.json({ location: buildDisplayLocation(geocode), days: [], nextRain: null });
    }

    const forecastData = (await forecastRes.json()) as ForecastResponse;
    const times = forecastData.daily?.time ?? [];
    const precipitation = forecastData.daily?.precipitation_sum ?? [];

    const days: WeatherDayForecast[] = times.map((date, index) => ({
      date,
      precipitationMm: precipitation[index] ?? 0,
    }));

    // The forecast is chronological; find the first day with meaningful rain.
    const nextRainIndex = days.findIndex((day) => day.precipitationMm >= MIN_MEANINGFUL_RAIN_MM);
    const nextRain = nextRainIndex === -1
      ? null
      : {
          date: days[nextRainIndex].date,
          daysUntil: nextRainIndex,
          precipitationMm: days[nextRainIndex].precipitationMm,
        };

    return NextResponse.json({
      location: buildDisplayLocation(geocode),
      days,
      nextRain,
    });
  } catch (err: unknown) {
    console.error("Weather API fallback due to error:", err);
    const settings = await getSettings();
    return NextResponse.json({ location: settings.location?.trim() || null, days: [], nextRain: null });
  }
}
