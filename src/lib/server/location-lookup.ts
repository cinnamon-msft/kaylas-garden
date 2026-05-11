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
  // ─── US: Northeast ─────────────────────────────────────────────────────────
  {
    key: "boston-ma",
    displayLabel: "Boston, MA",
    country: "US",
    region: "MA",
    aliases: ["boston", "boston ma", "boston massachusetts"],
    zipPrefixes: ["021", "022"],
    frostDates: f("April 15", "October 15", 183),
  },
  {
    key: "new-york-ny",
    displayLabel: "New York, NY",
    country: "US",
    region: "NY",
    aliases: ["new york", "new york ny", "nyc", "new york city", "manhattan"],
    zipPrefixes: ["100", "101", "102", "103", "104"],
    frostDates: f("April 10", "October 25", 198),
  },
  {
    key: "philadelphia-pa",
    displayLabel: "Philadelphia, PA",
    country: "US",
    region: "PA",
    aliases: ["philadelphia", "philly", "philadelphia pa"],
    zipPrefixes: ["190", "191"],
    frostDates: f("April 5", "October 25", 203),
  },
  {
    key: "pittsburgh-pa",
    displayLabel: "Pittsburgh, PA",
    country: "US",
    region: "PA",
    aliases: ["pittsburgh", "pittsburgh pa"],
    zipPrefixes: ["152"],
    frostDates: f("April 20", "October 15", 178),
  },
  {
    key: "portland-me",
    displayLabel: "Portland, ME",
    country: "US",
    region: "ME",
    aliases: ["portland me", "portland maine"],
    zipPrefixes: ["041"],
    frostDates: f("May 10", "September 25", 138),
  },
  {
    key: "burlington-vt",
    displayLabel: "Burlington, VT",
    country: "US",
    region: "VT",
    aliases: ["burlington vt", "burlington vermont"],
    zipPrefixes: ["054"],
    frostDates: f("May 10", "September 25", 138),
  },
  {
    key: "buffalo-ny",
    displayLabel: "Buffalo, NY",
    country: "US",
    region: "NY",
    aliases: ["buffalo", "buffalo ny"],
    zipPrefixes: ["142"],
    frostDates: f("May 1", "October 5", 157),
  },
  {
    key: "providence-ri",
    displayLabel: "Providence, RI",
    country: "US",
    region: "RI",
    aliases: ["providence", "providence ri"],
    zipPrefixes: ["029"],
    frostDates: f("April 15", "October 20", 188),
  },
  {
    key: "hartford-ct",
    displayLabel: "Hartford, CT",
    country: "US",
    region: "CT",
    aliases: ["hartford", "hartford ct"],
    zipPrefixes: ["061"],
    frostDates: f("April 25", "October 10", 168),
  },

  // ─── US: Mid-Atlantic / Southeast ──────────────────────────────────────────
  {
    key: "washington-dc",
    displayLabel: "Washington, DC",
    country: "US",
    region: "DC",
    aliases: ["washington dc", "washington, d.c.", "washington d c", "dc"],
    zipPrefixes: ["200", "202", "203"],
    frostDates: f("April 5", "November 1", 210),
  },
  {
    key: "baltimore-md",
    displayLabel: "Baltimore, MD",
    country: "US",
    region: "MD",
    aliases: ["baltimore", "baltimore md"],
    zipPrefixes: ["212"],
    frostDates: f("April 5", "October 30", 208),
  },
  {
    key: "richmond-va",
    displayLabel: "Richmond, VA",
    country: "US",
    region: "VA",
    aliases: ["richmond va", "richmond virginia"],
    zipPrefixes: ["232"],
    frostDates: f("April 5", "November 1", 210),
  },
  {
    key: "raleigh-nc",
    displayLabel: "Raleigh, NC",
    country: "US",
    region: "NC",
    aliases: ["raleigh", "raleigh nc"],
    zipPrefixes: ["276"],
    frostDates: f("April 5", "November 5", 214),
  },
  {
    key: "charlotte-nc",
    displayLabel: "Charlotte, NC",
    country: "US",
    region: "NC",
    aliases: ["charlotte", "charlotte nc"],
    zipPrefixes: ["282"],
    frostDates: f("April 5", "November 5", 214),
  },
  {
    key: "atlanta-ga",
    displayLabel: "Atlanta, GA",
    country: "US",
    region: "GA",
    aliases: ["atlanta", "atlanta ga"],
    zipPrefixes: ["303"],
    frostDates: f("March 20", "November 10", 235),
  },
  {
    key: "miami-fl",
    displayLabel: "Miami, FL",
    country: "US",
    region: "FL",
    aliases: ["miami", "miami fl"],
    zipPrefixes: ["331"],
    frostDates: f("January 1", "December 31", 365),
  },
  {
    key: "orlando-fl",
    displayLabel: "Orlando, FL",
    country: "US",
    region: "FL",
    aliases: ["orlando", "orlando fl"],
    zipPrefixes: ["328"],
    frostDates: f("February 1", "December 15", 317),
  },
  {
    key: "nashville-tn",
    displayLabel: "Nashville, TN",
    country: "US",
    region: "TN",
    aliases: ["nashville", "nashville tn"],
    zipPrefixes: ["372"],
    frostDates: f("April 1", "October 25", 207),
  },

  // ─── US: Midwest ───────────────────────────────────────────────────────────
  {
    key: "chicago-il",
    displayLabel: "Chicago, IL",
    country: "US",
    region: "IL",
    aliases: ["chicago", "chicago il"],
    zipPrefixes: ["606"],
    frostDates: f("April 20", "October 10", 173),
  },
  {
    key: "detroit-mi",
    displayLabel: "Detroit, MI",
    country: "US",
    region: "MI",
    aliases: ["detroit", "detroit mi"],
    zipPrefixes: ["482"],
    frostDates: f("April 25", "October 10", 168),
  },
  {
    key: "cleveland-oh",
    displayLabel: "Cleveland, OH",
    country: "US",
    region: "OH",
    aliases: ["cleveland", "cleveland oh"],
    zipPrefixes: ["441"],
    frostDates: f("April 25", "October 20", 178),
  },
  {
    key: "columbus-oh",
    displayLabel: "Columbus, OH",
    country: "US",
    region: "OH",
    aliases: ["columbus", "columbus oh"],
    zipPrefixes: ["432"],
    frostDates: f("April 25", "October 15", 173),
  },
  {
    key: "indianapolis-in",
    displayLabel: "Indianapolis, IN",
    country: "US",
    region: "IN",
    aliases: ["indianapolis", "indianapolis in", "indy"],
    zipPrefixes: ["462"],
    frostDates: f("April 20", "October 15", 178),
  },
  {
    key: "minneapolis-mn",
    displayLabel: "Minneapolis, MN",
    country: "US",
    region: "MN",
    aliases: ["minneapolis", "minneapolis mn"],
    zipPrefixes: ["554", "555"],
    frostDates: f("May 1", "October 1", 153),
  },
  {
    key: "milwaukee-wi",
    displayLabel: "Milwaukee, WI",
    country: "US",
    region: "WI",
    aliases: ["milwaukee", "milwaukee wi"],
    zipPrefixes: ["532"],
    frostDates: f("May 5", "October 5", 153),
  },
  {
    key: "st-louis-mo",
    displayLabel: "St. Louis, MO",
    country: "US",
    region: "MO",
    aliases: ["st louis", "saint louis", "st. louis", "st louis mo", "saint louis mo"],
    zipPrefixes: ["631"],
    frostDates: f("April 5", "October 20", 198),
  },
  {
    key: "kansas-city-mo",
    displayLabel: "Kansas City, MO",
    country: "US",
    region: "MO",
    aliases: ["kansas city", "kansas city mo", "kc"],
    zipPrefixes: ["641"],
    frostDates: f("April 15", "October 15", 183),
  },

  // ─── US: South / Central ───────────────────────────────────────────────────
  {
    key: "dallas-tx",
    displayLabel: "Dallas, TX",
    country: "US",
    region: "TX",
    aliases: ["dallas", "dallas tx"],
    zipPrefixes: ["752"],
    frostDates: f("March 10", "November 20", 255),
  },
  {
    key: "houston-tx",
    displayLabel: "Houston, TX",
    country: "US",
    region: "TX",
    aliases: ["houston", "houston tx"],
    zipPrefixes: ["770"],
    frostDates: f("February 15", "December 5", 293),
  },
  {
    key: "austin-tx",
    displayLabel: "Austin, TX",
    country: "US",
    region: "TX",
    aliases: ["austin", "austin tx"],
    zipPrefixes: ["787"],
    frostDates: f("March 1", "November 25", 269),
  },
  {
    key: "san-antonio-tx",
    displayLabel: "San Antonio, TX",
    country: "US",
    region: "TX",
    aliases: ["san antonio", "san antonio tx"],
    zipPrefixes: ["782"],
    frostDates: f("February 25", "November 30", 278),
  },
  {
    key: "oklahoma-city-ok",
    displayLabel: "Oklahoma City, OK",
    country: "US",
    region: "OK",
    aliases: ["oklahoma city", "oklahoma city ok", "okc"],
    zipPrefixes: ["731"],
    frostDates: f("April 1", "November 1", 214),
  },
  {
    key: "new-orleans-la",
    displayLabel: "New Orleans, LA",
    country: "US",
    region: "LA",
    aliases: ["new orleans", "new orleans la", "nola"],
    zipPrefixes: ["701"],
    frostDates: f("February 20", "December 5", 288),
  },

  // ─── US: West / Mountain ───────────────────────────────────────────────────
  {
    key: "denver-co",
    displayLabel: "Denver, CO",
    country: "US",
    region: "CO",
    aliases: ["denver", "denver co"],
    zipPrefixes: ["802"],
    frostDates: f("May 5", "October 5", 153),
  },
  {
    key: "salt-lake-city-ut",
    displayLabel: "Salt Lake City, UT",
    country: "US",
    region: "UT",
    aliases: ["salt lake city", "slc", "salt lake city ut"],
    zipPrefixes: ["841"],
    frostDates: f("May 5", "October 10", 158),
  },
  {
    key: "albuquerque-nm",
    displayLabel: "Albuquerque, NM",
    country: "US",
    region: "NM",
    aliases: ["albuquerque", "albuquerque nm"],
    zipPrefixes: ["871"],
    frostDates: f("April 15", "October 25", 193),
  },
  {
    key: "phoenix-az",
    displayLabel: "Phoenix, AZ",
    country: "US",
    region: "AZ",
    aliases: ["phoenix", "phoenix az"],
    zipPrefixes: ["850"],
    frostDates: f("February 5", "December 15", 313),
  },
  {
    key: "tucson-az",
    displayLabel: "Tucson, AZ",
    country: "US",
    region: "AZ",
    aliases: ["tucson", "tucson az"],
    zipPrefixes: ["857"],
    frostDates: f("February 20", "December 5", 288),
  },
  {
    key: "las-vegas-nv",
    displayLabel: "Las Vegas, NV",
    country: "US",
    region: "NV",
    aliases: ["las vegas", "las vegas nv", "vegas"],
    zipPrefixes: ["891"],
    frostDates: f("February 20", "November 25", 278),
  },

  // ─── US: Pacific ───────────────────────────────────────────────────────────
  {
    key: "seattle-wa",
    displayLabel: "Seattle, WA",
    country: "US",
    region: "WA",
    aliases: ["seattle", "seattle wa"],
    zipPrefixes: ["981"],
    frostDates: f("March 15", "November 15", 245),
  },
  {
    key: "portland-or",
    displayLabel: "Portland, OR",
    country: "US",
    region: "OR",
    aliases: ["portland or", "portland oregon"],
    zipPrefixes: ["972"],
    frostDates: f("March 25", "November 10", 230),
  },
  {
    key: "san-francisco-ca",
    displayLabel: "San Francisco, CA",
    country: "US",
    region: "CA",
    aliases: ["san francisco", "san francisco ca", "sf"],
    zipPrefixes: ["941"],
    frostDates: f("February 10", "December 10", 303),
  },
  {
    key: "los-angeles-ca",
    displayLabel: "Los Angeles, CA",
    country: "US",
    region: "CA",
    aliases: ["los angeles", "los angeles ca", "la"],
    zipPrefixes: ["900", "901", "902", "903"],
    frostDates: f("February 1", "December 15", 317),
  },
  {
    key: "san-diego-ca",
    displayLabel: "San Diego, CA",
    country: "US",
    region: "CA",
    aliases: ["san diego", "san diego ca"],
    zipPrefixes: ["921"],
    frostDates: f("January 15", "December 20", 340),
  },
  {
    key: "sacramento-ca",
    displayLabel: "Sacramento, CA",
    country: "US",
    region: "CA",
    aliases: ["sacramento", "sacramento ca"],
    zipPrefixes: ["958"],
    frostDates: f("February 25", "November 25", 273),
  },
  {
    key: "anchorage-ak",
    displayLabel: "Anchorage, AK",
    country: "US",
    region: "AK",
    aliases: ["anchorage", "anchorage ak"],
    zipPrefixes: ["995"],
    frostDates: f("May 20", "September 10", 113),
  },
  {
    key: "honolulu-hi",
    displayLabel: "Honolulu, HI",
    country: "US",
    region: "HI",
    aliases: ["honolulu", "honolulu hi"],
    zipPrefixes: ["968"],
    frostDates: f("January 1", "December 31", 365),
  },

  // ─── Canada ────────────────────────────────────────────────────────────────
  {
    key: "toronto-on",
    displayLabel: "Toronto, ON",
    country: "CA",
    region: "ON",
    aliases: ["toronto", "toronto on", "toronto ontario"],
    postalFsas: ["M4A", "M4B", "M4C", "M4E", "M4G", "M4H", "M4J", "M4K", "M4L", "M4M", "M4N", "M4P", "M4R", "M4S", "M4T", "M4V", "M4W", "M4X", "M4Y", "M5A", "M5B", "M5C", "M5E", "M5G", "M5H", "M5J", "M5K", "M5L", "M5M", "M5N", "M5P", "M5R", "M5S", "M5T", "M5V", "M5W", "M5X", "M6A", "M6B", "M6C", "M6E", "M6G", "M6H", "M6J", "M6K", "M6L", "M6M", "M6N", "M6P", "M6R", "M6S", "M9A", "M9B", "M9C"],
    frostDates: f("April 30", "October 10", 163),
  },
  {
    key: "ottawa-on",
    displayLabel: "Ottawa, ON",
    country: "CA",
    region: "ON",
    aliases: ["ottawa", "ottawa on", "ottawa ontario"],
    postalFsas: ["K1A", "K1B", "K1C", "K1G", "K1H", "K1J", "K1K", "K1L", "K1M", "K1N", "K1P", "K1R", "K1S", "K1T", "K1V", "K1W", "K1X", "K1Y", "K1Z", "K2A", "K2B", "K2C", "K2E", "K2G", "K2H", "K2J", "K2K", "K2L", "K2M", "K2P", "K2R", "K2S", "K2T", "K2V", "K2W"],
    frostDates: f("May 10", "September 30", 143),
  },
  {
    key: "montreal-qc",
    displayLabel: "Montréal, QC",
    country: "CA",
    region: "QC",
    aliases: ["montreal", "montréal", "montreal qc", "montréal qc", "montreal quebec", "montréal québec"],
    postalFsas: ["H1A", "H1B", "H1C", "H1E", "H1G", "H1H", "H1J", "H1K", "H1L", "H1M", "H1N", "H1P", "H1R", "H1S", "H1T", "H1V", "H1W", "H1X", "H1Y", "H1Z", "H2A", "H2B", "H2C", "H2E", "H2G", "H2H", "H2J", "H2K", "H2L", "H2M", "H2N", "H2P", "H2R", "H2S", "H2T", "H2V", "H2W", "H2X", "H2Y", "H2Z", "H3A", "H3B", "H3C", "H3E", "H3G", "H3H", "H3J", "H3K", "H3L", "H3M", "H3N", "H3P", "H3R", "H3S", "H3T", "H3V", "H3W", "H3X", "H3Y", "H3Z", "H4A", "H4B", "H4C", "H4E", "H4G", "H4H", "H4J", "H4K", "H4L", "H4M", "H4N", "H4P", "H4R", "H4S", "H4T", "H4V", "H4W", "H4X", "H4Y", "H4Z"],
    frostDates: f("May 5", "October 5", 153),
  },
  {
    key: "quebec-city-qc",
    displayLabel: "Québec City, QC",
    country: "CA",
    region: "QC",
    aliases: ["quebec city", "québec city", "quebec city qc", "ville de québec"],
    postalFsas: ["G1A", "G1B", "G1C", "G1E", "G1G", "G1H", "G1J", "G1K", "G1L", "G1M", "G1N", "G1P", "G1R", "G1S", "G1T", "G1V", "G1W", "G1X", "G1Y", "G2A", "G2B", "G2C", "G2E", "G2G", "G2J", "G2K", "G2L", "G2M", "G2N"],
    frostDates: f("May 15", "September 25", 133),
  },
  {
    key: "halifax-ns",
    displayLabel: "Halifax, NS",
    country: "CA",
    region: "NS",
    aliases: ["halifax", "halifax ns", "halifax nova scotia"],
    postalFsas: ["B3A", "B3B", "B3E", "B3G", "B3H", "B3J", "B3K", "B3L", "B3M", "B3N", "B3P", "B3R", "B3S", "B3T", "B3V", "B3Z"],
    frostDates: f("May 5", "October 15", 163),
  },
  {
    key: "winnipeg-mb",
    displayLabel: "Winnipeg, MB",
    country: "CA",
    region: "MB",
    aliases: ["winnipeg", "winnipeg mb", "winnipeg manitoba"],
    postalFsas: ["R2C", "R2E", "R2G", "R2H", "R2J", "R2K", "R2L", "R2M", "R2N", "R2P", "R2R", "R2V", "R2W", "R2X", "R2Y", "R3A", "R3B", "R3C", "R3E", "R3G", "R3H", "R3J", "R3K", "R3L", "R3M", "R3N", "R3P", "R3R", "R3T", "R3V", "R3W", "R3X", "R3Y"],
    frostDates: f("May 25", "September 20", 118),
  },
  {
    key: "calgary-ab",
    displayLabel: "Calgary, AB",
    country: "CA",
    region: "AB",
    aliases: ["calgary", "calgary ab", "calgary alberta"],
    postalFsas: ["T1Y", "T2A", "T2B", "T2C", "T2E", "T2G", "T2H", "T2J", "T2K", "T2L", "T2M", "T2N", "T2P", "T2R", "T2S", "T2T", "T2V", "T2W", "T2X", "T2Y", "T2Z", "T3A", "T3B", "T3C", "T3E", "T3G", "T3H", "T3J", "T3K", "T3L", "T3M", "T3N", "T3P", "T3R"],
    frostDates: f("May 25", "September 10", 108),
  },
  {
    key: "edmonton-ab",
    displayLabel: "Edmonton, AB",
    country: "CA",
    region: "AB",
    aliases: ["edmonton", "edmonton ab", "edmonton alberta"],
    postalFsas: ["T5A", "T5B", "T5C", "T5E", "T5G", "T5H", "T5J", "T5K", "T5L", "T5M", "T5N", "T5P", "T5R", "T5S", "T5T", "T5V", "T5W", "T5X", "T5Y", "T5Z", "T6A", "T6B", "T6C", "T6E", "T6G", "T6H", "T6J", "T6K", "T6L", "T6M", "T6N", "T6P", "T6R", "T6S", "T6T", "T6V", "T6W", "T6X"],
    frostDates: f("May 20", "September 15", 118),
  },
  {
    key: "vancouver-bc",
    displayLabel: "Vancouver, BC",
    country: "CA",
    region: "BC",
    aliases: ["vancouver", "vancouver bc", "vancouver british columbia"],
    postalFsas: ["V5K", "V5L", "V5M", "V5N", "V5P", "V5R", "V5S", "V5T", "V5V", "V5W", "V5X", "V5Y", "V5Z", "V6A", "V6B", "V6C", "V6E", "V6G", "V6H", "V6J", "V6K", "V6L", "V6M", "V6N", "V6P", "V6R", "V6S", "V6T", "V6Z"],
    frostDates: f("March 28", "November 5", 222),
  },
  {
    key: "victoria-bc",
    displayLabel: "Victoria, BC",
    country: "CA",
    region: "BC",
    aliases: ["victoria", "victoria bc"],
    postalFsas: ["V8N", "V8P", "V8R", "V8S", "V8T", "V8V", "V8W", "V8X", "V8Y", "V8Z", "V9A", "V9B", "V9C", "V9E"],
    frostDates: f("March 20", "November 15", 240),
  },

  // ─── Catch-all city overrides for the multi-Portland chooser case ─────────
  // (Portland, OR and Portland, ME are both first-class entries above; this
  //  block is intentionally empty — the chooser falls out of the `aliases`
  //  scan because two distinct keys list "portland" as an alias.)
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
