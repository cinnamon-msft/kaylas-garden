"use client";

import { useState, useEffect } from "react";
import type { UserSettings, FrostDates } from "@/lib/types";
import {
  DEFAULT_GARDEN_ICON,
  GARDEN_ICON_OPTIONS,
  normalizeGardenIcon,
} from "@/lib/garden-icons";
import { LocationPrompt } from "@/components/LocationPrompt";

type Theme = "green" | "earth" | "ocean" | "space";

const themes: { id: Theme; label: string; emoji: string; swatches: string[] }[] = [
  { id: "green", label: "Garden", emoji: "🌿", swatches: ["bg-green-600", "bg-green-400", "bg-green-100"] },
  { id: "earth", label: "Earth", emoji: "🌾", swatches: ["bg-amber-700", "bg-amber-500", "bg-amber-100"] },
  { id: "ocean", label: "Ocean", emoji: "🌊", swatches: ["bg-blue-700", "bg-blue-400", "bg-blue-100"] },
  { id: "space", label: "Space", emoji: "🔮", swatches: ["bg-purple-700", "bg-purple-400", "bg-purple-950"] },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [gardenName, setGardenName] = useState("");
  const [gardenIcon, setGardenIcon] = useState(DEFAULT_GARDEN_ICON);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Settings — The Seed Feed";
  }, []);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load settings (${res.status})`);
        }
        return res.json();
      })
      .then((data: UserSettings) => {
        const normalized: UserSettings = {
          location: data.location ?? "",
          gardenName: data.gardenName ?? "My Garden",
          gardenIcon: normalizeGardenIcon(data.gardenIcon),
          theme: data.theme ?? "green",
          frostDates: data.frostDates ?? null,
          locationResolved: data.locationResolved ?? false,
          resolvedLocation: data.resolvedLocation ?? null,
        };
        setSettings(normalized);
        setGardenName(normalized.gardenName);
        setGardenIcon(normalized.gardenIcon);
        document.documentElement.setAttribute("data-theme", normalized.theme);
        localStorage.setItem("kaylas-garden-theme", normalized.theme);
      })
      .catch(() => setError("Failed to load settings"));
  }, []);

  useEffect(() => {
    const handleThemeEvent = (event: Event) => {
      const theme = (event as CustomEvent<Theme>).detail;
      if (!themes.some((candidate) => candidate.id === theme)) return;
      setSettings((prev) => (prev ? { ...prev, theme } : prev));
    };

    window.addEventListener("garden-theme-change", handleThemeEvent);
    return () => window.removeEventListener("garden-theme-change", handleThemeEvent);
  }, []);

  const handleLocationResolved = (patch: Partial<UserSettings>) => {
    setSettings((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const handleThemeChange = async (theme: Theme) => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("kaylas-garden-theme", theme);
    setSettings((prev) => (prev ? { ...prev, theme } : prev));
    window.dispatchEvent(new CustomEvent("garden-theme-change", { detail: theme }));
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

  const locationPromptMode =
    settings.location.trim().length > 0 && !settings.locationResolved ? "unclear" : "missing";
  const frostDates: FrostDates | null = settings.frostDates;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="text-3xl font-bold text-text-primary"><span aria-hidden="true">⚙️</span> Settings</h1>

      {/* Garden identity */}
      <section className="rounded-xl border border-border bg-bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-xl font-semibold text-text-primary"><span aria-hidden="true">{gardenIcon}</span> Garden Identity</h2>
        <div className="flex flex-col gap-4">
          <label htmlFor="garden-name-input" className="text-sm font-medium text-text-secondary">
            Garden name
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              id="garden-name-input"
              type="text"
              value={gardenName}
              onChange={(e) => setGardenName(e.target.value)}
              placeholder="e.g., Sunny Side Plot"
              className="flex-1 rounded-lg border border-border bg-bg-page px-4 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={async () => {
                try {
                  const nextGardenName = gardenName.trim() || "My Garden";
                  const nextGardenIcon = normalizeGardenIcon(gardenIcon);
                  await fetch("/api/settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      gardenName: nextGardenName,
                      gardenIcon: nextGardenIcon,
                    }),
                  });
                  setSettings((prev) => prev ? { ...prev, gardenName: nextGardenName, gardenIcon: nextGardenIcon } : prev);
                } catch {
                  setError("Failed to save garden name");
                }
              }}
              disabled={!gardenName.trim()}
              className="rounded-lg bg-primary px-5 py-2 font-medium text-text-on-primary transition-colors hover:opacity-90 disabled:opacity-50"
            >
              Save
            </button>
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="text-sm font-medium text-text-secondary">
              Pick a garden icon
            </legend>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {GARDEN_ICON_OPTIONS.map((option) => {
                const selected = gardenIcon === option.icon;
                return (
                  <button
                    key={option.icon}
                    type="button"
                    onClick={() => setGardenIcon(option.icon)}
                    aria-label={option.label}
                    aria-pressed={selected}
                    title={option.label}
                    className={`flex aspect-square items-center justify-center rounded-xl border-2 text-2xl transition-all hover:bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary ${
                      selected
                        ? "border-primary bg-accent shadow-sm"
                        : "border-border bg-bg-page"
                    }`}
                  >
                    <span aria-hidden="true">{option.icon}</span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      </section>

      {/* Location & Frost Dates */}
      <LocationPrompt
        mode={locationPromptMode}
        initialValue={settings.location}
        onResolved={handleLocationResolved}
      />

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}

      {frostDates && (
        <section className="rounded-xl border border-border bg-bg-card p-4 shadow-sm sm:p-6">
          <h2 className="mb-4 text-xl font-semibold text-text-primary">
            <span aria-hidden="true">🥶</span> Frost Dates
            {settings.locationResolved ? null : (
              <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 align-middle text-xs font-medium text-amber-900">
                approximate
              </span>
            )}
          </h2>
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
        </section>
      )}

      {/* Theme */}
      <section className="rounded-xl border border-border bg-bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-xl font-semibold text-text-primary"><span aria-hidden="true">🎨</span> Theme</h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {themes.map((theme) => (
            <button
              key={theme.id}
              onClick={() => void handleThemeChange(theme.id)}
              aria-pressed={settings.theme === theme.id}
              className={`flex flex-col items-center gap-2 rounded-xl border-2 p-3 transition-all sm:gap-3 sm:p-5 ${
                settings.theme === theme.id
                  ? "border-primary bg-accent shadow-md"
                  : "border-border bg-bg-page hover:bg-hover"
              }`}
            >
              <span aria-hidden="true" className="text-2xl sm:text-3xl">{theme.emoji}</span>
              <span className="text-xs font-semibold text-text-primary sm:text-sm">{theme.label}</span>
              <div className="flex gap-1.5" aria-hidden="true">
                {theme.swatches.map((swatch) => (
                  <div key={swatch} className={`h-3 w-3 rounded-full sm:h-4 sm:w-4 ${swatch}`} />
                ))}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="rounded-xl border border-border bg-bg-card p-4 shadow-sm sm:p-6">
        <h2 className="mb-3 text-xl font-semibold text-text-primary"><span aria-hidden="true">🌱</span> About</h2>
        <p className="text-text-secondary">
          Seed Feed, originally Kayla&apos;s Garden, helps you track your plants, monitor their progress, and learn about gardening. 🌱
        </p>
      </section>
    </div>
  );
}
