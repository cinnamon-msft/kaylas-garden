// Server-only geocoding fallback using Nominatim (OpenStreetMap).
//
// Nominatim is the free, no-API-key geocoder run by the OSM foundation.
// We use it ONLY as a fallback when the user's input doesn't match any
// entry in our bundled REGIONAL_FROST_DATA table. The geocoded lat/lon
// is then mapped to the nearest known climate region via
// `resolveByCoordinates`, so frost data still comes from our curated
// dataset.
//
// Usage policy (https://operations.osmfoundation.org/policies/nominatim/):
//   - Max ~1 request/second per IP
//   - Must send a meaningful User-Agent (we send the app name + URL)
//   - Must cache results client-side (we do — in-process Map, no persistence)
//   - No bulk/heavy commercial use
//
// Disable by setting NOMINATIM_ENABLED=false in the environment.

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org/search";
const USER_AGENT = "KaylasGarden/1.0 (https://github.com/cinnamon-msft/kaylas-garden)";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h — coords don't change
const MAX_CACHE_ENTRIES = 500;
const REQUEST_TIMEOUT_MS = 5000;

interface CacheEntry {
  value: GeocodeResult | null;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

export interface GeocodeResult {
  lat: number;
  lon: number;
  displayName: string;
}

function cacheKey(query: string): string {
  return query.trim().toLowerCase();
}

function pruneCache(): void {
  if (cache.size <= MAX_CACHE_ENTRIES) return;
  // Drop the oldest 20% of entries to keep amortized cost low.
  const toDrop = Math.ceil(MAX_CACHE_ENTRIES * 0.2);
  let dropped = 0;
  for (const key of cache.keys()) {
    cache.delete(key);
    if (++dropped >= toDrop) break;
  }
}

function isEnabled(): boolean {
  return process.env["NOMINATIM_ENABLED"] !== "false";
}

/**
 * Geocode a free-form location string via Nominatim. Returns `null` when:
 *   - The feature is disabled via NOMINATIM_ENABLED=false
 *   - The request fails or times out
 *   - Nominatim returns no results
 *
 * Results are cached in process memory for 24 hours.
 *
 * Restricts results to US/CA by default, matching the scope of the bundled
 * REGIONAL_FROST_DATA table.
 */
export async function geocodeWithNominatim(rawQuery: string): Promise<GeocodeResult | null> {
  if (!isEnabled()) return null;
  const query = rawQuery.trim();
  if (query.length === 0) return null;

  const key = cacheKey(query);
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const url = new URL(NOMINATIM_BASE);
  url.searchParams.set("q", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us,ca");
  url.searchParams.set("addressdetails", "0");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      cache.set(key, { value: null, expiresAt: Date.now() + 60_000 }); // 1m negative cache
      return null;
    }
    const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
    if (!Array.isArray(data) || data.length === 0) {
      cache.set(key, { value: null, expiresAt: Date.now() + CACHE_TTL_MS });
      pruneCache();
      return null;
    }
    const first = data[0];
    const lat = Number(first.lat);
    const lon = Number(first.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
      return null;
    }
    const result: GeocodeResult = { lat, lon, displayName: first.display_name };
    cache.set(key, { value: result, expiresAt: Date.now() + CACHE_TTL_MS });
    pruneCache();
    return result;
  } catch (err) {
    // Network failure, timeout, or JSON parse error. Negative-cache briefly so
    // we don't hammer the upstream service.
    console.warn("Nominatim geocoding failed:", err instanceof Error ? err.message : err);
    cache.set(key, { value: null, expiresAt: Date.now() + 60_000 });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Test/maintenance helper: drop all cached entries. */
export function _clearGeocodingCache(): void {
  cache.clear();
}
