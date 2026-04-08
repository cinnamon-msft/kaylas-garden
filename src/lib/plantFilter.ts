import type { Plant } from "@/lib/types";

export function filterPlants(plants: Plant[], query: string): Plant[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return plants;

  return plants.filter((p) => {
    return (
      p.name.toLowerCase().includes(normalized) ||
      (p.species && p.species.toLowerCase().includes(normalized)) ||
      (p.category && p.category.toLowerCase().includes(normalized))
    );
  });
}
