"use client";

import { useState, useEffect } from "react";

interface LibraryPlantInfo {
  name: string;
  scientificName: string;
  description: string;
  sunlight: string;
  wateringSchedule: string;
  soilType: string;
  hardinessZones: string;
  plantingGuidelines: string;
  companionPlants: string[];
  commonPests: string[];
  growingTips: string[];
  daysToHarvest: string;
  category: string;
}

const POPULAR_PLANTS = [
  "Tomato", "Basil", "Lavender", "Sunflower", "Mint",
  "Strawberry", "Rose", "Pepper", "Cucumber", "Zucchini",
  "Rosemary", "Thyme",
];

const CATEGORY_EMOJI: Record<string, string> = {
  vegetable: "🥬",
  herb: "🌿",
  flower: "🌸",
  fruit: "🍓",
  succulent: "🌵",
  tree: "🌳",
  shrub: "🌲",
};

export default function LibraryPage() {
  const [query, setQuery] = useState("");
  const [plantInfo, setPlantInfo] = useState<LibraryPlantInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedToGarden, setAddedToGarden] = useState(false);

  useEffect(() => {
    document.title = "Plant Library — Kayla's Garden";
  }, []);

  const searchPlant = async (name: string) => {
    setLoading(true);
    setError(null);
    setPlantInfo(null);
    setAddedToGarden(false);
    setQuery(name);

    try {
      const res = await fetch(`/api/library?plant=${encodeURIComponent(name)}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to fetch plant info");
      }
      const data: LibraryPlantInfo = await res.json();
      setPlantInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      searchPlant(query.trim());
    }
  };

  const addToGarden = async () => {
    if (!plantInfo) return;

    try {
      const res = await fetch("/api/plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: plantInfo.name,
          species: plantInfo.scientificName,
          thumbnailImage: "",
          careInfo: {
            sunlight: plantInfo.sunlight,
            wateringSchedule: plantInfo.wateringSchedule,
            soilType: plantInfo.soilType,
            hardinessZone: plantInfo.hardinessZones,
            companionPlants: plantInfo.companionPlants,
            commonPests: plantInfo.commonPests,
            generalNotes: plantInfo.plantingGuidelines,
          },
        }),
      });

      if (!res.ok) throw new Error("Failed to add plant");
      setAddedToGarden(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to garden");
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="mb-2 text-3xl font-bold"><span aria-hidden="true">🌱</span> Plant Library</h1>
        <p className="text-text-secondary">
          Search for any plant to get AI-powered growing information and care
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
            placeholder="e.g., Tomato, Basil, Sunflower..."
            className="flex-1 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-text-primary placeholder:text-text-secondary/50 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="rounded-lg bg-primary px-6 py-2.5 font-medium text-text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
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
              key={plant}
              onClick={() => searchPlant(plant)}
              disabled={loading}
              aria-pressed={query === plant && !loading}
              className="rounded-full border border-border bg-bg-card px-4 py-1.5 text-sm font-medium text-text-primary transition-all hover:border-primary hover:bg-hover disabled:opacity-50"
            >
              {plant}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div role="status" aria-live="polite" aria-label="Looking up plant information" className="flex items-center justify-center rounded-lg border border-border bg-bg-card p-12">
          <div className="text-center">
            <div className="mb-3 animate-bounce text-4xl" aria-hidden="true">🌱</div>
            <p className="text-text-secondary">
              Looking up plant information...
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Plant Info */}
      {plantInfo && !loading && (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-lg border border-border bg-bg-card p-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span aria-hidden="true" className="text-2xl">
                    {CATEGORY_EMOJI[plantInfo.category] || "🌱"}
                  </span>
                  <h2 className="text-2xl font-bold">{plantInfo.name}</h2>
                </div>
                <p className="mt-1 text-sm italic text-text-secondary">
                  {plantInfo.scientificName}
                </p>
                <span className="mt-2 inline-block rounded-full bg-accent px-3 py-0.5 text-xs font-medium capitalize text-text-primary">
                  {plantInfo.category}
                </span>
              </div>
              <div>
                <div aria-live="polite" className="sr-only">
                  {addedToGarden && `${plantInfo.name} added to your garden`}
                </div>
                <button
                  onClick={addToGarden}
                  disabled={addedToGarden}
                  className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                    addedToGarden
                      ? "bg-green-100 text-green-700"
                      : "bg-primary text-text-on-primary hover:bg-primary-dark"
                  }`}
                >
                  {addedToGarden ? "✓ Added to Garden" : "+ Add to My Garden"}
                </button>
              </div>
            </div>
            <p className="mt-4 text-text-secondary">{plantInfo.description}</p>
          </div>

          {/* Care Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="mb-1 text-lg">☀️</div>
              <h3 className="text-sm font-semibold text-text-secondary">
                Sunlight
              </h3>
              <p className="mt-1 font-medium">{plantInfo.sunlight}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="mb-1 text-lg">💧</div>
              <h3 className="text-sm font-semibold text-text-secondary">
                Watering
              </h3>
              <p className="mt-1 font-medium">{plantInfo.wateringSchedule}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="mb-1 text-lg">🌍</div>
              <h3 className="text-sm font-semibold text-text-secondary">
                Soil
              </h3>
              <p className="mt-1 font-medium">{plantInfo.soilType}</p>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-4">
              <div className="mb-1 text-lg">📅</div>
              <h3 className="text-sm font-semibold text-text-secondary">
                Days to Harvest
              </h3>
              <p className="mt-1 font-medium">{plantInfo.daysToHarvest}</p>
            </div>
          </div>

          {/* Hardiness & Planting */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-border bg-bg-card p-5">
              <h3 className="mb-2 font-semibold">🗺️ Hardiness Zones</h3>
              <p className="text-text-secondary">
                {plantInfo.hardinessZones}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-bg-card p-5">
              <h3 className="mb-2 font-semibold">🌱 Planting Guidelines</h3>
              <p className="text-text-secondary">
                {plantInfo.plantingGuidelines}
              </p>
            </div>
          </div>

          {/* Lists */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-bg-card p-5">
              <h3 className="mb-3 font-semibold">🌻 Companion Plants</h3>
              <ul className="space-y-1">
                {plantInfo.companionPlants.map((plant) => (
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
                {plantInfo.commonPests.map((pest) => (
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
                {plantInfo.growingTips.map((tip, i) => (
                  <li
                    key={i}
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
