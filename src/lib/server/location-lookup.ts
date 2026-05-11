// Server-only module. Do not import from client components — the dataset is
// large and contains lookup logic that has no business on the wire. The
// `src/lib/server/` path is the convention boundary for this codebase.

import type { FrostDates } from "../types";

// ─── Public types ────────────────────────────────────────────────────────────

export type ParsedLocation =
  | { kind: "us_zip"; zip: string; prefix: string }
  | { kind: "ca_postal"; postal: string; fsa: string }
  | { kind: "city_state"; city: string; region: string; country: "US" | "CA" }
  | { kind: "city_only"; city: string }
  | { kind: "canonical_key"; key: string }
  | { kind: "invalid" };

export interface RegionalFrostData {
  readonly key: string;
  readonly displayLabel: string;
  readonly country: "US" | "CA";
  readonly region: string;
  readonly aliases: readonly string[];
  readonly lat: number;
  readonly lon: number;
  readonly zipPrefixes?: readonly string[];
  readonly postalFsas?: readonly string[];
  readonly frostDates: FrostDates;
}

export type ResolveResult =
  | { status: "matched"; match: RegionalFrostData }
  | { status: "ambiguous"; candidates: RegionalFrostData[] }
  | { status: "unmatched" };

// ─── Parser ──────────────────────────────────────────────────────────────────

const US_STATE_CODES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA",
  colorado: "CO", connecticut: "CT", delaware: "DE", florida: "FL", georgia: "GA",
  hawaii: "HI", idaho: "ID", illinois: "IL", indiana: "IN", iowa: "IA",
  kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO",
  montana: "MT", nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ",
  "new mexico": "NM", "new york": "NY", "north carolina": "NC", "north dakota": "ND", ohio: "OH",
  oklahoma: "OK", oregon: "OR", pennsylvania: "PA", "rhode island": "RI", "south carolina": "SC",
  "south dakota": "SD", tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
  virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
  "district of columbia": "DC",
};

const US_STATE_SET = new Set(Object.values(US_STATE_CODES));

const CA_PROVINCE_CODES: Record<string, string> = {
  alberta: "AB", "british columbia": "BC", manitoba: "MB", "new brunswick": "NB",
  "newfoundland and labrador": "NL", "nova scotia": "NS", "northwest territories": "NT",
  nunavut: "NU", ontario: "ON", "prince edward island": "PE", quebec: "QC", "québec": "QC",
  saskatchewan: "SK", yukon: "YT",
};

const CA_PROVINCE_SET = new Set(Object.values(CA_PROVINCE_CODES));

function normalize(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, " ");
}

function looksLikeCanonicalKey(raw: string): boolean {
  // canonical keys are kebab-case: lowercase letters and digits joined by
  // hyphens, with at least one letter (so ZIP+4 codes like "02101-1234" are
  // not mistaken for keys).
  return /^[a-z0-9]+(?:-[a-z0-9]+)+$/.test(raw) && /[a-z]/.test(raw);
}

export function parseLocationInput(raw: string): ParsedLocation {
  if (!raw || typeof raw !== "string") return { kind: "invalid" };
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { kind: "invalid" };

  // Canonical key (chosen-candidate round-trip from the chooser).
  if (looksLikeCanonicalKey(trimmed)) {
    return { kind: "canonical_key", key: trimmed.toLowerCase() };
  }

  // US ZIP: 5 digits, optionally + 4.
  const usZip = /^(\d{5})(?:-\d{4})?$/.exec(trimmed);
  if (usZip) {
    return { kind: "us_zip", zip: usZip[1], prefix: usZip[1].slice(0, 3) };
  }

  // Canadian postal code: A1A 1A1 or A1A1A1 (case-insensitive).
  const caPostal = /^([A-Za-z]\d[A-Za-z])\s?(\d[A-Za-z]\d)$/.exec(trimmed);
  if (caPostal) {
    const fsa = caPostal[1].toUpperCase();
    return {
      kind: "ca_postal",
      postal: `${fsa} ${caPostal[2].toUpperCase()}`,
      fsa,
    };
  }

  const norm = normalize(trimmed);

  // "City, State" or "City State" — try to find a state/province token.
  const commaSplit = norm.split(/\s*,\s*/);
  if (commaSplit.length >= 2) {
    const city = commaSplit[0].trim();
    const regionRaw = commaSplit.slice(1).join(", ").trim();
    const matchedRegion = matchRegion(regionRaw);
    if (matchedRegion) {
      return { kind: "city_state", city, region: matchedRegion.code, country: matchedRegion.country };
    }
  }

  // No comma — try trailing 2-letter code or full name.
  const trailingCode = /^(.+?)\s+([A-Za-z]{2})$/.exec(norm);
  if (trailingCode) {
    const candidateCode = trailingCode[2].toUpperCase();
    if (US_STATE_SET.has(candidateCode)) {
      return { kind: "city_state", city: trailingCode[1].trim(), region: candidateCode, country: "US" };
    }
    if (CA_PROVINCE_SET.has(candidateCode)) {
      return { kind: "city_state", city: trailingCode[1].trim(), region: candidateCode, country: "CA" };
    }
  }

  // Try matching trailing full state/province name.
  for (const [name, code] of Object.entries(US_STATE_CODES)) {
    if (norm.endsWith(` ${name}`)) {
      return { kind: "city_state", city: norm.slice(0, -name.length - 1).trim(), region: code, country: "US" };
    }
  }
  for (const [name, code] of Object.entries(CA_PROVINCE_CODES)) {
    if (norm.endsWith(` ${name}`)) {
      return { kind: "city_state", city: norm.slice(0, -name.length - 1).trim(), region: code, country: "CA" };
    }
  }

  // Plain city.
  return { kind: "city_only", city: norm };
}

function matchRegion(raw: string): { code: string; country: "US" | "CA" } | null {
  const n = raw.trim().toLowerCase();
  if (n.length === 2) {
    const upper = n.toUpperCase();
    if (US_STATE_SET.has(upper)) return { code: upper, country: "US" };
    if (CA_PROVINCE_SET.has(upper)) return { code: upper, country: "CA" };
  }
  if (US_STATE_CODES[n]) return { code: US_STATE_CODES[n], country: "US" };
  if (CA_PROVINCE_CODES[n]) return { code: CA_PROVINCE_CODES[n], country: "CA" };
  return null;
}

// ─── Dataset ─────────────────────────────────────────────────────────────────
//
// Frost dates are derived from public horticultural sources (USDA, Old Farmer's
// Almanac, Government of Canada). Each entry covers a single climate bucket;
// users typing a city name resolve via aliases, users typing a ZIP/FSA resolve
// via the prefix lists.
//
// V1 scope (per the rubber-duck-reviewed plan): preserve the original 20 city
// entries (now state-tagged), add ~30 more major North-American cities, plus a
// curated set of ZIP-prefix and FSA-prefix entries for common climate regions.
// No automatic state/province fallback — unmatched stays unmatched.

const f = (lastSpringFrost: string, firstFallFrost: string, growingSeasonDays: number): FrostDates =>
  ({ lastSpringFrost, firstFallFrost, growingSeasonDays });

