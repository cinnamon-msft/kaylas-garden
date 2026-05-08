"use client";

import Link from "next/link";
import { useState, useEffect, useMemo, type FormEvent } from "react";
import {
  PLANT_LIBRARY,
  searchLibraryPlants,
  type LibraryPlant,
} from "@/lib/plant-library";
import type { Plant } from "@/lib/types";

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
  const [gardenPlants, setGardenPlants] = useState<Plant[]>([]);
  const [addedPlant, setAddedPlant] = useState<Plant | null>(null);
  const [nickname, setNickname] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    document.title = "Plant Library — Kayla's Garden";
  }, []);

  useEffect(() => {
    fetch("/api/plants")
      .then((res) => res.ok ? res.json() : Promise.reject(new Error("Failed to load garden plants")))
      .then((plants: Plant[]) => setGardenPlants(plants))
      .catch((err: unknown) => {
        console.error("Failed to load garden plants:", err);
        setGardenPlants([]);
      });
  }, []);

  const results = useMemo(() => {
    if (!activeQuery.trim()) return [] as readonly LibraryPlant[];
    return [...searchLibraryPlants(activeQuery)].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [activeQuery]);

  const selectPlant = (plant: LibraryPlant) => {
    setSelected(plant);
    setAddedPlant(null);
    setNickname("");
    setError(null);
    setQuery(plant.name);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    setActiveQuery(trimmed);
    setSelected(null);
    setAddedPlant(null);
    setNickname("");
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
          nickname: nickname.trim() || undefined,
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
      const plant = (await res.json()) as Plant;
      setAddedPlant(plant);
      setGardenPlants((current) => [plant, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to garden");
    } finally {
      setAdding(false);
    }
  };

  const selectedAlreadyInGarden = Boolean(
    selected &&
      gardenPlants.some(
        (plant) =>
          plant.name.toLowerCase() === selected.name.toLowerCase() &&
          plant.species.toLowerCase() === selected.scientificName.toLowerCase(),
      ),
  );

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
        <div className="flex flex-col gap-2 sm:flex-row">
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
          <div className="rounded-lg border border-border bg-bg-card p-4 sm:p-6">
            <div className="flex flex-col items-start justify-between gap-4 sm:flex-row">
              <div className="min-w-0">
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
              <div className="w-full sm:w-auto">
                <div aria-live="polite" className="sr-only">
                  {addedPlant && `${selected.name} added to your garden`}
                </div>
                {addedPlant ? (
                  <div className="flex flex-col gap-2 sm:items-end">
                    <span className="rounded-lg bg-green-100 px-4 py-2 text-sm font-medium text-green-700">
                      ✓ Added to Garden
                    </span>
                    <div className="flex flex-wrap gap-2 text-sm">
                      <Link href={`/plants/${addedPlant.id}`} className="font-medium text-primary hover:underline">
                        View plant
                      </Link>
                      <Link href="/" className="font-medium text-primary hover:underline">
                        Go to My Garden
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setAddedPlant(null);
                          setNickname("");
                        }}
                        className="font-medium text-primary hover:underline"
                      >
                        Add another
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={addToGarden}
                    disabled={adding}
                    className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-60 sm:w-auto"
                  >
                    {adding
                      ? "Adding…"
                      : selectedAlreadyInGarden
                        ? "+ Add Another to My Garden"
                        : "+ Add to My Garden"}
                  </button>
                )}
              </div>
            </div>
            <p className="mt-4 text-text-secondary">{selected.description}</p>
            <div className="mt-4 max-w-md">
              <label htmlFor="library-plant-nickname" className="mb-1 block text-sm font-medium text-text-secondary">
                Nickname <span className="font-normal">(optional)</span>
              </label>
              <input
                id="library-plant-nickname"
                value={nickname}
                onChange={(event) => setNickname(event.target.value)}
                disabled={Boolean(addedPlant)}
                placeholder={`e.g., Patio ${selected.name}`}
                className="w-full rounded-lg border border-border bg-bg-page px-3 py-2 text-text-primary placeholder:text-text-secondary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              />
              {selectedAlreadyInGarden && !addedPlant && (
                <p className="mt-2 rounded-md bg-accent px-2 py-1 text-xs text-text-primary">
                  You already have this plant in your garden. Add another to track a separate specimen.
                </p>
              )}
            </div>
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
