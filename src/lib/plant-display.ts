import { PLANT_LIBRARY, type LibraryPlant } from "./plant-library";
import type { Plant } from "./types";

const CATEGORY_EMOJI: Record<string, string> = {
  vegetable: "🥬",
  herb: "🌿",
  flower: "🌸",
  fruit: "🍓",
  succulent: "🌵",
  tree: "🌳",
  shrub: "🌲",
};

type PlantName = {
  name: string;
  nickname?: string | null;
};

type PlantIdentity = PlantName & {
  species?: string | null;
};

export function getPlantDisplayName(plant: PlantName): string {
  return plant.nickname?.trim() || plant.name;
}

export function getPlantIdentityLine(plant: PlantIdentity): string {
  const parts = plant.nickname?.trim()
    ? [plant.name, plant.species]
    : [plant.species];
  return parts.filter(Boolean).join(" • ");
}

export function findLibraryPlantForPlant(
  plant: Pick<Plant, "name" | "species">,
): LibraryPlant | undefined {
  return PLANT_LIBRARY.find(
    (libraryPlant) =>
      libraryPlant.name.toLowerCase() === plant.name.toLowerCase() &&
      libraryPlant.scientificName.toLowerCase() === plant.species.toLowerCase(),
  );
}

export function getPlantCategoryEmoji(plant: Pick<Plant, "name" | "species">): string {
  const libraryPlant = findLibraryPlantForPlant(plant);
  return libraryPlant ? CATEGORY_EMOJI[libraryPlant.category] ?? "🌿" : "🌿";
}
