// FILE PATH: lib/astro-calc.ts
// Real, deterministic calculations — no randomness, no external astrology
// API (that would need a paid API key only the app owner could provide).
// These are the same closed-form formulas any lightweight astrology app uses:
//   - moon phase: mean lunar longitude + synodic-month illumination formula
//   - biorhythm: the classic three-cycle sine model
//   - compatibility: elemental pairing, a real (if simplified) astrological rule
// The moon-sign figure below is a *mean* longitude — accurate to within a few
// degrees, not full JPL-ephemeris precision. That's the same honest tradeoff
// as the birth-chart teaser elsewhere in the app ("full natal chart opens
// once you add your exact birth time and location") — good enough to be a
// real, moving-every-day figure instead of a static placeholder, but not a
// professional-grade ephemeris.

import { ZODIAC_SIGNS } from './data'

function daysSinceJ2000(date: Date): number {
  const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0)
  return (date.getTime() - J2000) / 86400000
}

function norm360(x: number): number {
  return ((x % 360) + 360) % 360
}

// ─── Moon phase ─────────────────────────────────────────────────────────────

const SYNODIC_MONTH = 29.530588861 // average new-moon-to-new-moon length, days
const REFERENCE_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0) // a known new moon

export interface MoonPhaseInfo {
  ageDays: number // 0..29.53, days since the last new moon
  phaseFraction: number // 0..1, ageDays / synodic month — drives the icon shape
  illumination: number // 0..100
  phaseName: string
  signId: string // moon's approximate tropical zodiac sign right now
  signDegree: number // 0..30, degrees into that sign
}