export const REGIONAL_FROST_DATA: readonly RegionalFrostData[] = [
  // ─── US: Northeast ─────────────────────────────────────────────────────────────
  {
    key: "boston-ma",
    displayLabel: "Boston, MA",
    country: "US",
    region: "MA",
    aliases: ["boston", "boston ma", "boston massachusetts"],
    lat: 42.3601,
    lon: -71.0589,
    zipPrefixes: ["021", "022"],
    frostDates: f("April 15", "October 15", 183),
  },
  {
    key: "worcester-ma",
    displayLabel: "Worcester, MA",
    country: "US",
    region: "MA",
    aliases: ["worcester", "worcester ma", "worcester massachusetts"],
    lat: 42.2626,
    lon: -71.8023,
    zipPrefixes: ["016"],
    frostDates: f("May 1", "October 1", 153),
  },
  {
    key: "springfield-ma",
    displayLabel: "Springfield, MA",
    country: "US",
    region: "MA",
    aliases: ["springfield ma", "springfield massachusetts"],
    lat: 42.1015,
    lon: -72.5898,
    zipPrefixes: ["011"],
    frostDates: f("April 25", "October 10", 168),
  },
  {
    key: "new-york-ny",
    displayLabel: "New York, NY",
    country: "US",
    region: "NY",
    aliases: ["new york", "new york ny", "nyc", "new york city", "manhattan"],
    lat: 40.7128,
    lon: -74.006,
    zipPrefixes: ["100", "101", "102", "103", "104"],
    frostDates: f("April 10", "October 25", 198),
  },
  {
    key: "albany-ny",
    displayLabel: "Albany, NY",
    country: "US",
    region: "NY",
    aliases: ["albany", "albany ny", "albany new york"],
    lat: 42.6526,
    lon: -73.7562,
    zipPrefixes: ["122"],
    frostDates: f("May 1", "October 5", 157),
  },
  {
    key: "rochester-ny",
    displayLabel: "Rochester, NY",
    country: "US",
    region: "NY",
    aliases: ["rochester", "rochester ny", "rochester new york"],
    lat: 43.1566,
    lon: -77.6088,
    zipPrefixes: ["146"],
    frostDates: f("May 5", "October 5", 153),
  },
  {
    key: "syracuse-ny",
    displayLabel: "Syracuse, NY",
    country: "US",
    region: "NY",
    aliases: ["syracuse", "syracuse ny", "syracuse new york"],
    lat: 43.0481,
    lon: -76.1474,
    zipPrefixes: ["132"],
    frostDates: f("May 5", "October 5", 153),
  },
  {
    key: "buffalo-ny",
    displayLabel: "Buffalo, NY",
    country: "US",
    region: "NY",
    aliases: ["buffalo", "buffalo ny"],
    lat: 42.8864,
    lon: -78.8784,
    zipPrefixes: ["142"],
    frostDates: f("May 1", "October 5", 157),
  },
  {
    key: "philadelphia-pa",
    displayLabel: "Philadelphia, PA",
    country: "US",
    region: "PA",
    aliases: ["philadelphia", "philly", "philadelphia pa"],
    lat: 39.9526,
    lon: -75.1652,
    zipPrefixes: ["190", "191"],
    frostDates: f("April 5", "October 25", 203),
  },
  {
    key: "pittsburgh-pa",
    displayLabel: "Pittsburgh, PA",
    country: "US",
    region: "PA",
    aliases: ["pittsburgh", "pittsburgh pa"],
    lat: 40.4406,
    lon: -79.9959,
    zipPrefixes: ["152"],
    frostDates: f("April 20", "October 15", 178),
  },
  {
    key: "harrisburg-pa",
    displayLabel: "Harrisburg, PA",
    country: "US",
    region: "PA",
    aliases: ["harrisburg", "harrisburg pa", "harrisburg pennsylvania"],
    lat: 40.2732,
    lon: -76.8867,
    zipPrefixes: ["171"],
    frostDates: f("April 20", "October 20", 183),
  },
  {
    key: "newark-nj",
    displayLabel: "Newark, NJ",
    country: "US",
    region: "NJ",
    aliases: ["newark", "newark nj", "newark new jersey"],
    lat: 40.7357,
    lon: -74.1724,
    zipPrefixes: ["071"],
    frostDates: f("April 15", "October 25", 193),
  },
  {
    key: "jersey-city-nj",
    displayLabel: "Jersey City, NJ",
    country: "US",
    region: "NJ",
    aliases: ["jersey city", "jersey city nj"],
    lat: 40.7178,
    lon: -74.0431,
    zipPrefixes: ["073"],
    frostDates: f("April 10", "October 25", 198),
  },
  {
    key: "trenton-nj",
    displayLabel: "Trenton, NJ",
    country: "US",
    region: "NJ",
    aliases: ["trenton", "trenton nj", "trenton new jersey"],
    lat: 40.2206,
    lon: -74.7597,
    zipPrefixes: ["086"],
    frostDates: f("April 15", "October 20", 188),
  },
  {
    key: "portland-me",
    displayLabel: "Portland, ME",
    country: "US",
    region: "ME",
    aliases: ["portland me", "portland maine"],
    lat: 43.6591,
    lon: -70.2568,
    zipPrefixes: ["041"],
    frostDates: f("May 10", "September 25", 138),
  },
  {
    key: "bangor-me",
    displayLabel: "Bangor, ME",
    country: "US",
    region: "ME",
    aliases: ["bangor", "bangor me", "bangor maine"],
    lat: 44.8016,
    lon: -68.7712,
    zipPrefixes: ["044"],
    frostDates: f("May 20", "September 20", 123),
  },
  {
    key: "burlington-vt",
    displayLabel: "Burlington, VT",
    country: "US",
    region: "VT",
    aliases: ["burlington vt", "burlington vermont"],
    lat: 44.4759,
    lon: -73.2121,
    zipPrefixes: ["054"],
    frostDates: f("May 10", "September 25", 138),
  },
  {
    key: "montpelier-vt",
    displayLabel: "Montpelier, VT",
    country: "US",
    region: "VT",
    aliases: ["montpelier", "montpelier vt", "montpelier vermont"],
    lat: 44.2601,
    lon: -72.5754,
    zipPrefixes: ["056"],
    frostDates: f("May 20", "September 20", 123),
  },
  {
    key: "manchester-nh",
    displayLabel: "Manchester, NH",
    country: "US",
    region: "NH",
    aliases: ["manchester nh", "manchester new hampshire"],
    lat: 42.9956,
    lon: -71.4548,
    zipPrefixes: ["031"],
    frostDates: f("May 5", "October 1", 148),
  },
  {
    key: "concord-nh",
    displayLabel: "Concord, NH",
    country: "US",
    region: "NH",
    aliases: ["concord nh", "concord new hampshire"],
    lat: 43.2081,
    lon: -71.5376,
    zipPrefixes: ["033"],
    frostDates: f("May 15", "September 25", 133),
  },
  {
    key: "providence-ri",
    displayLabel: "Providence, RI",
    country: "US",
    region: "RI",
    aliases: ["providence", "providence ri"],
    lat: 41.824,
    lon: -71.4128,
    zipPrefixes: ["029"],
    frostDates: f("April 15", "October 20", 188),
  },
  {
    key: "hartford-ct",
    displayLabel: "Hartford, CT",
    country: "US",
    region: "CT",
    aliases: ["hartford", "hartford ct"],
    lat: 41.7658,
    lon: -72.6734,
    zipPrefixes: ["061"],
    frostDates: f("April 25", "October 10", 168),
  },
  {
    key: "new-haven-ct",
    displayLabel: "New Haven, CT",
    country: "US",
    region: "CT",
    aliases: ["new haven", "new haven ct", "new haven connecticut"],
    lat: 41.3083,
    lon: -72.9279,
    zipPrefixes: ["065"],
    frostDates: f("April 15", "October 20", 188),
  },

  // ─── US: Mid-Atlantic / Southeast ─────────────────────────────────────────────────────────────
  {
    key: "washington-dc",
    displayLabel: "Washington, DC",
    country: "US",
    region: "DC",
    aliases: ["washington dc", "washington, d.c.", "washington d c", "dc"],
    lat: 38.9072,
    lon: -77.0369,
    zipPrefixes: ["200", "202", "203"],
    frostDates: f("April 5", "November 1", 210),
  },
  {
    key: "baltimore-md",
    displayLabel: "Baltimore, MD",
    country: "US",
    region: "MD",
    aliases: ["baltimore", "baltimore md"],
    lat: 39.2904,
    lon: -76.6122,
    zipPrefixes: ["212"],
    frostDates: f("April 5", "October 30", 208),
  },
  {
    key: "annapolis-md",
    displayLabel: "Annapolis, MD",
    country: "US",
    region: "MD",
    aliases: ["annapolis", "annapolis md", "annapolis maryland"],
    lat: 38.9784,
    lon: -76.4922,
    zipPrefixes: ["214"],
    frostDates: f("April 5", "November 1", 210),
  },
  {
    key: "wilmington-de",
    displayLabel: "Wilmington, DE",
    country: "US",
    region: "DE",
    aliases: ["wilmington de", "wilmington delaware"],
    lat: 39.7391,
    lon: -75.5398,
    zipPrefixes: ["198"],
    frostDates: f("April 10", "October 25", 198),
  },
  {
    key: "richmond-va",
    displayLabel: "Richmond, VA",
    country: "US",
    region: "VA",
    aliases: ["richmond va", "richmond virginia"],
    lat: 37.5407,
    lon: -77.436,
    zipPrefixes: ["232"],
    frostDates: f("April 5", "November 1", 210),
  },
  {
    key: "norfolk-va",
    displayLabel: "Norfolk, VA",
    country: "US",
    region: "VA",
    aliases: ["norfolk", "norfolk va", "norfolk virginia"],
    lat: 36.8508,
    lon: -76.2859,
    zipPrefixes: ["235"],
    frostDates: f("March 25", "November 10", 230),
  },
  {
    key: "virginia-beach-va",
    displayLabel: "Virginia Beach, VA",
    country: "US",
    region: "VA",
    aliases: ["virginia beach", "virginia beach va"],
    lat: 36.8529,
    lon: -75.978,
    zipPrefixes: ["234"],
    frostDates: f("March 25", "November 10", 230),
  },
  {
    key: "alexandria-va",
    displayLabel: "Alexandria, VA",
    country: "US",
    region: "VA",
    aliases: ["alexandria va", "alexandria virginia"],
    lat: 38.8048,
    lon: -77.0469,
    zipPrefixes: ["223"],
    frostDates: f("April 5", "November 1", 210),
  },
  {
    key: "arlington-va",
    displayLabel: "Arlington, VA",
    country: "US",
    region: "VA",
    aliases: ["arlington va", "arlington virginia"],
    lat: 38.8816,
    lon: -77.091,
    zipPrefixes: ["222"],
    frostDates: f("April 5", "November 1", 210),
  },
  {
    key: "charleston-wv",
    displayLabel: "Charleston, WV",
    country: "US",
    region: "WV",
    aliases: ["charleston wv", "charleston west virginia"],
    lat: 38.3498,
    lon: -81.6326,
    zipPrefixes: ["253"],
    frostDates: f("April 20", "October 20", 183),
  },
  {
    key: "raleigh-nc",
    displayLabel: "Raleigh, NC",
    country: "US",
    region: "NC",
    aliases: ["raleigh", "raleigh nc"],
    lat: 35.7796,
    lon: -78.6382,
    zipPrefixes: ["276"],
    frostDates: f("April 5", "November 5", 214),
  },
  {
    key: "charlotte-nc",
    displayLabel: "Charlotte, NC",
    country: "US",
    region: "NC",
    aliases: ["charlotte", "charlotte nc"],
    lat: 35.2271,
    lon: -80.8431,
    zipPrefixes: ["282"],
    frostDates: f("April 5", "November 5", 214),
  },
  {
    key: "greensboro-nc",
    displayLabel: "Greensboro, NC",
    country: "US",
    region: "NC",
    aliases: ["greensboro", "greensboro nc"],
    lat: 36.0726,
    lon: -79.792,
    zipPrefixes: ["274"],
    frostDates: f("April 10", "October 30", 203),
  },
  {
    key: "asheville-nc",
    displayLabel: "Asheville, NC",
    country: "US",
    region: "NC",
    aliases: ["asheville", "asheville nc"],
    lat: 35.5951,
    lon: -82.5515,
    zipPrefixes: ["288"],
    frostDates: f("April 15", "October 25", 193),
  },
  {
    key: "charleston-sc",
    displayLabel: "Charleston, SC",
    country: "US",
    region: "SC",
    aliases: ["charleston sc", "charleston south carolina"],
    lat: 32.7765,
    lon: -79.9311,
    zipPrefixes: ["294"],
    frostDates: f("March 10", "November 20", 255),
  },
  {
    key: "columbia-sc",
    displayLabel: "Columbia, SC",
    country: "US",
    region: "SC",
    aliases: ["columbia sc", "columbia south carolina"],
    lat: 34.0007,
    lon: -81.0348,
    zipPrefixes: ["292"],
    frostDates: f("March 25", "November 10", 230),
  },
  {
    key: "greenville-sc",
    displayLabel: "Greenville, SC",
    country: "US",
    region: "SC",
    aliases: ["greenville sc", "greenville south carolina"],
    lat: 34.8526,
    lon: -82.394,
    zipPrefixes: ["296"],
    frostDates: f("April 1", "November 5", 218),
  },
  {
    key: "atlanta-ga",
    displayLabel: "Atlanta, GA",
    country: "US",
    region: "GA",
    aliases: ["atlanta", "atlanta ga"],
    lat: 33.749,
    lon: -84.388,
    zipPrefixes: ["303"],
    frostDates: f("March 20", "November 10", 235),
  },
  {
    key: "savannah-ga",
    displayLabel: "Savannah, GA",
    country: "US",
    region: "GA",
    aliases: ["savannah", "savannah ga", "savannah georgia"],
    lat: 32.0809,
    lon: -81.0912,
    zipPrefixes: ["314"],
    frostDates: f("March 1", "November 25", 269),
  },
  {
    key: "miami-fl",
    displayLabel: "Miami, FL",
    country: "US",
    region: "FL",
    aliases: ["miami", "miami fl"],
    lat: 25.7617,
    lon: -80.1918,
    zipPrefixes: ["331"],
    frostDates: f("January 1", "December 31", 365),
  },
  {
    key: "orlando-fl",
    displayLabel: "Orlando, FL",
    country: "US",
    region: "FL",
    aliases: ["orlando", "orlando fl"],
    lat: 28.5383,
    lon: -81.3792,
    zipPrefixes: ["328"],
    frostDates: f("February 1", "December 15", 317),
  },
  {
    key: "tampa-fl",
    displayLabel: "Tampa, FL",
    country: "US",
    region: "FL",
    aliases: ["tampa", "tampa fl"],
    lat: 27.9506,
    lon: -82.4572,
    zipPrefixes: ["336"],
    frostDates: f("January 25", "December 20", 329),
  },
  {
    key: "jacksonville-fl",
    displayLabel: "Jacksonville, FL",
    country: "US",
    region: "FL",
    aliases: ["jacksonville", "jacksonville fl"],
    lat: 30.3322,
    lon: -81.6557,
    zipPrefixes: ["322"],
    frostDates: f("February 20", "December 5", 288),
  },
  {
    key: "nashville-tn",
    displayLabel: "Nashville, TN",
    country: "US",
    region: "TN",
    aliases: ["nashville", "nashville tn"],
    lat: 36.1627,
    lon: -86.7816,
    zipPrefixes: ["372"],
    frostDates: f("April 1", "October 25", 207),
  },
  {
    key: "memphis-tn",
    displayLabel: "Memphis, TN",
    country: "US",
    region: "TN",
    aliases: ["memphis", "memphis tn"],
    lat: 35.1495,
    lon: -90.049,
    zipPrefixes: ["381"],
    frostDates: f("March 25", "November 5", 225),
  },
  {
    key: "knoxville-tn",
    displayLabel: "Knoxville, TN",
    country: "US",
    region: "TN",
    aliases: ["knoxville", "knoxville tn"],
    lat: 35.9606,
    lon: -83.9207,
    zipPrefixes: ["379"],
    frostDates: f("April 5", "October 30", 208),
  },
  {
    key: "chattanooga-tn",
    displayLabel: "Chattanooga, TN",
    country: "US",
    region: "TN",
    aliases: ["chattanooga", "chattanooga tn"],
    lat: 35.0456,
    lon: -85.3097,
    zipPrefixes: ["374"],
    frostDates: f("April 1", "November 1", 214),
  },
  {
    key: "louisville-ky",
    displayLabel: "Louisville, KY",
    country: "US",
    region: "KY",
    aliases: ["louisville", "louisville ky"],
    lat: 38.2527,
    lon: -85.7585,
    zipPrefixes: ["402"],
    frostDates: f("April 10", "October 25", 198),
  },
  {
    key: "lexington-ky",
    displayLabel: "Lexington, KY",
    country: "US",
    region: "KY",
    aliases: ["lexington", "lexington ky"],
    lat: 38.0406,
    lon: -84.5037,
    zipPrefixes: ["405"],
    frostDates: f("April 15", "October 20", 188),
  },
  {
    key: "birmingham-al",
    displayLabel: "Birmingham, AL",
    country: "US",
    region: "AL",
    aliases: ["birmingham", "birmingham al", "birmingham alabama"],
    lat: 33.5186,
    lon: -86.8104,
    zipPrefixes: ["352"],
    frostDates: f("March 25", "November 5", 225),
  },
  {
    key: "mobile-al",
    displayLabel: "Mobile, AL",
    country: "US",
    region: "AL",
    aliases: ["mobile al", "mobile alabama"],
    lat: 30.6954,
    lon: -88.0399,
    zipPrefixes: ["366"],
    frostDates: f("February 25", "December 1", 280),
  },
  {
    key: "jackson-ms",
    displayLabel: "Jackson, MS",
    country: "US",
    region: "MS",
    aliases: ["jackson ms", "jackson mississippi"],
    lat: 32.2988,
    lon: -90.1848,
    zipPrefixes: ["392"],
    frostDates: f("March 15", "November 10", 240),
  },

  // ─── US: Midwest ─────────────────────────────────────────────────────────────
  {
    key: "chicago-il",
    displayLabel: "Chicago, IL",
    country: "US",
    region: "IL",
    aliases: ["chicago", "chicago il"],
    lat: 41.8781,
    lon: -87.6298,
    zipPrefixes: ["606"],
    frostDates: f("April 20", "October 10", 173),
  },
  {
    key: "detroit-mi",
    displayLabel: "Detroit, MI",
    country: "US",
    region: "MI",
    aliases: ["detroit", "detroit mi"],
    lat: 42.3314,
    lon: -83.0458,
    zipPrefixes: ["482"],
    frostDates: f("April 25", "October 10", 168),
  },
  {
    key: "grand-rapids-mi",
    displayLabel: "Grand Rapids, MI",
    country: "US",
    region: "MI",
    aliases: ["grand rapids", "grand rapids mi"],
    lat: 42.9634,
    lon: -85.6681,
    zipPrefixes: ["495"],
    frostDates: f("May 5", "October 5", 153),
  },
  {
    key: "ann-arbor-mi",
    displayLabel: "Ann Arbor, MI",
    country: "US",
    region: "MI",
    aliases: ["ann arbor", "ann arbor mi"],
    lat: 42.2808,
    lon: -83.743,
    zipPrefixes: ["481"],
    frostDates: f("May 1", "October 5", 157),
  },
  {
    key: "cleveland-oh",
    displayLabel: "Cleveland, OH",
    country: "US",
    region: "OH",
    aliases: ["cleveland", "cleveland oh"],
    lat: 41.4993,
    lon: -81.6944,
    zipPrefixes: ["441"],
    frostDates: f("April 25", "October 20", 178),
  },
  {
    key: "columbus-oh",
    displayLabel: "Columbus, OH",
    country: "US",
    region: "OH",
    aliases: ["columbus", "columbus oh"],
    lat: 39.9612,
    lon: -82.9988,
    zipPrefixes: ["432"],
    frostDates: f("April 25", "October 15", 173),
  },
  {
    key: "cincinnati-oh",
    displayLabel: "Cincinnati, OH",
    country: "US",
    region: "OH",
    aliases: ["cincinnati", "cincinnati oh"],
    lat: 39.1031,
    lon: -84.512,
    zipPrefixes: ["452"],
    frostDates: f("April 15", "October 20", 188),
  },
  {
    key: "toledo-oh",
    displayLabel: "Toledo, OH",
    country: "US",
    region: "OH",
    aliases: ["toledo", "toledo oh"],
    lat: 41.6528,
    lon: -83.5379,
    zipPrefixes: ["436"],
    frostDates: f("May 1", "October 10", 162),
  },
  {
    key: "indianapolis-in",
    displayLabel: "Indianapolis, IN",
    country: "US",
    region: "IN",
    aliases: ["indianapolis", "indianapolis in", "indy"],
    lat: 39.7684,
    lon: -86.1581,
    zipPrefixes: ["462"],
    frostDates: f("April 20", "October 15", 178),
  },
  {
    key: "minneapolis-mn",
    displayLabel: "Minneapolis, MN",
    country: "US",
    region: "MN",
    aliases: ["minneapolis", "minneapolis mn"],
    lat: 44.9778,
    lon: -93.265,
    zipPrefixes: ["554", "555"],
    frostDates: f("May 1", "October 1", 153),
  },
  {
    key: "milwaukee-wi",
    displayLabel: "Milwaukee, WI",
    country: "US",
    region: "WI",
    aliases: ["milwaukee", "milwaukee wi"],
    lat: 43.0389,
    lon: -87.9065,
    zipPrefixes: ["532"],
    frostDates: f("May 5", "October 5", 153),
  },
  {
    key: "madison-wi",
    displayLabel: "Madison, WI",
    country: "US",
    region: "WI",
    aliases: ["madison wi", "madison wisconsin"],
    lat: 43.0731,
    lon: -89.4012,
    zipPrefixes: ["537"],
    frostDates: f("May 10", "October 1", 144),
  },
  {
    key: "green-bay-wi",
    displayLabel: "Green Bay, WI",
    country: "US",
    region: "WI",
    aliases: ["green bay", "green bay wi"],
    lat: 44.5133,
    lon: -88.0133,
    zipPrefixes: ["543"],
    frostDates: f("May 15", "September 25", 133),
  },
  {
    key: "st-louis-mo",
    displayLabel: "St. Louis, MO",
    country: "US",
    region: "MO",
    aliases: ["st louis", "saint louis", "st. louis", "st louis mo", "saint louis mo"],
    lat: 38.627,
    lon: -90.1994,
    zipPrefixes: ["631"],
    frostDates: f("April 5", "October 20", 198),
  },
  {
    key: "kansas-city-mo",
    displayLabel: "Kansas City, MO",
    country: "US",
    region: "MO",
    aliases: ["kansas city", "kansas city mo", "kc"],
    lat: 39.0997,
    lon: -94.5786,
    zipPrefixes: ["641"],
    frostDates: f("April 15", "October 15", 183),
  },
  {
    key: "springfield-mo",
    displayLabel: "Springfield, MO",
    country: "US",
    region: "MO",
    aliases: ["springfield mo", "springfield missouri"],
    lat: 37.2089,
    lon: -93.2923,
    zipPrefixes: ["658"],
    frostDates: f("April 15", "October 20", 188),
  },
  {
    key: "des-moines-ia",
    displayLabel: "Des Moines, IA",
    country: "US",
    region: "IA",
    aliases: ["des moines", "des moines ia", "des moines iowa"],
    lat: 41.5868,
    lon: -93.625,
    zipPrefixes: ["503"],
    frostDates: f("April 25", "October 10", 168),
  },
  {
    key: "omaha-ne",
    displayLabel: "Omaha, NE",
    country: "US",
    region: "NE",
    aliases: ["omaha", "omaha ne", "omaha nebraska"],
    lat: 41.2565,
    lon: -95.9345,
    zipPrefixes: ["681"],
    frostDates: f("April 25", "October 10", 168),
  },
  {
    key: "lincoln-ne",
    displayLabel: "Lincoln, NE",
    country: "US",
    region: "NE",
    aliases: ["lincoln ne", "lincoln nebraska"],
    lat: 40.8136,
    lon: -96.7026,
    zipPrefixes: ["685"],
    frostDates: f("April 30", "October 5", 158),
  },
  {
    key: "wichita-ks",
    displayLabel: "Wichita, KS",
    country: "US",
    region: "KS",
    aliases: ["wichita", "wichita ks", "wichita kansas"],
    lat: 37.6872,
    lon: -97.3301,
    zipPrefixes: ["672"],
    frostDates: f("April 10", "October 20", 193),
  },
  {
    key: "fargo-nd",
    displayLabel: "Fargo, ND",
    country: "US",
    region: "ND",
    aliases: ["fargo", "fargo nd", "fargo north dakota"],
    lat: 46.8772,
    lon: -96.7898,
    zipPrefixes: ["581"],
    frostDates: f("May 20", "September 20", 123),
  },
  {
    key: "bismarck-nd",
    displayLabel: "Bismarck, ND",
    country: "US",
    region: "ND",
    aliases: ["bismarck", "bismarck nd", "bismarck north dakota"],
    lat: 46.8083,
    lon: -100.7837,
    zipPrefixes: ["585"],
    frostDates: f("May 20", "September 20", 123),
  },
  {
    key: "sioux-falls-sd",
    displayLabel: "Sioux Falls, SD",
    country: "US",
    region: "SD",
    aliases: ["sioux falls", "sioux falls sd"],
    lat: 43.5446,
    lon: -96.7311,
    zipPrefixes: ["571"],
    frostDates: f("May 5", "October 1", 148),
  },
  {
    key: "rapid-city-sd",
    displayLabel: "Rapid City, SD",
    country: "US",
    region: "SD",
    aliases: ["rapid city", "rapid city sd"],
    lat: 44.0805,
    lon: -103.231,
    zipPrefixes: ["577"],
    frostDates: f("May 15", "September 25", 133),
  },

  // ─── US: South / Central ─────────────────────────────────────────────────────────────
  {
    key: "dallas-tx",
    displayLabel: "Dallas, TX",
    country: "US",
    region: "TX",
    aliases: ["dallas", "dallas tx"],
    lat: 32.7767,
    lon: -96.797,
    zipPrefixes: ["752"],
    frostDates: f("March 10", "November 20", 255),
  },
  {
    key: "fort-worth-tx",
    displayLabel: "Fort Worth, TX",
    country: "US",
    region: "TX",
    aliases: ["fort worth", "fort worth tx", "ft worth"],
    lat: 32.7555,
    lon: -97.3308,
    zipPrefixes: ["761"],
    frostDates: f("March 10", "November 20", 255),
  },
  {
    key: "houston-tx",
    displayLabel: "Houston, TX",
    country: "US",
    region: "TX",
    aliases: ["houston", "houston tx"],
    lat: 29.7604,
    lon: -95.3698,
    zipPrefixes: ["770"],
    frostDates: f("February 15", "December 5", 293),
  },
  {
    key: "austin-tx",
    displayLabel: "Austin, TX",
    country: "US",
    region: "TX",
    aliases: ["austin", "austin tx"],
    lat: 30.2672,
    lon: -97.7431,
    zipPrefixes: ["787"],
    frostDates: f("March 1", "November 25", 269),
  },
  {
    key: "san-antonio-tx",
    displayLabel: "San Antonio, TX",
    country: "US",
    region: "TX",
    aliases: ["san antonio", "san antonio tx"],
    lat: 29.4241,
    lon: -98.4936,
    zipPrefixes: ["782"],
    frostDates: f("February 25", "November 30", 278),
  },
  {
    key: "el-paso-tx",
    displayLabel: "El Paso, TX",
    country: "US",
    region: "TX",
    aliases: ["el paso", "el paso tx"],
    lat: 31.7619,
    lon: -106.485,
    zipPrefixes: ["799"],
    frostDates: f("March 15", "November 10", 240),
  },
  {
    key: "lubbock-tx",
    displayLabel: "Lubbock, TX",
    country: "US",
    region: "TX",
    aliases: ["lubbock", "lubbock tx"],
    lat: 33.5779,
    lon: -101.8552,
    zipPrefixes: ["794"],
    frostDates: f("April 10", "November 1", 205),
  },
  {
    key: "corpus-christi-tx",
    displayLabel: "Corpus Christi, TX",
    country: "US",
    region: "TX",
    aliases: ["corpus christi", "corpus christi tx"],
    lat: 27.8006,
    lon: -97.3964,
    zipPrefixes: ["784"],
    frostDates: f("February 10", "December 10", 303),
  },
  {
    key: "oklahoma-city-ok",
    displayLabel: "Oklahoma City, OK",
    country: "US",
    region: "OK",
    aliases: ["oklahoma city", "oklahoma city ok", "okc"],
    lat: 35.4676,
    lon: -97.5164,
    zipPrefixes: ["731"],
    frostDates: f("April 1", "November 1", 214),
  },
  {
    key: "tulsa-ok",
    displayLabel: "Tulsa, OK",
    country: "US",
    region: "OK",
    aliases: ["tulsa", "tulsa ok"],
    lat: 36.154,
    lon: -95.9928,
    zipPrefixes: ["741"],
    frostDates: f("April 1", "November 1", 214),
  },
  {
    key: "little-rock-ar",
    displayLabel: "Little Rock, AR",
    country: "US",
    region: "AR",
    aliases: ["little rock", "little rock ar", "little rock arkansas"],
    lat: 34.7465,
    lon: -92.2896,
    zipPrefixes: ["722"],
    frostDates: f("March 25", "November 5", 225),
  },
  {
    key: "new-orleans-la",
    displayLabel: "New Orleans, LA",
    country: "US",
    region: "LA",
    aliases: ["new orleans", "new orleans la", "nola"],
    lat: 29.9511,
    lon: -90.0715,
    zipPrefixes: ["701"],
    frostDates: f("February 20", "December 5", 288),
  },

  // ─── US: West / Mountain ─────────────────────────────────────────────────────────────
  {
    key: "denver-co",
    displayLabel: "Denver, CO",
    country: "US",
    region: "CO",
    aliases: ["denver", "denver co"],
    lat: 39.7392,
    lon: -104.9903,
    zipPrefixes: ["802"],
    frostDates: f("May 5", "October 5", 153),
  },
  {
    key: "salt-lake-city-ut",
    displayLabel: "Salt Lake City, UT",
    country: "US",
    region: "UT",
    aliases: ["salt lake city", "slc", "salt lake city ut"],
    lat: 40.7608,
    lon: -111.891,
    zipPrefixes: ["841"],
    frostDates: f("May 5", "October 10", 158),
  },
  {
    key: "ogden-ut",
    displayLabel: "Ogden, UT",
    country: "US",
    region: "UT",
    aliases: ["ogden", "ogden ut", "ogden utah"],
    lat: 41.223,
    lon: -111.9738,
    zipPrefixes: ["844"],
    frostDates: f("May 10", "October 5", 148),
  },
  {
    key: "provo-ut",
    displayLabel: "Provo, UT",
    country: "US",
    region: "UT",
    aliases: ["provo", "provo ut", "provo utah"],
    lat: 40.2338,
    lon: -111.6585,
    zipPrefixes: ["846"],
    frostDates: f("May 10", "October 5", 148),
  },
  {
    key: "albuquerque-nm",
    displayLabel: "Albuquerque, NM",
    country: "US",
    region: "NM",
    aliases: ["albuquerque", "albuquerque nm"],
    lat: 35.0844,
    lon: -106.6504,
    zipPrefixes: ["871"],
    frostDates: f("April 15", "October 25", 193),
  },
  {
    key: "santa-fe-nm",
    displayLabel: "Santa Fe, NM",
    country: "US",
    region: "NM",
    aliases: ["santa fe", "santa fe nm"],
    lat: 35.687,
    lon: -105.9378,
    zipPrefixes: ["875"],
    frostDates: f("May 5", "October 10", 158),
  },
  {
    key: "phoenix-az",
    displayLabel: "Phoenix, AZ",
    country: "US",
    region: "AZ",
    aliases: ["phoenix", "phoenix az"],
    lat: 33.4484,
    lon: -112.074,
    zipPrefixes: ["850"],
    frostDates: f("February 5", "December 15", 313),
  },
  {
    key: "tucson-az",
    displayLabel: "Tucson, AZ",
    country: "US",
    region: "AZ",
    aliases: ["tucson", "tucson az"],
    lat: 32.2226,
    lon: -110.9747,
    zipPrefixes: ["857"],
    frostDates: f("February 20", "December 5", 288),
  },
  {
    key: "las-vegas-nv",
    displayLabel: "Las Vegas, NV",
    country: "US",
    region: "NV",
    aliases: ["las vegas", "las vegas nv", "vegas"],
    lat: 36.1699,
    lon: -115.1398,
    zipPrefixes: ["891"],
    frostDates: f("February 20", "November 25", 278),
  },
  {
    key: "reno-nv",
    displayLabel: "Reno, NV",
    country: "US",
    region: "NV",
    aliases: ["reno", "reno nv"],
    lat: 39.5296,
    lon: -119.8138,
    zipPrefixes: ["895"],
    frostDates: f("May 15", "September 25", 133),
  },
  {
    key: "boise-id",
    displayLabel: "Boise, ID",
    country: "US",
    region: "ID",
    aliases: ["boise", "boise id", "boise idaho"],
    lat: 43.615,
    lon: -116.2023,
    zipPrefixes: ["837"],
    frostDates: f("May 1", "October 10", 162),
  },
  {
    key: "billings-mt",
    displayLabel: "Billings, MT",
    country: "US",
    region: "MT",
    aliases: ["billings", "billings mt", "billings montana"],
    lat: 45.7833,
    lon: -108.5007,
    zipPrefixes: ["591"],
    frostDates: f("May 15", "September 20", 128),
  },
  {
    key: "missoula-mt",
    displayLabel: "Missoula, MT",
    country: "US",
    region: "MT",
    aliases: ["missoula", "missoula mt", "missoula montana"],
    lat: 46.8721,
    lon: -113.994,
    zipPrefixes: ["598"],
    frostDates: f("May 20", "September 15", 118),
  },
  {
    key: "cheyenne-wy",
    displayLabel: "Cheyenne, WY",
    country: "US",
    region: "WY",
    aliases: ["cheyenne", "cheyenne wy", "cheyenne wyoming"],
    lat: 41.14,
    lon: -104.8202,
    zipPrefixes: ["820"],
    frostDates: f("May 20", "September 20", 123),
  },
  {
    key: "casper-wy",
    displayLabel: "Casper, WY",
    country: "US",
    region: "WY",
    aliases: ["casper", "casper wy", "casper wyoming"],
    lat: 42.8666,
    lon: -106.3131,
    zipPrefixes: ["826"],
    frostDates: f("May 25", "September 15", 113),
  },

  // ─── US: Pacific ─────────────────────────────────────────────────────────────
  {
    key: "seattle-wa",
    displayLabel: "Seattle, WA",
    country: "US",
    region: "WA",
    aliases: ["seattle", "seattle wa"],
    lat: 47.6062,
    lon: -122.3321,
    zipPrefixes: ["981"],
    frostDates: f("March 15", "November 15", 245),
  },
  {
    key: "tacoma-wa",
    displayLabel: "Tacoma, WA",
    country: "US",
    region: "WA",
    aliases: ["tacoma", "tacoma wa"],
    lat: 47.2529,
    lon: -122.4443,
    zipPrefixes: ["984"],
    frostDates: f("March 25", "November 5", 225),
  },
  {
    key: "spokane-wa",
    displayLabel: "Spokane, WA",
    country: "US",
    region: "WA",
    aliases: ["spokane", "spokane wa"],
    lat: 47.6588,
    lon: -117.426,
    zipPrefixes: ["992"],
    frostDates: f("May 5", "October 5", 153),
  },
  {
    key: "bellingham-wa",
    displayLabel: "Bellingham, WA",
    country: "US",
    region: "WA",
    aliases: ["bellingham", "bellingham wa"],
    lat: 48.7519,
    lon: -122.4787,
    zipPrefixes: ["982"],
    frostDates: f("April 1", "November 1", 214),
  },
  {
    key: "portland-or",
    displayLabel: "Portland, OR",
    country: "US",
    region: "OR",
    aliases: ["portland or", "portland oregon"],
    lat: 45.5152,
    lon: -122.6784,
    zipPrefixes: ["972"],
    frostDates: f("March 25", "November 10", 230),
  },
  {
    key: "eugene-or",
    displayLabel: "Eugene, OR",
    country: "US",
    region: "OR",
    aliases: ["eugene", "eugene or", "eugene oregon"],
    lat: 44.0521,
    lon: -123.0868,
    zipPrefixes: ["974"],
    frostDates: f("April 5", "November 1", 210),
  },
  {
    key: "bend-or",
    displayLabel: "Bend, OR",
    country: "US",
    region: "OR",
    aliases: ["bend", "bend or", "bend oregon"],
    lat: 44.0582,
    lon: -121.3153,
    zipPrefixes: ["977"],
    frostDates: f("June 1", "September 5", 96),
  },
  {
    key: "san-francisco-ca",
    displayLabel: "San Francisco, CA",
    country: "US",
    region: "CA",
    aliases: ["san francisco", "san francisco ca", "sf"],
    lat: 37.7749,
    lon: -122.4194,
    zipPrefixes: ["941"],
    frostDates: f("February 10", "December 10", 303),
  },
  {
    key: "oakland-ca",
    displayLabel: "Oakland, CA",
    country: "US",
    region: "CA",
    aliases: ["oakland", "oakland ca"],
    lat: 37.8044,
    lon: -122.2712,
    zipPrefixes: ["946"],
    frostDates: f("January 30", "December 15", 320),
  },
  {
    key: "san-jose-ca",
    displayLabel: "San Jose, CA",
    country: "US",
    region: "CA",
    aliases: ["san jose", "san jose ca"],
    lat: 37.3382,
    lon: -121.8863,
    zipPrefixes: ["951"],
    frostDates: f("February 5", "December 10", 308),
  },
  {
    key: "los-angeles-ca",
    displayLabel: "Los Angeles, CA",
    country: "US",
    region: "CA",
    aliases: ["los angeles", "los angeles ca", "la"],
    lat: 34.0522,
    lon: -118.2437,
    zipPrefixes: ["900", "901", "902", "903"],
    frostDates: f("February 1", "December 15", 317),
  },
  {
    key: "long-beach-ca",
    displayLabel: "Long Beach, CA",
    country: "US",
    region: "CA",
    aliases: ["long beach", "long beach ca"],
    lat: 33.7701,
    lon: -118.1937,
    zipPrefixes: ["908"],
    frostDates: f("January 25", "December 20", 329),
  },
  {
    key: "san-diego-ca",
    displayLabel: "San Diego, CA",
    country: "US",
    region: "CA",
    aliases: ["san diego", "san diego ca"],
    lat: 32.7157,
    lon: -117.1611,
    zipPrefixes: ["921"],
    frostDates: f("January 15", "December 20", 340),
  },
  {
    key: "sacramento-ca",
    displayLabel: "Sacramento, CA",
    country: "US",
    region: "CA",
    aliases: ["sacramento", "sacramento ca"],
    lat: 38.5816,
    lon: -121.4944,
    zipPrefixes: ["958"],
    frostDates: f("February 25", "November 25", 273),
  },
  {
    key: "fresno-ca",
    displayLabel: "Fresno, CA",
    country: "US",
    region: "CA",
    aliases: ["fresno", "fresno ca"],
    lat: 36.7378,
    lon: -119.7871,
    zipPrefixes: ["937"],
    frostDates: f("February 20", "November 25", 278),
  },
  {
    key: "bakersfield-ca",
    displayLabel: "Bakersfield, CA",
    country: "US",
    region: "CA",
    aliases: ["bakersfield", "bakersfield ca"],
    lat: 35.3733,
    lon: -119.0187,
    zipPrefixes: ["933"],
    frostDates: f("February 15", "November 30", 288),
  },
  {
    key: "anchorage-ak",
    displayLabel: "Anchorage, AK",
    country: "US",
    region: "AK",
    aliases: ["anchorage", "anchorage ak"],
    lat: 61.2181,
    lon: -149.9003,
    zipPrefixes: ["995"],
    frostDates: f("May 20", "September 10", 113),
  },
  {
    key: "honolulu-hi",
    displayLabel: "Honolulu, HI",
    country: "US",
    region: "HI",
    aliases: ["honolulu", "honolulu hi"],
    lat: 21.3099,
    lon: -157.8581,
    zipPrefixes: ["968"],
    frostDates: f("January 1", "December 31", 365),
  },

  // ─── Canada: Ontario ─────────────────────────────────────────────────────────────
  {
    key: "toronto-on",
    displayLabel: "Toronto, ON",
    country: "CA",
    region: "ON",
    aliases: ["toronto", "toronto on", "toronto ontario"],
    lat: 43.6532,
    lon: -79.3832,
    postalFsas: ["M4A", "M4B", "M4C", "M4E", "M4G", "M4H", "M4J", "M4K", "M4L", "M4M", "M4N", "M4P", "M4R", "M4S", "M4T", "M4V", "M4W", "M4X", "M4Y", "M5A", "M5B", "M5C", "M5E", "M5G", "M5H", "M5J", "M5K", "M5L", "M5M", "M5N", "M5P", "M5R", "M5S", "M5T", "M5V", "M5W", "M5X", "M6A", "M6B", "M6C", "M6E", "M6G", "M6H", "M6J", "M6K", "M6L", "M6M", "M6N", "M6P", "M6R", "M6S", "M9A", "M9B", "M9C"],
    frostDates: f("April 30", "October 10", 163),
  },
  {
    key: "ottawa-on",
    displayLabel: "Ottawa, ON",
    country: "CA",
    region: "ON",
    aliases: ["ottawa", "ottawa on", "ottawa ontario"],
    lat: 45.4215,
    lon: -75.6972,
    postalFsas: ["K1A", "K1B", "K1C", "K1G", "K1H", "K1J", "K1K", "K1L", "K1M", "K1N", "K1P", "K1R", "K1S", "K1T", "K1V", "K1W", "K1X", "K1Y", "K1Z", "K2A", "K2B", "K2C", "K2E", "K2G", "K2H", "K2J", "K2K", "K2L", "K2M", "K2P", "K2R", "K2S", "K2T", "K2V", "K2W"],
    frostDates: f("May 10", "September 30", 143),
  },
  {
    key: "hamilton-on",
    displayLabel: "Hamilton, ON",
    country: "CA",
    region: "ON",
    aliases: ["hamilton", "hamilton on", "hamilton ontario"],
    lat: 43.2557,
    lon: -79.8711,
    postalFsas: ["L8E", "L8G", "L8H", "L8J", "L8K", "L8L", "L8M", "L8N", "L8P", "L8R", "L8S", "L8T", "L8V", "L8W", "L9A", "L9B", "L9C"],
    frostDates: f("April 28", "October 15", 170),
  },
  {
    key: "london-on",
    displayLabel: "London, ON",
    country: "CA",
    region: "ON",
    aliases: ["london on", "london ontario"],
    lat: 42.9849,
    lon: -81.2453,
    postalFsas: ["N5V", "N5W", "N5X", "N5Y", "N5Z", "N6A", "N6B", "N6C", "N6E", "N6G", "N6H", "N6J", "N6K", "N6L", "N6M", "N6N", "N6P"],
    frostDates: f("May 5", "October 5", 153),
  },
  {
    key: "kitchener-on",
    displayLabel: "Kitchener, ON",
    country: "CA",
    region: "ON",
    aliases: ["kitchener", "kitchener on", "kitchener ontario"],
    lat: 43.4516,
    lon: -80.4925,
    postalFsas: ["N2A", "N2B", "N2C", "N2E", "N2G", "N2H", "N2K", "N2M", "N2N", "N2P", "N2R"],
    frostDates: f("May 10", "September 30", 143),
  },
  {
    key: "windsor-on",
    displayLabel: "Windsor, ON",
    country: "CA",
    region: "ON",
    aliases: ["windsor", "windsor on", "windsor ontario"],
    lat: 42.3149,
    lon: -83.0364,
    postalFsas: ["N8N", "N8P", "N8R", "N8S", "N8T", "N8V", "N8W", "N8X", "N8Y", "N9A", "N9B", "N9C", "N9E", "N9G", "N9H", "N9J", "N9K"],
    frostDates: f("April 25", "October 20", 178),
  },
  {
    key: "sudbury-on",
    displayLabel: "Sudbury, ON",
    country: "CA",
    region: "ON",
    aliases: ["sudbury", "sudbury on", "greater sudbury"],
    lat: 46.4917,
    lon: -80.993,
    postalFsas: ["P3A", "P3B", "P3C", "P3E", "P3G", "P3L", "P3N", "P3P", "P3Y"],
    frostDates: f("May 25", "September 15", 113),
  },
  {
    key: "thunder-bay-on",
    displayLabel: "Thunder Bay, ON",
    country: "CA",
    region: "ON",
    aliases: ["thunder bay", "thunder bay on"],
    lat: 48.3809,
    lon: -89.2477,
    postalFsas: ["P7A", "P7B", "P7C", "P7E", "P7G", "P7J", "P7K"],
    frostDates: f("May 28", "September 15", 110),
  },

  // ─── Canada: Quebec ─────────────────────────────────────────────────────────────
  {
    key: "montreal-qc",
    displayLabel: "Montréal, QC",
    country: "CA",
    region: "QC",
    aliases: ["montreal", "montréal", "montreal qc", "montréal qc", "montreal quebec", "montréal québec"],
    lat: 45.5017,
    lon: -73.5673,
    postalFsas: ["H1A", "H1B", "H1C", "H1E", "H1G", "H1H", "H1J", "H1K", "H1L", "H1M", "H1N", "H1P", "H1R", "H1S", "H1T", "H1V", "H1W", "H1X", "H1Y", "H1Z", "H2A", "H2B", "H2C", "H2E", "H2G", "H2H", "H2J", "H2K", "H2L", "H2M", "H2N", "H2P", "H2R", "H2S", "H2T", "H2V", "H2W", "H2X", "H2Y", "H2Z", "H3A", "H3B", "H3C", "H3E", "H3G", "H3H", "H3J", "H3K", "H3L", "H3M", "H3N", "H3P", "H3R", "H3S", "H3T", "H3V", "H3W", "H3X", "H3Y", "H3Z", "H4A", "H4B", "H4C", "H4E", "H4G", "H4H", "H4J", "H4K", "H4L", "H4M", "H4N", "H4P", "H4R", "H4S", "H4T", "H4V", "H4W", "H4X", "H4Y", "H4Z"],
    frostDates: f("May 5", "October 5", 153),
  },
  {
    key: "quebec-city-qc",
    displayLabel: "Québec City, QC",
    country: "CA",
    region: "QC",
    aliases: ["quebec city", "québec city", "quebec city qc", "ville de québec"],
    lat: 46.8139,
    lon: -71.208,
    postalFsas: ["G1A", "G1B", "G1C", "G1E", "G1G", "G1H", "G1J", "G1K", "G1L", "G1M", "G1N", "G1P", "G1R", "G1S", "G1T", "G1V", "G1W", "G1X", "G1Y", "G2A", "G2B", "G2C", "G2E", "G2G", "G2J", "G2K", "G2L", "G2M", "G2N"],
    frostDates: f("May 15", "September 25", 133),
  },

  // ─── Canada: Atlantic ─────────────────────────────────────────────────────────────
  {
    key: "halifax-ns",
    displayLabel: "Halifax, NS",
    country: "CA",
    region: "NS",
    aliases: ["halifax", "halifax ns", "halifax nova scotia"],
    lat: 44.6488,
    lon: -63.5752,
    postalFsas: ["B3A", "B3B", "B3E", "B3G", "B3H", "B3J", "B3K", "B3L", "B3M", "B3N", "B3P", "B3R", "B3S", "B3T", "B3V", "B3Z"],
    frostDates: f("May 5", "October 15", 163),
  },
  {
    key: "moncton-nb",
    displayLabel: "Moncton, NB",
    country: "CA",
    region: "NB",
    aliases: ["moncton", "moncton nb", "moncton new brunswick"],
    lat: 46.0878,
    lon: -64.7782,
    postalFsas: ["E1A", "E1B", "E1C", "E1E", "E1G", "E1H"],
    frostDates: f("May 20", "September 25", 128),
  },
  {
    key: "fredericton-nb",
    displayLabel: "Fredericton, NB",
    country: "CA",
    region: "NB",
    aliases: ["fredericton", "fredericton nb", "fredericton new brunswick"],
    lat: 45.9636,
    lon: -66.6431,
    postalFsas: ["E3A", "E3B", "E3C"],
    frostDates: f("May 20", "September 25", 128),
  },
  {
    key: "saint-john-nb",
    displayLabel: "Saint John, NB",
    country: "CA",
    region: "NB",
    aliases: ["saint john", "saint john nb", "saint john new brunswick", "st john nb"],
    lat: 45.2733,
    lon: -66.0633,
    postalFsas: ["E2J", "E2K", "E2L", "E2M", "E2N", "E2P", "E2R", "E2S"],
    frostDates: f("May 15", "October 5", 143),
  },
  {
    key: "st-johns-nl",
    displayLabel: "St. John's, NL",
    country: "CA",
    region: "NL",
    aliases: ["st johns", "st john's", "st johns nl", "st. john's nl", "st. johns", "st johns newfoundland"],
    lat: 47.5615,
    lon: -52.7126,
    postalFsas: ["A1A", "A1B", "A1C", "A1E", "A1G", "A1H"],
    frostDates: f("June 1", "October 5", 126),
  },
  {
    key: "charlottetown-pe",
    displayLabel: "Charlottetown, PE",
    country: "CA",
    region: "PE",
    aliases: ["charlottetown", "charlottetown pe", "charlottetown prince edward island"],
    lat: 46.2382,
    lon: -63.1311,
    postalFsas: ["C1A", "C1B", "C1C", "C1E"],
    frostDates: f("May 20", "October 5", 138),
  },

  // ─── Canada: Prairies ─────────────────────────────────────────────────────────────
  {
    key: "winnipeg-mb",
    displayLabel: "Winnipeg, MB",
    country: "CA",
    region: "MB",
    aliases: ["winnipeg", "winnipeg mb", "winnipeg manitoba"],
    lat: 49.8951,
    lon: -97.1384,
    postalFsas: ["R2C", "R2E", "R2G", "R2H", "R2J", "R2K", "R2L", "R2M", "R2N", "R2P", "R2R", "R2V", "R2W", "R2X", "R2Y", "R3A", "R3B", "R3C", "R3E", "R3G", "R3H", "R3J", "R3K", "R3L", "R3M", "R3N", "R3P", "R3R", "R3T", "R3V", "R3W", "R3X", "R3Y"],
    frostDates: f("May 25", "September 20", 118),
  },
  {
    key: "regina-sk",
    displayLabel: "Regina, SK",
    country: "CA",
    region: "SK",
    aliases: ["regina", "regina sk", "regina saskatchewan"],
    lat: 50.4452,
    lon: -104.6189,
    postalFsas: ["S4N", "S4P", "S4R", "S4S", "S4T", "S4V", "S4W", "S4X", "S4Y", "S4Z"],
    frostDates: f("May 22", "September 12", 113),
  },
  {
    key: "saskatoon-sk",
    displayLabel: "Saskatoon, SK",
    country: "CA",
    region: "SK",
    aliases: ["saskatoon", "saskatoon sk", "saskatoon saskatchewan"],
    lat: 52.1332,
    lon: -106.67,
    postalFsas: ["S7H", "S7J", "S7K", "S7L", "S7M", "S7N", "S7P", "S7R", "S7S", "S7T", "S7V", "S7W"],
    frostDates: f("May 25", "September 10", 108),
  },
  {
    key: "calgary-ab",
    displayLabel: "Calgary, AB",
    country: "CA",
    region: "AB",
    aliases: ["calgary", "calgary ab", "calgary alberta"],
    lat: 51.0447,
    lon: -114.0719,
    postalFsas: ["T1Y", "T2A", "T2B", "T2C", "T2E", "T2G", "T2H", "T2J", "T2K", "T2L", "T2M", "T2N", "T2P", "T2R", "T2S", "T2T", "T2V", "T2W", "T2X", "T2Y", "T2Z", "T3A", "T3B", "T3C", "T3E", "T3G", "T3H", "T3J", "T3K", "T3L", "T3M", "T3N", "T3P", "T3R"],
    frostDates: f("May 25", "September 10", 108),
  },
  {
    key: "edmonton-ab",
    displayLabel: "Edmonton, AB",
    country: "CA",
    region: "AB",
    aliases: ["edmonton", "edmonton ab", "edmonton alberta"],
    lat: 53.5461,
    lon: -113.4938,
    postalFsas: ["T5A", "T5B", "T5C", "T5E", "T5G", "T5H", "T5J", "T5K", "T5L", "T5M", "T5N", "T5P", "T5R", "T5S", "T5T", "T5V", "T5W", "T5X", "T5Y", "T5Z", "T6A", "T6B", "T6C", "T6E", "T6G", "T6H", "T6J", "T6K", "T6L", "T6M", "T6N", "T6P", "T6R", "T6S", "T6T", "T6V", "T6W", "T6X"],
    frostDates: f("May 20", "September 15", 118),
  },

  // ─── Canada: British Columbia ─────────────────────────────────────────────────────────────
  {
    key: "vancouver-bc",
    displayLabel: "Vancouver, BC",
    country: "CA",
    region: "BC",
    aliases: ["vancouver", "vancouver bc", "vancouver british columbia"],
    lat: 49.2827,
    lon: -123.1207,
    postalFsas: ["V5K", "V5L", "V5M", "V5N", "V5P", "V5R", "V5S", "V5T", "V5V", "V5W", "V5X", "V5Y", "V5Z", "V6A", "V6B", "V6C", "V6E", "V6G", "V6H", "V6J", "V6K", "V6L", "V6M", "V6N", "V6P", "V6R", "V6S", "V6T", "V6Z"],
    frostDates: f("March 28", "November 5", 222),
  },
  {
    key: "victoria-bc",
    displayLabel: "Victoria, BC",
    country: "CA",
    region: "BC",
    aliases: ["victoria", "victoria bc"],
    lat: 48.4284,
    lon: -123.3656,
    postalFsas: ["V8N", "V8P", "V8R", "V8S", "V8T", "V8V", "V8W", "V8X", "V8Y", "V8Z", "V9A", "V9B", "V9C", "V9E"],
    frostDates: f("March 20", "November 15", 240),
  },
  {
    key: "kelowna-bc",
    displayLabel: "Kelowna, BC",
    country: "CA",
    region: "BC",
    aliases: ["kelowna", "kelowna bc"],
    lat: 49.888,
    lon: -119.496,
    postalFsas: ["V1P", "V1V", "V1W", "V1X", "V1Y", "V1Z"],
    frostDates: f("April 25", "October 15", 173),
  },
  {
    key: "kamloops-bc",
    displayLabel: "Kamloops, BC",
    country: "CA",
    region: "BC",
    aliases: ["kamloops", "kamloops bc"],
    lat: 50.6745,
    lon: -120.3273,
    postalFsas: ["V2B", "V2C", "V2E", "V2H"],
    frostDates: f("May 5", "October 5", 153),
  },
  {
    key: "prince-george-bc",
    displayLabel: "Prince George, BC",
    country: "CA",
    region: "BC",
    aliases: ["prince george", "prince george bc"],
    lat: 53.9171,
    lon: -122.7497,
    postalFsas: ["V2K", "V2L", "V2M", "V2N"],
    frostDates: f("June 1", "September 5", 96),
  },

  // ─── Canada: North ─────────────────────────────────────────────────────────────
  {
    key: "whitehorse-yt",
    displayLabel: "Whitehorse, YT",
    country: "CA",
    region: "YT",
    aliases: ["whitehorse", "whitehorse yt", "whitehorse yukon"],
    lat: 60.7212,
    lon: -135.0568,
    postalFsas: ["Y1A"],
    frostDates: f("May 30", "September 5", 98),
  },
  {
    key: "yellowknife-nt",
    displayLabel: "Yellowknife, NT",
    country: "CA",
    region: "NT",
    aliases: ["yellowknife", "yellowknife nt", "yellowknife northwest territories"],
    lat: 62.454,
    lon: -114.3718,
    postalFsas: ["X1A"],
    frostDates: f("May 27", "September 12", 108),
  },
  {
    key: "iqaluit-nu",
    displayLabel: "Iqaluit, NU",
    country: "CA",
    region: "NU",
    aliases: ["iqaluit", "iqaluit nu", "iqaluit nunavut"],
    lat: 63.7467,
    lon: -68.517,
    postalFsas: ["X0A"],
    frostDates: f("June 25", "August 25", 61),
  },

  // ─── Notes ─────────────────────────────────────────────────────────────────
  // Multiple entries may share an alias (e.g. "portland" → Portland, OR and
  // Portland, ME). The chooser disambiguates via the city_only path. The
  // lat/lon fields enable a geolocation-based nearest-neighbor lookup.
];

