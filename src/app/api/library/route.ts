import { NextResponse } from "next/server";
import {
  PLANT_LIBRARY,
  getLibraryPlantById,
  getLibraryPlantByName,
} from "@/lib/plant-library";

export function GET(request: Request): NextResponse {
  const { searchParams } = new URL(request.url);
  const plant = searchParams.get("plant");
  const list = searchParams.get("list");

  if (list !== null || !plant) {
    return NextResponse.json({ plants: PLANT_LIBRARY });
  }

  const match = getLibraryPlantById(plant) ?? getLibraryPlantByName(plant);
  if (!match) {
    return NextResponse.json(
      { error: `No plant named "${plant}" was found in the library.` },
      { status: 404 },
    );
  }
  return NextResponse.json(match);
}