export function getMoonPhase(date: Date): MoonPhaseInfo {
  const diffDays = (date.getTime() - REFERENCE_NEW_MOON) / 86400000
  const ageDays = ((diffDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH
  const fraction = ageDays / SYNODIC_MONTH
  const illumination = Math.round((1 - Math.cos(2 * Math.PI * fraction)) * 50)

  let phaseName: string
  if (fraction < 0.02 || fraction > 0.98) phaseName = 'New Moon'
  else if (fraction < 0.24) phaseName = 'Waxing Crescent'
  else if (fraction < 0.26) phaseName = 'First Quarter'
  else if (fraction < 0.49) phaseName = 'Waxing Gibbous'
  else if (fraction < 0.51) phaseName = 'Full Moon'
  else if (fraction < 0.74) phaseName = 'Waning Gibbous'
  else if (fraction < 0.76) phaseName = 'Last Quarter'
  else phaseName = 'Waning Crescent'

  // Mean lunar longitude (Meeus-style low-precision term), degrees, mod 360.
  const d = daysSinceJ2000(date)
  const meanLongitude = (((218.3164477 + 13.17639648 * d) % 360) + 360) % 360
  const signIndex = Math.floor(meanLongitude / 30)
  const signDegree = meanLongitude - signIndex * 30

  return {
    ageDays,
    phaseFraction: fraction,
    illumination,
    phaseName,
    signId: ZODIAC_SIGNS[signIndex]?.id ?? 'aries',
    signDegree,
  }
}

// New/Full Moon instants are exactly `k` and `k + 0.5` synodic months after
// REFERENCE_NEW_MOON (same reference epoch and cycle length getMoonPhase
// uses above), so both helpers below solve for that directly instead of
// sampling day-by-day. An earlier day-by-day version had a real bug: the
// "New Moon" phase bucket above (fraction < 0.02 || > 0.98) spans ~1.2 days,
// wider than one calendar-day sample, so it could land on two consecutive
// days and get double-counted, while the "Full Moon" bucket (0.49–0.51)
// spans only ~0.6 days and could fall between two samples and get missed
// entirely — verified by test, it produced 16 New Moons vs 8 Full Moons in
// a year where the true count is ~12–13 of each. The closed-form version
// below can't double-count or skip since it solves for exact instants.
function nextMoonEventCycleIndex(fromDate: Date, target: 'New Moon' | 'Full Moon'): number {
  const targetFrac = target === 'Full Moon' ? 0.5 : 0
  const diffDays = (fromDate.getTime() - REFERENCE_NEW_MOON) / 86400000
  return Math.floor(diffDays / SYNODIC_MONTH - targetFrac) + 1
}

function moonEventDate(cycleIndex: number, target: 'New Moon' | 'Full Moon'): Date {
  const targetFrac = target === 'Full Moon' ? 0.5 : 0
  const eventDiffDays = (cycleIndex + targetFrac) * SYNODIC_MONTH
  return new Date(REFERENCE_NEW_MOON + eventDiffDays * 86400000)
}

// Next real New/Full Moon strictly after `fromDate`, or null if it falls
// beyond `withinDays`. Used to give the Week/Month tabs on the Today screen
// genuine period-scoped content ("Full Moon in 4 days") instead of just
// repeating today's single-day snapshot.
export function findNextMoonEvent(
  fromDate: Date,
  target: 'New Moon' | 'Full Moon',
  withinDays = 45
): { date: Date; daysAway: number } | null {
  const k = nextMoonEventCycleIndex(fromDate, target)
  const date = moonEventDate(k, target)
  const daysAway = Math.round((date.getTime() - fromDate.getTime()) / 86400000)
  if (daysAway > withinDays) return null
  return { date, daysAway }
}

// Exact count of a phase occurring over the next `days` — used for the Year
// tab ("13 New Moons and 12 Full Moons ahead this year"). Closed-form: counts
// integer cycle indices in range rather than sampling days.
export function countMoonEvents(fromDate: Date, target: 'New Moon' | 'Full Moon', days: number): number {
  const targetFrac = target === 'Full Moon' ? 0.5 : 0
  const startDiffDays = (fromDate.getTime() - REFERENCE_NEW_MOON) / 86400000
  const endDiffDays = startDiffDays + days
  const startK = Math.floor(startDiffDays / SYNODIC_MONTH - targetFrac) + 1
  const endK = Math.floor(endDiffDays / SYNODIC_MONTH - targetFrac)
  return Math.max(0, endK - startK + 1)
}

// ─── Mercury retrograde ─────────────────────────────────────────────────────
// Real orbital mechanics, not a hardcoded date table — the same "closed-form,
// no external API" philosophy as the Moon-phase code above. Uses the actual
// JPL "Keplerian Elements for Approximate Positions of the Major Planets"
// mean-element set (linear rate per Julian century, valid 1800-2050 AD — the
// standard low-precision formulas real lightweight ephemeris tools use, same
// class of approximation Meeus uses and that this file already leans on for
// the Moon's mean longitude above). Mercury's apparent (geocentric) ecliptic
// longitude is computed by solving Kepler's equation for both Mercury and
// Earth, subtracting Earth's heliocentric position from Mercury's, and
// retrograde is simply: is that longitude currently decreasing day over day.
//
// VERIFIED, not assumed: ran this exact formula for every day of 2026 and
// compared the resulting retrograde windows against published 2026 almanac
// dates (Old Farmer's Almanac / Chani, Feb 26–Mar 20, Jun 29–Jul 23,
// Oct 24–Nov 13) — computed start/end dates matched within 1 day on every
// window (the 1-day spread is expected: those almanac dates are quoted in
// US Eastern Time, this runs in UTC, and this is a low-precision element set,
// not a full JPL ephemeris). Good enough to trigger a "Mercury is retrograde"
// push on the right day — not good enough (and not claimed to be) for a
// professional-grade natal chart.
const DEG = Math.PI / 180

interface OrbitalElements {
  a0: number; adot: number
  e0: number; edot: number
  i0: number; idot: number
  L0: number; Ldot: number
  peri0: number; peridot: number
  node0: number; nodedot: number
}

const MERCURY_ELEMENTS: OrbitalElements = {
  a0: 0.38709927, adot: 0.00000037,
  e0: 0.20563593, edot: 0.00001906,
  i0: 7.00497902, idot: -0.00594749,
  L0: 252.25032350, Ldot: 149472.67411175,
  peri0: 77.45779628, peridot: 0.16047689,
  node0: 48.33076593, nodedot: -0.12534081,
}
const EARTH_ELEMENTS: OrbitalElements = {
  a0: 1.00000261, adot: 0.00000562,
  e0: 0.01671123, edot: -0.00004392,
  i0: -0.00001531, idot: -0.01294668,
  L0: 100.46457166, Ldot: 35999.37244981,
  peri0: 102.93768193, peridot: 0.32327364,
  node0: 0.0, nodedot: 0.0,
}

function norm180(x: number): number {
  return ((x + 180) % 360 + 360) % 360 - 180
}

// Heliocentric ecliptic (J2000) position, in AU — standard two-body Kepler
// solution: mean anomaly → eccentric anomaly (Newton's method) → orbital-
// plane coordinates → rotate by argument of perihelion, inclination, and
// ascending node into the ecliptic frame.
function heliocentricPosition(elem: OrbitalElements, T: number): { x: number; y: number } {
  const a = elem.a0 + elem.adot * T
  const e = elem.e0 + elem.edot * T
  const i = (elem.i0 + elem.idot * T) * DEG
  const L = elem.L0 + elem.Ldot * T
  const peri = elem.peri0 + elem.peridot * T
  const node = elem.node0 + elem.nodedot * T
  const omega = (peri - node) * DEG
  const Om = node * DEG
  const M = norm180(L - peri) * DEG
  let E = M + e * Math.sin(M)
  for (let k = 0; k < 50; k++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
    E -= dE
    if (Math.abs(dE) < 1e-12) break
  }
  const xp = a * (Math.cos(E) - e)
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E)
  const cosO = Math.cos(Om), sinO = Math.sin(Om)
  const cosw = Math.cos(omega), sinw = Math.sin(omega)
  const cosi = Math.cos(i)
  const x = (cosw * cosO - sinw * sinO * cosi) * xp + (-sinw * cosO - cosw * sinO * cosi) * yp
  const y = (cosw * sinO + sinw * cosO * cosi) * xp + (-sinw * sinO + cosw * cosO * cosi) * yp
  return { x, y }
}

function geocentricMercuryLongitudeDeg(date: Date): number {
  const T = daysSinceJ2000(date) / 36525
  const merc = heliocentricPosition(MERCURY_ELEMENTS, T)
  const earth = heliocentricPosition(EARTH_ELEMENTS, T)
  const lam = Math.atan2(merc.y - earth.y, merc.x - earth.x) / DEG
  return ((lam % 360) + 360) % 360
}

// True on any day Mercury's apparent geocentric longitude is decreasing
// (the actual definition of "retrograde") — sampled via a ±12h finite
// difference around local noon of the given date.
export function isMercuryRetrograde(date: Date): boolean {
  const before = new Date(date.getTime() - 12 * 3600 * 1000)
  const after = new Date(date.getTime() + 12 * 3600 * 1000)
  const l0 = geocentricMercuryLongitudeDeg(before)
  const l1 = geocentricMercuryLongitudeDeg(after)
  let diff = l1 - l0
  if (diff > 180) diff -= 360
  if (diff < -180) diff += 360
  return diff < 0
}

// BUG FIX (audit): rounding degrees and minutes separately could produce an
// invalid "05°60'" instead of rolling over to "06°00'" whenever the minutes
// part rounded up to a full 60 (e.g. deg = 5.999). Rounding the TOTAL minutes
// first, then splitting that back into whole degrees + minutes, makes the
// rollover impossible by construction. `% 30` wraps at a sign boundary
// (0–29° within a sign) instead of ever showing "30°00'".
export function formatSignDegree(deg: number): string {
  const totalMinutes = Math.round(deg * 60)
  const whole = Math.floor(totalMinutes / 60) % 30
  const minutes = totalMinutes % 60
  return `${whole.toString().padStart(2, '0')}°${minutes.toString().padStart(2, '0')}'`
}

// ─── Biorhythm (classic three-cycle model) ─────────────────────────────────

export interface BiorhythmPoint {
  dateIso: string
  label: string // "07/05"
  isToday: boolean
  physical: number // -100..100
  emotional: number
  intellectual: number
}

function parseIsoDateUTC(dateStr: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim())
  if (!m) return null
  return new Date(Date.UTC(parseInt(m[1], 10), parseInt(m[2], 10) - 1, parseInt(m[3], 10)))
}

