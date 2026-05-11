export interface PlantImage {
  id: string;
  filename: string;
  caption: string;
  uploadedAt: string; // ISO date
}

export interface PlantEntry {
  id: string;
  date: string; // ISO date
  note: string;
  plantingLocation?: string; // "potted", "in-ground", "hanging", etc.
  images: PlantImage[];
}

export interface PlantCareInfo {
  sunlight: string; // e.g., "Full sun", "Partial shade"
  wateringSchedule: string; // e.g., "Every 2-3 days"
  soilType: string; // e.g., "Well-draining, loamy"
  hardinessZone: string; // e.g., "5-9"
  companionPlants: string[];
  commonPests: string[];
  generalNotes: string;
}

export interface WateringEvent {
  id: string;
  date: string; // ISO date
  note: string;
}

export interface Plant {
  id: string;
  name: string;
  nickname?: string;
  species: string;
  dateAdded: string; // ISO date
  thumbnailImage: string; // filename in public/uploads
  careInfo: PlantCareInfo;
  entries: PlantEntry[];
  wateringIntervalDays: number; // how often to water, in days (e.g., 3 = every 3 days)
  wateringHistory: WateringEvent[];
}

export interface FrostDates {
  lastSpringFrost: string; // e.g., "April 15"
  firstFallFrost: string; // e.g., "October 20"
  growingSeasonDays: number;
}

export interface UserSettings {
  location: string; // city or zip
  gardenName: string;
  gardenIcon: string;
  theme: "green" | "earth" | "ocean" | "space";
  frostDates: FrostDates | null;
  /**
   * True only after the saved `location` resolved to a known entry in the
   * frost-data lookup table with a single, unambiguous match. Existing rows
   * without this flag are treated as `false` until a one-time backfill in
   * `getSettings` re-resolves the value.
   */
  locationResolved: boolean;
  /**
   * Canonical key of the resolved location entry (e.g. `"boston-ma"`).
   * `null` when the saved location is unresolved.
   */
  resolvedLocation: string | null;
}
