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
  species: string;
  dateAdded: string; // ISO date
  thumbnailImage: string; // filename in public/uploads
  careInfo: PlantCareInfo;
  entries: PlantEntry[];
  wateringIntervalDays: number; // how often to water, in days (e.g., 3 = every 3 days)
  wateringHistory: WateringEvent[];
}

export interface WeatherDayForecast {
  date: string; // ISO date
  precipitationMm: number;
}

export interface WeatherForecast {
  location: string | null;
  days: WeatherDayForecast[];
  nextRain: {
    date: string; // ISO date
    daysUntil: number;
    precipitationMm: number;
  } | null;
}

export interface FrostDates {
  lastSpringFrost: string; // e.g., "April 15"
  firstFallFrost: string; // e.g., "October 20"
  growingSeasonDays: number;
}

export interface UserSettings {
  location: string; // city or zip
  theme: "green" | "earth" | "ocean";
  frostDates: FrostDates | null;
}