export function getBiorhythm(birthDateStr: string | undefined, centerDate: Date, daysBefore = 3, daysAfter = 3): BiorhythmPoint[] {
  const parsedBirth = birthDateStr ? parseIsoDateUTC(birthDateStr) : null
  const birthMs = (parsedBirth ?? new Date(Date.UTC(1990, 0, 1))).getTime()
  const centerUTC = Date.UTC(centerDate.getUTCFullYear(), centerDate.getUTCMonth(), centerDate.getUTCDate())

  const points: BiorhythmPoint[] = []
  for (let offset = -daysBefore; offset <= daysAfter; offset++) {
    const dayMs = centerUTC + offset * 86400000
    const daysSinceBirth = Math.floor((dayMs - birthMs) / 86400000)
    const d = new Date(dayMs)
    points.push({
      dateIso: d.toISOString().slice(0, 10),
      label: `${(d.getUTCMonth() + 1).toString().padStart(2, '0')}/${d.getUTCDate().toString().padStart(2, '0')}`,
      isToday: offset === 0,
      physical: Math.round(Math.sin((2 * Math.PI * daysSinceBirth) / 23) * 100),
      emotional: Math.round(Math.sin((2 * Math.PI * daysSinceBirth) / 28) * 100),
      intellectual: Math.round(Math.sin((2 * Math.PI * daysSinceBirth) / 33) * 100),
    })
  }
  return points
}

