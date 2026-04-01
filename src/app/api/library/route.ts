import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { AzureKeyCredential } from "@azure/core-auth";

const CACHE_PATH = path.join(process.cwd(), "data", "library-cache.json");

interface LibraryPlantInfo {
  name: string;
  scientificName: string;
  description: string;
  sunlight: string;
  wateringSchedule: string;
  soilType: string;
  hardinessZones: string;
  plantingGuidelines: string;
  companionPlants: string[];
  commonPests: string[];
  growingTips: string[];
  daysToHarvest: string;
  category: string;
}

async function getCache(): Promise<Record<string, LibraryPlantInfo>> {
  try {
    const data = await fs.readFile(CACHE_PATH, "utf-8");
    return JSON.parse(data) as Record<string, LibraryPlantInfo>;
  } catch {
    return {};
  }
}

async function saveCache(cache: Record<string, LibraryPlantInfo>): Promise<void> {
  await fs.writeFile(CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
}

async function fetchPlantInfo(plantName: string): Promise<LibraryPlantInfo> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error("GITHUB_TOKEN environment variable is required for AI features");
  }

  const client = ModelClient(
    "https://models.inference.ai.azure.com",
    new AzureKeyCredential(token)
  );

  const response = await client.path("/chat/completions").post({
    body: {
      model: "gpt-4.1",
      messages: [
        {
          role: "system",
          content:
            "You are a knowledgeable gardening expert. Return ONLY valid JSON with no markdown formatting, no code blocks, no extra text.",
        },
        {
          role: "user",
          content: `Provide comprehensive gardening information about "${plantName}". Return a JSON object with these exact fields:
{
  "name": "common name",
  "scientificName": "scientific name",
  "description": "2-3 sentence description",
  "sunlight": "sunlight requirements (e.g., Full sun, Partial shade)",
  "wateringSchedule": "how often to water",
  "soilType": "preferred soil type",
  "hardinessZones": "USDA hardiness zones (e.g., 3-9)",
  "plantingGuidelines": "when and how to plant",
  "companionPlants": ["list", "of", "companion", "plants"],
  "commonPests": ["list", "of", "common", "pests"],
  "growingTips": ["list", "of", "helpful", "tips"],
  "daysToHarvest": "days to harvest or bloom time",
  "category": "one of: vegetable, herb, flower, fruit, succulent, tree, shrub"
}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 1000,
    },
  });

  if (isUnexpected(response)) {
    throw new Error(`AI API error: ${response.status}`);
  }

  const content = response.body.choices[0]?.message?.content;
  if (!content) {
    throw new Error("No response from AI");
  }

  const cleaned = content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
  return JSON.parse(cleaned) as LibraryPlantInfo;
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const plantName = searchParams.get("plant");

    if (!plantName) {
      return NextResponse.json(
        { error: "Missing 'plant' query parameter" },
        { status: 400 }
      );
    }

    const cacheKey = plantName.toLowerCase().trim();
    const cache = await getCache();

    if (cache[cacheKey]) {
      return NextResponse.json(cache[cacheKey]);
    }

    const info = await fetchPlantInfo(plantName);
    cache[cacheKey] = info;
    await saveCache(cache);

    return NextResponse.json(info);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
