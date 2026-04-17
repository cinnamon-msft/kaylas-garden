import { NextResponse } from "next/server";
import ModelClient, { isUnexpected } from "@azure-rest/ai-inference";
import { DefaultAzureCredential } from "@azure/identity";
import { downloadJson, uploadJson } from "@/lib/blob-storage";

const CACHE_BLOB = "json/library-cache.json";

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

function parseConnectionProps(conn: string): Record<string, string> {
  return Object.fromEntries(
    conn
      .split(";")
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf("=");
        return [part.slice(0, idx), part.slice(idx + 1)];
      })
  );
}

function getAIClient(): { client: ReturnType<typeof ModelClient>; deploymentName: string } {
  // ConnectionStrings__gpt format:
  //   Endpoint=https://...;EndpointAIInference=https://...models;Deployment=gpt
  // The ai-inference client needs EndpointAIInference, not the base Endpoint.
  const connStr = process.env["ConnectionStrings__gpt"];
  if (!connStr) {
    throw new Error(
      "ConnectionStrings__gpt is not set. Run the app via Aspire to configure the Foundry AI deployment."
    );
  }

  const props = parseConnectionProps(connStr);
  const endpoint = props["EndpointAIInference"] || props["Endpoint"];
  const deploymentName = props["Deployment"] || process.env["GPT_MODELNAME"] || "gpt-4.1";

  if (!endpoint) {
    throw new Error("No endpoint found in ConnectionStrings__gpt");
  }

  const client = ModelClient(endpoint, new DefaultAzureCredential(), {
    credentials: { scopes: ["https://cognitiveservices.azure.com/.default"] },
  });
  return { client, deploymentName };
}

async function fetchPlantInfo(plantName: string): Promise<LibraryPlantInfo> {
  const { client, deploymentName } = getAIClient();

  const response = await client.path("/chat/completions").post({
    body: {
      model: deploymentName,
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
    const { data: cache, etag } = await downloadJson<Record<string, LibraryPlantInfo>>(
      CACHE_BLOB,
      {}
    );

    if (cache[cacheKey]) {
      return NextResponse.json(cache[cacheKey]);
    }

    const info = await fetchPlantInfo(plantName);
    cache[cacheKey] = info;
    await uploadJson(CACHE_BLOB, cache, etag);

    return NextResponse.json(info);
  } catch (error) {
    console.error("GET /api/library failed:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