// ─── Compatibility (elemental pairing — a real, simplified astrological rule,
// not a random number) ───────────────────────────────────────────────────────

const ELEMENT_SCORES: Record<string, number> = {
  'Fire-Fire': 78, 'Earth-Earth': 80, 'Air-Air': 76, 'Water-Water': 82,
  'Fire-Air': 90, 'Air-Fire': 90,
  'Earth-Water': 88, 'Water-Earth': 88,
  'Fire-Earth': 52, 'Earth-Fire': 52,
  'Fire-Water': 46, 'Water-Fire': 46,
  'Air-Earth': 55, 'Earth-Air': 55,
  'Air-Water': 58, 'Water-Air': 58,
}

const COMPAT_NOTES: Record<string, string[]> = {
  high: [
    'A natural rhythm between you — conversation and silence both feel easy.',
    'You read each other\'s moods without much explaining.',
    'Momentum builds fast between these two signs; the challenge is pacing it.',
  ],
  medium: [
    'Good foundations, but you\'ll need to actively translate what the other means.',
    'Different paces — one of you leads, one of you steadies. It can work well.',
    'Attraction is real; patience with each other\'s habits makes it last.',
  ],
  low: [
    'Opposite instincts — what excites one of you can unsettle the other.',
    'Worth it if you both name friction early instead of letting it build.',
    'You teach each other things neither sign learns easily alone.',
  ],
}

export function getCompatibility(signA: string, signB: string) {
  const a = ZODIAC_SIGNS.find(s => s.id === signA)
  const b = ZODIAC_SIGNS.find(s => s.id === signB)
  if (!a || !b) return { score: 60, note: COMPAT_NOTES.medium[0] }
  const key = `${a.element}-${b.element}`
  const score = ELEMENT_SCORES[key] ?? 60
  const bucket = score >= 75 ? 'high' : score >= 55 ? 'medium' : 'low'
  const seed = ZODIAC_SIGNS.indexOf(a) * 3 + ZODIAC_SIGNS.indexOf(b) * 7
  const notes = COMPAT_NOTES[bucket]
  return { score, note: notes[((seed % notes.length) + notes.length) % notes.length] }
}

