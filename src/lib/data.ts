import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import type { Plant, PlantEntry, UserSettings } from "./types";

const DATA_DIR = join(process.cwd(), "data");
const PLANTS_FILE = join(DATA_DIR, "plants.json");
const SETTINGS_FILE = join(DATA_DIR, "settings.json");

const DEFAULT_SETTINGS: UserSettings = {
  location: "Boston, MA",
  theme: "green",
  frostDates: null,
};

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDataDir();
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// --- Plants ---

export async function getPlants(): Promise<Plant[]> {
  return readJsonFile<Plant[]>(PLANTS_FILE, []);
}

export async function getPlant(id: string): Promise<Plant | undefined> {
  const plants = await getPlants();
  return plants.find((p) => p.id === id);
}

export async function createPlant(
  plant: Omit<Plant, "id" | "dateAdded" | "entries">
): Promise<Plant> {
  const plants = await getPlants();
  const newPlant: Plant = {
    ...plant,
    id: randomUUID(),
    dateAdded: new Date().toISOString(),
    entries: [],
  };
  plants.push(newPlant);
  await writeJsonFile(PLANTS_FILE, plants);
  return newPlant;
}

export async function updatePlant(
  id: string,
  updates: Partial<Plant>
): Promise<Plant> {
  const plants = await getPlants();
  const index = plants.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error(`Plant with id "${id}" not found`);
  }
  const updated: Plant = { ...plants[index], ...updates, id };
  plants[index] = updated;
  await writeJsonFile(PLANTS_FILE, plants);
  return updated;
}

export async function deletePlant(id: string): Promise<void> {
  const plants = await getPlants();
  const filtered = plants.filter((p) => p.id !== id);
  if (filtered.length === plants.length) {
    throw new Error(`Plant with id "${id}" not found`);
  }
  await writeJsonFile(PLANTS_FILE, filtered);
}

export async function addPlantEntry(
  plantId: string,
  entry: Omit<PlantEntry, "id">
): Promise<PlantEntry> {
  const plants = await getPlants();
  const plant = plants.find((p) => p.id === plantId);
  if (!plant) {
    throw new Error(`Plant with id "${plantId}" not found`);
  }
  const newEntry: PlantEntry = { ...entry, id: randomUUID() };
  plant.entries.push(newEntry);
  await writeJsonFile(PLANTS_FILE, plants);
  return newEntry;
}

// --- Settings ---

export async function getSettings(): Promise<UserSettings> {
  return readJsonFile<UserSettings>(SETTINGS_FILE, DEFAULT_SETTINGS);
}

export async function updateSettings(
  settings: Partial<UserSettings>
): Promise<UserSettings> {
  const current = await getSettings();
  const updated: UserSettings = { ...current, ...settings };
  await writeJsonFile(SETTINGS_FILE, updated);
  return updated;
}
