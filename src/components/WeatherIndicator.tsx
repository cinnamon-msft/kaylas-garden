"use client";

import { useState, useEffect } from "react";
import type { WeatherData } from "@/lib/types";

function weatherEmoji(code: number): string {
  // WMO Weather interpretation codes
  if (code === 0) return "☀️";
  if (code <= 3) return "⛅";
  if (code <= 48) return "🌫️";
  if (code <= 55) return "🌦️";
  if (code <= 57) return "🌧️";
  if (code <= 65) return "🌧️";
  if (code <= 67) return "🌧️";
  if (code <= 75) return "🌨️";
  if (code === 77) return "🌨️";
  if (code <= 82) return "🌧️";
  if (code <= 86) return "🌨️";
  if (code <= 99) return "⛈️";
  return "🌡️";
}

export function WeatherIndicator() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetch("/api/weather")
      .then((res) => {
        if (!res.ok) return null;
        return res.json() as Promise<WeatherData>;
      })
      .then((data) => {
        if (data) setWeather(data);
      })
      .catch(() => {
        // Silently fail — weather is non-critical
      });
  }, []);

  if (!weather) return null;

  const rainLabel =
    weather.precipitationProbability > 0
      ? `💧${weather.precipitationProbability}%`
      : null;

  return (
    <div
      className="flex items-center gap-1.5 text-sm text-text-on-primary/80"
      title={`${weather.locationName} — ${weather.temperature}°F`}
    >
      <span>{weatherEmoji(weather.weatherCode)}</span>
      <span className="font-medium">{weather.temperature}°F</span>
      {rainLabel && (
        <span className="text-xs opacity-80">{rainLabel}</span>
      )}
    </div>
  );
}
