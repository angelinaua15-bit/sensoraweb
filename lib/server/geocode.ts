// FILE PATH: lib/server/geocode.ts
// Turns a free-text birth place ("Kyiv, Ukraine") into real coordinates, so
// the natal chart engine (lib/astro-calc.ts) can compute a real Ascendant
// and houses instead of leaving them permanently unavailable. Uses the free
// OpenStreetMap Nominatim API — no API key required, which matters here
// since this sandbox has no way to install a paid geocoding SDK or store a
// billed API key. Nominatim's usage policy requires a real identifying
// User-Agent and asks callers not to hammer it — this is only ever called
// once per birth-place edit (see setBirthInfo in lib/server/db.ts), not on
// every page load, so that's respected by construction.
//
// Note: this was written and reviewed for correctness but could not be
// live-tested end-to-end from the sandbox this was built in (outbound
// requests to nominatim.openstreetmap.org are blocked by the sandbox's
// network proxy — a sandbox limitation, not a Vercel one). Verify once
// deployed: save a birth place with exact time, then check the Natal Chart
// screen shows a real Ascendant instead of "coordinates needed."

export interface GeoPoint {
  latitude: number
  longitude: number
}

export async function geocodePlace(place: string): Promise<GeoPoint | null> {
  const trimmed = place.trim()
  if (!trimmed) return null
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}`
    const res = await fetch(url, {
      headers: {
        // Required by Nominatim's usage policy — a generic/missing
        // User-Agent gets rate-limited or blocked outright.
        'User-Agent': 'SensoraApp/1.0 (contact via in-app support)',
        Accept: 'application/json',
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) return null
    const results = await res.json()
    const first = Array.isArray(results) ? results[0] : null
    if (!first || first.lat === undefined || first.lon === undefined) return null
    const latitude = Number(first.lat)
    const longitude = Number(first.lon)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null
    return { latitude, longitude }
  } catch {
    // Network hiccup or Nominatim downtime — the caller falls back to
    // saving the birth place text with no coordinates, which is the
    // honest "we don't know yet" state, not a fabricated location.
    return null
  }
}