"use client";

import { useEffect, useState } from "react";
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

type GeoPermissionState = "unknown" | "prompt" | "granted" | "denied" | "unsupported" | "insecure";

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

function detectBrowser(): "chrome" | "firefox" | "safari" | "edge" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes("edg/")) return "edge";
  if (ua.includes("firefox")) return "firefox";
  if (ua.includes("chrome")) return "chrome";
  if (ua.includes("safari")) return "safari";
  return "other";
}

function browserUnblockInstructions(): string {
  switch (detectBrowser()) {
    case "chrome":
      return "Click the 🔒 lock (or ⓘ) icon to the left of the address bar → Site settings → set Location to “Allow”, then reload this page.";
    case "edge":
      return "Click the 🔒 lock icon in the address bar → Permissions for this site → set Location to “Allow”, then reload this page.";
    case "firefox":
      return "Click the 🔒 lock icon in the address bar → Connection secure → More information → Permissions → uncheck “Use Default” for Access Your Location and select “Allow”, then reload.";
    case "safari":
      return "Open Safari → Settings → Websites → Location → set this site to “Allow”, then reload this page.";
    default:
      return "Open your browser's site settings for this page, set Location to “Allow”, and reload.";
  }
}

export function LocationPrompt({
  mode,
  initialValue = "",
  onResolved,
  variant = "card",
}: LocationPromptProps) {
  const [value, setValue] = useState(initialValue);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<CandidateDto[] | null>(null);
  const [unmatched, setUnmatched] = useState(false);
  const [permissionState, setPermissionState] = useState<GeoPermissionState>("unknown");
  const copy = copyForMode(mode);

  // Detect geolocation availability + permission state up front so we can
  // render the right call-to-action (the browser only prompts the first
  // time — after a denial, it returns PERMISSION_DENIED instantly and we
  // have to tell the user how to unblock it manually).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setPermissionState("unsupported");
      return;
    }
    if (window.isSecureContext === false) {
      // Geolocation requires https or localhost.
      setPermissionState("insecure");
      return;
    }
    type PermissionsNav = Navigator & { permissions?: { query: (q: { name: string }) => Promise<{ state: PermissionState; onchange?: (() => void) | null }> } };
    const navWithPerms = navigator as PermissionsNav;
    if (!navWithPerms.permissions?.query) {
      setPermissionState("prompt"); // assume promptable; we'll find out when clicked
      return;
    }
    let cancelled = false;
    navWithPerms.permissions
      .query({ name: "geolocation" })
      .then((status) => {
        if (cancelled) return;
        setPermissionState(status.state as GeoPermissionState);
        status.onchange = () => {
          if (!cancelled) setPermissionState(status.state as GeoPermissionState);
        };
      })
      .catch(() => {
        if (!cancelled) setPermissionState("prompt");
      });
    return () => {
      cancelled = true;
    };
  }, []);


  async function persistMatch(data: Extract<FrostLookupResponse, { status: "matched" }>) {
    onResolved?.({
      location: data.location,
      resolvedLocation: data.resolvedLocation,
      frostDates: data.frostDates,
      locationResolved: true,
    });
    setValue(data.location);
    setCandidates(null);
    setUnmatched(false);
  }

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
        await persistMatch(data);
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

  function useMyLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setError("This browser doesn't support geolocation. Type your city, ZIP, or postal code instead.");
      return;
    }
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setError("Geolocation requires HTTPS or localhost. Type your city, ZIP, or postal code instead.");
      return;
    }
    setGeoLoading(true);
    setError(null);
    setUnmatched(false);
    setCandidates(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(
            `/api/frost-dates?lat=${latitude.toFixed(5)}&lon=${longitude.toFixed(5)}`,
          );
          if (!res.ok) {
            throw new Error(`Lookup failed (${res.status})`);
          }
          const data = (await res.json()) as FrostLookupResponse;
          if (data.status === "matched") {
            await persistMatch(data);
          } else {
            setUnmatched(true);
          }
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : "Lookup failed";
          setError(msg);
        } finally {
          setGeoLoading(false);
        }
      },
      (err) => {
        setGeoLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setPermissionState("denied");
          // No setError — the "denied" hint block handles this case with
          // browser-specific instructions instead of a generic alert.
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setError("Couldn't determine your location. Try typing your city, ZIP, or postal code instead.");
        } else if (err.code === err.TIMEOUT) {
          setError("Location request timed out. Try typing your city, ZIP, or postal code instead.");
        } else {
          setError("Couldn't read your location. Try typing your city, ZIP, or postal code instead.");
        }
      },
      { enableHighAccuracy: false, maximumAge: 10 * 60 * 1000, timeout: 10_000 },
    );
  }

  const containerClass =
    variant === "card"
      ? "rounded-xl border border-border bg-bg-card p-4 shadow-sm sm:p-6"
      : "rounded-lg border border-border bg-bg-page p-4";

  const busy = loading || geoLoading;
  const showGeoButton = permissionState !== "unsupported" && permissionState !== "insecure";
  const showPermissionDeniedHint = permissionState === "denied";
  const showSupportedNotice = permissionState === "unsupported" || permissionState === "insecure";

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
          disabled={busy || value.trim().length === 0}
          className="rounded-lg bg-primary px-5 py-2 font-medium text-text-on-primary transition-colors hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Looking up…" : "Look Up"}
        </button>
      </div>

      {showGeoButton && (
        <button
          type="button"
          onClick={useMyLocation}
          disabled={busy || permissionState === "denied"}
          aria-describedby={permissionState === "denied" ? "geo-denied-hint" : undefined}
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-page px-3 py-1.5 text-sm font-medium text-text-primary transition-colors hover:bg-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span aria-hidden="true">🧭</span>
          {geoLoading
            ? "Locating…"
            : permissionState === "denied"
              ? "Location blocked"
              : "Use my location"}
        </button>
      )}

      {showSupportedNotice && (
        <p className="mt-3 text-sm text-text-secondary">
          {permissionState === "unsupported"
            ? "This browser doesn't support geolocation."
            : "Geolocation requires a secure connection (HTTPS or localhost)."}{" "}
          Type your city, ZIP, or postal code to continue.
        </p>
      )}

      {showPermissionDeniedHint && (
        <div
          id="geo-denied-hint"
          role="status"
          className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <p className="font-medium">
            <span aria-hidden="true">🔒</span> Location access is blocked for this site.
          </p>
          <p className="mt-1">{browserUnblockInstructions()}</p>
          <p className="mt-2 text-amber-800">
            Browsers only show the location prompt once. After you unblock it above, reload this
            page and click <span className="font-medium">Use my location</span> again — or just
            type your city, ZIP, or postal code in the box above.
          </p>
        </div>
      )}

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
                disabled={busy}
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
          <code className="rounded bg-bg-page px-1">M5V 3A8</code>) — or click{" "}
          <span className="font-medium">Use my location</span>.
        </p>
      )}
    </section>
  );
}
