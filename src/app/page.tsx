"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import type { Plant } from "@/lib/types";
import { AddPlantModal } from "@/components/AddPlantModal";
import { FrostDateBanner } from "@/components/FrostDateBanner";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function PlantCard({ plant }: { readonly plant: Plant }) {
  const lastEntry =
    plant.entries.length > 0
      ? plant.entries[plant.entries.length - 1]
      : null;

  return (
    <article
      aria-labelledby={`plant-${plant.id}-name`}
      className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-bg-card shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
    >
      <div className="relative flex h-48 items-center justify-center bg-hover">
        {plant.thumbnailImage ? (
          <Image
            src={`/api/uploads/${plant.thumbnailImage}`}
            alt={plant.name}
            fill
            className="object-cover"
          />
        ) : (
          <span aria-hidden="true" className="text-6xl">🌿</span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 id={`plant-${plant.id}-name`} className="text-lg font-bold text-text-primary">
          <a
            href={`/plants/${plant.id}`}
            className="group-hover:text-primary after:absolute after:inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1"
          >
            {plant.name}
          </a>
        </h3>
        {plant.species && (
          <p className="text-sm italic text-text-secondary">{plant.species}</p>
        )}
        <p className="mt-1 text-xs text-text-secondary">
          Added {formatDate(plant.dateAdded)}
        </p>
        <div className="mt-auto flex items-center justify-between pt-3 text-xs text-text-secondary">
          <span>
            <span aria-hidden="true">📝</span>{" "}
            {plant.entries.length}{" "}
            {plant.entries.length === 1 ? "entry" : "entries"}
          </span>
          {lastEntry && <span>Last: {formatDate(lastEntry.date)}</span>}
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchPlants = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/plants");
      if (!res.ok) throw new Error("Failed to load plants");
      const data = (await res.json()) as Plant[];
      setPlants(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlants();
  }, [fetchPlants]);

  return (
    <>
      {/* Welcome Banner */}
      <section className="mb-8 rounded-2xl bg-primary p-6 text-text-on-primary shadow-md">
        <h2 className="text-3xl font-bold"><span aria-hidden="true">🌱</span> My Garden</h2>
        <p className="mt-1 text-text-on-primary/80">
          Track your plants, upload photos, and watch them grow!
        </p>
      </section>

      {/* Frost Date Alert */}
      <FrostDateBanner />

      {/* Actions */}
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-text-primary">
          Your Plants{!loading && ` (${plants.length})`}
        </h3>
        <button
          onClick={() => setModalOpen(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-on-primary shadow-sm hover:bg-primary-dark"
        >
          + Add Plant
        </button>
      </div>

      {/* Content */}
      {loading && (
        <div role="status" aria-live="polite" className="flex justify-center py-20 text-text-secondary">
          <span className="animate-pulse text-lg">Loading your garden…</span>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-center text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && plants.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-border bg-bg-card py-20 text-center">
          <span className="text-5xl">🌱</span>
          <p className="text-lg text-text-secondary">
            No plants yet! Add your first plant to get started.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="rounded-lg bg-primary px-5 py-2.5 font-medium text-text-on-primary hover:bg-primary-dark"
          >
            + Add Your First Plant
          </button>
        </div>
      )}

      {!loading && !error && plants.length > 0 && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {plants.map((plant) => (
            <PlantCard key={plant.id} plant={plant} />
          ))}
        </div>
      )}

      <AddPlantModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onPlantAdded={fetchPlants}
      />
    </>
  );
}
