"use client";

import { useState } from "react";
import type { UserSettings, FrostDates } from "@/lib/types";

export type LocationPromptMode = "missing" | "unclear";

interface CandidateDto {
  key: string;
  displayLabel: string;
  region: string;
  country: "US" | "CA";
  frostDates: FrostDates;
}

type FrostLookupResponse =
  | { status: "matched"; location: string; resolvedLocation: string; frostDates: FrostDates }
  | { status: "ambiguous"; location: string; candidates: CandidateDto[] }
  | { status: "unmatched"; location: string };

export interface LocationPromptProps {
  mode: LocationPromptMode;
  initialValue?: string;
  onResolved?: (settings: Partial<UserSettings>) => void;
  /** Optional surrounding container styles. Defaults to a card-style wrapper. */
  variant?: "card" | "inline";
}

function copyForMode(mode: LocationPromptMode): { heading: string; body: string } {
  if (mode === "missing") {
    return {
      heading: "Set your location",
      body: "Enter a city, US ZIP code, or Canadian postal code to see your planting calendar.",
    };
  }
  return {
    heading: "We couldn't pinpoint your location",
    body: "The location we have on file didn't match a known climate region. Try a nearby major city, US ZIP code, or Canadian postal code.",
  };
}

export function LocationPrompt({
  mode,
  initialValue = "",
  onResolved,
  variant = "card",
}: LocationPromptProps) {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateDto[] | null>(null);
  const [unmatched, setUnmatched] = useState(false);
  const copy = copyForMode(mode);

  async function lookup(rawLocation: string) {
    const trimmed = rawLocation.trim();
    if (trimmed.length === 0) return;
    setLoading(true);
    setError(null);
    setUnmatched(false);
    setCandidates(null);
    try {
      const res = await fetch(`/api/frost-dates?location=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        throw new Error(`Lookup failed (${res.status})`);
      }
      const data = (await res.json()) as FrostLookupResponse;
      if (data.status === "matched") {
        onResolved?.({
          location: data.location,
          resolvedLocation: data.resolvedLocation,
          frostDates: data.frostDates,
          locationResolved: true,
        });
        // Reflect canonical label in the input.
        setValue(data.location);
      } else if (data.status === "ambiguous") {
        setCandidates(data.candidates);
      } else {
        setUnmatched(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Lookup failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const containerClass =
    variant === "card"
      ? "rounded-xl border border-border bg-bg-card p-4 shadow-sm sm:p-6"
      : "rounded-lg border border-border bg-bg-page p-4";

  return (
    <section className={containerClass} aria-labelledby="location-prompt-heading">
      <h2 id="location-prompt-heading" className="mb-1 text-lg font-semibold text-text-primary">
        <span aria-hidden="true">📍</span> {copy.heading}
      </h2>
      <p className="mb-3 text-sm text-text-secondary">{copy.body}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="e.g., Boston, MA · 98101 · M5V 3A8"
          className="flex-1 rounded-lg border border-border bg-bg-page px-4 py-2 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
          aria-label="Location"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void lookup(value);
            }
          }}
        />
        <button
          onClick={() => void lookup(value)}
          disabled={loading || value.trim().length === 0}
          className="rounded-lg bg-primary px-5 py-2 font-medium text-text-on-primary transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Looking up…" : "Look Up"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}

      {candidates && candidates.length > 0 && (
        <div className="mt-4" aria-live="polite">
          <p className="mb-2 text-sm font-medium text-text-primary">Did you mean…?</p>
          <div className="flex flex-wrap gap-2">
            {candidates.map((candidate) => (
              <button
                key={candidate.key}
                type="button"
                onClick={() => void lookup(candidate.key)}
                disabled={loading}
                className="rounded-lg border border-border bg-bg-page px-3 py-1.5 text-sm text-text-primary transition-colors hover:bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
              >
                <span aria-hidden="true">📍</span> {candidate.displayLabel}
              </button>
            ))}
          </div>
        </div>
      )}

      {unmatched && (
        <p className="mt-3 text-sm text-text-secondary" aria-live="polite">
          We don&apos;t have frost data for that location yet. Try a nearby major city, US ZIP code,
          or Canadian postal code (e.g., <code className="rounded bg-bg-page px-1">Boston, MA</code>,{" "}
          <code className="rounded bg-bg-page px-1">98101</code>,{" "}
          <code className="rounded bg-bg-page px-1">M5V 3A8</code>).
        </p>
      )}
    </section>
  );
}
