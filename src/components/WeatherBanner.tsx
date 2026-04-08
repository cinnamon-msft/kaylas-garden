"use client";

import type { WeatherForecast } from "@/lib/types";

function getBannerContent(forecast: WeatherForecast): { message: string; className: string } {
  if (!forecast.location) {
    return {
      message: "📍 Set your location in Settings to get rain-aware watering recommendations.",
      className: "border-border bg-bg-card text-text-secondary",
    };
  }

  if (!forecast.nextRain) {
    return {
      message: "☀️ No meaningful rain expected this week. Keep watering on schedule.",
      className: "border-amber-300 bg-amber-50 text-amber-900",
    };
  }

  if (forecast.nextRain.daysUntil === 0) {
    return {
      message: "🌧️ Rain expected today. Most plants can skip watering unless soil is very dry.",
      className: "border-green-300 bg-green-50 text-green-900",
    };
  }

  if (forecast.nextRain.daysUntil === 1) {
    return {
      message: "🌦️ Rain expected tomorrow. Consider waiting before watering heavily today.",
      className: "border-blue-300 bg-blue-50 text-blue-900",
    };
  }

  if (forecast.nextRain.daysUntil <= 3) {
    return {
      message: `🌤️ Rain is coming in ${forecast.nextRain.daysUntil} days. Adjust watering to avoid overwatering.`,
      className: "border-sky-300 bg-sky-50 text-sky-900",
    };
  }

  return {
    message: `🌤️ Next rain is in ${forecast.nextRain.daysUntil} days. Water as needed until then.`,
    className: "border-indigo-300 bg-indigo-50 text-indigo-900",
  };
}

export function WeatherBanner({
  forecast,
  loading,
}: {
  readonly forecast: WeatherForecast | null;
  readonly loading: boolean;
}) {
  if (loading) {
    return (
      <div role="status" className="rounded-lg border border-border bg-bg-card px-4 py-3 text-sm text-text-secondary">
        Checking rain forecast…
      </div>
    );
  }

  if (!forecast) {
    return (
      <div role="status" className="rounded-lg border border-border bg-bg-card px-4 py-3 text-sm text-text-secondary">
        Unable to load rain forecast right now.
      </div>
    );
  }

  const { message, className } = getBannerContent(forecast);
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
