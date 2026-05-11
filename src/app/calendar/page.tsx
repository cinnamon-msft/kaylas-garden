"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Plant, FrostDates } from "@/lib/types";
import { LocationPrompt } from "@/components/LocationPrompt";

type PlantingStage = "start_seeds_indoors" | "direct_sow_outdoors" | "transplant_outdoors" | "harvest";
type PlantCategory = "vegetable" | "fruit" | "herb" | "flower" | "succulent" | "tree" | "shrub";
type CalendarSeason = "winter" | "spring" | "summer" | "fall";
type FrostPhase = "before_last_spring_frost" | "growing_season" | "after_first_fall_frost";

interface PlantingWindow {
  stage: PlantingStage;
  location: "indoor" | "outdoor";
  startDate: string;
  endDate: string;
  anchorYear: number;
  isCurrent: boolean;
  isUpcoming: boolean;
  isPast: boolean;
  weeksUntilStart: number;
}

interface PlantCalendarEntry {
  plantId: string;
  name: string;
  category: PlantCategory;
  emoji: string;
  windows: PlantingWindow[];
}

interface CalendarPayload {
  frostDates: FrostDates;
  locationDisplayLabel: string;
  today: string;
  calendarSeason: CalendarSeason;
  frostPhase: FrostPhase;
  weeksSinceLastSpringFrost: number;
  weeksToNextLastSpringFrost: number;
  weeksToNextFirstFallFrost: number;
  plants: PlantCalendarEntry[];
  locationResolved: boolean;
  resolvedLocation: string | null;
}

interface ErrorPayload {
  error: string;
  code: "LOCATION_REQUIRED";
  location: string;
}

type FetchState =
  | { kind: "loading" }
  | { kind: "ready"; data: CalendarPayload }
  | { kind: "needs-location"; location: string }
  | { kind: "error"; message: string };

const STAGE_LABEL: Record<PlantingStage, string> = {
  start_seeds_indoors: "Start seeds indoors",
  direct_sow_outdoors: "Direct sow outdoors",
  transplant_outdoors: "Transplant outdoors",
  harvest: "Harvest",
};

const STAGE_EMOJI: Record<PlantingStage, string> = {
  start_seeds_indoors: "🌱",
  direct_sow_outdoors: "🪴",
  transplant_outdoors: "🌿",
  harvest: "🧺",
};

const SEASON_LABEL: Record<CalendarSeason, string> = {
  winter: "Winter",
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
};

const SEASON_EMOJI: Record<CalendarSeason, string> = {
  winter: "❄️",
  spring: "🌸",
  summer: "☀️",
  fall: "🍂",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type Tab = "this_season" | "full_year";

export default function CalendarPage() {
  const [state, setState] = useState<FetchState>({ kind: "loading" });
  const [tab, setTab] = useState<Tab>("this_season");
  const [filterToMyGarden, setFilterToMyGarden] = useState(false);
  const [myGardenIds, setMyGardenIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    document.title = "Planting Calendar — The Seed Feed";
  }, []);

  const loadCalendar = useCallback(async () => {
    setState({ kind: "loading" });
    try {
      const res = await fetch("/api/planting-calendar");
      if (res.status === 400) {
        const body = (await res.json()) as ErrorPayload;
        if (body.code === "LOCATION_REQUIRED") {
          setState({ kind: "needs-location", location: body.location ?? "" });
          return;
        }
        setState({ kind: "error", message: body.error || "Failed to load calendar" });
        return;
      }
      if (!res.ok) {
        setState({ kind: "error", message: `Failed to load calendar (${res.status})` });
        return;
      }
      const data = (await res.json()) as CalendarPayload;
      setState({ kind: "ready", data });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load calendar";
      setState({ kind: "error", message: msg });
    }
  }, []);

  useEffect(() => {
    void loadCalendar();
  }, [loadCalendar]);

  // Fetch user's garden plants once for the "My Garden only" filter. Match by
  // case-insensitive comparison of Plant.name and Plant.species against the
  // LibraryPlant.id, LibraryPlant.name, and LibraryPlant.scientificName fields.
  // The server returns plantId equal to LibraryPlant.id, so we resolve user
  // plants to library ids by re-fetching the library (small, bundled) — but
  // since matching by name covers the common case (plants added from the
  // library use the library name as Plant.name), we keep this client-side and
  // straightforward.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/plants");
        if (!res.ok) return;
        const plants = (await res.json()) as Plant[];
        const idsByName = new Map<string, string>();
        for (const p of plants) {
          // Heuristic: lowercase + non-alphanumeric removed.
          const key = (p.name || "").toLowerCase().trim();
          if (key) idsByName.set(key, key);
          const speciesKey = (p.species || "").toLowerCase().trim();
          if (speciesKey) idsByName.set(speciesKey, speciesKey);
        }
        if (!cancelled) setMyGardenIds(new Set(idsByName.keys()));
      } catch {
        // ignore — filter just stays empty
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.kind === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-text-secondary">Loading planting calendar…</p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-3xl font-bold text-text-primary">
          <span aria-hidden="true">🗓️</span> Planting Calendar
        </h1>
        <p role="alert" className="text-sm text-red-600">{state.message}</p>
      </div>
    );
  }

  if (state.kind === "needs-location") {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <h1 className="text-3xl font-bold text-text-primary">
          <span aria-hidden="true">🗓️</span> Planting Calendar
        </h1>
        <p className="text-text-secondary">
          Tell us where you garden and we&apos;ll show you what to seed, transplant, and harvest this season.
        </p>
        <LocationPrompt
          mode="missing"
          initialValue={state.location}
          onResolved={() => void loadCalendar()}
        />
      </div>
    );
  }

  const { data } = state;
  return (
    <CalendarReady
      data={data}
      tab={tab}
      setTab={setTab}
      filterToMyGarden={filterToMyGarden}
      setFilterToMyGarden={setFilterToMyGarden}
      myGardenIds={myGardenIds}
      onReload={() => void loadCalendar()}
    />
  );
}

