/**
 * Smoke tests for the planting-calendar feature. Run with:
 *   npx tsx scripts/test-planting-calendar.ts
 *
 * Covers the high-risk edge cases flagged in the rubber-duck review:
 *   - Garlic / fall-planted crops crossing into next year
 *   - Late-year viewing of next spring's "start indoors" windows
 *   - Current-window badge logic (today inside the window)
 *   - "Portland" ambiguity (chooser) vs. "Boston" single match
 *   - Canonical-key resolution from chooser round-trip
 *   - US ZIP and Canadian postal code parsing
 */

import { buildPlantingCalendar } from "../src/lib/planting-calendar";
import {
  parseLocationInput,
  resolveLocation,
  REGIONAL_FROST_DATA,
} from "../src/lib/server/location-lookup";
import { PLANT_LIBRARY } from "../src/lib/plant-library";
import type { FrostDates } from "../src/lib/types";

let failed = 0;
let total = 0;

function ok(label: string, cond: boolean, info?: string) {
  total++;
  if (cond) {
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.error(`  ✗ ${label}${info ? `\n    ${info}` : ""}`);
  }
}

function section(name: string) {
  console.log(`\n— ${name} —`);
}

// ─── Location parsing ────────────────────────────────────────────────────────

section("parseLocationInput");

ok("US ZIP detected", parseLocationInput("02101").kind === "us_zip");
ok("US ZIP+4 detected", parseLocationInput("02101-1234").kind === "us_zip");
ok(
  "Canadian postal (with space) detected",
  parseLocationInput("M5V 3A8").kind === "ca_postal",
);
ok(
  "Canadian postal (no space) detected",
  parseLocationInput("m5v3a8").kind === "ca_postal",
);
ok(
  "City + 2-letter state parsed",
  (() => {
    const p = parseLocationInput("Boston, MA");
    return p.kind === "city_state" && p.region === "MA" && p.country === "US";
  })(),
);
ok(
  "City + full state name parsed",
  (() => {
    const p = parseLocationInput("Boston, Massachusetts");
    return p.kind === "city_state" && p.region === "MA";
  })(),
);
ok(
  "City + Canadian province parsed",
  (() => {
    const p = parseLocationInput("Toronto, Ontario");
    return p.kind === "city_state" && p.region === "ON" && p.country === "CA";
  })(),
);
ok(
  "Plain city parsed as city_only",
  parseLocationInput("Portland").kind === "city_only",
);
ok(
  "Canonical key detected",
  parseLocationInput("portland-or").kind === "canonical_key",
);
ok("Empty string is invalid", parseLocationInput("").kind === "invalid");

// ─── Location resolution ─────────────────────────────────────────────────────

section("resolveLocation");

ok(
  '"Boston" single-matches Boston, MA (no chooser)',
  (() => {
    const r = resolveLocation("Boston");
    return r.status === "matched" && r.match.key === "boston-ma";
  })(),
);

ok(
  '"Portland" surfaces a chooser with Portland, ME and Portland, OR',
  (() => {
    const r = resolveLocation("Portland");
    if (r.status !== "ambiguous") return false;
    const keys = r.candidates.map((c) => c.key).sort();
    return keys.includes("portland-me") && keys.includes("portland-or");
  })(),
);

ok(
  "canonical key portland-or resolves directly",
  (() => {
    const r = resolveLocation("portland-or");
    return r.status === "matched" && r.match.key === "portland-or";
  })(),
);

ok(
  "US ZIP 02101 resolves to Boston, MA",
  (() => {
    const r = resolveLocation("02101");
    return r.status === "matched" && r.match.key === "boston-ma";
  })(),
);

ok(
  "Canadian postal M5V 3A8 resolves to Toronto, ON",
  (() => {
    const r = resolveLocation("M5V 3A8");
    return r.status === "matched" && r.match.key === "toronto-on";
  })(),
);

ok(
  "garbled input is unmatched",
  resolveLocation("Atlantis, Mars").status === "unmatched",
);

ok(
  "all canonical keys are unique",
  new Set(REGIONAL_FROST_DATA.map((e) => e.key)).size === REGIONAL_FROST_DATA.length,
);

// ─── Calendar engine ─────────────────────────────────────────────────────────

section("buildPlantingCalendar");

const bostonFrost: FrostDates = {
  lastSpringFrost: "April 15",
  firstFallFrost: "October 15",
  growingSeasonDays: 183,
};

