"use client";

import { useState, useEffect } from "react";
import type { FrostDates } from "@/lib/types";

function parseMonthDay(dateStr: string): Date {
  const currentYear = new Date().getFullYear();
  const parsed = new Date(`${dateStr}, ${currentYear}`);
  return parsed;
}

function getDaysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

function getBannerContent(frostDates: FrostDates): { message: string; className: string } {
  const now = new Date();
  const springFrost = parseMonthDay(frostDates.lastSpringFrost);
  const fallFrost = parseMonthDay(frostDates.firstFallFrost);

  if (now < springFrost) {
    return {
      message: `🥶 Frost warning! Last expected frost: ${frostDates.lastSpringFrost}. Be careful with tender plants!`,
      className: "border-blue-300 bg-blue-50 text-blue-900",
    };
  }

  if (now <= fallFrost) {
    const daysLeft = getDaysBetween(now, fallFrost);
    return {
      message: `🌱 Growing season! ${daysLeft} days until first fall frost on ${frostDates.firstFallFrost}.`,
      className: "border-green-300 bg-green-50 text-green-900",
    };
  }

  return {
    message: "🍂 Frost season! Protect sensitive plants or bring them indoors.",
    className: "border-amber-300 bg-amber-50 text-amber-900",
  };
}

export function FrostDateBanner() {
  const [frostDates, setFrostDates] = useState<FrostDates | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data: { frostDates: FrostDates | null }) => {
        setFrostDates(data.frostDates);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  if (!loaded) return null;

  if (!frostDates) {
    return (
      <div role="status" className="rounded-lg border border-border bg-bg-card px-4 py-3 text-sm text-text-secondary">
        <span aria-hidden="true">📍</span>{" "}Set your location in{" "}
        <a href="/settings" className="font-medium text-primary underline">
          Settings
        </a>{" "}
        to see frost date alerts.
      </div>
    );
  }

  const { message, className } = getBannerContent(frostDates);

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