interface CalendarReadyProps {
  data: CalendarPayload;
  tab: Tab;
  setTab: (t: Tab) => void;
  filterToMyGarden: boolean;
  setFilterToMyGarden: (v: boolean) => void;
  myGardenIds: Set<string>;
  onReload: () => void;
}

function CalendarReady({
  data,
  tab,
  setTab,
  filterToMyGarden,
  setFilterToMyGarden,
  myGardenIds,
  onReload,
}: CalendarReadyProps) {
  const visiblePlants = useMemo(() => {
    if (!filterToMyGarden) return data.plants;
    return data.plants.filter((p) =>
      myGardenIds.has(p.plantId.toLowerCase()) ||
      myGardenIds.has(p.name.toLowerCase()),
    );
  }, [data.plants, filterToMyGarden, myGardenIds]);

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-text-primary">
          <span aria-hidden="true">🗓️</span> Planting Calendar
        </h1>
        <p className="text-text-secondary">
          <span aria-hidden="true">{SEASON_EMOJI[data.calendarSeason]}</span>{" "}
          <span className="font-medium">{SEASON_LABEL[data.calendarSeason]}</span>
          {" · "}
          {frostPhaseSummary(data)}
          {data.locationDisplayLabel ? ` · ${data.locationDisplayLabel}` : null}
        </p>
        {!data.locationResolved && (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            We&apos;re showing approximate frost dates because we couldn&apos;t pinpoint your location.{" "}
            <a href="/settings" className="font-medium underline">Clarify in Settings</a>
            {" "}for a more accurate calendar.
          </div>
        )}
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="group" aria-label="View" className="inline-flex rounded-lg border border-border bg-bg-card p-1">
          <button
            type="button"
            aria-pressed={tab === "this_season"}
            onClick={() => setTab("this_season")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "this_season"
                ? "bg-primary text-text-on-primary"
                : "text-text-primary hover:bg-hover"
            }`}
          >
            This Season
          </button>
          <button
            type="button"
            aria-pressed={tab === "full_year"}
            onClick={() => setTab("full_year")}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "full_year"
                ? "bg-primary text-text-on-primary"
                : "text-text-primary hover:bg-hover"
            }`}
          >
            Full Year
          </button>
        </div>

        <label className="inline-flex items-center gap-2 text-sm text-text-primary">
          <input
            type="checkbox"
            checked={filterToMyGarden}
            onChange={(e) => setFilterToMyGarden(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
          />
          My Garden plants only
        </label>
      </div>

      {tab === "this_season" ? (
        <ThisSeasonView plants={visiblePlants} onReload={onReload} />
      ) : (
        <FullYearView plants={visiblePlants} />
      )}
    </div>
  );
}

function frostPhaseSummary(data: CalendarPayload): string {
  switch (data.frostPhase) {
    case "before_last_spring_frost":
      return `${data.weeksToNextLastSpringFrost} weeks before last spring frost`;
    case "growing_season":
      return `${data.weeksToNextFirstFallFrost} weeks until first fall frost`;
    case "after_first_fall_frost":
      return `${data.weeksToNextLastSpringFrost} weeks until next last spring frost`;
  }
}

interface ThisSeasonViewProps {
  plants: PlantCalendarEntry[];
  onReload: () => void;
}

