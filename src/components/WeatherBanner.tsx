"use client";

import { useState, useEffect } from "react";
import type { WeatherForecast } from "@/lib/types";

function getBannerContent(weather: WeatherForecast): { message: string; className: string } {
  const { daysUntilRain, nextRainAmount, noRainExpected } = weather;

  if (noRainExpected) {
    return {
      message: "☀️ No rain expected this week — don't forget to water your plants!",
      className: "border-yellow-300 bg-yellow-50 text-yellow-900",
    };
  }

  const amountStr = nextRainAmount !== null ? ` (${nextRainAmount.toFixed(1)}mm)` : "";

  if (daysUntilRain === 0) {
    return {
      message: `🌧️ Rain expected today${amountStr}! No need to water — let nature do the work.`,
      className: "border-blue-300 bg-blue-50 text-blue-900",
    };
  }

  if (daysUntilRain === 1) {
    return {
      message: `🌦️ Rain tomorrow${amountStr} — hold off on watering today!`,
      className: "border-blue-200 bg-blue-50 text-blue-800",
    };
  }

  if (daysUntilRain !== null && daysUntilRain <= 3) {
    return {
      message: `🌤️ Rain expected in ${daysUntilRain} days${amountStr}. Consider waiting before watering.`,
      className: "border-sky-200 bg-sky-50 text-sky-800",
    };
  }

  return {
    message: `🌤️ Next rain in ${daysUntilRain ?? "?"} days${amountStr}. Water as needed until then.`,
    className: "border-sky-200 bg-sky-50 text-sky-800",
  };
}

export function WeatherBanner() {
  const [weather, setWeather] = useState<WeatherForecast | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/weather")
      .then((res) => res.json())
      .then((data: WeatherForecast) => {
        setWeather(data);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  if (!weather?.location) {
    return (
      <div role="status" className="rounded-lg border border-border bg-bg-card px-4 py-3 text-sm text-text-secondary">
        <span aria-hidden="true">🌦️</span>{" "}Set your location in{" "}
        <a href="/settings" className="font-medium text-primary underline">
          Settings
        </a>{" "}
        to see rain forecasts and watering reminders.
      </div>
    );
  }

  const { message, className } = getBannerContent(weather);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={`rounded-lg border px-4 py-3 text-sm font-medium ${className}`}
    >
      {message}
    </div>
  );
}
