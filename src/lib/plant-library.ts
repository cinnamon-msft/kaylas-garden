export type PlantCategory =
  | "vegetable"
  | "herb"
  | "flower"
  | "fruit"
  | "succulent"
  | "tree"
  | "shrub";

export interface LibraryPlant {
  readonly id: string; // stable slug, e.g. "tomato"
  readonly name: string;
  readonly scientificName: string;
  readonly description: string;
  readonly sunlight: string;
  readonly wateringSchedule: string;
  readonly wateringIntervalDays: number;
  readonly soilType: string;
  readonly hardinessZones: string;
  readonly plantingGuidelines: string;
  readonly companionPlants: readonly string[];
  readonly commonPests: readonly string[];
  readonly growingTips: readonly string[];
  readonly daysToHarvest: string;
  readonly category: PlantCategory;
}

export const PLANT_LIBRARY: readonly LibraryPlant[] = [
  // --- Vegetables ---
  {
    id: "tomato",
    name: "Tomato",
    scientificName: "Solanum lycopersicum",
    description:
      "A warm-season fruiting vegetable prized for its juicy, flavorful fruits used fresh, cooked, and preserved.",
    sunlight: "Full sun",
    wateringSchedule: "Deeply 1-2 times per week; keep soil evenly moist",
    wateringIntervalDays: 3,
    soilType: "Well-draining, fertile loam rich in organic matter; pH 6.2-6.8",
    hardinessZones: "USDA zones 3-11 (grown as an annual)",
    plantingGuidelines:
      "Start seeds indoors 6-8 weeks before last frost. Transplant outdoors after soil warms to 60°F, spacing 24-36 inches apart. Stake or cage for support.",
    companionPlants: ["Basil", "Carrot", "Marigold", "Onion", "Parsley"],
    commonPests: ["Hornworms", "Aphids", "Whiteflies", "Blossom-end rot"],
    growingTips: [
      "Mulch to retain moisture and prevent soil splash",
      "Prune suckers on indeterminate varieties for better airflow",
      "Water at the base, not overhead, to reduce disease",
      "Feed with calcium to prevent blossom-end rot",
    ],
    daysToHarvest: "60-85 days from transplant",
    category: "vegetable",
  },
  {
    id: "pepper",
    name: "Pepper",
    scientificName: "Capsicum annuum",
    description:
      "Warm-season vegetable producing sweet or hot fruits in a wide range of colors and shapes.",
    sunlight: "Full sun",
    wateringSchedule: "Consistently moist, about 1-2 inches per week",
    wateringIntervalDays: 3,
    soilType: "Well-draining, fertile loam; pH 6.0-6.8",
    hardinessZones: "USDA zones 4-11 (annual in most regions)",
    plantingGuidelines:
      "Start seeds indoors 8-10 weeks before last frost. Transplant after nights stay above 55°F, 18-24 inches apart.",
    companionPlants: ["Basil", "Onion", "Carrot", "Tomato"],
    commonPests: ["Aphids", "Flea beetles", "Pepper maggots"],
    growingTips: [
      "Provide stakes for tall or heavy-fruited varieties",
      "Mulch to keep roots cool and moist",
      "Pinch early blossoms to encourage stronger plants",
    ],
    daysToHarvest: "60-90 days from transplant",
    category: "vegetable",
  },
  {
    id: "cucumber",
    name: "Cucumber",
    scientificName: "Cucumis sativus",
    description:
      "Vining warm-season vegetable that produces crisp, refreshing fruits great for fresh eating and pickling.",
    sunlight: "Full sun",
    wateringSchedule: "1-2 inches per week, more in hot weather",
    wateringIntervalDays: 2,
    soilType: "Loose, well-draining soil rich in compost; pH 6.0-7.0",
    hardinessZones: "USDA zones 4-11 (grown as an annual)",
    plantingGuidelines:
      "Direct sow after last frost when soil reaches 70°F. Plant in hills or rows with a trellis for vining types; space 12 inches apart.",
    companionPlants: ["Beans", "Corn", "Radish", "Sunflower", "Dill"],
    commonPests: ["Cucumber beetles", "Squash bugs", "Powdery mildew"],
    growingTips: [
      "Trellis to save space and reduce disease",
      "Harvest often to keep plants productive",
      "Avoid letting fruits over-ripen on the vine",
    ],
    daysToHarvest: "50-70 days from sowing",
    category: "vegetable",
  },
  {
    id: "zucchini",
    name: "Zucchini",
    scientificName: "Cucurbita pepo",
    description:
      "Prolific summer squash with mild, tender fruits picked young for the best flavor and texture.",
    sunlight: "Full sun",
    wateringSchedule: "Deep watering 1-2 times per week, about 1 inch",
    wateringIntervalDays: 3,
    soilType: "Rich, well-draining soil amended with compost; pH 6.0-7.5",
    hardinessZones: "USDA zones 3-10 (annual)",
    plantingGuidelines:
      "Direct sow after last frost in hills or rows, 24-36 inches apart. Soil should be at least 70°F.",
    companionPlants: ["Corn", "Beans", "Nasturtium", "Marigold"],
    commonPests: ["Squash vine borer", "Squash bugs", "Powdery mildew"],
    growingTips: [
      "Harvest when 6-8 inches long for best flavor",
      "Mulch heavily to retain moisture",
      "Water at the base to prevent fungal disease",
    ],
    daysToHarvest: "45-60 days from sowing",
    category: "vegetable",
  },
  {
    id: "carrot",
    name: "Carrot",
    scientificName: "Daucus carota",
    description:
      "Cool-season root vegetable producing sweet, crunchy taproots in shades of orange, purple, yellow, and white.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "About 1 inch per week, evenly",
    wateringIntervalDays: 3,
    soilType: "Loose, sandy, stone-free soil; pH 6.0-6.8",
    hardinessZones: "USDA zones 3-10",
    plantingGuidelines:
      "Direct sow seeds 1/4 inch deep, 2 inches apart, 2-3 weeks before last frost. Thin to 3 inches once seedlings emerge.",
    companionPlants: ["Onion", "Leek", "Lettuce", "Tomato", "Rosemary"],
    commonPests: ["Carrot rust fly", "Aphids", "Wireworms"],
    growingTips: [
      "Keep soil moist for even germination (can take 2-3 weeks)",
      "Thin seedlings to prevent crowded, twisted roots",
      "Mulch to keep shoulders from turning green",
    ],
    daysToHarvest: "60-80 days from sowing",
    category: "vegetable",
  },
  {
    id: "lettuce",
    name: "Lettuce",
    scientificName: "Lactuca sativa",
    description:
      "Fast-growing cool-season leafy green available in loose-leaf, butterhead, romaine, and crisphead types.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "Frequent shallow watering to keep soil moist",
    wateringIntervalDays: 2,
    soilType: "Loose, well-draining soil rich in organic matter; pH 6.0-7.0",
    hardinessZones: "USDA zones 4-9",
    plantingGuidelines:
      "Direct sow as soon as soil can be worked. Sow successively every 2 weeks for continuous harvest.",
    companionPlants: ["Carrot", "Radish", "Strawberry", "Cucumber"],
    commonPests: ["Aphids", "Slugs", "Cutworms"],
    growingTips: [
      "Harvest outer leaves for cut-and-come-again",
      "Provide afternoon shade in hot weather to prevent bolting",
      "Use row covers to protect from pests",
    ],
    daysToHarvest: "30-60 days from sowing",
    category: "vegetable",
  },
  {
    id: "spinach",
    name: "Spinach",
    scientificName: "Spinacia oleracea",
    description:
      "Nutrient-dense cool-season leafy green that grows quickly in spring and fall.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "Consistent moisture; about 1-1.5 inches per week",
    wateringIntervalDays: 2,
    soilType: "Fertile, well-draining loam; pH 6.5-7.5",
    hardinessZones: "USDA zones 3-9",
    plantingGuidelines:
      "Direct sow 4-6 weeks before last frost or in late summer for fall crop. Sow 1/2 inch deep, thin to 4-6 inches apart.",
    companionPlants: ["Strawberry", "Pea", "Radish", "Cabbage"],
    commonPests: ["Leaf miners", "Aphids", "Slugs"],
    growingTips: [
      "Bolts quickly in heat — plant for cool weather",
      "Harvest outer leaves first for extended production",
      "Use row covers to deter leaf miners",
    ],
    daysToHarvest: "35-50 days from sowing",
    category: "vegetable",
  },
  {
    id: "kale",
    name: "Kale",
    scientificName: "Brassica oleracea var. sabellica",
    description:
      "Hardy cool-season leafy green that gets sweeter after frost. Excellent for fresh, sautéed, or baked use.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "1-1.5 inches per week",
    wateringIntervalDays: 3,
    soilType: "Fertile, well-draining; pH 6.0-7.5",
    hardinessZones: "USDA zones 3-9",
    plantingGuidelines:
      "Direct sow 4-6 weeks before last frost or late summer for fall crop. Space plants 12-18 inches apart.",
    companionPlants: ["Beet", "Onion", "Dill", "Potato"],
    commonPests: ["Cabbage worms", "Aphids", "Flea beetles"],
    growingTips: [
      "Flavor improves after a light frost",
      "Pick lower leaves first to keep plants producing",
      "Use row covers to keep cabbage moths away",
    ],
    daysToHarvest: "55-75 days from sowing",
    category: "vegetable",
  },
  {
    id: "broccoli",
    name: "Broccoli",
    scientificName: "Brassica oleracea var. italica",
    description:
      "Cool-season brassica grown for its dense flower heads and tender side shoots.",
    sunlight: "Full sun",
    wateringSchedule: "1-1.5 inches per week, evenly",
    wateringIntervalDays: 3,
    soilType: "Rich, well-draining loam; pH 6.0-7.0",
    hardinessZones: "USDA zones 3-10",
    plantingGuidelines:
      "Start seeds indoors 6-8 weeks before last frost or direct sow in late summer. Space 18 inches apart.",
    companionPlants: ["Onion", "Beet", "Potato", "Dill"],
    commonPests: ["Cabbage worms", "Aphids", "Cabbage loopers"],
    growingTips: [
      "Harvest main head before flowers open",
      "Continue harvesting side shoots for weeks after main head",
      "Mulch to keep roots cool",
    ],
    daysToHarvest: "55-100 days from transplant",
    category: "vegetable",
  },
  {
    id: "snap-peas",
    name: "Sugar Snap Peas",
    scientificName: "Pisum sativum var. macrocarpon",
    description:
      "Cool-season climbing legume with sweet, edible pods. Great fresh, steamed, or in stir-fries.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "Even moisture; about 1 inch per week",
    wateringIntervalDays: 3,
    soilType: "Well-draining, fertile loam; pH 6.0-7.5",
    hardinessZones: "USDA zones 3-11",
    plantingGuidelines:
      "Direct sow 4-6 weeks before last frost. Provide a 4-6 ft trellis. Space seeds 1-2 inches apart.",
    companionPlants: ["Carrot", "Radish", "Lettuce", "Cucumber"],
    commonPests: ["Aphids", "Pea weevils", "Powdery mildew"],
    growingTips: [
      "Harvest when pods are plump and bright green",
      "Pick frequently to keep plants producing",
      "Mulch to keep roots cool",
    ],
    daysToHarvest: "55-70 days from sowing",
    category: "vegetable",
  },
  {
    id: "green-bean",
    name: "Green Bean",
    scientificName: "Phaseolus vulgaris",
    description:
      "Warm-season legume available in bush and pole varieties, prized for tender, crisp pods.",
    sunlight: "Full sun",
    wateringSchedule: "1 inch per week, deeply",
    wateringIntervalDays: 3,
    soilType: "Well-draining, moderately fertile; pH 6.0-7.0",
    hardinessZones: "USDA zones 3-10",
    plantingGuidelines:
      "Direct sow after last frost when soil is 60°F. Bush types: 3-4 inches apart. Pole types: provide a trellis.",
    companionPlants: ["Corn", "Cucumber", "Radish", "Strawberry"],
    commonPests: ["Mexican bean beetle", "Aphids", "Spider mites"],
    growingTips: [
      "Harvest pods when pencil-thick for best flavor",
      "Pick often to encourage more production",
      "Avoid handling plants when wet to prevent disease",
    ],
    daysToHarvest: "50-65 days from sowing",
    category: "vegetable",
  },
  {
    id: "radish",
    name: "Radish",
    scientificName: "Raphanus sativus",
    description:
      "Fast-growing cool-season root vegetable with peppery, crunchy roots ready in just a few weeks.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "Even moisture, about 1 inch per week",
    wateringIntervalDays: 2,
    soilType: "Loose, well-draining soil free of stones; pH 6.0-7.0",
    hardinessZones: "USDA zones 2-10",
    plantingGuidelines:
      "Direct sow 4-6 weeks before last frost. Sow seeds 1/2 inch deep, 1 inch apart. Successive sow every 2 weeks.",
    companionPlants: ["Carrot", "Lettuce", "Spinach", "Cucumber"],
    commonPests: ["Flea beetles", "Cabbage maggots", "Aphids"],
    growingTips: [
      "Harvest promptly to avoid woody, hot roots",
      "Thin seedlings to allow proper root development",
      "Plant in cool weather to prevent bolting",
    ],
    daysToHarvest: "20-30 days from sowing",
    category: "vegetable",
  },
  {
    id: "onion",
    name: "Onion",
    scientificName: "Allium cepa",
    description:
      "Versatile bulb crop grown from sets, seeds, or transplants in a wide range of sweet to pungent varieties.",
    sunlight: "Full sun",
    wateringSchedule: "About 1 inch per week",
    wateringIntervalDays: 4,
    soilType: "Loose, well-draining loam rich in organic matter; pH 6.0-7.0",
    hardinessZones: "USDA zones 3-9",
    plantingGuidelines:
      "Plant sets or transplants 4-6 weeks before last frost, 4-6 inches apart. Choose long-day, short-day, or day-neutral types based on latitude.",
    companionPlants: ["Carrot", "Lettuce", "Strawberry", "Tomato"],
    commonPests: ["Onion maggots", "Thrips", "Downy mildew"],
    growingTips: [
      "Stop watering when tops fall over to cure bulbs",
      "Cure bulbs in a dry, airy spot for 2-3 weeks before storage",
      "Avoid mulching too thickly over the bulbs",
    ],
    daysToHarvest: "90-120 days from planting",
    category: "vegetable",
  },
  {
    id: "garlic",
    name: "Garlic",
    scientificName: "Allium sativum",
    description:
      "Pungent bulb crop typically planted in fall and harvested the following summer.",
    sunlight: "Full sun",
    wateringSchedule: "About 1 inch per week during active growth",
    wateringIntervalDays: 5,
    soilType: "Well-draining, fertile loam; pH 6.0-7.0",
    hardinessZones: "USDA zones 3-9",
    plantingGuidelines:
      "Plant individual cloves 2 inches deep, 6 inches apart, 4-6 weeks before ground freezes. Mulch heavily for winter.",
    companionPlants: ["Tomato", "Carrot", "Beet", "Strawberry"],
    commonPests: ["Onion thrips", "Nematodes", "White rot"],
    growingTips: [
      "Cut scapes from hardneck varieties to direct energy to bulbs",
      "Stop watering 2 weeks before harvest",
      "Cure for 2-3 weeks in a dry, ventilated spot",
    ],
    daysToHarvest: "240+ days from fall planting",
    category: "vegetable",
  },
  {
    id: "potato",
    name: "Potato",
    scientificName: "Solanum tuberosum",
    description:
      "Versatile starchy tuber grown from seed potatoes in a wide variety of skin and flesh colors.",
    sunlight: "Full sun",
    wateringSchedule: "1-2 inches per week, especially when tubers form",
    wateringIntervalDays: 3,
    soilType: "Loose, well-draining, slightly acidic soil; pH 5.5-6.5",
    hardinessZones: "USDA zones 3-10",
    plantingGuidelines:
      "Plant seed potatoes 4 inches deep, 12 inches apart, after last frost. Hill soil over plants as they grow to prevent greening.",
    companionPlants: ["Bean", "Corn", "Cabbage", "Horseradish"],
    commonPests: ["Colorado potato beetle", "Aphids", "Late blight"],
    growingTips: [
      "Hill soil up around stems for higher yields",
      "Harvest new potatoes 2-3 weeks after flowering",
      "Cure mature potatoes in the dark before storage",
    ],
    daysToHarvest: "70-120 days from planting",
    category: "vegetable",
  },
  {
    id: "beet",
    name: "Beet",
    scientificName: "Beta vulgaris",
    description:
      "Cool-season root vegetable with sweet, earthy roots and edible nutrient-rich greens.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "About 1 inch per week, evenly",
    wateringIntervalDays: 3,
    soilType: "Loose, well-draining soil; pH 6.0-7.0",
    hardinessZones: "USDA zones 2-10",
    plantingGuidelines:
      "Direct sow 2-4 weeks before last frost. Sow 1/2 inch deep, thin to 3-4 inches apart.",
    companionPlants: ["Onion", "Lettuce", "Cabbage", "Bush beans"],
    commonPests: ["Leaf miners", "Aphids", "Flea beetles"],
    growingTips: [
      "Harvest greens lightly while roots develop",
      "Pick beets at golf-ball size for tenderness",
      "Mulch to retain even moisture",
    ],
    daysToHarvest: "55-70 days from sowing",
    category: "vegetable",
  },
  {
    id: "corn",
    name: "Sweet Corn",
    scientificName: "Zea mays",
    description:
      "Warm-season grain grown for tender, sweet kernels best eaten fresh from the garden.",
    sunlight: "Full sun",
    wateringSchedule: "1-1.5 inches per week, especially when silking",
    wateringIntervalDays: 3,
    soilType: "Fertile, well-draining loam; pH 6.0-6.8",
    hardinessZones: "USDA zones 4-11 (annual)",
    plantingGuidelines:
      "Direct sow after last frost in blocks of at least 4 rows for proper pollination. Space 8-12 inches apart.",
    companionPlants: ["Bean", "Squash", "Cucumber"],
    commonPests: ["Corn earworm", "European corn borer", "Raccoons"],
    growingTips: [
      "Plant in blocks rather than single rows for pollination",
      "Harvest when silks are brown and kernels are milky",
      "Eat or refrigerate quickly — sugars convert to starch fast",
    ],
    daysToHarvest: "60-100 days from sowing",
    category: "vegetable",
  },

  // --- Herbs ---
  {
    id: "basil",
    name: "Basil",
    scientificName: "Ocimum basilicum",
    description:
      "Tender, aromatic warm-season herb essential to Italian and Southeast Asian cooking.",
    sunlight: "Full sun",
    wateringSchedule: "Keep soil consistently moist; water 2-3 times per week",
    wateringIntervalDays: 2,
    soilType: "Well-draining, fertile soil rich in organic matter; pH 6.0-7.5",
    hardinessZones: "USDA zones 10-11 (annual elsewhere)",
    plantingGuidelines:
      "Plant outdoors after last frost when soil is above 50°F. Sow 1/4 inch deep or transplant 12-18 inches apart.",
    companionPlants: ["Tomato", "Pepper", "Oregano", "Chives", "Marigold"],
    commonPests: ["Aphids", "Japanese beetles", "Slugs", "Spider mites"],
    growingTips: [
      "Pinch off flower buds to prolong leaf production",
      "Harvest from the top to encourage bushiness",
      "Avoid overhead watering to reduce fungal disease",
      "Mulch to retain soil moisture",
    ],
    daysToHarvest: "50-60 days from sowing",
    category: "herb",
  },
  {
    id: "mint",
    name: "Mint",
    scientificName: "Mentha spp.",
    description:
      "Vigorous perennial herb with refreshing flavor; best contained as it spreads aggressively.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "Keep evenly moist; water 1-2 times per week",
    wateringIntervalDays: 3,
    soilType: "Moist, well-draining soil; pH 6.0-7.0",
    hardinessZones: "USDA zones 3-11 (varies by species)",
    plantingGuidelines:
      "Plant in containers or designated areas to prevent spread. Space 18-24 inches apart if in ground.",
    companionPlants: ["Cabbage", "Tomato", "Carrot"],
    commonPests: ["Spider mites", "Aphids", "Rust"],
    growingTips: [
      "Grow in containers to control spreading roots",
      "Pinch back regularly to prevent flowering",
      "Divide every 2-3 years to maintain vigor",
    ],
    daysToHarvest: "60-90 days from planting",
    category: "herb",
  },
  {
    id: "rosemary",
    name: "Rosemary",
    scientificName: "Salvia rosmarinus",
    description:
      "Evergreen Mediterranean herb with needle-like leaves and a piney aroma. Drought-tolerant once established.",
    sunlight: "Full sun",
    wateringSchedule: "Allow soil to dry between waterings; about every 7-10 days",
    wateringIntervalDays: 7,
    soilType: "Well-draining, sandy or loamy soil; pH 6.0-7.5",
    hardinessZones: "USDA zones 7-10 (overwinter indoors in colder zones)",
    plantingGuidelines:
      "Transplant in spring after last frost. Space 24-36 inches apart in full sun.",
    companionPlants: ["Sage", "Cabbage", "Carrot", "Bean"],
    commonPests: ["Spider mites", "Mealybugs", "Powdery mildew"],
    growingTips: [
      "Avoid overwatering — roots rot easily",
      "Prune lightly after flowering to maintain shape",
      "Bring containers indoors before hard frost in cold climates",
    ],
    daysToHarvest: "Year-round once established",
    category: "herb",
  },
  {
    id: "thyme",
    name: "Thyme",
    scientificName: "Thymus vulgaris",
    description:
      "Low-growing perennial Mediterranean herb with tiny aromatic leaves used in many cuisines.",
    sunlight: "Full sun",
    wateringSchedule: "Allow soil to dry; water about every 7-10 days",
    wateringIntervalDays: 7,
    soilType: "Well-draining, sandy or rocky soil; pH 6.0-8.0",
    hardinessZones: "USDA zones 5-9",
    plantingGuidelines:
      "Transplant after last frost. Space 9-12 inches apart in a sunny, well-drained spot.",
    companionPlants: ["Cabbage", "Tomato", "Strawberry", "Eggplant"],
    commonPests: ["Spider mites", "Aphids", "Root rot"],
    growingTips: [
      "Trim regularly to encourage tender new growth",
      "Avoid wet feet — drainage is critical",
      "Replace plants every 3-4 years as they get woody",
    ],
    daysToHarvest: "Harvest as needed once established",
    category: "herb",
  },
  {
    id: "oregano",
    name: "Oregano",
    scientificName: "Origanum vulgare",
    description:
      "Hardy perennial herb essential to Italian, Greek, and Mexican cooking, with a warm, peppery flavor.",
    sunlight: "Full sun",
    wateringSchedule: "Allow soil to dry between waterings",
    wateringIntervalDays: 7,
    soilType: "Well-draining, moderately fertile soil; pH 6.0-8.0",
    hardinessZones: "USDA zones 4-10",
    plantingGuidelines:
      "Transplant after last frost. Space 8-12 inches apart in full sun.",
    companionPlants: ["Tomato", "Pepper", "Basil", "Cabbage"],
    commonPests: ["Aphids", "Spider mites", "Rust"],
    growingTips: [
      "Pinch off flowers to keep flavor strong",
      "Divide every few years to renew plants",
      "Flavor is best just before flowering",
    ],
    daysToHarvest: "80-90 days from sowing",
    category: "herb",
  },
  {
    id: "parsley",
    name: "Parsley",
    scientificName: "Petroselinum crispum",
    description:
      "Biennial herb commonly grown as an annual; available in flat-leaf (Italian) and curly forms.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "Keep evenly moist; about 1 inch per week",
    wateringIntervalDays: 3,
    soilType: "Rich, well-draining loam; pH 6.0-7.0",
    hardinessZones: "USDA zones 3-9",
    plantingGuidelines:
      "Direct sow 3-4 weeks before last frost. Soak seeds overnight to speed germination. Thin to 6-8 inches apart.",
    companionPlants: ["Tomato", "Asparagus", "Carrot", "Chives"],
    commonPests: ["Parsleyworm", "Aphids", "Spider mites"],
    growingTips: [
      "Patience — seeds can take 3 weeks to germinate",
      "Cut outer stems first to keep plants productive",
      "Tolerates light frost",
    ],
    daysToHarvest: "70-90 days from sowing",
    category: "herb",
  },
  {
    id: "cilantro",
    name: "Cilantro",
    scientificName: "Coriandrum sativum",
    description:
      "Cool-season annual herb with bright, citrusy leaves; produces coriander seed when allowed to flower.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "Keep evenly moist; about 1 inch per week",
    wateringIntervalDays: 2,
    soilType: "Well-draining, fertile loam; pH 6.2-6.8",
    hardinessZones: "USDA zones 3-11 (cool-season annual)",
    plantingGuidelines:
      "Direct sow every 2-3 weeks for continuous harvest. Bolts quickly in heat — plant in spring and fall.",
    companionPlants: ["Tomato", "Spinach", "Bean"],
    commonPests: ["Aphids", "Powdery mildew"],
    growingTips: [
      "Sow successively to extend harvest before bolting",
      "Provide afternoon shade in warm weather",
      "Let some plants bolt to harvest coriander seed",
    ],
    daysToHarvest: "30-45 days for leaves",
    category: "herb",
  },
  {
    id: "dill",
    name: "Dill",
    scientificName: "Anethum graveolens",
    description:
      "Annual herb prized for its feathery leaves and seeds; classic with pickles and fish.",
    sunlight: "Full sun",
    wateringSchedule: "Even moisture; about 1 inch per week",
    wateringIntervalDays: 3,
    soilType: "Well-draining, slightly acidic soil; pH 5.5-6.5",
    hardinessZones: "USDA zones 3-7 (annual)",
    plantingGuidelines:
      "Direct sow after last frost. Successive sow every 2-3 weeks. Doesn't transplant well.",
    companionPlants: ["Cabbage", "Onion", "Cucumber", "Lettuce"],
    commonPests: ["Aphids", "Parsleyworm"],
    growingTips: [
      "Stake tall plants in windy areas",
      "Let some plants flower to attract beneficial insects",
      "Harvest seeds as they turn brown",
    ],
    daysToHarvest: "40-60 days from sowing",
    category: "herb",
  },
  {
    id: "chives",
    name: "Chives",
    scientificName: "Allium schoenoprasum",
    description:
      "Hardy perennial herb in the onion family with mild flavor and edible purple flowers.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "About 1 inch per week",
    wateringIntervalDays: 4,
    soilType: "Well-draining, fertile soil; pH 6.0-7.0",
    hardinessZones: "USDA zones 3-9",
    plantingGuidelines:
      "Sow indoors 8-10 weeks before last frost or divide existing clumps. Space 8-12 inches apart.",
    companionPlants: ["Carrot", "Tomato", "Strawberry", "Apple"],
    commonPests: ["Aphids", "Thrips"],
    growingTips: [
      "Cut leaves down to 2 inches to encourage regrowth",
      "Divide clumps every 3-4 years",
      "Flowers are edible and attract pollinators",
    ],
    daysToHarvest: "60-90 days from sowing",
    category: "herb",
  },
  {
    id: "sage",
    name: "Sage",
    scientificName: "Salvia officinalis",
    description:
      "Hardy perennial Mediterranean herb with soft gray-green leaves and an earthy, peppery flavor.",
    sunlight: "Full sun",
    wateringSchedule: "Allow soil to dry between waterings",
    wateringIntervalDays: 7,
    soilType: "Well-draining, sandy loam; pH 6.0-7.0",
    hardinessZones: "USDA zones 4-10",
    plantingGuidelines:
      "Transplant after last frost. Space 18-24 inches apart in full sun.",
    companionPlants: ["Rosemary", "Cabbage", "Carrot"],
    commonPests: ["Spider mites", "Slugs", "Powdery mildew"],
    growingTips: [
      "Prune in spring to remove woody growth",
      "Replace plants every 4-5 years as they get woody",
      "Harvest before flowering for best flavor",
    ],
    daysToHarvest: "75 days from transplant",
    category: "herb",
  },
  {
    id: "lavender",
    name: "Lavender",
    scientificName: "Lavandula angustifolia",
    description:
      "Fragrant perennial subshrub with silvery foliage and purple flower spikes loved by pollinators.",
    sunlight: "Full sun",
    wateringSchedule: "Drought-tolerant once established; water deeply but infrequently",
    wateringIntervalDays: 10,
    soilType: "Sandy, very well-draining alkaline soil; pH 6.7-7.3",
    hardinessZones: "USDA zones 5-9 (variety dependent)",
    plantingGuidelines:
      "Transplant in spring after last frost. Space 18-24 inches apart with excellent drainage.",
    companionPlants: ["Rosemary", "Sage", "Echinacea", "Roses"],
    commonPests: ["Root rot from overwatering", "Spittlebugs"],
    growingTips: [
      "Avoid wet feet — drainage is essential",
      "Prune by 1/3 after flowering to maintain shape",
      "Harvest flowers when half-open for best fragrance",
    ],
    daysToHarvest: "First-year light bloom; full bloom year 2",
    category: "herb",
  },

  // --- Fruits ---
  {
    id: "strawberry",
    name: "Strawberry",
    scientificName: "Fragaria × ananassa",
    description:
      "Low-growing perennial fruit available in June-bearing, everbearing, and day-neutral varieties.",
    sunlight: "Full sun",
    wateringSchedule: "1-2 inches per week, more during fruiting",
    wateringIntervalDays: 3,
    soilType: "Well-draining, slightly acidic loam; pH 5.5-6.5",
    hardinessZones: "USDA zones 3-10",
    plantingGuidelines:
      "Plant bare-root crowns in spring with crown at soil level. Space 12-18 inches apart in rows 3 feet apart.",
    companionPlants: ["Spinach", "Lettuce", "Bean", "Borage"],
    commonPests: ["Slugs", "Birds", "Spider mites", "Gray mold"],
    growingTips: [
      "Mulch with straw to keep berries clean and retain moisture",
      "Pinch off first-year flowers on June-bearers for stronger plants",
      "Use netting to protect ripening fruit from birds",
    ],
    daysToHarvest: "60-90 days from planting (variety dependent)",
    category: "fruit",
  },
  {
    id: "blueberry",
    name: "Blueberry",
    scientificName: "Vaccinium corymbosum",
    description:
      "Long-lived deciduous shrub producing antioxidant-rich blue berries; needs acidic soil to thrive.",
    sunlight: "Full sun",
    wateringSchedule: "1-2 inches per week, especially during fruit development",
    wateringIntervalDays: 4,
    soilType: "Acidic, well-draining, organic-rich soil; pH 4.5-5.5",
    hardinessZones: "USDA zones 3-9 (variety dependent)",
    plantingGuidelines:
      "Plant in spring or fall. Space 4-6 feet apart. Plant at least two varieties for cross-pollination.",
    companionPlants: ["Strawberry", "Cranberry", "Rhododendron"],
    commonPests: ["Birds", "Spotted-wing drosophila", "Mummy berry"],
    growingTips: [
      "Mulch with pine needles or wood chips to maintain acidity",
      "Net plants to protect from birds",
      "Prune in late winter to remove old wood",
    ],
    daysToHarvest: "Light yields year 2; full yields year 4-5",
    category: "fruit",
  },
  {
    id: "raspberry",
    name: "Raspberry",
    scientificName: "Rubus idaeus",
    description:
      "Cane fruit producing sweet, delicate berries; available in summer-bearing and everbearing types.",
    sunlight: "Full sun",
    wateringSchedule: "About 1 inch per week, more during fruiting",
    wateringIntervalDays: 4,
    soilType: "Well-draining loam rich in organic matter; pH 5.5-6.5",
    hardinessZones: "USDA zones 3-9",
    plantingGuidelines:
      "Plant bare-root canes in early spring 18-24 inches apart in rows. Provide a trellis or fencing for support.",
    companionPlants: ["Garlic", "Tansy", "Yarrow"],
    commonPests: ["Japanese beetles", "Spider mites", "Cane borers"],
    growingTips: [
      "Trellis to keep canes upright and fruit clean",
      "Prune out fruited canes after harvest",
      "Mulch to keep roots cool and moist",
    ],
    daysToHarvest: "Year 2 for summer-bearing; first-year fall crop on everbearing",
    category: "fruit",
  },
  {
    id: "watermelon",
    name: "Watermelon",
    scientificName: "Citrullus lanatus",
    description:
      "Sprawling warm-season vine producing large, juicy fruits beloved in summer.",
    sunlight: "Full sun",
    wateringSchedule: "1-2 inches per week, reducing as fruit ripens",
    wateringIntervalDays: 3,
    soilType: "Sandy, well-draining loam rich in compost; pH 6.0-6.8",
    hardinessZones: "USDA zones 3-11 (annual)",
    plantingGuidelines:
      "Direct sow after last frost when soil is 70°F. Plant in hills with 2-3 seeds, thin to strongest. Space hills 4-6 feet apart.",
    companionPlants: ["Corn", "Sunflower", "Radish", "Nasturtium"],
    commonPests: ["Cucumber beetles", "Aphids", "Powdery mildew"],
    growingTips: [
      "Provide ample space — vines spread widely",
      "Reduce watering as fruits ripen for sweeter flavor",
      "Harvest when tendril nearest the fruit turns brown",
    ],
    daysToHarvest: "70-90 days from sowing",
    category: "fruit",
  },

  // --- Flowers ---
  {
    id: "sunflower",
    name: "Sunflower",
    scientificName: "Helianthus annuus",
    description:
      "Iconic warm-season annual with cheerful flower heads that follow the sun and produce edible seeds.",
    sunlight: "Full sun",
    wateringSchedule: "Deep watering once per week",
    wateringIntervalDays: 5,
    soilType: "Well-draining, moderately fertile soil; pH 6.0-7.5",
    hardinessZones: "USDA zones 2-11 (annual)",
    plantingGuidelines:
      "Direct sow after last frost, 1 inch deep. Space dwarf varieties 6 inches apart, giants 24-36 inches apart.",
    companionPlants: ["Cucumber", "Squash", "Corn", "Pole bean"],
    commonPests: ["Birds", "Squirrels", "Sunflower moth"],
    growingTips: [
      "Stake tall varieties in windy areas",
      "Cover ripening seed heads with mesh to deter birds",
      "Successive sow for blooms all summer",
    ],
    daysToHarvest: "70-100 days from sowing",
    category: "flower",
  },
  {
    id: "marigold",
    name: "Marigold",
    scientificName: "Tagetes spp.",
    description:
      "Cheerful warm-season annual flower; widely planted as a companion to repel pests.",
    sunlight: "Full sun",
    wateringSchedule: "Allow to dry between waterings; drought-tolerant",
    wateringIntervalDays: 5,
    soilType: "Well-draining, moderately fertile soil; pH 6.0-7.5",
    hardinessZones: "USDA zones 2-11 (annual)",
    plantingGuidelines:
      "Direct sow after last frost or transplant. Space 6-12 inches apart depending on variety.",
    companionPlants: ["Tomato", "Pepper", "Bean", "Squash"],
    commonPests: ["Slugs", "Spider mites", "Botrytis"],
    growingTips: [
      "Deadhead spent blooms to encourage continuous flowering",
      "Plant near vegetables to deter nematodes and pests",
      "Drought-tolerant once established",
    ],
    daysToHarvest: "50-60 days to first bloom",
    category: "flower",
  },
  {
    id: "zinnia",
    name: "Zinnia",
    scientificName: "Zinnia elegans",
    description:
      "Easy-to-grow warm-season annual with vibrant blooms in nearly every color, beloved by butterflies.",
    sunlight: "Full sun",
    wateringSchedule: "1 inch per week, at the base of plants",
    wateringIntervalDays: 4,
    soilType: "Well-draining, fertile soil; pH 5.5-7.5",
    hardinessZones: "USDA zones 2-11 (annual)",
    plantingGuidelines:
      "Direct sow after last frost when soil is warm. Space 6-18 inches apart depending on variety.",
    companionPlants: ["Tomato", "Cucumber", "Pepper", "Cauliflower"],
    commonPests: ["Powdery mildew", "Aphids", "Spider mites"],
    growingTips: [
      "Water at the base to prevent powdery mildew",
      "Cut flowers often to encourage more blooms",
      "Pinch young plants to encourage branching",
    ],
    daysToHarvest: "60-70 days to first bloom",
    category: "flower",
  },
  {
    id: "rose",
    name: "Rose",
    scientificName: "Rosa spp.",
    description:
      "Classic flowering shrub available in countless cultivars from miniatures to climbers.",
    sunlight: "Full sun",
    wateringSchedule: "Deep watering 1-2 times per week",
    wateringIntervalDays: 4,
    soilType: "Well-draining, fertile loam; pH 6.0-6.5",
    hardinessZones: "USDA zones 3-11 (variety dependent)",
    plantingGuidelines:
      "Plant bare-root in early spring or container roses anytime in growing season. Space 2-6 feet apart.",
    companionPlants: ["Lavender", "Garlic", "Catmint", "Geranium"],
    commonPests: ["Aphids", "Japanese beetles", "Black spot", "Powdery mildew"],
    growingTips: [
      "Water at the base to keep leaves dry",
      "Prune in early spring before new growth",
      "Mulch to retain moisture and protect roots",
    ],
    daysToHarvest: "First-year light bloom; established blooms year 2+",
    category: "flower",
  },
  {
    id: "cosmos",
    name: "Cosmos",
    scientificName: "Cosmos bipinnatus",
    description:
      "Airy, daisy-like annual flower that thrives in poor soil and reseeds readily.",
    sunlight: "Full sun",
    wateringSchedule: "Drought-tolerant once established; water about every 7 days",
    wateringIntervalDays: 7,
    soilType: "Well-draining, low-fertility soil; pH 6.0-7.0",
    hardinessZones: "USDA zones 2-11 (annual)",
    plantingGuidelines:
      "Direct sow after last frost. Lightly cover seeds. Space 12-18 inches apart.",
    companionPlants: ["Tomato", "Squash", "Cucumber", "Sunflower"],
    commonPests: ["Aphids", "Powdery mildew"],
    growingTips: [
      "Avoid over-fertilizing — too rich soil reduces blooms",
      "Stake tall varieties to prevent flopping",
      "Deadhead to extend blooming season",
    ],
    daysToHarvest: "65-90 days to first bloom",
    category: "flower",
  },
  {
    id: "echinacea",
    name: "Coneflower",
    scientificName: "Echinacea purpurea",
    description:
      "Hardy native perennial with daisy-like blooms that attract pollinators and birds.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "Drought-tolerant once established; water weekly first year",
    wateringIntervalDays: 7,
    soilType: "Well-draining, average to lean soil; pH 6.0-7.0",
    hardinessZones: "USDA zones 3-9",
    plantingGuidelines:
      "Plant in spring or fall, 18-24 inches apart. Tolerates poor soil; avoid wet feet.",
    companionPlants: ["Black-eyed Susan", "Bee Balm", "Yarrow", "Lavender"],
    commonPests: ["Aphids", "Powdery mildew", "Leaf spot"],
    growingTips: [
      "Leave seed heads in fall for birds and winter interest",
      "Divide every 3-4 years to maintain vigor",
      "Avoid overwatering or rich soil",
    ],
    daysToHarvest: "First bloom year 2 from seed; same year from transplant",
    category: "flower",
  },
  {
    id: "tulip",
    name: "Tulip",
    scientificName: "Tulipa spp.",
    description:
      "Classic spring-blooming bulb in a wide range of colors and forms; planted in fall.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "Water at planting; minimal water in summer dormancy",
    wateringIntervalDays: 14,
    soilType: "Well-draining, sandy loam; pH 6.0-7.0",
    hardinessZones: "USDA zones 3-8",
    plantingGuidelines:
      "Plant bulbs 6-8 inches deep in fall, pointy end up, 4-6 inches apart, before ground freezes.",
    companionPlants: ["Daffodil", "Hyacinth", "Pansy", "Forget-me-not"],
    commonPests: ["Squirrels", "Voles", "Aphids", "Tulip fire"],
    growingTips: [
      "Plant deeper than recommended in mild climates to encourage perennial behavior",
      "Allow foliage to die back naturally before removing",
      "Many tulips are best treated as annuals for reliable blooms",
    ],
    daysToHarvest: "Spring bloom from fall planting",
    category: "flower",
  },
  {
    id: "daffodil",
    name: "Daffodil",
    scientificName: "Narcissus spp.",
    description:
      "Cheerful spring-blooming bulb that's deer- and rodent-resistant and naturalizes well.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "Water at planting; little needed in summer dormancy",
    wateringIntervalDays: 14,
    soilType: "Well-draining loam; pH 6.0-7.0",
    hardinessZones: "USDA zones 3-9",
    plantingGuidelines:
      "Plant bulbs in fall, 6 inches deep and 4-6 inches apart, before ground freezes.",
    companionPlants: ["Tulip", "Hyacinth", "Hosta", "Daylily"],
    commonPests: ["Narcissus bulb fly", "Botrytis"],
    growingTips: [
      "Leave foliage in place until it yellows naturally",
      "Naturalizes well in lawns and woodland edges",
      "Toxic to most pests — squirrel-proof",
    ],
    daysToHarvest: "Spring bloom from fall planting",
    category: "flower",
  },
  {
    id: "nasturtium",
    name: "Nasturtium",
    scientificName: "Tropaeolum majus",
    description:
      "Easy-to-grow edible flower with peppery leaves and bright blooms; great for trailing or climbing.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "About 1 inch per week",
    wateringIntervalDays: 4,
    soilType: "Well-draining, lean soil; pH 6.0-7.5",
    hardinessZones: "USDA zones 2-11 (annual)",
    plantingGuidelines:
      "Direct sow after last frost, 1/2 inch deep, 10-12 inches apart. Doesn't transplant well.",
    companionPlants: ["Cucumber", "Squash", "Tomato", "Cabbage"],
    commonPests: ["Aphids (acts as a trap crop)", "Cabbage worms"],
    growingTips: [
      "Avoid rich soil — produces leaves at expense of blooms",
      "All parts are edible, peppery like watercress",
      "Use as trap crop to lure aphids from veggies",
    ],
    daysToHarvest: "50-60 days to first bloom",
    category: "flower",
  },
  {
    id: "pansy",
    name: "Pansy",
    scientificName: "Viola × wittrockiana",
    description:
      "Cool-season annual with cheerful 'face' flowers; perfect for early spring and fall color.",
    sunlight: "Full sun to partial shade",
    wateringSchedule: "Keep evenly moist; about 1 inch per week",
    wateringIntervalDays: 3,
    soilType: "Rich, well-draining loam; pH 5.4-5.8",
    hardinessZones: "USDA zones 4-8 (cool-season annual)",
    plantingGuidelines:
      "Transplant in early spring or fall when temperatures are cool. Space 6-8 inches apart.",
    companionPlants: ["Tulip", "Daffodil", "Snapdragon"],
    commonPests: ["Aphids", "Slugs", "Powdery mildew"],
    growingTips: [
      "Deadhead regularly to extend blooming",
      "Tolerates light frost",
      "Replace in summer when plants stop blooming in heat",
    ],
    daysToHarvest: "60-70 days from sowing",
    category: "flower",
  },

  // --- Succulents ---
  {
    id: "aloe-vera",
    name: "Aloe Vera",
    scientificName: "Aloe barbadensis miller",
    description:
      "Easy-to-grow medicinal succulent with thick, gel-filled leaves; great houseplant.",
    sunlight: "Bright indirect light to full sun",
    wateringSchedule: "Allow soil to dry completely; water every 2-3 weeks",
    wateringIntervalDays: 14,
    soilType: "Sandy, well-draining cactus mix; pH 7.0-8.5",
    hardinessZones: "USDA zones 9-11 (houseplant elsewhere)",
    plantingGuidelines:
      "Plant in pots with drainage holes. Use cactus/succulent soil. Repot every 2-3 years.",
    companionPlants: ["Other succulents", "Cacti"],
    commonPests: ["Mealybugs", "Scale", "Root rot from overwatering"],
    growingTips: [
      "Underwater rather than overwater — root rot is the biggest risk",
      "Bring indoors before frost",
      "Harvest outer leaves for gel without harming the plant",
    ],
    daysToHarvest: "Mature plants ready in 2-3 years",
    category: "succulent",
  },
  {
    id: "echeveria",
    name: "Echeveria",
    scientificName: "Echeveria spp.",
    description:
      "Rosette-forming succulent in many shades; popular for arrangements and centerpieces.",
    sunlight: "Bright sun",
    wateringSchedule: "Water deeply when soil is fully dry; about every 2 weeks",
    wateringIntervalDays: 14,
    soilType: "Sandy, well-draining cactus mix; pH 6.0-7.0",
    hardinessZones: "USDA zones 9-11",
    plantingGuidelines:
      "Plant in pots with drainage. Use cactus mix and avoid overwatering.",
    companionPlants: ["Sedum", "Other succulents"],
    commonPests: ["Mealybugs", "Aphids", "Root rot"],
    growingTips: [
      "Provide bright light to keep tight rosettes and color",
      "Water from below to keep rosettes dry",
      "Propagate easily from leaves",
    ],
    daysToHarvest: "N/A (ornamental)",
    category: "succulent",
  },
  {
    id: "jade-plant",
    name: "Jade Plant",
    scientificName: "Crassula ovata",
    description:
      "Long-lived succulent with thick, glossy leaves; symbol of prosperity in many cultures.",
    sunlight: "Bright sun to bright indirect light",
    wateringSchedule: "Water when soil is fully dry; about every 2-3 weeks",
    wateringIntervalDays: 14,
    soilType: "Well-draining cactus mix; pH 6.0-7.0",
    hardinessZones: "USDA zones 10-11 (houseplant elsewhere)",
    plantingGuidelines:
      "Plant in heavy pots — they get top-heavy. Use cactus/succulent mix.",
    companionPlants: ["Other succulents"],
    commonPests: ["Mealybugs", "Spider mites", "Root rot"],
    growingTips: [
      "Don't water in winter dormancy",
      "Rotate for even growth",
      "Prune to maintain shape; cuttings root easily",
    ],
    daysToHarvest: "N/A (ornamental)",
    category: "succulent",
  },

  // --- Trees & Shrubs ---
  {
    id: "lemon-tree",
    name: "Lemon Tree",
    scientificName: "Citrus limon",
    description:
      "Productive citrus tree producing fragrant flowers and tart fruit; can grow in containers in cold climates.",
    sunlight: "Full sun",
    wateringSchedule: "Deep watering every 5-7 days; let top inch dry",
    wateringIntervalDays: 5,
    soilType: "Well-draining, slightly acidic loam; pH 5.5-6.5",
    hardinessZones: "USDA zones 9-11 (container in colder zones)",
    plantingGuidelines:
      "Plant in spring after frost. Use a large container with drainage if not in ground. Space 12-25 feet apart.",
    companionPlants: ["Marigold", "Nasturtium", "Lavender"],
    commonPests: ["Aphids", "Scale", "Citrus leaf miner"],
    growingTips: [
      "Bring container plants indoors before frost",
      "Fertilize with citrus-specific fertilizer",
      "Don't let soil completely dry, but don't let it stay wet",
    ],
    daysToHarvest: "Year 3-5 from planting; year-round once mature",
    category: "tree",
  },
  {
    id: "blueberry-bush",
    name: "Blueberry Bush",
    scientificName: "Vaccinium corymbosum",
    description:
      "Long-lived deciduous shrub producing flavorful blue berries in summer; needs acidic soil.",
    sunlight: "Full sun",
    wateringSchedule: "1-2 inches per week, especially during fruiting",
    wateringIntervalDays: 4,
    soilType: "Acidic, well-draining, organic-rich; pH 4.5-5.5",
    hardinessZones: "USDA zones 3-9",
    plantingGuidelines:
      "Plant in spring or fall. Space 4-6 feet apart. Plant 2+ varieties for cross-pollination.",
    companionPlants: ["Strawberry", "Cranberry"],
    commonPests: ["Birds", "Spotted-wing drosophila"],
    growingTips: [
      "Mulch with pine needles or wood chips to maintain acidity",
      "Net plants to protect from birds",
      "Test soil pH yearly and amend with sulfur if needed",
    ],
    daysToHarvest: "Light yields year 2; full yields year 4-5",
    category: "shrub",
  },
  {
    id: "hydrangea",
    name: "Hydrangea",
    scientificName: "Hydrangea macrophylla",
    description:
      "Showy deciduous shrub with large flower clusters; flower color depends on soil pH in many varieties.",
    sunlight: "Morning sun, afternoon shade",
    wateringSchedule: "Deeply 2-3 times per week, especially in hot weather",
    wateringIntervalDays: 3,
    soilType: "Rich, well-draining loam; pH determines flower color (acid = blue, alkaline = pink)",
    hardinessZones: "USDA zones 3-9 (variety dependent)",
    plantingGuidelines:
      "Plant in spring or fall. Space 3-10 feet apart depending on variety. Provide afternoon shade in hot climates.",
    companionPlants: ["Hosta", "Astilbe", "Fern", "Boxwood"],
    commonPests: ["Aphids", "Spider mites", "Powdery mildew"],
    growingTips: [
      "Mulch heavily to retain moisture and protect roots",
      "Adjust soil pH to influence flower color",
      "Prune timing depends on variety — know if yours blooms on old or new wood",
    ],
    daysToHarvest: "First bloom year 2-3 from planting",
    category: "shrub",
  },
] as const;

export function getLibraryPlantById(id: string): LibraryPlant | undefined {
  return PLANT_LIBRARY.find((p) => p.id === id);
}

export function getLibraryPlantByName(name: string): LibraryPlant | undefined {
  const lower = name.trim().toLowerCase();
  return PLANT_LIBRARY.find(
    (p) => p.name.toLowerCase() === lower || p.id === lower,
  );
}

export function searchLibraryPlants(query: string): readonly LibraryPlant[] {
  const q = query.trim().toLowerCase();
  if (!q) return PLANT_LIBRARY;
  return PLANT_LIBRARY.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      p.scientificName.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q),
  );
}

export function getLibraryPlantsByCategory(
  category: PlantCategory,
): readonly LibraryPlant[] {
  return PLANT_LIBRARY.filter((p) => p.category === category);
}
