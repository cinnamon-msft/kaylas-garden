"use client";

import { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  PLANT_LIBRARY,
  searchLibraryPlants,
  type LibraryPlant,
} from "@/lib/plant-library";

const POPULAR_PLANT_IDS = [
  "tomato",
  "basil",
  "lavender",
  "sunflower",
  "mint",
  "strawberry",
  "rose",
  "pepper",
  "cucumber",
  "zucchini",
  "rosemary",
  "thyme",
] as const;

const CATEGORY_EMOJI: Record<string, string> = {
  vegetable: "🥬",
  herb: "🌿",
  flower: "🌸",
  fruit: "🍓",
  succulent: "🌵",
  tree: "🌳",
  shrub: "🌲",
};

const POPULAR_PLANTS: readonly LibraryPlant[] = POPULAR_PLANT_IDS
  .map((id) => PLANT_LIBRARY.find((p) => p.id === id))
  .filter((p): p is LibraryPlant => Boolean(p));

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState("");
  const [selected, setSelected] = useState<LibraryPlant | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addedToGarden, setAddedToGarden] = useState(false);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    document.title = "Plant Library — Kayla's Garden";
  }, []);

  const results = useMemo(() => {
    if (!activeQuery.trim()) return [] as readonly LibraryPlant[];
    return [...searchLibraryPlants(activeQuery)].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [activeQuery]);

  const selectPlant = (plant: LibraryPlant) => {
    setSelected(plant);
    setAddedToGarden(false);
    setError(null);
    setQuery(plant.name);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    setActiveQuery(trimmed);
    setSelected(null);
    setAddedToGarden(false);
    setError(null);
    if (trimmed) {
      const exact = searchLibraryPlants(trimmed).find(
        (p) => p.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (exact) {
        setSelected(exact);
      }
    }
  };

  const addToGarden = async () => {
    if (!selected) return;
    setAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: selected.name,
          species: selected.scientificName,
          thumbnailImage: "",
          careInfo: {
            sunlight: selected.sunlight,
            wateringSchedule: selected.wateringSchedule,
            soilType: selected.soilType,
            hardinessZone: selected.hardinessZones,
            companionPlants: [...selected.companionPlants],
            commonPests: [...selected.commonPests],
            generalNotes: selected.plantingGuidelines,
          },
          wateringIntervalDays: selected.wateringIntervalDays,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to add plant");
      }
      setAddedToGarden(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to garden");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold">
          <span aria-hidden="true">🌱</span> Plant Library
        </h1>
        <p className="text-text-secondary">
          Browse our curated collection of plants with growing info and care
          guidelines.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6 flex flex-col gap-2">
        <label htmlFor="plant-search" className="sr-only">
          Search for a plant
        </label>
        <div className="flex gap-2">
          <input
            id="plant-search"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, scientific name, or category..."
            className="flex-1 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            Search
          </button>
        </div>
      </form>

      {/* Popular plants */}
      <div className="mb-8">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
          Popular Plants
        </h2>
        <div className="flex flex-wrap gap-2">
          {POPULAR_PLANTS.map((plant) => (
            <button
              key={plant.id}
              type="button"
              onClick={() => selectPlant(plant)}
              aria-pressed={selected?.id === plant.id}
              className="rounded-full border border-border bg-bg-card px-4 py-1.5 text-sm font-medium text-text-primary transition-all hover:border-primary hover:bg-hover"
            >
              {plant.name}
            </button>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4 text-red-800"
        >
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Search results grid (only when searching, no single selection) */}
      {activeQuery && !selected && (
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-text-secondary">
            {results.length === 0
              ? `No matches for "${activeQuery}"`
              : `${results.length} result${results.length === 1 ? "" : "s"} for "${activeQuery}"`}
          </h2>
          {results.length > 0 && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((plant) => (
                <button
                  key={plant.id}
                  type="button"
                  onClick={() => selectPlant(plant)}
                  className="flex flex-col items-start gap-1 rounded-lg border border-border bg-bg-card p-4 text-left transition-all hover:border-primary hover:bg-hover"
                >
                  <div className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-xl">
                      {CATEGORY_EMOJI[plant.category] ?? "🌱"}
                    </span>
                    <span className="font-semibold text-text-primary">
                      {plant.name}
                    </span>
                  </div>
                  <span className="text-xs italic text-text-secondary">
                    {plant.scientificName}
                  </span>
                  <span className="mt-1 inline-block rounded-full bg-accent px-2 py-0.5 text-xs font-medium capitalize text-text-primary">
                    {plant.category}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Plant Info */}
      {selected && (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-lg border border-border bg-bg-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-2xl">
                    {CATEGORY_EMOJI[selected.category] ?? "🌱"}
                  </span>
                  <h2 className="text-2xl font-bold">{selected.name}</h2>
                </div>
                <p className="mt-1 text-sm italic text-text-secondary">
                  {selected.scientificName}
                </p>
                <span className="mt-2 inline-block rounded-full bg-accent px-3 py-0.5 text-xs font-medium capitalize text-text-primary">
                  {selected.category}
                </span>
              </div>
              <div>
                <div aria-live="polite" className="sr-only">
                  {addedToGarden && `${selected.name} added to your garden`}
                </div>
                <button
                  type="button"
                  onClick={addToGarden}
                  disabled={addedToGarden || adding}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    addedToGarden
                      ? "bg-green-100 text-green-700"
                      : "bg-primary text-text-on-primary hover:bg-primary-dark"
                  } disabled:opacity-60`}
                >
                  {addedToGarden
                    ? "✓ Added to Garden"
                    : adding
                      ? "Adding…"
                      : "+ Add to My Garden"}
                </button>
              </div>
            </div>
            <p className="mt-4 text-text-secondary">{selected.description}</p>
          </div>

          {/* Care Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="mb-1 text-lg" aria-hidden="true">
                ☀️
              </div>
              <h3 className="text-sm font-semibold text-text-secondary">
                Sunlight
              </h3>
              <p className="mt-1 font-medium">{selected.sunlight}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="mb-1 text-lg" aria-hidden="true">
                💧
              </div>
              <h3 className="text-sm font-semibold text-text-secondary">
                Watering
              </h3>
              <p className="mt-1 font-medium">{selected.wateringSchedule}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="mb-1 text-lg" aria-hidden="true">
                🌍
              </div>
              <h3 className="text-sm font-semibold text-text-secondary">
                Soil
              </h3>
              <p className="mt-1 font-medium">{selected.soilType}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="mb-1 text-lg" aria-hidden="true">
                📅
              </div>
              <h3 className="text-sm font-semibold text-text-secondary">
                Days to Harvest
              </h3>
              <p className="mt-1 font-medium">{selected.daysToHarvest}</p>
            </div>
          </div>

          {/* Hardiness & Planting */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-bg-card p-5">
              <h3 className="mb-2 font-semibold">🗺️ Hardiness Zones</h3>
              <p className="text-text-secondary">{selected.hardinessZones}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-5">
              <h3 className="mb-2 font-semibold">🌱 Planting Guidelines</h3>
              <p className="text-text-secondary">
                {selected.plantingGuidelines}
              </p>
            </div>
          </div>

          {/* Lists */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-bg-card p-5">
              <h3 className="mb-3 font-semibold">🌻 Companion Plants</h3>
              <ul className="space-y-1">
                {selected.companionPlants.map((plant) => (
                  <li
                    key={plant}
                    className="flex items-center gap-2 text-sm text-text-secondary"
                  >
                    <span className="text-primary">•</span> {plant}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-5">
              <h3 className="mb-3 font-semibold">🐛 Common Pests</h3>
              <ul className="space-y-1">
                {selected.commonPests.map((pest) => (
                  <li
                    key={pest}
                    className="flex items-center gap-2 text-sm text-text-secondary"
                  >
                    <span className="text-red-400">•</span> {pest}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-5">
              <h3 className="mb-3 font-semibold">💡 Growing Tips</h3>
              <ul className="space-y-1">
                {selected.growingTips.map((tip) => (
                  <li
                    key={tip}
                    className="flex items-start gap-2 text-sm text-text-secondary"
                  >
                    <span className="mt-0.5 text-primary">✓</span> {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
