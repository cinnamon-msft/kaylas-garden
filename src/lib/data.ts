import { randomUUID } from "crypto";
import type { Plant, PlantEntry, UserSettings, WateringEvent } from "./types";
import { downloadJson, uploadJson } from "./blob-storage";

const PLANTS_BLOB = "json/plants.json";
const SETTINGS_BLOB = "json/settings.json";

const DEFAULT_SETTINGS: UserSettings = {
  location: "Boston, MA",
  theme: "green",
  frostDates: null,
};

// --- Plants ---

export async function getPlants(): Promise<Plant[]> {
  const { data } = await downloadJson<Plant[]>(PLANTS_BLOB, []);
  return data;
}

export async function getPlant(id: string): Promise<Plant | undefined> {
  const plants = await getPlants();
  return plants.find((p) => p.id === id);
}

export async function createPlant(
  plant: Omit<Plant, "id" | "dateAdded" | "entries" | "wateringHistory">
): Promise<Plant> {
  const { data: plants, etag } = await downloadJson<Plant[]>(PLANTS_BLOB, []);
  const newPlant: Plant = {
    ...plant,
    id: randomUUID(),
    dateAdded: new Date().toISOString(),
    entries: [],
    wateringIntervalDays: plant.wateringIntervalDays ?? 3,
    wateringHistory: [],
  };
  plants.push(newPlant);
  await uploadJson(PLANTS_BLOB, plants, etag);
  return newPlant;
}

export async function updatePlant(
  id: string,
  updates: Partial<Plant>
): Promise<Plant> {
  const { data: plants, etag } = await downloadJson<Plant[]>(PLANTS_BLOB, []);
  const index = plants.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error(`Plant with id "${id}" not found`);
  }
  const updated: Plant = { ...plants[index], ...updates, id };
  plants[index] = updated;
  await uploadJson(PLANTS_BLOB, plants, etag);
  return updated;
}

export async function deletePlant(id: string): Promise<void> {
  const { data: plants, etag } = await downloadJson<Plant[]>(PLANTS_BLOB, []);
  const filtered = plants.filter((p) => p.id !== id);
  if (filtered.length === plants.length) {
    throw new Error(`Plant with id "${id}" not found`);
  }
  await uploadJson(PLANTS_BLOB, filtered, etag);
}

export async function addPlantEntry(
  plantId: string,
  entry: Omit<PlantEntry, "id">
): Promise<PlantEntry> {
  const { data: plants, etag } = await downloadJson<Plant[]>(PLANTS_BLOB, []);
  const plant = plants.find((p) => p.id === plantId);
  if (!plant) {
    throw new Error(`Plant with id "${plantId}" not found`);
  }
  const newEntry: PlantEntry = { ...entry, id: randomUUID() };
  plant.entries.push(newEntry);
  await uploadJson(PLANTS_BLOB, plants, etag);
  return newEntry;
}

// --- Watering ---

export async function waterPlant(
  plantId: string,
  event: Omit<WateringEvent, "id">
): Promise<WateringEvent> {
  const { data: plants, etag } = await downloadJson<Plant[]>(PLANTS_BLOB, []);
  const plant = plants.find((p) => p.id === plantId);
  if (!plant) {
    throw new Error(`Plant with id "${plantId}" not found`);
  }
  const newEvent: WateringEvent = { ...event, id: randomUUID() };
  if (!plant.wateringHistory) {
    plant.wateringHistory = [];
  }
  plant.wateringHistory.push(newEvent);
  await uploadJson(PLANTS_BLOB, plants, etag);
  return newEvent;
}

// --- Settings ---

export async function getSettings(): Promise<UserSettings> {
  const { data } = await downloadJson<UserSettings>(
    SETTINGS_BLOB,
    DEFAULT_SETTINGS
  );
  return data;
}

export async function updateSettings(
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  const { data: current, etag } = await downloadJson<UserSettings>(
    SETTINGS_BLOB,
    DEFAULT_SETTINGS
  );
  const updated: UserSettings = { ...current, ...settings };
  await uploadJson(SETTINGS_BLOB, updated, etag);
  return updated;
}