// Sanity check at module load: keys must be unique.
{
  const seen = new Set<string>();
  for (const entry of REGIONAL_FROST_DATA) {
    if (seen.has(entry.key)) {
      throw new Error(`Duplicate location-lookup key: ${entry.key}`);
    }
    seen.add(entry.key);
  }
}

// ─── Resolver ────────────────────────────────────────────────────────────────

function findByKey(key: string): RegionalFrostData | undefined {
  return REGIONAL_FROST_DATA.find((entry) => entry.key === key);
}

function findByCity(city: string, region?: string): RegionalFrostData[] {
  const target = city.trim().toLowerCase();
  if (target.length === 0) return [];
  return REGIONAL_FROST_DATA.filter((entry) => {
    const cityMatches = entry.aliases.some(
      (alias) => alias === target || alias.startsWith(`${target} `),
    );
    if (!cityMatches) return false;
    if (region && entry.region !== region) return false;
    return true;
  });
}

function findByZipPrefix(prefix: string): RegionalFrostData | undefined {
  return REGIONAL_FROST_DATA.find((entry) => entry.zipPrefixes?.includes(prefix));
}

function findByFsa(fsa: string): RegionalFrostData | undefined {
  return REGIONAL_FROST_DATA.find((entry) => entry.postalFsas?.includes(fsa));
}

