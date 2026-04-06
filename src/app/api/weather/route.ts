import { NextResponse } from "next/server";
import { getSettings } from "@/lib/data";
import type { WeatherData } from "@/lib/types";

interface GeoResult {
  latitude: number;
  longitude: number;
  name: string;
}

interface GeoResponse {
  results?: GeoResult[];
}

interface OpenMeteoForecast {
  current: {
    temperature_2m: number;
    weather_code: number;
  };
  hourly: {
    precipitation_probability: number[];
  };
}

interface CacheEntry {
  data: WeatherData;
  timestamp: number;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
let cache: CacheEntry | null = null;

async function geocodeLocation(location: string): Promise<GeoResult> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=en&format=json`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Geocoding request failed");
  }

  const data = (await res.json()) as GeoResponse;

  if (!data.results || data.results.length === 0) {
    throw new Error(`Could not geocode location: ${location}`);
  }

  return data.results[0];
}

async function fetchWeather(lat: number, lon: number): Promise<OpenMeteoForecast> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,weather_code` +
    `&hourly=precipitation_probability` +
    `&temperature_unit=fahrenheit` +
    `&forecast_days=1`;

  const res = await fetch(url);

  if (!res.ok) {
    throw new Error("Weather request failed");
  }

  return (await res.json()) as OpenMeteoForecast;
}

function getMaxPrecipNextHours(probabilities: number[], hours: number): number {
  // Take the max precipitation probability over the next N hours
  const slice = probabilities.slice(0, hours);
  return slice.length > 0 ? Math.max(...slice) : 0;
}

export async function GET(): Promise<NextResponse> {
  try {
    // Return cached data if still fresh
    if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
      return NextResponse.json(cache.data);
    }

    const settings = await getSettings();

    if (!settings.location) {
      return NextResponse.json(
        { error: "No location configured" },
        { status: 404 },
      );
    }

    const geo = await geocodeLocation(settings.location);
    const forecast = await fetchWeather(geo.latitude, geo.longitude);

    const weatherData: WeatherData = {
      temperature: Math.round(forecast.current.temperature_2m),
      weatherCode: forecast.current.weather_code,
      precipitationProbability: getMaxPrecipNextHours(
        forecast.hourly.precipitation_probability,
        6,
      ),
      locationName: geo.name,
    };

    cache = { data: weatherData, timestamp: Date.now() };

    return NextResponse.json(weatherData);
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch weather";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
