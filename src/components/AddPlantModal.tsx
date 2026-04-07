"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";

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

export function AddPlantModal({ open, onClose, onPlantAdded }: AddPlantModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
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

  const resetForm = () => {
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
      const res = await fetch("/api/plants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });

      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
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

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="add-plant-dialog-title"
      className="w-full max-w-lg rounded-2xl border border-border bg-bg-card p-0 shadow-xl backdrop:bg-black/50"
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
        <div className="flex items-center justify-between">
          <h2 id="add-plant-dialog-title" className="text-xl font-bold text-text-primary">
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

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text-secondary">
            Name{" "}
            <span className="text-red-500" aria-hidden="true">*</span>
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
          <span className="text-sm font-medium text-text-secondary">Species</span>
          <input
            type="text"
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            placeholder="e.g., Solanum lycopersicum"
            className={inputClasses}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text-secondary">Sunlight</span>
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
          <span className="text-sm font-medium text-text-secondary">Soil Type</span>
          <input
            type="text"
            value={soilType}
            onChange={(e) => setSoilType(e.target.value)}
            placeholder="e.g., Well-draining, loamy"
            className={inputClasses}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-text-secondary">General Notes</span>
          <textarea
            value={generalNotes}
            onChange={(e) => setGeneralNotes(e.target.value)}
            placeholder="Any notes about this plant..."
            rows={3}
            className={inputClasses}
          />
        </label>

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
            disabled={submitting}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-text-on-primary hover:bg-primary-dark disabled:opacity-50"
          >
            {submitting ? "Adding…" : "Add Plant"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