export function resolveLocation(raw: string): ResolveResult {
  const parsed = parseLocationInput(raw);
  switch (parsed.kind) {
    case "invalid":
      return { status: "unmatched" };
    case "canonical_key": {
      const match = findByKey(parsed.key);
      return match ? { status: "matched", match } : { status: "unmatched" };
    }
    case "us_zip": {
      const match = findByZipPrefix(parsed.prefix);
      return match ? { status: "matched", match } : { status: "unmatched" };
    }
    case "ca_postal": {
      const match = findByFsa(parsed.fsa);
      return match ? { status: "matched", match } : { status: "unmatched" };
    }
    case "city_state": {
      const matches = findByCity(parsed.city, parsed.region);
      if (matches.length === 1) return { status: "matched", match: matches[0] };
      if (matches.length === 0) return { status: "unmatched" };
      return { status: "ambiguous", candidates: matches.slice(0, 5) };
    }
    case "city_only": {
      const matches = findByCity(parsed.city);
      if (matches.length === 0) return { status: "unmatched" };
      if (matches.length === 1) return { status: "matched", match: matches[0] };
      return { status: "ambiguous", candidates: matches.slice(0, 5) };
    }
  }
}

// ─── Backfill helper (used by getSettings) ───────────────────────────────────

export function tryBackfillResolvedLocation(savedLocation: string): RegionalFrostData | null {
  const result = resolveLocation(savedLocation);
  return result.status === "matched" ? result.match : null;
}

// ─── Geolocation: nearest-neighbor lookup by lat/lon ─────────────────────────

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Great-circle distance between two points in kilometers (haversine).
 */
function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export interface NearestRegionResult {
  match: RegionalFrostData;
  distanceKm: number;
}

/**
 * Resolve a coordinate pair to the closest bundled climate region using
 * great-circle distance. Used by the "Use my location" button when the
 * browser supplies lat/lon. Returns `null` only on invalid coordinates;
 * with 150+ bundled entries covering all of North America there will
 * always be some nearest neighbor for valid inputs.
 */
export function resolveByCoordinates(lat: number, lon: number): NearestRegionResult | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  if (REGIONAL_FROST_DATA.length === 0) return null;

  let bestMatch = REGIONAL_FROST_DATA[0];
  let bestDistance = distanceKm(lat, lon, bestMatch.lat, bestMatch.lon);
  for (let i = 1; i < REGIONAL_FROST_DATA.length; i++) {
    const entry = REGIONAL_FROST_DATA[i];
    const d = distanceKm(lat, lon, entry.lat, entry.lon);
    if (d < bestDistance) {
      bestDistance = d;
      bestMatch = entry;
    }
  }
  return { match: bestMatch, distanceKm: bestDistance };
}