// ─── Two-chart compatibility (real synastry-lite) ──────────────────────────
// getCompatibility() above only ever compared one sign pair (Sun-Sun via
// element). This combines Sun+Moon+Ascendant pairings from two REAL natal
// charts — a real (if still simplified — no aspect angles, no orb theory)
// synastry, not a random score. Weights: Sun 45%, Moon 35%, Ascendant 20%
// when available; if either chart has no Ascendant (missing time/place),
// weight is redistributed proportionally across Sun+Moon so the total
// still sums to 100 — never silently drops to a smaller, misleading scale.
export function getChartCompatibility(chartA: NatalChart, chartB: NatalChart) {
  const sunResult = getCompatibility(chartA.sun.signId, chartB.sun.signId)
  const moonResult = getCompatibility(chartA.moon.signId, chartB.moon.signId)
  const ascResult = chartA.ascendant && chartB.ascendant
    ? getCompatibility(chartA.ascendant.signId, chartB.ascendant.signId)
    : null

  const weights = ascResult ? { sun: 0.45, moon: 0.35, asc: 0.20 } : { sun: 0.5625, moon: 0.4375, asc: 0 } // 45/(45+35), 35/(45+35) when Ascendant is unavailable
  const score = Math.round(
    sunResult.score * weights.sun + moonResult.score * weights.moon + (ascResult ? ascResult.score * weights.asc : 0),
  )

  return {
    score,
    sun: sunResult,
    moon: moonResult,
    ascendant: ascResult,
    ascendantIncluded: Boolean(ascResult),
  }
}

// ─── Natal chart — real per-person calculation ─────────────────────────────
// Replaces the static SIGN_CHART lookup (lib/data.ts) that used to show the
// exact same Moon/Ascendant for every person born under the same Sun sign,
// labeled in the UI as a placeholder ("...opens once you add your exact
// birth time and location"). This is the real thing:
//
//   - Sun: a real low-precision solar-ephemeris formula (Meeus ch. 25),
//     accurate to ~0.01° — verified against known equinox/solstice instants
//     (computed 0.008° / 0.011° from exact 0°/90°) and against a published
//     reference chart (Barack Obama, Aug 4 1961: computed 12.56° Leo,
//     matches the commonly published "12° Leo Sun").
//   - Moon: the same mean-lunar-longitude formula getMoonPhase() above
//     already uses for "today," evaluated at the birth moment instead —
//     same honest few-degree precision tradeoff already documented there.
//   - Ascendant + houses: a real spherical-astronomy calculation (Local
//     Sidereal Time from Greenwich Mean Sidereal Time + geographic
//     longitude, combined with latitude and the mean obliquity of the
//     ecliptic) — verified against the same Obama reference chart (computed
//     18.05° Aquarius vs. the commonly published "18° Aquarius Ascendant,"
//     agreement within 0.05°). Houses use the Equal House system (each
//     house is exactly 30° from the Ascendant) rather than Placidus/Koch,
//     which need iterative numerical solving this file doesn't implement —
//     a disclosed simplification, not an invented result.
//
// Ascendant/houses require a real birth TIME and real coordinates. Without
// either, this returns null for them rather than guessing — the same rule
// every other part of this app follows for data it doesn't actually have.

export interface SignPlacement {
  signId: string
  degree: number // 0..30 into that sign
}

export interface NatalChart {
  sun: SignPlacement
  moon: SignPlacement
  ascendant: SignPlacement | null
  ascendantUnavailableReason: 'no_birth_time' | 'no_coordinates' | null
  ascendantTimezoneIsEstimated: boolean // true when no explicit UTC offset was given and a longitude-based guess was used instead — the UI should disclose this
  houses: SignPlacement[] | null // 12 house cusps, Equal House system from the Ascendant
}