function ThisSeasonView({ plants, onReload }: ThisSeasonViewProps) {
  const filtered = plants
    .map((plant) => ({
      ...plant,
      windows: plant.windows.filter((w) => w.isCurrent || w.isUpcoming),
    }))
    .filter((p) => p.windows.length > 0);

  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6 text-center text-text-secondary">
        <p className="mb-2">Nothing to plant or harvest in the next 6 weeks.</p>
        <button
          type="button"
          onClick={onReload}
          className="text-sm font-medium text-primary underline"
        >
          Refresh
        </button>
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {filtered.map((plant) => (
        <li key={plant.plantId} className="rounded-xl border border-border bg-bg-card p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-semibold text-text-primary">
              <span aria-hidden="true">{plant.emoji}</span> {plant.name}
            </h3>
            <span className="text-xs uppercase tracking-wide text-text-secondary">{plant.category}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {plant.windows.map((w, i) => (
              <WindowBadge key={`${plant.plantId}-${w.stage}-${w.startDate}-${i}`} window={w} />
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}

interface FullYearViewProps {
  plants: PlantCalendarEntry[];
}

function FullYearView({ plants }: FullYearViewProps) {
  // Group windows by starting month.
  const monthBuckets = useMemo(() => {
    const buckets: Record<number, Array<{ plant: PlantCalendarEntry; window: PlantingWindow }>> = {};
    for (const plant of plants) {
      for (const w of plant.windows) {
        const month = new Date(`${w.startDate}T00:00:00Z`).getUTCMonth();
        if (!buckets[month]) buckets[month] = [];
        buckets[month].push({ plant, window: w });
      }
    }
    return buckets;
  }, [plants]);

  const populatedMonths = MONTHS
    .map((label, idx) => ({ label, idx }))
    .filter(({ idx }) => monthBuckets[idx]?.length);

  if (populatedMonths.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6 text-center text-text-secondary">
        No planting windows in the next year for the current filter.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {populatedMonths.map(({ label, idx }) => (
        <section key={label} className="rounded-xl border border-border bg-bg-card p-4 shadow-sm">
          <h3 className="mb-2 text-lg font-semibold text-text-primary">{label}</h3>
          <ul className="space-y-2">
            {monthBuckets[idx]
              .sort((a, b) => a.window.startDate.localeCompare(b.window.startDate))
              .map(({ plant, window: w }, i) => (
                <li
                  key={`${plant.plantId}-${w.stage}-${w.startDate}-${i}`}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <span className="font-medium text-text-primary">
                    <span aria-hidden="true">{plant.emoji}</span> {plant.name}
                  </span>
                  <WindowBadge window={w} compact />
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

interface WindowBadgeProps {
  window: PlantingWindow;
  compact?: boolean;
}

function WindowBadge({ window: w, compact = false }: WindowBadgeProps) {
  const dateRange = formatDateRange(w.startDate, w.endDate);
  const timing = timingLabel(w);
  const locationLabel = w.location === "indoor" ? "Indoors" : "Outdoors";
  const locationIcon = w.location === "indoor" ? "🏠" : "☀️";

  return (
    <span
      className={`inline-flex flex-wrap items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${
        w.isCurrent
          ? "border-green-300 bg-green-50 text-green-900"
          : w.isUpcoming
          ? "border-blue-300 bg-blue-50 text-blue-900"
          : "border-border bg-bg-page text-text-secondary"
      }`}
    >
      <span aria-hidden="true">{STAGE_EMOJI[w.stage]}</span>
      <span>{STAGE_LABEL[w.stage]}</span>
      <span aria-hidden="true">·</span>
      <span>
        <span aria-hidden="true">{locationIcon}</span>{" "}
        <span aria-label={locationLabel === "Indoors" ? "Indoors" : "Outdoors"}>{locationLabel}</span>
      </span>
      <span aria-hidden="true">·</span>
      <span>{dateRange}</span>
      {!compact && timing && (
        <span
          aria-label={w.isCurrent ? "Active this week" : undefined}
          className={`ml-1 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
            w.isCurrent
              ? "bg-green-600 text-white"
              : w.isUpcoming
              ? "bg-blue-600 text-white"
              : "bg-bg-card text-text-secondary"
          }`}
        >
          {timing}
        </span>
      )}
    </span>
  );
}

function timingLabel(w: PlantingWindow): string | null {
  if (w.isCurrent) return "Now";
  if (w.isUpcoming) {
    if (w.weeksUntilStart <= 0) return "Now";
    if (w.weeksUntilStart === 1) return "Next week";
    return `In ${w.weeksUntilStart} weeks`;
  }
  return null;
}

function formatDateRange(startIso: string, endIso: string): string {
  const start = new Date(`${startIso}T00:00:00Z`);
  const end = new Date(`${endIso}T00:00:00Z`);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  if (sameMonth) {
    return `${fmt(start)}–${end.getUTCDate()}`;
  }
  return `${fmt(start)} – ${fmt(end)}`;
}
