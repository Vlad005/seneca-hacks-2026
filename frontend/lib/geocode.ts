import type { GeocodedAddress } from "./types";

/**
 * Geocode a free-form address via Mapbox. Returns null if no result.
 * Limited to Canada to reduce false hits on ambiguous street names.
 */
export async function geocodeAddress(
  query: string,
): Promise<GeocodedAddress | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    console.warn("[geocode] NEXT_PUBLIC_MAPBOX_TOKEN missing");
    return null;
  }
  if (!query.trim()) return null;

  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
    `?access_token=${token}&country=CA&limit=1&types=address,postcode`;

  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature?.center) return null;
    const [lon, lat] = feature.center as [number, number];
    return { lat, lon, query };
  } catch (e) {
    console.warn("[geocode] fetch failed", e);
    return null;
  }
}