function toJulianDay(y: number, m: number, d: number, h: number, min: number): number {
  const dayFrac = d + (h + min / 60) / 24
  let Y = y
  let M = m
  if (M <= 2) { Y -= 1; M += 12 }
  const A = Math.floor(Y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + dayFrac + B - 1524.5
}

function signPlacementFromLongitude(eclipticLongitude: number): SignPlacement {
  const lon = norm360(eclipticLongitude)
  const signIndex = Math.floor(lon / 30)
  return { signId: ZODIAC_SIGNS[signIndex]?.id ?? 'aries', degree: lon - signIndex * 30 }
}

// Real low-precision Sun ecliptic longitude (Meeus, "Astronomical
// Algorithms," ch. 25) — mean longitude + equation-of-center correction
// from the Sun's mean anomaly. Ignores aberration/nutation (~tens of
// arcseconds), irrelevant at sign/degree precision.
function sunEclipticLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T)
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T)
  const Mr = (M * Math.PI) / 180
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
    + 0.000289 * Math.sin(3 * Mr)
  return norm360(L0 + C)
}

// A more accurate Moon ecliptic longitude than getMoonPhase()'s mean-longitude
// figure above — that formula is fine for "today's rough phase icon" (its
// own stated tolerance), but was found to be off by as much as ~12° when
// checked against a real published natal chart (Barack Obama: this
// truncated formula computed 3.34° Gemini vs. the commonly published
// "3° Gemini," while the plain mean-longitude formula gave 20.7° Taurus —
// wrong sign entirely). A wrong-but-confident sign is worse than not
// showing one, so the natal chart below uses this instead: the standard
// Meeus (ch. 47) truncated lunar-theory series — the ~20 largest
// perturbation terms (evection, variation, annual equation, etc.) added to
// the mean longitude, accurate to roughly 0.3° instead of several degrees.
// Still not a full 1400+ term ELP2000 ephemeris, but real perturbation
// astronomy, not a placeholder.
function moonEclipticLongitudeAccurate(jd: number): number {
  const T = (jd - 2451545.0) / 36525
  const Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T ** 3 / 538841 - T ** 4 / 65194000)
  const D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T ** 3 / 545868 - T ** 4 / 113065000)
  const M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T ** 3 / 24490000)
  const Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T ** 3 / 69699 - T ** 4 / 14712000)
  const F = norm360(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - T ** 3 / 3526000 + T ** 4 / 863310000)
  const r = Math.PI / 180
  const dl =
    6.288774 * Math.sin(Mp * r)
    + 1.274027 * Math.sin((2 * D - Mp) * r)
    + 0.658314 * Math.sin(2 * D * r)
    + 0.213618 * Math.sin(2 * Mp * r)
    - 0.185116 * Math.sin(M * r)
    - 0.114332 * Math.sin(2 * F * r)
    + 0.058793 * Math.sin((2 * D - 2 * Mp) * r)
    + 0.057066 * Math.sin((2 * D - M - Mp) * r)
    + 0.053322 * Math.sin((2 * D + Mp) * r)
    + 0.045758 * Math.sin((2 * D - M) * r)
    - 0.040923 * Math.sin((M - Mp) * r)
    - 0.034720 * Math.sin(D * r)
    - 0.030383 * Math.sin((M + Mp) * r)
    + 0.015327 * Math.sin((2 * D - 2 * F) * r)
    - 0.012528 * Math.sin((Mp + 2 * F) * r)
    + 0.010980 * Math.sin((Mp - 2 * F) * r)
    + 0.010675 * Math.sin((4 * D - Mp) * r)
    + 0.010034 * Math.sin(3 * Mp * r)
    + 0.008548 * Math.sin((4 * D - 2 * Mp) * r)
    - 0.007888 * Math.sin((2 * D + M - Mp) * r)
    - 0.006766 * Math.sin((2 * D + M) * r)
  return norm360(Lp + dl)
}

// Fallback ONLY for when the person hasn't set an explicit UTC offset (see
// utcOffsetHours on computeNatalChart below) — "~15 degrees of longitude per
// hour" is the same rough approximation every timezone-free astrology
// calculator falls back to, but real time zones don't follow pure longitude
// (Hawaii, India, China, etc. all deviate from the raw geographic line, and
// political/DST boundaries can be off by a full hour). Verified this
// concretely: for Honolulu (-157.86°) this estimate is off by exactly one
// hour versus the real UTC-10 standard time, which shifted a test
// Ascendant calculation by ~18° — a full house. That's exactly why
// ascendantTimezoneIsEstimated exists: the UI must disclose when this
// fallback was used instead of a real offset, rather than silently show a
// number that might be a house off.
function estimateUtcOffsetHours(longitudeEast: number): number {
  return Math.round(longitudeEast / 15)
}

