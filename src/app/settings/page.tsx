"use client";

import { useState, useEffect } from "react";
import type { UserSettings, FrostDates } from "@/lib/types";

type Theme = "green" | "earth" | "ocean";

const themes: { id: Theme; label: string; emoji: string; swatches: string[] }[] = [
  { id: "green", label: "Garden", emoji: "🌿", swatches: ["bg-green-600", "bg-green-400", "bg-green-100"] },
  { id: "earth", label: "Earth", emoji: "🌾", swatches: ["bg-amber-700", "bg-amber-500", "bg-amber-100"] },
  { id: "ocean", label: "Ocean", emoji: "🌊", swatches: ["bg-blue-700", "bg-blue-400", "bg-blue-100"] },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [location, setLocation] = useState("");
  const [frostDates, setFrostDates] = useState<FrostDates | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Settings — Kayla's Garden";
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data: UserSettings) => {
        setSettings(data);
        setLocation(data.location);
        setFrostDates(data.frostDates);
      })
      .catch(() => setError("Failed to load settings"));
  }, []);

  const lookUpFrostDates = async () => {
    if (!location.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/frost-dates?location=${encodeURIComponent(location.trim())}`);
      const data = (await res.json()) as { frostDates: FrostDates };
      setFrostDates(data.frostDates);
      setSettings((prev) => (prev ? { ...prev, location: location.trim(), frostDates: data.frostDates } : prev));
    } catch {
      setError("Failed to look up frost dates");
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = async (theme: Theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("kaylas-garden-theme", theme);
    setSettings((prev) => (prev ? { ...prev, theme } : prev));
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme }),
      });
    } catch {
      setError("Failed to save theme");
    }
  };

  if (!settings) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-text-secondary">Loading settings…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <h1 className="text-3xl font-bold text-text-primary"><span aria-hidden="true">⚙️</span> Settings</h1>

      {/* Location & Frost Dates */}
      <section className="rounded-xl border border-border bg-bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-text-primary"><span aria-hidden="true">📍</span> Location &amp; Frost Dates</h2>
        <div className="flex flex-col gap-2">
          <label htmlFor="location-input" className="text-sm font-medium text-text-secondary">
            City name or zip code
          </label>
          <div className="flex gap-3">
            <input
              id="location-input"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Seattle, WA or 98101"
              className="flex-1 rounded-lg border border-border bg-bg-page px-4 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
              aria-describedby={error ? "location-error" : undefined}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  void lookUpFrostDates();
                }
              }}
            />
            <button
              onClick={() => void lookUpFrostDates()}
              disabled={loading || !location.trim()}
              className="rounded-lg bg-primary px-5 py-2 font-medium text-text-on-primary transition-colors hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Looking up…" : "Look Up Frost Dates"}
            </button>
          </div>
        </div>

        {error && <p id="location-error" role="alert" className="mt-3 text-sm text-red-600">{error}</p>}

        {frostDates && (
          <div className="mt-5 rounded-lg border border-border bg-bg-page p-5">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🌸</span>
                <span className="font-medium text-text-primary">Last Spring Frost:</span>
                <span className="text-text-secondary">{frostDates.lastSpringFrost}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">🍂</span>
                <span className="font-medium text-text-primary">First Fall Frost:</span>
                <span className="text-text-secondary">{frostDates.firstFallFrost}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">📅</span>
                <span className="font-medium text-text-primary">Growing Season:</span>
                <span className="text-text-secondary">{frostDates.growingSeasonDays} days</span>
              </div>
            </div>
            <p className="mt-4 text-sm text-text-secondary">
              💡 Frost dates help you decide when to plant outdoors. Wait until after the last spring frost to
              transplant tender seedlings, and plan to harvest or protect plants before the first fall frost.
            </p>
          </div>
        )}
      </section>

      {/* Theme */}
      <section className="rounded-xl border border-border bg-bg-card p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-text-primary"><span aria-hidden="true">🎨</span> Theme</h2>
        <div className="grid grid-cols-3 gap-4">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => void handleThemeChange(theme.id)}
              aria-pressed={settings.theme === theme.id}
              className={`flex flex-col items-center gap-3 rounded-xl border-2 p-5 transition-all ${
                settings.theme === theme.id
                  ? "border-primary bg-accent shadow-md"
                  : "border-border bg-bg-page hover:bg-hover"
              }`}
            >
              <span aria-hidden="true" className="text-3xl">{theme.emoji}</span>
              <span className="text-sm font-semibold text-text-primary">{theme.label}</span>
              <div className="flex gap-1.5" aria-hidden="true">
                {theme.swatches.map((swatch) => (
                  <div key={swatch} className={`h-4 w-4 rounded-full ${swatch}`} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="rounded-xl border border-border bg-bg-card p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-semibold text-text-primary"><span aria-hidden="true">🌱</span> About</h2>
        <p className="text-text-secondary">
          Kayla&apos;s Garden helps you track your plants, monitor their progress, and learn about gardening. 🌱
        </p>
      </section>
    </div>
  );
}
