"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback, useRef } from "react";
import type { Plant, PlantCareInfo, PlantEntry, PlantImage } from "@/lib/types";
import Link from "next/link";

// ── Helpers ──────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

// ── Sub-components ───────────────────────────────────────────────────

function PlantHeader({
  plant,
  onDelete,
}: {
  plant: Plant;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);

  return (
    <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-4">
        {plant.thumbnailImage ? (
          <img
            src={`/api/uploads/${plant.thumbnailImage}`}
            alt={plant.name}
            className="h-28 w-28 rounded-lg border border-border object-cover"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-lg border border-border bg-bg-card text-5xl">
            🌱
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold text-text-primary">
            {plant.name}
          </h1>
          <p className="text-lg italic text-text-secondary">{plant.species}</p>
          <p className="mt-1 text-sm text-text-secondary">
            Added {formatDate(plant.dateAdded)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="rounded-lg border border-border px-4 py-2 text-sm text-text-secondary hover:bg-hover"
        >
          ← Back
        </Link>

        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-red-600">Delete this plant?</span>
            <button
              onClick={onDelete}
              className="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:bg-hover"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            Delete
          </button>
        )}
      </div>
    </section>
  );
}

// ── Care Information Card ────────────────────────────────────────────

function CareInfoCard({
  careInfo,
  onSave,
}: {
  careInfo: PlantCareInfo;
  onSave: (updated: PlantCareInfo) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<PlantCareInfo>(careInfo);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(careInfo);
  }, [careInfo]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const updateField = <K extends keyof PlantCareInfo>(
    key: K,
    value: PlantCareInfo[K],
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const infoGrid: { label: string; emoji: string; key: keyof PlantCareInfo }[] =
    [
      { label: "Sunlight", emoji: "☀️", key: "sunlight" },
      { label: "Watering", emoji: "💧", key: "wateringSchedule" },
      { label: "Soil", emoji: "🌍", key: "soilType" },
      { label: "Hardiness Zone", emoji: "🗺️", key: "hardinessZone" },
    ];

  return (
    <section className="rounded-lg border border-border bg-bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">
          🌿 Care Information
        </h2>
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm text-text-on-primary hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setDraft(careInfo);
                setEditing(false);
              }}
              className="rounded-lg border border-border px-4 py-1.5 text-sm text-text-secondary hover:bg-hover"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border px-4 py-1.5 text-sm text-text-secondary hover:bg-hover"
          >
            Edit
          </button>
        )}
      </div>

      {/* Top grid: sunlight, watering, soil, hardiness */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {infoGrid.map(({ label, emoji, key }) => (
          <div key={key} className="rounded-lg border border-border p-3">
            <p className="mb-1 text-xs font-medium text-text-secondary">
              {emoji} {label}
            </p>
            {editing ? (
              <input
                value={draft[key] as string}
                onChange={(e) => updateField(key, e.target.value)}
                className="w-full rounded border border-border bg-bg-page px-2 py-1 text-sm text-text-primary"
              />
            ) : (
              <p className="text-sm font-medium text-text-primary">
                {(careInfo[key] as string) || "—"}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Companion plants */}
      <div className="mt-4 rounded-lg border border-border p-3">
        <p className="mb-1 text-xs font-medium text-text-secondary">
          🌻 Companion Plants
        </p>
        {editing ? (
          <input
            value={draft.companionPlants.join(", ")}
            onChange={(e) =>
              updateField(
                "companionPlants",
                e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              )
            }
            placeholder="Comma-separated list"
            className="w-full rounded border border-border bg-bg-page px-2 py-1 text-sm text-text-primary"
          />
        ) : careInfo.companionPlants.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {careInfo.companionPlants.map((p) => (
              <span
                key={p}
                className="rounded-full bg-accent px-2.5 py-0.5 text-xs text-text-primary"
              >
                {p}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">—</p>
        )}
      </div>

      {/* Common pests */}
      <div className="mt-4 rounded-lg border border-border p-3">
        <p className="mb-1 text-xs font-medium text-text-secondary">
          🐛 Common Pests
        </p>
        {editing ? (
          <input
            value={draft.commonPests.join(", ")}
            onChange={(e) =>
              updateField(
                "commonPests",
                e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              )
            }
            placeholder="Comma-separated list"
            className="w-full rounded border border-border bg-bg-page px-2 py-1 text-sm text-text-primary"
          />
        ) : careInfo.commonPests.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {careInfo.commonPests.map((p) => (
              <span
                key={p}
                className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-700"
              >
                {p}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">—</p>
        )}
      </div>

      {/* General notes */}
      <div className="mt-4 rounded-lg border border-border p-3">
        <p className="mb-1 text-xs font-medium text-text-secondary">
          📝 General Notes
        </p>
        {editing ? (
          <textarea
            value={draft.generalNotes}
            onChange={(e) => updateField("generalNotes", e.target.value)}
            rows={3}
            className="w-full rounded border border-border bg-bg-page px-2 py-1 text-sm text-text-primary"
          />
        ) : (
          <p className="text-sm text-text-primary">
            {careInfo.generalNotes || "—"}
          </p>
        )}
      </div>
    </section>
  );
}

// ── Watering Date Card ───────────────────────────────────────────────

function WateringDateCard({
  plant,
  onSave,
}: {
  plant: Plant;
  onSave: (date: string | null) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(
    plant.nextWateringDate ? plant.nextWateringDate.slice(0, 10) : ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft(plant.nextWateringDate ? plant.nextWateringDate.slice(0, 10) : "");
  }, [plant.nextWateringDate]);

  const today = todayISO();
  const isDueToday =
    plant.nextWateringDate && plant.nextWateringDate.slice(0, 10) === today;

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft ? draft : null);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="rounded-lg border border-border bg-bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">
          💧 Watering Schedule
        </h2>
        {editing ? (
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-1.5 text-sm text-text-on-primary hover:bg-primary-dark disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              onClick={() => {
                setDraft(
                  plant.nextWateringDate
                    ? plant.nextWateringDate.slice(0, 10)
                    : ""
                );
                setEditing(false);
              }}
              className="rounded-lg border border-border px-4 py-1.5 text-sm text-text-secondary hover:bg-hover"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="rounded-lg border border-border px-4 py-1.5 text-sm text-text-secondary hover:bg-hover"
          >
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-text-secondary">
            Next Watering Date
          </label>
          <input
            type="date"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full max-w-xs rounded border border-border bg-bg-page px-3 py-2 text-sm text-text-primary"
          />
          <p className="text-xs text-text-secondary">
            Leave blank to clear the watering schedule.
          </p>
        </div>
      ) : plant.nextWateringDate ? (
        <div
          className={`rounded-lg border p-3 ${
            isDueToday
              ? "border-blue-300 bg-blue-50"
              : "border-border bg-bg-page"
          }`}
        >
          <p
            className={`text-sm font-medium ${
              isDueToday ? "text-blue-800" : "text-text-primary"
            }`}
          >
            {isDueToday
              ? "💧 Due today!"
              : `Next watering: ${formatDate(plant.nextWateringDate)}`}
          </p>
        </div>
      ) : (
        <p className="text-sm text-text-secondary">
          No watering date set. Click Edit to schedule the next watering.
        </p>
      )}
    </section>
  );
}

function AddEntryForm({
  plantId,
  onAdded,
}: {
  plantId: string;
  onAdded: () => void;
}) {
  const [date, setDate] = useState(todayISO());
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      // Upload images first
      const uploadedImages: PlantImage[] = [];

      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const { filename } = (await uploadRes.json()) as { filename: string };
        uploadedImages.push({
          id: crypto.randomUUID(),
          filename,
          caption: file.name,
          uploadedAt: new Date().toISOString(),
        });
      }

      // Create the entry
      const entryRes = await fetch(`/api/plants/${plantId}/entries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          note,
          images: uploadedImages,
        }),
      });

      if (!entryRes.ok) {
        throw new Error("Failed to create entry");
      }

      // Reset form
      setDate(todayISO());
      setNote("");
      setFiles([]);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-lg border border-border bg-bg-card p-4"
    >
      <h3 className="mb-3 text-lg font-semibold text-text-primary">
        📝 Add Progress Entry
      </h3>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Date
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded border border-border bg-bg-page px-3 py-2 text-sm text-text-primary"
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-text-secondary">
            Photos
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
            className="w-full rounded border border-border bg-bg-page px-3 py-2 text-sm text-text-primary file:mr-2 file:rounded file:border-0 file:bg-primary file:px-2 file:py-1 file:text-xs file:text-text-on-primary"
          />
        </div>
      </div>

      <div className="mt-3">
        <label className="mb-1 block text-xs font-medium text-text-secondary">
          Note
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="How is your plant doing today?"
          className="w-full rounded border border-border bg-bg-page px-3 py-2 text-sm text-text-primary"
          required
        />
      </div>

      {files.length > 0 && (
        <p className="mt-2 text-xs text-text-secondary">
          {files.length} file{files.length > 1 ? "s" : ""} selected
        </p>
      )}

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={submitting}
        className="mt-3 rounded-lg bg-primary px-5 py-2 text-sm font-medium text-text-on-primary hover:bg-primary-dark disabled:opacity-50"
      >
        {submitting ? "Saving…" : "Add Entry"}
      </button>
    </form>
  );
}

// ── Image Lightbox ───────────────────────────────────────────────────

function Lightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <img
        src={src}
        alt={alt}
        className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ── Timeline Entry ───────────────────────────────────────────────────

function TimelineEntry({ entry }: { entry: PlantEntry }) {
  const [lightboxImg, setLightboxImg] = useState<{
    src: string;
    alt: string;
  } | null>(null);

  return (
    <>
      {lightboxImg && (
        <Lightbox
          src={lightboxImg.src}
          alt={lightboxImg.alt}
          onClose={() => setLightboxImg(null)}
        />
      )}

      <div className="relative border-l-2 border-primary pl-6 pb-6">
        {/* Timeline dot */}
        <div className="absolute -left-[7px] top-1 h-3 w-3 rounded-full bg-primary" />

        <p className="text-xs font-medium text-text-secondary">
          {formatDate(entry.date)}
        </p>
        <p className="mt-1 text-sm text-text-primary">{entry.note}</p>

        {entry.images.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {entry.images.map((img) => (
              <button
                key={img.id}
                onClick={() =>
                  setLightboxImg({
                    src: `/api/uploads/${img.filename}`,
                    alt: img.caption || entry.note,
                  })
                }
                className="overflow-hidden rounded-lg border border-border"
              >
                <img
                  src={`/api/uploads/${img.filename}`}
                  alt={img.caption || "Entry photo"}
                  className="h-20 w-20 object-cover transition-transform hover:scale-105"
                />
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ── Main Page Component ──────────────────────────────────────────────

export default function PlantDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchPlant = useCallback(async () => {
    try {
      const res = await fetch(`/api/plants/${params.id}`);
      if (!res.ok) {
        setError(res.status === 404 ? "Plant not found" : "Failed to load");
        return;
      }
      const data = (await res.json()) as Plant;
      setPlant(data);
      setError("");
    } catch {
      setError("Failed to load plant");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchPlant();
  }, [fetchPlant]);

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/plants/${params.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        router.push("/");
      }
    } catch {
      setError("Failed to delete plant");
    }
  };

  const handleSaveCare = async (updated: PlantCareInfo) => {
    const res = await fetch(`/api/plants/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ careInfo: updated }),
    });

    if (!res.ok) throw new Error("Failed to update care info");

    const updatedPlant = (await res.json()) as Plant;
    setPlant(updatedPlant);
  };

  const handleSaveWateringDate = async (date: string | null) => {
    const res = await fetch(`/api/plants/${params.id}/water`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextWateringDate: date }),
    });

    if (!res.ok) throw new Error("Failed to update watering date");

    const updatedPlant = (await res.json()) as Plant;
    setPlant(updatedPlant);
  };

  // ── Render states ──

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-text-secondary">Loading plant…</p>
      </div>
    );
  }

  if (error || !plant) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <p className="text-lg text-red-600">{error || "Plant not found"}</p>
        <Link
          href="/"
          className="rounded-lg bg-primary px-4 py-2 text-sm text-text-on-primary hover:bg-primary-dark"
        >
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const sortedEntries = [...plant.entries].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 sm:p-6">
      <PlantHeader plant={plant} onDelete={handleDelete} />

      <CareInfoCard careInfo={plant.careInfo} onSave={handleSaveCare} />

      <WateringDateCard plant={plant} onSave={handleSaveWateringDate} />

      {/* Progress Timeline */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">
          📅 Progress Timeline
        </h2>

        <AddEntryForm plantId={params.id} onAdded={fetchPlant} />

        {sortedEntries.length > 0 ? (
          <div className="mt-4">
            {sortedEntries.map((entry) => (
              <TimelineEntry key={entry.id} entry={entry} />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-border bg-bg-card p-6 text-center text-sm text-text-secondary">
            No progress entries yet. Add your first one above!
          </p>
        )}
      </section>
    </div>
  );
}
