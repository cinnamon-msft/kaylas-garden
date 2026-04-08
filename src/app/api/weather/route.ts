import { NextResponse } from "next/server";
import { getSettings } from "@/lib/data";
import type { WeatherForecast } from "@/lib/types";

const MIN_RAIN_MM = 1; // minimum precipitation to count as "rain"

interface GeocodingResult {
  results?: Array<{
    latitude: number;
    longitude: number;
  }>;
}

interface ForecastResult {
  daily: {
    time: string[];
    precipitation_sum: number[];
  };
}

export async function GET(): Promise<NextResponse> {
  try {
    const settings = await getSettings();

    if (!settings.location) {
      return NextResponse.json({
        location: null,
        nextRainDate: null,
        nextRainAmount: null,
        daysUntilRain: null,
        noRainExpected: false,
      } satisfies WeatherForecast);
    }

    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(settings.location)}&count=1&language=en&format=json`;
    const geoRes = await fetch(geoUrl, { next: { revalidate: 3600 } });

    if (!geoRes.ok) throw new Error("Geocoding request failed");

    const geoData = (await geoRes.json()) as GeocodingResult;

    if (!geoData.results || geoData.results.length === 0) {
      return NextResponse.json({
        location: settings.location,
        nextRainDate: null,
        nextRainAmount: null,
        daysUntilRain: null,
        noRainExpected: false,
      } satisfies WeatherForecast);
    }

    const { latitude, longitude } = geoData.results[0];

    const forecastUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=precipitation_sum&forecast_days=7&timezone=auto`;
    const forecastRes = await fetch(forecastUrl, { next: { revalidate: 3600 } });

    if (!forecastRes.ok) throw new Error("Forecast request failed");

    const forecastData = (await forecastRes.json()) as ForecastResult;
    const { time: dates, precipitation_sum: precip } = forecastData.daily;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let nextRainDate: string | null = null;
    let nextRainAmount: number | null = null;
    let daysUntilRain: number | null = null;

    for (let i = 0; i < dates.length; i++) {
      const forecastDate = new Date(`${dates[i]}T00:00:00`);
      const daysDiff = Math.round(
        (forecastDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if ((precip[i] ?? 0) >= MIN_RAIN_MM) {
        nextRainDate = dates[i];
        nextRainAmount = precip[i] ?? null;
        daysUntilRain = daysDiff;
        break;
      }
    }

    return NextResponse.json({
      location: settings.location,
      nextRainDate,
      nextRainAmount,
      daysUntilRain,
      noRainExpected: nextRainDate === null,
    } satisfies WeatherForecast);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch weather";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
