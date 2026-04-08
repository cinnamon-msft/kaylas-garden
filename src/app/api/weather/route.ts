import { NextResponse } from "next/server";
import { getSettings } from "@/lib/data";
import type { WeatherDayForecast, WeatherForecast } from "@/lib/types";

const MIN_MEANINGFUL_RAIN_MM = 1;

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

    const geocodeRes = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1`,
      { next: { revalidate: 3600 } },
    );

    if (!geocodeRes.ok) {
      throw new Error("Failed to geocode location");
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
      throw new Error("Failed to fetch forecast");
    }

    const forecastData = (await forecastRes.json()) as ForecastResponse;
    const times = forecastData.daily?.time ?? [];
    const precipitation = forecastData.daily?.precipitation_sum ?? [];

    const days: WeatherDayForecast[] = times.map((date, index) => ({
      date,
      precipitationMm: precipitation[index] ?? 0,
    }));

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
    const message = err instanceof Error ? err.message : "Failed to fetch weather";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