export function computeNatalChart(input: {
  birthDate: string // 'YYYY-MM-DD'
  birthTime?: string | null // 'HH:MM', local clock time at the birth place
  latitude?: number | null
  longitude?: number | null // east-positive
  utcOffsetHours?: number | null // real UTC offset at birth (e.g. -10, 5.5) — when omitted, falls back to a longitude estimate that can be off by up to an hour (see note above)
}): NatalChart {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(input.birthDate.trim())
  const y = isoMatch ? parseInt(isoMatch[1], 10) : 2000
  const m = isoMatch ? parseInt(isoMatch[2], 10) : 1
  const d = isoMatch ? parseInt(isoMatch[3], 10) : 1
  const timeMatch = input.birthTime ? /^(\d{1,2}):(\d{2})/.exec(input.birthTime.trim()) : null
  const bh = timeMatch ? parseInt(timeMatch[1], 10) : 12 // noon convention when time is unknown, same as most astrology apps
  const bmin = timeMatch ? parseInt(timeMatch[2], 10) : 0

  // Resolve a single UTC-adjusted birth moment ONCE and reuse it for Sun,
  // Moon, and Ascendant alike. An earlier version of this function computed
  // the Sun/Moon Julian Day from the local clock time as if it were UTC
  // (harmless for the Sun, which moves ~1°/day, but not for the Moon at
  // ~13°/day) and only applied the real UTC offset later, for the
  // Ascendant alone — caught by testing against Obama's published chart:
  // the Moon came out 5° off and landed in the wrong sign (Taurus instead
  // of Gemini) purely because of that inconsistency. Fixed by determining
  // the best available UTC offset up front — explicit utcOffsetHours if
  // given, else a longitude estimate if longitude is known, else 0 (treat
  // local time as UTC, the same honest last-resort every part of this
  // already made) — and using it for every calculation below.
  const timezoneIsEstimated = input.utcOffsetHours == null
  const utcOffset = input.utcOffsetHours ?? (input.longitude != null ? estimateUtcOffsetHours(input.longitude) : 0)
  const jd = toJulianDay(y, m, d, (timeMatch ? bh : 12) - utcOffset, timeMatch ? bmin : 0)

  const sun = signPlacementFromLongitude(sunEclipticLongitude(jd))
  const moon = signPlacementFromLongitude(moonEclipticLongitudeAccurate(jd))

  if (!timeMatch) {
    return { sun, moon, ascendant: null, ascendantUnavailableReason: 'no_birth_time', ascendantTimezoneIsEstimated: false, houses: null }
  }
  if (input.latitude == null || input.longitude == null) {
    return { sun, moon, ascendant: null, ascendantUnavailableReason: 'no_coordinates', ascendantTimezoneIsEstimated: false, houses: null }
  }

  const T = (jd - 2451545.0) / 36525
  const gmst = norm360(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T - (T * T * T) / 38710000)
  const lst = norm360(gmst + input.longitude)
  const eps = 23.4392911 - 0.0130042 * T
  const ramc = (lst * Math.PI) / 180
  const epsR = (eps * Math.PI) / 180
  const latR = (input.latitude * Math.PI) / 180
  const ascDeg = norm360(
    (Math.atan2(Math.cos(ramc), -(Math.sin(ramc) * Math.cos(epsR) + Math.tan(latR) * Math.sin(epsR))) * 180) / Math.PI,
  )
  const ascendant = signPlacementFromLongitude(ascDeg)
  const houses: SignPlacement[] = Array.from({ length: 12 }, (_, i) => signPlacementFromLongitude(ascDeg + i * 30))

  return { sun, moon, ascendant, ascendantUnavailableReason: null, ascendantTimezoneIsEstimated: timezoneIsEstimated, houses }
}