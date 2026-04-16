import { describe, expect, it } from "vitest";
import { filterPlants } from "../plantFilter";
import type { Plant } from "../types";

function makePlant(overrides: Partial<Plant> & Pick<Plant, "id" | "name">): Plant {
  return {
    species: "",
    category: undefined,
    dateAdded: "2024-01-01T00:00:00.000Z",
    thumbnailImage: "",
    careInfo: {
      sunlight: "",
      wateringSchedule: "",
      soilType: "",
      hardinessZone: "",
      companionPlants: [],
      commonPests: [],
      generalNotes: "",
    },
    entries: [],
    wateringIntervalDays: 3,
    wateringHistory: [],
    ...overrides,
  };
}

const PLANTS: Plant[] = [
  makePlant({ id: "1", name: "Basil", species: "Ocimum basilicum", category: "herb" }),
  makePlant({ id: "2", name: "Tomato", species: "Solanum lycopersicum", category: "vegetable" }),
  makePlant({ id: "3", name: "Lavender", species: "Lavandula angustifolia", category: "herb" }),
  makePlant({ id: "4", name: "Rose", species: "Rosa rubiginosa" }),
];

describe("filterPlants", () => {
  it("returns all plants for an empty query", () => {
    expect(filterPlants(PLANTS, "")).toHaveLength(4);
  });

  it("returns all plants for a whitespace-only query", () => {
    expect(filterPlants(PLANTS, "   ")).toHaveLength(4);
  });

  it("filters by plant name (case-insensitive)", () => {
    const results = filterPlants(PLANTS, "basil");
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Basil");
  });

  it("filters by plant name with different casing", () => {
    const results = filterPlants(PLANTS, "TOMATO");
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Tomato");
  });

  it("filters by partial name match", () => {
    const results = filterPlants(PLANTS, "lave");
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Lavender");
  });

  it("filters by species (case-insensitive)", () => {
    const results = filterPlants(PLANTS, "solanum");
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Tomato");
  });

  it("filters by partial species match", () => {
    const results = filterPlants(PLANTS, "basilicum");
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Basil");
  });

  it("filters by category", () => {
    const results = filterPlants(PLANTS, "herb");
    expect(results).toHaveLength(2);
    expect(results.map((p) => p.name)).toEqual(["Basil", "Lavender"]);
  });

  it("filters by partial category match", () => {
    const results = filterPlants(PLANTS, "veg");
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Tomato");
  });

  it("returns empty array when no plants match", () => {
    expect(filterPlants(PLANTS, "cactus")).toHaveLength(0);
  });

  it("handles plants with no species gracefully", () => {
    const plant = makePlant({ id: "5", name: "Mystery Plant", species: "" });
    expect(filterPlants([plant], "mystery")).toHaveLength(1);
    expect(filterPlants([plant], "ocimum")).toHaveLength(0);
  });

  it("handles plants with no category gracefully", () => {
    const results = filterPlants(PLANTS, "rosa");
    expect(results).toHaveLength(1);
    expect(results[0]?.name).toBe("Rose");
  });

  it("returns empty array for empty plants list", () => {
    expect(filterPlants([], "basil")).toHaveLength(0);
  });
});
