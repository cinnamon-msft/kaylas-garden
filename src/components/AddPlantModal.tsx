"use client";

import { useState, useRef, useEffect, useMemo, type FormEvent } from "react";
import { PLANT_LIBRARY, type LibraryPlant } from "@/lib/plant-library";

interface AddPlantModalProps {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onPlantAdded: () => void;
}

const SUNLIGHT_OPTIONS = [
  "Full sun",
  "Partial sun",
  "Partial shade",
  "Full shade",
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

const SORTED_LIBRARY: readonly LibraryPlant[] = [...PLANT_LIBRARY].sort(
  (a, b) => a.name.localeCompare(b.name),
);

type Mode = "library" | "custom";

export function AddPlantModal({
  open,
  onClose,
  onPlantAdded,
}: AddPlantModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>("library");

  // Library mode
  const [libraryQuery, setLibraryQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string>("");

  // Custom mode
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("");
  const [sunlight, setSunlight] = useState<string>(SUNLIGHT_OPTIONS[0]);
  const [wateringSchedule, setWateringSchedule] = useState("");
  const [soilType, setSoilType] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => onClose();
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  const filteredLibrary = useMemo(() => {
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return SORTED_LIBRARY;
    return SORTED_LIBRARY.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.scientificName.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q),
    );
  }, [libraryQuery]);

  const selectedLibraryPlant: LibraryPlant | undefined = useMemo(
    () => SORTED_LIBRARY.find((p) => p.id === selectedId),
    [selectedId],
  );

  const resetForm = () => {
    setMode("library");
    setLibraryQuery("");
    setSelectedId("");
    setName("");
    setSpecies("");
    setSunlight(SUNLIGHT_OPTIONS[0]);
    setWateringSchedule("");
    setSoilType("");
    setGeneralNotes("");
    setError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let payload: Record<string, unknown>;

      if (mode === "library") {
        if (!selectedLibraryPlant) {
          throw new Error("Please pick a plant from the library.");
        }
        payload = {
          name: selectedLibraryPlant.name,
          species: selectedLibraryPlant.scientificName,
          thumbnailImage: "",
          careInfo: {
            sunlight: selectedLibraryPlant.sunlight,
            wateringSchedule: selectedLibraryPlant.wateringSchedule,
            soilType: selectedLibraryPlant.soilType,
            hardinessZone: selectedLibraryPlant.hardinessZones,
            companionPlants: [...selectedLibraryPlant.companionPlants],
            commonPests: [...selectedLibraryPlant.commonPests],
            generalNotes: selectedLibraryPlant.plantingGuidelines,
          },
          wateringIntervalDays: selectedLibraryPlant.wateringIntervalDays,
        };
      } else {
        payload = {
          name: name.trim(),
          species: species.trim(),
          thumbnailImage: "",
          careInfo: {
            sunlight,
            wateringSchedule: wateringSchedule.trim(),
            soilType: soilType.trim(),
            hardinessZone: "",
            companionPlants: [],
            commonPests: [],
            generalNotes: generalNotes.trim(),
          },
        };
      }

      const res = await fetch("/api/plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Failed to create plant");
      }

      resetForm();
      onPlantAdded();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClasses =
    "w-full rounded-lg border border-border bg-bg-card px-3 py-2 text-text-primary placeholder:text-text-secondary/60 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30";

  const tabClasses = (active: boolean) =>
    `flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active
        ? "bg-primary text-text-on-primary"
        : "bg-bg-card text-text-secondary hover:bg-hover"
    }`;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="add-plant-dialog-title"
      className="w-full max-w-lg rounded-2xl border border-border bg-bg-card p-0 shadow-xl backdrop:bg-black/50"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between">
          <h2
            id="add-plant-dialog-title"
            className="text-xl font-bold text-text-primary"
          >
            <span aria-hidden="true">🌿</span> Add a New Plant
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-text-secondary hover:bg-hover"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Mode toggle */}
        <div
          role="tablist"
          aria-label="Add plant mode"
          className="flex gap-2 rounded-lg border border-border p-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "library"}
            onClick={() => setMode("library")}
            className={tabClasses(mode === "library")}
          >
            📚 Pick from library
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "custom"}
            onClick={() => setMode("custom")}
            className={tabClasses(mode === "custom")}
          >
            ✏️ Custom plant
          </button>
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
          >
            {error}
          </p>
        )}

        {mode === "library" ? (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-secondary">
                Search the library
              </span>
              <input
                type="search"
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder="e.g., Tomato, herb, Basil..."
                className={inputClasses}
              />
            </label>

            <fieldset className="flex flex-col gap-1">
              <legend className="mb-1 text-sm font-medium text-text-secondary">
                Plant{" "}
                <span className="text-red-500" aria-hidden="true">
                  *
                </span>
                <span className="sr-only">(required)</span>
              </legend>
              <div
                role="listbox"
                aria-label="Plant library"
                tabIndex={0}
                className="max-h-72 overflow-y-auto rounded-lg border border-border bg-bg-card p-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {filteredLibrary.length === 0 ? (
                  <p className="p-4 text-center text-sm text-text-secondary">
                    No matches for &ldquo;{libraryQuery}&rdquo;
                  </p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {filteredLibrary.map((plant) => {
                      const isSelected = plant.id === selectedId;
                      return (
                        <li key={plant.id}>
                          <button
                            type="button"
                            role="option"
                            aria-selected={isSelected}
                            onClick={() => setSelectedId(plant.id)}
                            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors ${
                              isSelected
                                ? "bg-primary text-text-on-primary"
                                : "hover:bg-hover"
                            }`}
                          >
                            <span
                              aria-hidden="true"
                              className="text-xl leading-none"
                            >
                              {CATEGORY_EMOJI[plant.category] ?? "🌱"}
                            </span>
                            <span className="flex min-w-0 flex-1 flex-col">
                              <span className="truncate text-sm font-semibold">
                                {plant.name}
                              </span>
                              <span
                                className={`truncate text-xs italic ${
                                  isSelected
                                    ? "text-text-on-primary/80"
                                    : "text-text-secondary"
                                }`}
                              >
                                {plant.scientificName}
                              </span>
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                                isSelected
                                  ? "bg-white/20 text-text-on-primary"
                                  : "bg-accent text-text-primary"
                              }`}
                            >
                              {plant.category}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {/* Hidden field so the form is unsubmittable without a selection */}
              <input
                type="text"
                value={selectedId}
                onChange={() => {
                  /* controlled by listbox */
                }}
                required
                aria-hidden="true"
                tabIndex={-1}
                className="sr-only"
              />
            </fieldset>

            {selectedLibraryPlant && (
              <div className="rounded-lg border border-border bg-hover/30 p-3 text-sm">
                <p className="font-semibold text-text-primary">
                  {selectedLibraryPlant.name}
                </p>
                <p className="italic text-text-secondary">
                  {selectedLibraryPlant.scientificName}
                </p>
                <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-text-secondary">
                  <dt className="font-medium">Sunlight</dt>
                  <dd>{selectedLibraryPlant.sunlight}</dd>
                  <dt className="font-medium">Water</dt>
                  <dd>{selectedLibraryPlant.wateringSchedule}</dd>
                  <dt className="font-medium">Soil</dt>
                  <dd>{selectedLibraryPlant.soilType}</dd>
                  <dt className="font-medium">Zones</dt>
                  <dd>{selectedLibraryPlant.hardinessZones}</dd>
                </dl>
                <p className="mt-2 text-xs text-text-secondary">
                  Care info will be pre-filled from the library. You can edit
                  it after adding.
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-secondary">
                Name{" "}
                <span className="text-red-500" aria-hidden="true">
                  *
                </span>
                <span className="sr-only">(required)</span>
              </span>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., My Tomato Plant"
                className={inputClasses}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-secondary">
                Species
              </span>
              <input
                type="text"
                value={species}
                onChange={(e) => setSpecies(e.target.value)}
                placeholder="e.g., Solanum lycopersicum"
                className={inputClasses}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-secondary">
                Sunlight
              </span>
              <select
                value={sunlight}
                onChange={(e) => setSunlight(e.target.value)}
                className={inputClasses}
              >
                {SUNLIGHT_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-secondary">
                Watering Schedule
              </span>
              <input
                type="text"
                value={wateringSchedule}
                onChange={(e) => setWateringSchedule(e.target.value)}
                placeholder="e.g., Every 2-3 days"
                className={inputClasses}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-secondary">
                Soil Type
              </span>
              <input
                type="text"
                value={soilType}
                onChange={(e) => setSoilType(e.target.value)}
                placeholder="e.g., Well-draining, loamy"
                className={inputClasses}
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-text-secondary">
                General Notes
              </span>
              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Any notes about this plant..."
                rows={3}
                className={inputClasses}
              />
            </label>
          </>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-hover"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || (mode === "library" && !selectedId)}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-on-primary hover:bg-primary-dark disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add Plant"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
