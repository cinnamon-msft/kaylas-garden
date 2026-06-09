// Server-only — imports PLANT_LIBRARY (large). Pure logic, no I/O.

import type { FrostDates } from "./types";
import {
  PLANT_LIBRARY,
  type LibraryPlant,
  type PlantCategory,
  type PlantingCalendarOffsets,
  type PlantingStage,
  type WeekOffsetRange,
} from "./plant-library";

export type CalendarSeason = "winter" | "spring" | "summer" | "fall";

export type FrostPhase =
  | "before_last_spring_frost"
  | "growing_season"
  | "after_first_fall_frost";

export interface PlantingWindow {
  readonly stage: PlantingStage;
  readonly location: "indoor" | "outdoor";
  readonly startDate: string; // ISO YYYY-MM-DD
  readonly endDate: string;   // ISO YYYY-MM-DD
  readonly weeksFromReference: WeekOffsetRange;
  readonly anchorYear: number; // year of the frost reference this window was anchored to
  readonly isCurrent: boolean;
  readonly isUpcoming: boolean;
  readonly isPast: boolean;
  /** Whole weeks until this window starts; negative when window has already started. */
  readonly weeksUntilStart: number;
}

export interface PlantCalendarEntry {
  readonly plantId: string;
  readonly name: string;
  readonly category: PlantCategory;
  readonly emoji: string;
  readonly windows: readonly PlantingWindow[];
}

export interface CalendarPayload {
  readonly frostDates: FrostDates;
  readonly locationDisplayLabel: string;
  readonly today: string;
  readonly calendarSeason: CalendarSeason;
  readonly frostPhase: FrostPhase;
  readonly weeksSinceLastSpringFrost: number;
  readonly weeksToNextLastSpringFrost: number;
  readonly weeksToNextFirstFallFrost: number;
  readonly plants: readonly PlantCalendarEntry[];
}

export interface BuildCalendarOptions {
  readonly today?: Date;
  readonly upcomingHorizonWeeks?: number;
  readonly categories?: ReadonlyArray<PlantCategory>;
  readonly locationDisplayLabel?: string;
}

const CATEGORY_EMOJI: Record<PlantCategory, string> = {
  vegetable: "🥬",
  herb: "🌿",
  flower: "🌸",
  fruit: "🍓",
  succulent: "🌵",
  tree: "🌳",
  shrub: "🌲",
};

const MONTH_INDEX: Record<string, number> = {
  january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
  july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
};

const MS_PER_DAY = 86_400_000;
const MS_PER_WEEK = MS_PER_DAY * 7;

// Parse "April 15" into { month, day }. Throws on invalid input so we surface
// data issues loudly rather than silently miscomputing.
function parseMonthDay(input: string): { month: number; day: number } {
  const match = /^([A-Za-z]+)\s+(\d{1,2})$/.exec(input.trim());
  if (!match) {
    throw new Error(`Invalid frost date format: "${input}" (expected e.g. "April 15")`);
  }
  const month = MONTH_INDEX[match[1].toLowerCase()];
  if (month === undefined) {
    throw new Error(`Unknown month in frost date: "${input}"`);
  }
  const day = parseInt(match[2], 10);
  if (day < 1 || day > 31) {
    throw new Error(`Invalid day in frost date: "${input}"`);
  }
  return { month, day };
}