ok(
  "calendar built for Boston has at least one vegetable entry",
  (() => {
    const cal = buildPlantingCalendar(bostonFrost, { today: new Date("2026-05-01T12:00:00Z") });
    return cal.plants.some((p) => p.category === "vegetable");
  })(),
);

ok(
  "October viewing surfaces next-spring start-indoors as upcoming-or-future",
  (() => {
    // Late October: too late for this year's start-indoors of tomato, but
    // next year's window (Feb-Mar 2027) should fall within the rolling
    // 12-month range and have isCurrent=false, isPast=false (future).
    const cal = buildPlantingCalendar(bostonFrost, { today: new Date("2026-10-30T12:00:00Z") });
    const tomato = cal.plants.find((p) => p.plantId === "tomato");
    if (!tomato) return false;
    const futureIndoor = tomato.windows.find(
      (w) => w.stage === "start_seeds_indoors" && !w.isPast,
    );
    return Boolean(futureIndoor);
  })(),
);

ok(
  "garlic harvest in October correctly anchors to NEXT summer (not same year)",
  (() => {
    // Plant garlic Oct 2026 → harvest summer 2027. The engine should NOT
    // produce a current harvest window while the user is being told to plant.
    const cal = buildPlantingCalendar(bostonFrost, { today: new Date("2026-10-15T12:00:00Z") });
    const garlic = cal.plants.find((p) => p.plantId === "garlic");
    if (!garlic) return false;
    const currentHarvest = garlic.windows.find(
      (w) => w.stage === "harvest" && w.isCurrent,
    );
    const futureHarvest = garlic.windows.find(
      (w) => w.stage === "harvest" && !w.isPast && !w.isCurrent,
    );
    // Must NOT be currently active (no "harvest now" while planting now).
    return !currentHarvest && Boolean(futureHarvest);
  })(),
);

ok(
  "current-window badge: today inside window => isCurrent=true",
  (() => {
    // Pick a date where lettuce direct-sow is active: -4 to -2 weeks before
    // April 15. That's March 18 to April 1. Use March 25.
    const cal = buildPlantingCalendar(bostonFrost, { today: new Date("2026-03-25T12:00:00Z") });
    const lettuce = cal.plants.find((p) => p.plantId === "lettuce");
    if (!lettuce) return false;
    const sow = lettuce.windows.find(
      (w) => w.stage === "direct_sow_outdoors" && w.isCurrent,
    );
    return Boolean(sow);
  })(),
);

ok(
  "frostPhase is before_last_spring_frost in March",
  (() => {
    const cal = buildPlantingCalendar(bostonFrost, { today: new Date("2026-03-25T12:00:00Z") });
    return cal.frostPhase === "before_last_spring_frost";
  })(),
);

ok(
  "frostPhase is growing_season in July",
  (() => {
    const cal = buildPlantingCalendar(bostonFrost, { today: new Date("2026-07-15T12:00:00Z") });
    return cal.frostPhase === "growing_season";
  })(),
);

ok(
  "frostPhase is after_first_fall_frost in late November",
  (() => {
    const cal = buildPlantingCalendar(bostonFrost, { today: new Date("2026-11-25T12:00:00Z") });
    return cal.frostPhase === "after_first_fall_frost";
  })(),
);

ok(
  "calendarSeason matches month (May = spring)",
  buildPlantingCalendar(bostonFrost, { today: new Date("2026-05-01T12:00:00Z") })
    .calendarSeason === "spring",
);

ok(
  "weeksToNextLastSpringFrost is non-negative",
  (() => {
    const cal = buildPlantingCalendar(bostonFrost, { today: new Date("2026-05-01T12:00:00Z") });
    return cal.weeksToNextLastSpringFrost >= 0;
  })(),
);

ok(
  "categories filter excludes flowers",
  (() => {
    const cal = buildPlantingCalendar(bostonFrost, {
      today: new Date("2026-05-01T12:00:00Z"),
      categories: ["vegetable"],
    });
    return cal.plants.every((p) => p.category === "vegetable");
  })(),
);

ok(
  "every library plant in calendar has at least one window",
  (() => {
    const cal = buildPlantingCalendar(bostonFrost, { today: new Date("2026-05-01T12:00:00Z") });
    return cal.plants.every((p) => p.windows.length > 0);
  })(),
);

ok(
  "plant library has at least 25 plants with planting calendars",
  PLANT_LIBRARY.filter((p) => p.plantingCalendar).length >= 25,
);

// ─── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${total - failed}/${total} passed`);
if (failed > 0) {
  process.exit(1);
}