function utcDate(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function startOfTodayUtc(today: Date): Date {
  return utcDate(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
}

function toIsoDate(d: Date): string {
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function addDaysUtc(base: Date, days: number): Date {
  return new Date(base.getTime() + days * MS_PER_DAY);
}

function diffWeeks(later: Date, earlier: Date): number {
  return Math.round((later.getTime() - earlier.getTime()) / MS_PER_WEEK);
}

function calendarSeasonFor(today: Date): CalendarSeason {
  // Northern hemisphere meteorological seasons.
  const m = today.getUTCMonth();
  if (m === 11 || m === 0 || m === 1) return "winter";
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  return "fall";
}

function locationForStage(stage: PlantingStage): "indoor" | "outdoor" {
  return stage === "start_seeds_indoors" ? "indoor" : "outdoor";
}

interface StageOffsetPair {
  readonly stage: PlantingStage;
  readonly offset: WeekOffsetRange;
}

function collectStageOffsets(cal: PlantingCalendarOffsets): StageOffsetPair[] {
  const result: StageOffsetPair[] = [];
  if (cal.startSeedsIndoors) result.push({ stage: "start_seeds_indoors", offset: cal.startSeedsIndoors });
  if (cal.directSowOutdoors) result.push({ stage: "direct_sow_outdoors", offset: cal.directSowOutdoors });
  if (cal.transplantOutdoors) result.push({ stage: "transplant_outdoors", offset: cal.transplantOutdoors });
  if (cal.harvest) result.push({ stage: "harvest", offset: cal.harvest });
  if (cal.secondaryDirectSowOutdoors) result.push({ stage: "direct_sow_outdoors", offset: cal.secondaryDirectSowOutdoors });
  if (cal.secondaryHarvest) result.push({ stage: "harvest", offset: cal.secondaryHarvest });
  return result;
}

// Given a frost anchor date (Date in UTC) and a week offset range, produce
// a concrete [start, end] window of UTC dates.
function offsetWindow(anchor: Date, offset: WeekOffsetRange): { start: Date; end: Date } {
  return {
    start: addDaysUtc(anchor, offset.startWeeks * 7),
    end: addDaysUtc(anchor, offset.endWeeks * 7),
  };
}

interface BuiltWindow {
  readonly start: Date;
  readonly end: Date;
  readonly anchorYear: number;
}

// For a given stage offset, build candidate windows anchored to the relevant
// frost date in `currentYear - 1`, `currentYear`, and `currentYear + 1`. Keep
// only the ones that intersect the rolling display range [rangeStart, rangeEnd].
function buildWindowsForOffset(
  offset: WeekOffsetRange,
  frost: { lastSpring: { month: number; day: number }; firstFall: { month: number; day: number } },
  currentYear: number,
  rangeStart: Date,
  rangeEnd: Date,
): BuiltWindow[] {
  const out: BuiltWindow[] = [];
  for (const yearDelta of [-1, 0, 1]) {
    const anchorYear = currentYear + yearDelta;
    const ref = offset.reference === "last_spring"
      ? utcDate(anchorYear, frost.lastSpring.month, frost.lastSpring.day)
      : utcDate(anchorYear, frost.firstFall.month, frost.firstFall.day);
    const win = offsetWindow(ref, offset);
    // Intersect with display range. Keep if any overlap.
    if (win.end >= rangeStart && win.start <= rangeEnd) {
      out.push({ start: win.start, end: win.end, anchorYear });
    }
  }
  return out;
}

export function buildPlantingCalendar(
  frostDates: FrostDates,
  options: BuildCalendarOptions = {},
): CalendarPayload {
  const todayInput = options.today ?? new Date();
  const today = startOfTodayUtc(todayInput);
  const horizonWeeks = options.upcomingHorizonWeeks ?? 6;
  const categories = options.categories ?? (["vegetable", "fruit", "herb"] as const);

  const lastSpring = parseMonthDay(frostDates.lastSpringFrost);
  const firstFall = parseMonthDay(frostDates.firstFallFrost);
  const currentYear = today.getUTCFullYear();

  // Rolling display range: 30 days into the past so windows that just ended
  // still appear as `isPast` on the "Full Year" tab, through one full year
  // forward.
  const rangeStart = addDaysUtc(today, -30);
  const rangeEnd = addDaysUtc(today, 365);

  // Spring frost reference for "weeks since / until" headers.
  const lastSpringThisYear = utcDate(currentYear, lastSpring.month, lastSpring.day);
  const lastSpringNextYear = utcDate(currentYear + 1, lastSpring.month, lastSpring.day);
  const firstFallThisYear = utcDate(currentYear, firstFall.month, firstFall.day);
  const firstFallNextYear = utcDate(currentYear + 1, firstFall.month, firstFall.day);

  const weeksSinceLastSpringFrost = diffWeeks(today, lastSpringThisYear);
  const nextLastSpring = today <= lastSpringThisYear ? lastSpringThisYear : lastSpringNextYear;
  const weeksToNextLastSpringFrost = diffWeeks(nextLastSpring, today);
  const nextFirstFall = today <= firstFallThisYear ? firstFallThisYear : firstFallNextYear;
  const weeksToNextFirstFallFrost = diffWeeks(nextFirstFall, today);

  let frostPhase: FrostPhase;
  if (today < lastSpringThisYear) frostPhase = "before_last_spring_frost";
  else if (today <= firstFallThisYear) frostPhase = "growing_season";
  else frostPhase = "after_first_fall_frost";

  const horizonEnd = addDaysUtc(today, horizonWeeks * 7);

  const plants: PlantCalendarEntry[] = [];

  for (const plant of PLANT_LIBRARY) {
    if (!plant.plantingCalendar) continue;
    if (!categories.includes(plant.category)) continue;

    const windows: PlantingWindow[] = [];
    for (const { stage, offset } of collectStageOffsets(plant.plantingCalendar)) {
      const built = buildWindowsForOffset(
        offset,
        { lastSpring, firstFall },
        currentYear,
        rangeStart,
        rangeEnd,
      );
      for (const w of built) {
        const isCurrent = today >= w.start && today <= w.end;
        const isPast = w.end < today;
        const isUpcoming = !isCurrent && !isPast && w.start <= horizonEnd;
        windows.push({
          stage,
          location: locationForStage(stage),
          startDate: toIsoDate(w.start),
          endDate: toIsoDate(w.end),
          weeksFromReference: offset,
          anchorYear: w.anchorYear,
          isCurrent,
          isUpcoming,
          isPast,
          weeksUntilStart: diffWeeks(w.start, today),
        });
      }
    }

    if (windows.length === 0) continue;

    windows.sort((a, b) => a.startDate.localeCompare(b.startDate));

    plants.push({
      plantId: plant.id,
      name: plant.name,
      category: plant.category,
      emoji: CATEGORY_EMOJI[plant.category],
      windows,
    });
  }

  // Stable sort: plants with currently-active or upcoming windows first.
  plants.sort((a, b) => {
    const score = (entry: PlantCalendarEntry) => {
      if (entry.windows.some((w) => w.isCurrent)) return 0;
      if (entry.windows.some((w) => w.isUpcoming)) return 1;
      return 2;
    };
    const diff = score(a) - score(b);
    if (diff !== 0) return diff;
    if (a.category !== b.category) return a.category.localeCompare(b.category);
    return a.name.localeCompare(b.name);
  });

  return {
    frostDates,
    locationDisplayLabel: options.locationDisplayLabel ?? "",
    today: toIsoDate(today),
    calendarSeason: calendarSeasonFor(today),
    frostPhase,
    weeksSinceLastSpringFrost,
    weeksToNextLastSpringFrost,
    weeksToNextFirstFallFrost,
    plants,
  };
}

export function findLibraryPlantById(id: string): LibraryPlant | undefined {
  return PLANT_LIBRARY.find((p) => p.id === id);
}
