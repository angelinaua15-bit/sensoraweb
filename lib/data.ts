// FILE PATH: lib/data.ts
// REAL PHOTOS (your call: "фото квізів зробити як з інтернету взяти реальні
// магічні штуки і додати, зробити живіше" — swap the flat AI color-field
// cards for real, lively photography): these 9 were pulled live from
// Unsplash (free license — unsplash.com/license, free for commercial use,
// no permission/attribution required), matched by real theme to each quiz/
// article rather than reused generically, and verified to actually load
// (HTTP 200) before being wired in here — not guessed URLs. Replaces the
// old base64 AI-art constants from ./discover-art (that file is no longer
// imported here; it can be deleted from the project if nothing else uses it).
const DQ4_IMG = 'https://images.unsplash.com/photo-1506014299253-3725319c0f69?auto=format&fit=crop&w=800&q=80' // attachment style — couple holding hands
const DQ1_IMG = 'https://images.unsplash.com/photo-1686087350079-9f6ca138583c?auto=format&fit=crop&w=800&q=80' // manifestation blocks — vision board / journal / candle
const DQ3_IMG = 'https://images.unsplash.com/photo-1621508654686-809f23efdabc?auto=format&fit=crop&w=800&q=80' // intuition blocks — crystal ball
const AR1_IMG = 'https://images.unsplash.com/photo-1593769836752-994f26f143a4?auto=format&fit=crop&w=800&q=80' // grounding energy — bare feet on ground
const AR2_IMG = 'https://images.unsplash.com/photo-1588338949261-659fc6fed20b?auto=format&fit=crop&w=800&q=80' // manifestation list — writing in journal by candle
const AR3_IMG = 'https://images.unsplash.com/photo-1652391662470-88d4a44349c6?auto=format&fit=crop&w=800&q=80' // relationship healing — couple at sunset
const AR4_IMG = 'https://images.unsplash.com/photo-1554832307-e5e32d164958?auto=format&fit=crop&w=800&q=80' // clearing stagnant energy — sage smudging smoke
const AR5_IMG = 'https://images.unsplash.com/photo-1507502707541-f369a3b18502?auto=format&fit=crop&w=800&q=80' // wanting vs attracting — full moon night sky
const AR6_IMG = 'https://images.unsplash.com/photo-1522075782449-e45a34f1ddfb?auto=format&fit=crop&w=800&q=80' // boundaries — woman alone, peaceful solitude
// Real UA/EN content (2026-09-18) — every getX() content function below now
// takes a `locale` param; see the big comment above CAREER_LINES_EN/_UK.
import type { Locale } from './i18n'

// ─── Types ───────────────────────────────────────────────────────────────────

export type Screen =
  | 'splash'
  | 'onboarding'
  | 'register'
  | 'minitest'
  | 'home'
  | 'search'
  | 'discover'
  | 'expert'
  | 'chat'
  | 'low-balance'
  | 'wallet'
  | 'payment-success'
  | 'review'
  | 'chats'
  | 'history'
  | 'profile'
  | 'expert-cabinet'
  | 'crm-client'
  | 'crm-chatter'
  | 'admin'

// Rating, category, and pricePerMin are nullable — a brand-new real expert
// profile (created the moment a chatter's activation code is redeemed) has
// none of these filled in yet, and the UI is expected to show that honestly
// ("New" / "Not set" / "Price not set yet") rather than falling back to a
// fabricated number. This mirrors ExpertProfile in lib/server/db.ts, which is
// the real shape returned by GET /api/experts.
export interface Expert {
  id: string
  name: string
  specialty: string[]
  category: 'astrology' | 'tarot' | 'numerology' | 'compatibility' | null
  rating: number | null
  reviews: number
  sessions: number
  pricePerMin: number | null
  online: boolean
  bio: string
  badge?: 'Master' | 'Senior' | null
  avatar: string
  tags: string[]
}

// ─── Mock Data ────────────────────────────────────────────────────────────────
// The EXPERTS array that used to live here (6 invented psychics — Luna
// Verner, Daria Frost, etc.) has been removed. Every screen that used to
// import it now fetches the real catalog from GET /api/experts
// (lib/server/db.ts → listExpertProfiles), which reflects only real chatter
// accounts that have gone through registration + admin approval + activation.
// See lib/server/db.ts's ExpertProfile type for the equivalent real shape.
//
// BUG FIX (code audit): this file used to also still export CHAT_SESSIONS /
// HISTORY / ADMIN_USERS / ADMIN_TRANSACTIONS / PAYOUT_REQUESTS — fabricated
// sample data (fake "Luna Verner"/"Daria Frost" sessions, fake balances,
// fake payout requests) left over from before the app had a real backend.
// Their only two consumers (components/screens/history-screen.tsx and
// components/screens/admin-screen.tsx) were themselves dead code — not
// imported from app/page.tsx or anywhere else, fully superseded by
// ConsultationHistoryScreen and /crm/admin respectively — and
// history-screen.tsx additionally still imported the already-removed
// EXPERTS array, which would have crashed with "Cannot read properties of
// undefined (reading 'map')" the instant anyone re-wired it back in. Deleted
// both dead screen files and all five fabricated exports (plus their
// now-unused Message/ChatSession/HistoryItem/Transaction/AdminUser/
// PayoutRequest type definitions) rather than patch a broken import to a
// screen nothing links to — same principle as removing the EXPERTS array
// itself.

// ─── CRM (web) mock data ───────────────────────────────────────────────────────
// Backs the two standalone web dashboards: /crm/client and /crm/chatter.
// Kept as a small, hand-written cast — same principle as EXPERTS above: no
// randomly-generated filler users, just realistic sample records.

export interface CrmClientCard {
  id: string
  name: string
  avatar: string
  tag: 'new' | 'active' | 'vip' | 'at_risk' | 'churned'
  sessionsCount: number
  totalSpent: number
  lastSession: string
  notes: string
}

export const CRM_CLIENT_CARDS: CrmClientCard[] = [
  { id: 'c1', name: 'Elena Vance', avatar: 'EV', tag: 'vip', sessionsCount: 14, totalSpent: 412, lastSession: 'Jul 6, 2025', notes: 'Prefers direct, analytical answers. Going through a career change — asked about a new job offer twice. Birthday: March 3.' },
  { id: 'c2', name: 'Alina Petrov', avatar: 'AP', tag: 'active', sessionsCount: 5, totalSpent: 98, lastSession: 'Jul 4, 2025', notes: 'Focused on relationship questions. Responds well to Venus/Mars talk. Follows up roughly every 2 weeks.' },
  { id: 'c3', name: 'Sofia Marsh', avatar: 'SM', tag: 'new', sessionsCount: 1, totalSpent: 12, lastSession: 'Jul 5, 2025', notes: 'First session used the free trial minutes. Asked mostly about career timing — good candidate for a follow-up nudge.' },
  { id: 'c4', name: 'Tatiana Reyes', avatar: 'TR', tag: 'at_risk', sessionsCount: 8, totalSpent: 210, lastSession: 'Jun 2, 2025', notes: 'Was a regular every week, hasn’t booked in over a month. Worth a gentle re-engagement message.' },
  { id: 'c5', name: 'Marina Cole', avatar: 'MC', tag: 'churned', sessionsCount: 2, totalSpent: 20, lastSession: 'Apr 18, 2025', notes: 'Balance ran out mid-session and never topped up again.' },
]

export interface KpiStat {
  key: string
  label: string
  value: string
  sub: string
  progress: number // 0-100, relative to next level threshold
}

export const CHATTER_KPI: KpiStat[] = [
  { key: 'sessions', label: 'Sessions (30d)', value: '92', sub: 'Median on platform: 74', progress: 82 },
  { key: 'rating', label: 'Average rating', value: '4.9', sub: 'Based on 1,284 reviews', progress: 96 },
  { key: 'minutes', label: 'Chat minutes (30d)', value: '2,140', sub: 'Milestone bonus at 2,400', progress: 71 },
  { key: 'response', label: 'Avg. response time', value: '18s', sub: 'Threshold for dual chat: 25s', progress: 90 },
  { key: 'retention', label: 'Client retention', value: '38%', sub: 'Clients who book you again', progress: 62 },
]

export interface BonusEntry {
  id: string
  type: 'streak_return' | 'night_shift' | 'chat_minutes'
  label: string
  amount: number
  date: string
  detail: string
}

export const CHATTER_BONUSES: BonusEntry[] = [
  { id: 'b1', type: 'streak_return', label: 'Returning client bonus', amount: 3.6, date: 'Jul 6, 2025', detail: 'Elena Vance — 5th consecutive session (+15%)' },
  { id: 'b2', type: 'night_shift', label: 'Night shift bonus', amount: 8.2, date: 'Jul 5, 2025', detail: '22 min worked between 00:00–08:00 (+25%)' },
  { id: 'b3', type: 'chat_minutes', label: 'Weekly minutes milestone', amount: 25, date: 'Jun 30, 2025', detail: '600+ minutes this week' },
  { id: 'b4', type: 'streak_return', label: 'Returning client bonus', amount: 1.8, date: 'Jun 28, 2025', detail: 'Alina Petrov — 3rd consecutive session (+10%)' },
]

// ─── "Today" horoscope tab (Nebula-style, Sensora branding) ───────────────────
// Zodiac carousel + daily focus/mood + horoscope text. Values are computed
// deterministically from the sign index and period index (same formula every
// render/reload) rather than Math.random() — same pattern already used for
// EXPERT_RESPONSES cycling above, so nothing here is "random fake data," it's
// reproducible sample content, same as a real horoscope engine would produce
// from a fixed rule set until a real ephemeris/astrology engine is wired in.

export interface ZodiacSign {
  id: string
  symbol: string
  name: string
  dates: string
  element: 'Fire' | 'Earth' | 'Air' | 'Water'
}

export const ZODIAC_SIGNS: ZodiacSign[] = [
  { id: 'aries', symbol: '♈', name: 'Aries', dates: 'Mar 21 – Apr 19', element: 'Fire' },
  { id: 'taurus', symbol: '♉', name: 'Taurus', dates: 'Apr 20 – May 20', element: 'Earth' },
  { id: 'gemini', symbol: '♊', name: 'Gemini', dates: 'May 21 – Jun 20', element: 'Air' },
  { id: 'cancer', symbol: '♋', name: 'Cancer', dates: 'Jun 21 – Jul 22', element: 'Water' },
  { id: 'leo', symbol: '♌', name: 'Leo', dates: 'Jul 23 – Aug 22', element: 'Fire' },
  { id: 'virgo', symbol: '♍', name: 'Virgo', dates: 'Aug 23 – Sep 22', element: 'Earth' },
  { id: 'libra', symbol: '♎', name: 'Libra', dates: 'Sep 23 – Oct 22', element: 'Air' },
  { id: 'scorpio', symbol: '♏', name: 'Scorpio', dates: 'Oct 23 – Nov 21', element: 'Water' },
  { id: 'sagittarius', symbol: '♐', name: 'Sagittarius', dates: 'Nov 22 – Dec 21', element: 'Fire' },
  { id: 'capricorn', symbol: '♑', name: 'Capricorn', dates: 'Dec 22 – Jan 19', element: 'Earth' },
  { id: 'aquarius', symbol: '♒', name: 'Aquarius', dates: 'Jan 20 – Feb 18', element: 'Air' },
  { id: 'pisces', symbol: '♓', name: 'Pisces', dates: 'Feb 19 – Mar 20', element: 'Water' },
]

// Sun/Moon/Ascendant shown under the selected sign avatar — a small realistic
// per-sign lookup rather than one generic line for every sign.
export const SIGN_CHART: Record<string, { moon: string; ascendant: string }> = {
  aries: { moon: 'Pisces', ascendant: 'Leo' },
  taurus: { moon: 'Aries', ascendant: 'Virgo' },
  gemini: { moon: 'Taurus', ascendant: 'Libra' },
  cancer: { moon: 'Gemini', ascendant: 'Scorpio' },
  leo: { moon: 'Cancer', ascendant: 'Sagittarius' },
  virgo: { moon: 'Leo', ascendant: 'Capricorn' },
  libra: { moon: 'Virgo', ascendant: 'Aquarius' },
  scorpio: { moon: 'Libra', ascendant: 'Pisces' },
  sagittarius: { moon: 'Scorpio', ascendant: 'Aries' },
  capricorn: { moon: 'Sagittarius', ascendant: 'Taurus' },
  aquarius: { moon: 'Capricorn', ascendant: 'Gemini' },
  pisces: { moon: 'Aquarius', ascendant: 'Cancer' },
}

// Real sign calculation from an actual birth date (YYYY-MM-DD), not a guess —
// standard tropical zodiac date ranges. Falls back to Leo only if no date was
// ever supplied (e.g. an old test account created before this field existed).
export function getZodiacSignFromDate(dateStr?: string | null): string {
  if (!dateStr) return 'leo'
  // Parse the "YYYY-MM-DD" string straight out of the <input type="date">
  // ourselves, instead of going through `new Date(dateStr)`. The latter
  // parses the string as UTC midnight and then reads it back with local
  // getMonth()/getDate() — in any timezone behind UTC that silently rolls
  // the date back a day, which was quietly producing the wrong sign right
  // around every sign boundary. Parsing the digits directly sidesteps time
  // zones entirely, since a birth date has no time component to begin with.
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateStr.trim())
  let month: number
  let day: number
  if (isoMatch) {
    month = parseInt(isoMatch[2], 10)
    day = parseInt(isoMatch[3], 10)
  } else {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return 'leo'
    month = d.getMonth() + 1
    day = d.getDate()
  }
  const ranges: [string, number, number, number, number][] = [
    ['capricorn', 12, 22, 1, 19],
    ['aquarius', 1, 20, 2, 18],
    ['pisces', 2, 19, 3, 20],
    ['aries', 3, 21, 4, 19],
    ['taurus', 4, 20, 5, 20],
    ['gemini', 5, 21, 6, 20],
    ['cancer', 6, 21, 7, 22],
    ['leo', 7, 23, 8, 22],
    ['virgo', 8, 23, 9, 22],
    ['libra', 9, 23, 10, 22],
    ['scorpio', 10, 23, 11, 21],
    ['sagittarius', 11, 22, 12, 21],
  ]
  for (const [id, m1, d1, m2, d2] of ranges) {
    const afterStart = month > m1 || (month === m1 && day >= d1)
    const beforeEnd = month < m2 || (month === m2 && day <= d2)
    if (m1 > m2) { // wraps around New Year (Capricorn)
      if (afterStart || beforeEnd) return id
    } else if (afterStart && beforeEnd) {
      return id
    }
  }
  return 'leo'
}

export const HOROSCOPE_PERIODS = ['Yesterday', 'Today', 'Tomorrow', 'Week', 'Month', 'Year'] as const
export type HoroscopePeriod = typeof HOROSCOPE_PERIODS[number]

// BUG FIX (real translation gap, 2026-09-18): every string pool in this
// file used to be English-only — lib/i18n.ts's own top comment always
// honestly documented this as out of scope ("does NOT cover the
// deterministic astrology content... a real content project of its own").
// This is that project: each pool below now has a parallel, independently
// authored Ukrainian array in the exact same order, and every getX()
// function below takes a `locale` parameter and picks from the matching
// language pool by the same seeded index — so a given sign/period/seed
// combination shows the "same" content in either language, not just a
// re-translated English structure. These are static, hand-translated
// strings (not run through the live MyMemory API like the external daily
// horoscope in lib/server/horoscope-api.ts) — this content never changes,
// so there's no reason to pay a runtime translation call + its failure
// modes (rate limits, the 500-char query cap that bit the daily horoscope)
// for text that only needs translating once.
const CAREER_LINES_EN = [
  'A short, focused push at work pays off more than a long grind today.',
  'Someone in your network reopens a door you thought was closed.',
  'Slow down before signing anything — a second read reveals a detail you missed.',
  'Your ideas land well in conversation; put the best one in writing before the day ends.',
  'A quiet win goes unnoticed unless you say it out loud.',
  'Financial caution serves you better than a bold move right now.',
  'Recognition arrives later than you expect, but it does arrive.',
  'A collaboration works best if you let someone else lead the first step.',
]
const CAREER_LINES_ES = [
  'Un empujón corto y enfocado en el trabajo hoy rinde más que un esfuerzo largo y agotador.',
  'Alguien de tu red vuelve a abrir una puerta que creías cerrada.',
  'Frena antes de firmar algo — una segunda lectura revela un detalle que pasaste por alto.',
  'Tus ideas se reciben bien en la conversación; pon la mejor por escrito antes de que termine el día.',
  'Un logro silencioso pasa desapercibido a menos que lo digas en voz alta.',
  'La cautela financiera te sirve mejor que un movimiento audaz ahora mismo.',
  'El reconocimiento llega más tarde de lo que esperas, pero llega.',
  'Una colaboración funciona mejor si dejas que otra persona dé el primer paso.',
]
const LOVE_LINES_EN = [
  'An honest conversation clears up more than a week of guessing would.',
  'Venus favors small gestures over grand ones today.',
  'Someone from your past resurfaces — you decide what that means.',
  'Give a new connection room to unfold slowly rather than forcing pace.',
  'A disagreement is really about something smaller than it looks.',
  'Affection expressed plainly lands better than a hint.',
  'Your intuition about a partner\'s mood is more accurate than usual.',
  'Solitude serves you as well as company would today.',
]
const LOVE_LINES_ES = [
  'Una conversación honesta aclara más de lo que haría una semana de suposiciones.',
  'Hoy Venus favorece los gestos pequeños por encima de los grandiosos.',
  'Alguien de tu pasado reaparece — tú decides qué significa eso.',
  'Dale a una nueva conexión espacio para desarrollarse despacio en lugar de forzar el ritmo.',
  'Un desacuerdo trata en realidad de algo más pequeño de lo que parece.',
  'El cariño expresado con claridad llega mejor que una insinuación.',
  'Tu intuición sobre el estado de ánimo de tu pareja es más precisa de lo habitual.',
  'La soledad te sirve hoy tan bien como lo haría la compañía.',
]
const HEALTH_LINES_EN = [
  'Your energy runs in short bursts today — plan around them instead of against them.',
  'A walk outside resets your focus faster than caffeine would.',
  'Sleep debt catches up if you don\'t protect tonight\'s rest.',
  'Your body is asking for less screen time, not more willpower.',
  'A small ache is a signal to stretch, not to ignore.',
  'Hydration affects your mood more than usual today.',
  'A structured routine suits you better than an ambitious one right now.',
  'Your appetite and your schedule are slightly out of sync — plan meals ahead.',
]
const HEALTH_LINES_ES = [
  'Hoy tu energía llega en ráfagas cortas — planifica en torno a ellas, no en contra.',
  'Un paseo al aire libre restablece tu enfoque más rápido que la cafeína.',
  'La deuda de sueño te alcanza si no proteges el descanso de esta noche.',
  'Tu cuerpo pide menos tiempo de pantalla, no más fuerza de voluntad.',
  'Un pequeño dolor es una señal para estirar, no para ignorarlo.',
  'La hidratación afecta tu ánimo más de lo habitual hoy.',
  'Una rutina estructurada te sienta mejor ahora que una ambiciosa.',
  'Tu apetito y tu horario están ligeramente desincronizados — planifica las comidas con antelación.',
]
const FAMILY_LINES_EN = [
  'A relative needs to be heard more than advised today.',
  'Old family patterns surface — you\'re not obligated to repeat them.',
  'A small kindness at home is remembered longer than you\'d think.',
  'Boundaries with family feel uncomfortable but are worth holding.',
  'Someone close needs your time more than your solutions.',
  'A shared meal or call resolves more than a long explanation would.',
  'Your patience is tested, and it holds.',
  'A tradition or ritual grounds you more than usual today.',
]
const FAMILY_LINES_ES = [
  'Un familiar necesita hoy que lo escuchen más que que lo aconsejen.',
  'Surgen viejos patrones familiares — no estás obligado/a a repetirlos.',
  'Un pequeño gesto de cariño en casa se recuerda más tiempo de lo que crees.',
  'Los límites con la familia se sienten incómodos pero merecen mantenerse.',
  'Alguien cercano necesita tu tiempo más que tus soluciones.',
  'Una comida o llamada compartida resuelve más que una larga explicación.',
  'Tu paciencia se pone a prueba, y resiste.',
  'Una tradición o ritual te arraiga hoy más de lo habitual.',
]
const TIP_LINES_EN = [
  'Balance ambition with patience — not everything needs to move fast.',
  'Say the quiet thing out loud; it carries less weight once it\'s spoken.',
  'Rest is a decision today, not a leftover.',
  'Choose the option that feels honest, not the one that looks impressive.',
  'Let today\'s small win be enough.',
]
const TIP_LINES_ES = [
  'Equilibra la ambición con paciencia — no todo necesita ir rápido.',
  'Di en voz alta lo que callabas; pesa menos una vez dicho.',
  'Hoy el descanso es una decisión, no un sobrante.',
  'Elige la opción que se sienta honesta, no la que parezca impresionante.',
  'Deja que la pequeña victoria de hoy sea suficiente.',
]

function pools(locale: Locale) {
  return locale === 'es'
    ? { career: CAREER_LINES_ES, love: LOVE_LINES_ES, health: HEALTH_LINES_ES, family: FAMILY_LINES_ES, tip: TIP_LINES_ES }
    : { career: CAREER_LINES_EN, love: LOVE_LINES_EN, health: HEALTH_LINES_EN, family: FAMILY_LINES_EN, tip: TIP_LINES_EN }
}

function pick<T>(arr: T[], seed: number): T {
  return arr[((seed % arr.length) + arr.length) % arr.length]
}

// FNV-1a-style integer hash for turning (sign, period, field-salt) into a
// well-mixed seed. Plain linear combinations like `signIndex*3 + periodIndex*5`
// alias badly against small content-pool lengths — e.g. with a 6-item pool
// and a `periodIndex*2` term, Today (periodIndex 1 → 2) and Month (periodIndex
// 4 → 8) land on the exact same `% 6` slot, so every sign's "Month" astrology
// event silently rendered as an identical copy of its "Today" event. Hashing
// each field with its own salt breaks that alignment so every period/sign
// combination gets an independent, non-repeating pick.
function hashSeed(...parts: number[]): number {
  let h = 0x811c9dc5
  for (const p of parts) {
    h ^= p
    h = Math.imul(h, 0x01000193)
  }
  return (h ^ (h >>> 15)) >>> 0
}

// The content pools above are authored with "today" as the default time
// word. Rather than showing that same word under the Week/Month/Year tabs
// (which reads as a bug — "why does my week outlook say 'today'?"), swap it
// for the word matching the selected tab. This is the same convention most
// horoscope apps use for non-daily tabs, applied here for real rather than
// just leaving the daily text in place under a different label.
function periodWord(period: HoroscopePeriod, locale: Locale = 'en'): string {
  if (locale === 'es') {
    switch (period) {
      case 'Yesterday': return 'ayer'
      case 'Tomorrow': return 'mañana'
      case 'Week': return 'esta semana'
      case 'Month': return 'este mes'
      case 'Year': return 'este año'
      default: return 'hoy'
    }
  }
  switch (period) {
    case 'Yesterday': return 'yesterday'
    case 'Tomorrow': return 'tomorrow'
    case 'Week': return 'this week'
    case 'Month': return 'this month'
    case 'Year': return 'this year'
    default: return 'today'
  }
}
// Spanish has no apostrophe-s possessive either, and "hoy" is an
// indeclinable adverb that can open a sentence capitalized — a plain
// case-insensitive replace with a capitalization-preserving replacer
// covers both positions correctly without needing separate "Today's"
// handling the way the English version does.
function applyPeriodWord(text: string, period: HoroscopePeriod, locale: Locale = 'en'): string {
  const word = periodWord(period, locale)
  if (locale === 'es') {
    if (word === 'hoy') return text
    return text.replace(/hoy/gi, matched =>
      matched[0] === matched[0].toUpperCase() ? word[0].toUpperCase() + word.slice(1) : word,
    )
  }
  if (word === 'today') return text
  return text.replace(/today's/g, `${word}'s`).replace(/today/g, word)
}

export function getHoroscope(signId: string, period: HoroscopePeriod, locale: Locale = 'en') {
  const signIndex = ZODIAC_SIGNS.findIndex(s => s.id === signId)
  const periodIndex = HOROSCOPE_PERIODS.indexOf(period)
  const p = pools(locale)
  return {
    career: applyPeriodWord(pick(p.career, hashSeed(signIndex, periodIndex, 1)), period, locale),
    love: applyPeriodWord(pick(p.love, hashSeed(signIndex, periodIndex, 2)), period, locale),
    health: applyPeriodWord(pick(p.health, hashSeed(signIndex, periodIndex, 3)), period, locale),
    family: applyPeriodWord(pick(p.family, hashSeed(signIndex, periodIndex, 4)), period, locale),
    tip: applyPeriodWord(pick(p.tip, hashSeed(signIndex, periodIndex, 5)), period, locale),
    focus: {
      career: 50 + (hashSeed(signIndex, periodIndex, 11) % 45),
      love: 50 + (hashSeed(signIndex, periodIndex, 12) % 45),
      health: 50 + (hashSeed(signIndex, periodIndex, 13) % 45),
      family: 50 + (hashSeed(signIndex, periodIndex, 14) % 45),
    },
  }
}

// ─── Today-screen extras (Nebula-style: astrology events, tips, yes/no) ──────
// All deterministic via the same pick(arr, seed) pattern as getHoroscope
// above — content changes by sign/day/period, never by Math.random().

const ASTRO_EVENTS_EN: { title: string; body: string }[] = [
  { title: 'Moon conjunction Saturn', body: 'Feelings turn inward, seeking structure and safety. You may sense emotional restraint or seriousness. This aspect offers maturity through self-containment rather than withdrawal.' },
  { title: 'Venus trine Moon', body: 'Harmony flows between heart and desire. Emotional expression feels natural and nourishing. This aspect supports gentle connection and emotional openness with people you trust.' },
  { title: 'Mercury sextile Mars', body: 'Words carry more force than usual — thoughts translate quickly into action. A good window for direct conversations you\'ve been putting off.' },
  { title: 'Sun square Jupiter', body: 'A pull toward doing too much at once. Ambition is real, but today rewards one deliberate step over three scattered ones.' },
  { title: 'Moon trine Neptune', body: 'Intuition runs clearer than logic today. Pay attention to a hunch even if you can\'t immediately justify it.' },
  { title: 'Mars opposition Pluto', body: 'Tension between what you want and what you feel allowed to want. Naming the tension quietly defuses more than acting on it would.' },
  { title: 'Sun conjunction Mercury', body: 'Clarity arrives through speaking rather than through more reflection. What you say now shapes how the next few days unfold.' },
  { title: 'Venus square Saturn', body: 'Affection meets a practical test. A relationship\'s staying power is proven by consistency right now, not by grand declarations.' },
  { title: 'Jupiter trine Moon', body: 'Emotional generosity opens doors. Being a little more open than usual pays off in ways you won\'t expect right away.' },
  { title: 'Mercury opposition Neptune', body: 'Details blur at the edges — double-check anything that matters before committing to it. Not everything you hear is the full picture.' },
]
const ASTRO_EVENTS_ES: { title: string; body: string }[] = [
  { title: 'Luna en conjunción con Saturno', body: 'Los sentimientos se vuelven hacia adentro, buscando estructura y seguridad. Puedes sentir contención emocional o seriedad. Este aspecto ofrece madurez a través del autocontrol, no del aislamiento.' },
  { title: 'Venus en trígono con la Luna', body: 'La armonía fluye entre el corazón y el deseo. La expresión emocional se siente natural y nutritiva. Este aspecto favorece la conexión cálida y la apertura emocional con personas en quienes confías.' },
  { title: 'Mercurio en sextil con Marte', body: 'Las palabras llevan más fuerza de lo habitual — los pensamientos se traducen rápido en acción. Un buen momento para conversaciones directas que has estado postergando.' },
  { title: 'Sol en cuadratura con Júpiter', body: 'Una tentación de hacer demasiado a la vez. La ambición es real, pero hoy premia un paso deliberado más que tres dispersos.' },
  { title: 'Luna en trígono con Neptuno', body: 'La intuición es hoy más clara que la lógica. Presta atención a una corazonada aunque no puedas justificarla de inmediato.' },
  { title: 'Marte en oposición a Plutón', body: 'Tensión entre lo que quieres y lo que sientes que tienes permitido querer. Nombrar la tensión en voz baja la calma más de lo que lo haría actuar sobre ella.' },
  { title: 'Sol en conjunción con Mercurio', body: 'La claridad llega al hablar, no al reflexionar más. Lo que dices ahora moldea cómo se desarrollan los próximos días.' },
  { title: 'Venus en cuadratura con Saturno', body: 'El cariño se enfrenta a una prueba práctica. La durabilidad de una relación se demuestra ahora con constancia, no con grandes declaraciones.' },
  { title: 'Júpiter en trígono con la Luna', body: 'La generosidad emocional abre puertas. Ser un poco más abierta de lo habitual da frutos de formas que no esperas de inmediato.' },
  { title: 'Mercurio en oposición a Neptuno', body: 'Los detalles se difuminan en los bordes — verifica dos veces todo lo que importa antes de comprometerte. No todo lo que oyes es el cuadro completo.' },
]
function astroEventsPool(locale: Locale): { title: string; body: string }[] {
  return locale === 'es' ? ASTRO_EVENTS_ES : ASTRO_EVENTS_EN
}

// Broader tabs earn genuinely more content instead of the same single card
// with its time-word swapped: Week/Month/Year surface several distinct,
// non-repeating highlights drawn from the same real aspect pool.
const EVENTS_PER_PERIOD: Record<HoroscopePeriod, number> = {
  Yesterday: 1, Today: 1, Tomorrow: 1, Week: 3, Month: 4, Year: 6,
}

// Yesterday/Today/Tomorrow are swiped side by side, so a same-sign collision
// between them reads as an obvious bug even if it's statistically rare (a
// pure per-period hash still has ~1-in-10 odds of two of the three landing
// on the same aspect, since there are only 10 in the pool). Those three
// slots are picked together, from a single ordered draw per sign, so they
// are always pairwise distinct — Week/Month/Year, which show multiple items
// at once anyway, keep the simpler independent-per-period dedup below.
const DAILY_PERIODS: HoroscopePeriod[] = ['Yesterday', 'Today', 'Tomorrow']

function pickDistinctIndices(seedBase: number, count: number, poolSize: number): number[] {
  const used = new Set<number>()
  const out: number[] = []
  let attempt = 0
  while (out.length < count && attempt < poolSize * 4) {
    const idx = hashSeed(seedBase, 97 + attempt * 17) % poolSize
    attempt++
    if (used.has(idx)) continue
    used.add(idx)
    out.push(idx)
  }
  return out
}

export function getAstrologyEvents(signId: string, period: HoroscopePeriod, locale: Locale = 'en') {
  const signIndex = ZODIAC_SIGNS.findIndex(s => s.id === signId)
  const periodIndex = HOROSCOPE_PERIODS.indexOf(period)
  const events = astroEventsPool(locale)

  if (DAILY_PERIODS.includes(period)) {
    const dailyIdx = pickDistinctIndices(signIndex, DAILY_PERIODS.length, events.length)
    const idx = dailyIdx[DAILY_PERIODS.indexOf(period)]
    const event = events[idx]
    return [{ title: event.title, body: applyPeriodWord(event.body, period, locale) }]
  }

  const count = Math.min(EVENTS_PER_PERIOD[period] ?? 1, events.length)
  const usedIdx = new Set<number>()
  const out: { title: string; body: string }[] = []
  let attempt = 0
  while (out.length < count && attempt < events.length * 4) {
    const idx = hashSeed(signIndex, periodIndex, 21 + attempt * 13) % events.length
    attempt++
    if (usedIdx.has(idx)) continue
    usedIdx.add(idx)
    const event = events[idx]
    out.push({ title: event.title, body: applyPeriodWord(event.body, period, locale) })
  }
  return out
}

// ─── Week/Month "pulse" strip ─────────────────────────────────────────────
// Swapping "today" for "this week" in the same three sentence-cards reads as
// a cosmetic re-label, not a genuinely different view — this is what made
// the Week/Month tabs feel like duplicates of Today even after their text
// stopped literally colliding. A pulse strip gives those two tabs a shape
// no daily tab has: a real day-by-day (Week) or week-by-week (Month) energy
// readout, still fully deterministic per sign — never Math.random().

const DAY_VIBES_EN = [
  'Focused', 'Social', 'Restful', 'Bold', 'Reflective',
  'Productive', 'Emotional', 'Adventurous', 'Grounded', 'Playful',
]
const DAY_VIBES_ES = [
  'Enfocado', 'Sociable', 'Relajado', 'Audaz', 'Reflexivo',
  'Productivo', 'Emocional', 'Aventurero', 'Centrado', 'Juguetón',
]

// A stable per-calendar-day integer (not time-of-day-sensitive) so the same
// date always yields the same snapshot no matter when in the day it's read.
function dateSeed(date: Date): number {
  return date.getFullYear() * 372 + date.getMonth() * 31 + date.getDate()
}

export interface DaySnapshot {
  date: Date
  energy: number
  vibe: string
}

export function getDaySnapshot(signId: string, date: Date, locale: Locale = 'en'): DaySnapshot {
  const signIndex = ZODIAC_SIGNS.findIndex(s => s.id === signId)
  const ds = dateSeed(date)
  return {
    date,
    energy: 42 + (hashSeed(signIndex, ds, 71) % 52), // 42-93, never a dead-flat 0/100
    vibe: pick(locale === 'es' ? DAY_VIBES_ES : DAY_VIBES_EN, hashSeed(signIndex, ds, 72)),
  }
}

/** The 7 days of the current week (Mon → Sun), for the Week tab's strip. */
export function getWeekDays(today: Date): Date[] {
  const day = today.getDay() // 0=Sun..6=Sat
  const mondayOffset = day === 0 ? -6 : 1 - day
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() + mondayOffset + i)
    d.setHours(0, 0, 0, 0)
    return d
  })
}

/** One representative date per week of the current month, for the Month tab. */
export function getMonthWeeks(today: Date): Date[] {
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
  const weeks: Date[] = []
  let cursor = new Date(firstOfMonth)
  while (cursor <= lastOfMonth) {
    weeks.push(new Date(cursor))
    cursor = new Date(cursor)
    cursor.setDate(cursor.getDate() + 7)
  }
  return weeks
}

const TIP_CATEGORIES_EN: { icon: string; label: string; texts: string[] }[] = [
  { icon: 'flower', label: 'Flowers', texts: [
    'Peonies suit your mood today — soft, layered, unhurried.',
    'A single stem says more today than a full bouquet would.',
    'Sunflowers match the direct energy the day is asking for.',
    'Something in a cool color grounds an otherwise restless day.',
  ]},
  { icon: 'bag', label: 'Shopping', texts: [
    'Hold off on anything over budget until tomorrow — today favors small, considered purchases.',
    'A practical item outshines a decorative one today.',
    'Something for the home settles better than something for going out.',
    'Second-guessing a purchase today is a genuine signal, not just noise.',
  ]},
  { icon: 'hat', label: 'Fashion', texts: [
    'Structure over softness today — a sharper silhouette matches your energy.',
    'One statement piece, everything else quiet.',
    'Comfort wins over impression today; dress for the version of the day you actually have.',
    'A color you don\'t normally reach for suits today\'s mood.',
  ]},
]
const TIP_CATEGORIES_ES: { icon: string; label: string; texts: string[] }[] = [
  { icon: 'flower', label: 'Flores', texts: [
    'Las peonías van con tu ánimo de hoy — suaves, con capas, sin prisa.',
    'Un solo tallo dice hoy más de lo que diría un ramo entero.',
    'Los girasoles combinan con la energía directa que pide el día.',
    'Algo en un color frío ancla un día por lo demás inquieto.',
  ]},
  { icon: 'bag', label: 'Compras', texts: [
    'Deja para mañana cualquier cosa que supere tu presupuesto — hoy favorece las compras pequeñas y meditadas.',
    'Un artículo práctico hoy supera a uno decorativo.',
    'Algo para la casa encaja mejor hoy que algo para salir.',
    'Dudar hoy de una compra es una señal real, no solo ruido.',
  ]},
  { icon: 'hat', label: 'Moda', texts: [
    'Hoy la estructura gana a la suavidad — una silueta más definida combina con tu energía.',
    'Una pieza llamativa, el resto discreto.',
    'Hoy la comodidad gana a la impresión; vístete para el día que realmente tienes.',
    'Un color que no sueles elegir le sienta bien al ánimo de hoy.',
  ]},
]

export function getPersonalTips(signId: string, period: HoroscopePeriod, locale: Locale = 'en') {
  const signIndex = ZODIAC_SIGNS.findIndex(s => s.id === signId)
  const periodIndex = HOROSCOPE_PERIODS.indexOf(period)
  const categories = locale === 'es' ? TIP_CATEGORIES_ES : TIP_CATEGORIES_EN
  return categories.map((cat, i) => ({
    icon: cat.icon,
    label: cat.label,
    text: applyPeriodWord(pick(cat.texts, hashSeed(signIndex, periodIndex, 31 + i)), period, locale),
  }))
}

const YES_POOL_EN = [
  'Start a new project', 'Go on an adventure', 'Communicate openly',
  'Trust a hunch', 'Ask for help', 'Finish something small', 'Reach out first',
  'Say no clearly', 'Rest on purpose', 'Revisit an old idea',
]
const YES_POOL_ES = [
  'Empezar un proyecto nuevo', 'Salir a una aventura', 'Comunicarte abiertamente',
  'Confiar en una corazonada', 'Pedir ayuda', 'Terminar algo pequeño', 'Dar tú el primer paso',
  'Decir que no con claridad', 'Descansar a propósito', 'Retomar una vieja idea',
]
const NO_POOL_EN = [
  'Rush decisions', 'Ignore self-care', 'Overspend impulsively',
  'Pick a fight over something small', 'Skip sleep for one more task',
  'Make a promise you\'re unsure of', 'Compare your day to someone else\'s',
  'Avoid a hard conversation', 'Overcommit your calendar', 'Numb out on screens',
]
const NO_POOL_ES = [
  'Apresurar decisiones', 'Descuidar el autocuidado', 'Gastar de más por impulso',
  'Buscar pelea por algo pequeño', 'Sacrificar el sueño por una tarea más',
  'Hacer una promesa de la que no estás segura', 'Comparar tu día con el de otra persona',
  'Evitar una conversación difícil', 'Sobrecargar tu agenda', 'Anestesiarte con pantallas',
]

export function getYesNoToday(signId: string, period: HoroscopePeriod, locale: Locale = 'en') {
  const signIndex = ZODIAC_SIGNS.findIndex(s => s.id === signId)
  const periodIndex = HOROSCOPE_PERIODS.indexOf(period)
  const pickThree = (pool: string[], salt: number) => {
    const out: string[] = []
    let i = 0
    while (out.length < 3) {
      const candidate = pick(pool, hashSeed(signIndex, periodIndex, salt + i * 7))
      if (!out.includes(candidate)) out.push(candidate)
      i++
    }
    return out
  }
  const yesPool = locale === 'es' ? YES_POOL_ES : YES_POOL_EN
  const noPool = locale === 'es' ? NO_POOL_ES : NO_POOL_EN
  return { yes: pickThree(yesPool, 41), no: pickThree(noPool, 42) }
}

// ─── "Readings" tab (Nebula-style: quizzes / challenges / daily practices) ────

export interface ReadingQuiz {
  id: string
  icon: string
  title: string
  minutes: number
  locked: boolean
}

const READING_QUIZZES_EN: ReadingQuiz[] = [
  { id: 'q1', icon: '🎩', title: 'What is your Witch Type?', minutes: 3, locked: false },
  { id: 'q2', icon: '🔥', title: 'What is your Shaman Path?', minutes: 3, locked: false },
  { id: 'q3', icon: '🌸', title: 'What is your Feminine Archetype?', minutes: 4, locked: true },
  { id: 'q4', icon: '🌗', title: 'What is your Moon Sign story?', minutes: 3, locked: true },
]
const READING_QUIZZES_ES: ReadingQuiz[] = [
  { id: 'q1', icon: '🎩', title: '¿Cuál es tu tipo de bruja?', minutes: 3, locked: false },
  { id: 'q2', icon: '🔥', title: '¿Cuál es tu camino chamánico?', minutes: 3, locked: false },
  { id: 'q3', icon: '🌸', title: '¿Cuál es tu arquetipo femenino?', minutes: 4, locked: true },
  { id: 'q4', icon: '🌗', title: '¿Cuál es la historia de tu signo lunar?', minutes: 3, locked: true },
]
export function getReadingQuizzes(locale: Locale = 'en'): ReadingQuiz[] {
  return locale === 'es' ? READING_QUIZZES_ES : READING_QUIZZES_EN
}
/** @deprecated use getReadingQuizzes(locale) */
export const READING_QUIZZES = READING_QUIZZES_EN

export interface ReadingChallenge {
  id: string
  days: number
  icon: string
  title: string
  desc: string
}

const READING_CHALLENGES_EN: ReadingChallenge[] = [
  { id: 'c1', days: 12, icon: '🌺', title: 'Free your feminine energy', desc: 'When your feminine energy is blocked, life can feel overwhelming and uninspired. This challenge helps you reconnect.' },
  { id: 'c2', days: 8, icon: '🧿', title: 'Unblock your emotional flow', desc: 'Balance your emotional energy centers with daily guided steps.' },
  { id: 'c3', days: 21, icon: '🌕', title: 'Align with the lunar cycle', desc: 'Sync your habits with the Moon\'s phases for steadier energy.' },
]
const READING_CHALLENGES_ES: ReadingChallenge[] = [
  { id: 'c1', days: 12, icon: '🌺', title: 'Libera tu energía femenina', desc: 'Cuando tu energía femenina está bloqueada, la vida puede sentirse abrumadora y sin inspiración. Este reto te ayuda a reconectar.' },
  { id: 'c2', days: 8, icon: '🧿', title: 'Desbloquea tu flujo emocional', desc: 'Equilibra tus centros de energía emocional con pasos guiados diarios.' },
  { id: 'c3', days: 21, icon: '🌕', title: 'Alinéate con el ciclo lunar', desc: 'Sincroniza tus hábitos con las fases de la Luna para una energía más estable.' },
]
export function getReadingChallenges(locale: Locale = 'en'): ReadingChallenge[] {
  return locale === 'es' ? READING_CHALLENGES_ES : READING_CHALLENGES_EN
}
/** @deprecated use getReadingChallenges(locale) */
export const READING_CHALLENGES = READING_CHALLENGES_EN

export interface ReadingPractice {
  id: string
  icon: string
  title: string
  type: 'Audio' | 'Article'
}

const READING_PRACTICES_EN: ReadingPractice[] = [
  { id: 'p1', icon: '🧘', title: 'Guided Starseed Meditation', type: 'Audio' },
  { id: 'p2', icon: '🔊', title: 'Sound Healing Practice', type: 'Audio' },
  { id: 'p3', icon: '🌌', title: 'Dream Interpretation Basics', type: 'Article' },
  { id: 'p4', icon: '🕯️', title: 'New Moon Intention Ritual', type: 'Audio' },
]
const READING_PRACTICES_ES: ReadingPractice[] = [
  { id: 'p1', icon: '🧘', title: 'Meditación guiada del alma estelar', type: 'Audio' },
  { id: 'p2', icon: '🔊', title: 'Práctica de sanación con sonido', type: 'Audio' },
  { id: 'p3', icon: '🌌', title: 'Fundamentos de interpretación de sueños', type: 'Article' },
  { id: 'p4', icon: '🕯️', title: 'Ritual de intención de luna nueva', type: 'Audio' },
]
export function getReadingPractices(locale: Locale = 'en'): ReadingPractice[] {
  return locale === 'es' ? READING_PRACTICES_ES : READING_PRACTICES_EN
}
/** @deprecated use getReadingPractices(locale) */
export const READING_PRACTICES = READING_PRACTICES_EN

// One-line personalization used at the top of the Readings tab — keyed by
// the same sign ids as ZODIAC_SIGNS/getZodiacSignFromDate, so "picked for
// you" reflects the real birth date collected at signup, not a guess.
const SIGN_READING_BLURB_EN: Record<string, string> = {
  aries: 'Bold energy suits fast, direct readings — start with the Shaman Path quiz.',
  taurus: 'You respond well to grounding practices — try the New Moon Intention Ritual.',
  gemini: 'Curiosity is your strength — the Witch Type quiz was made for a mind like yours.',
  cancer: 'Emotional depth is your gift — Sound Healing Practice will resonate today.',
  leo: 'You shine brightest with self-discovery — the Feminine Archetype quiz fits well.',
  virgo: 'You like structure — the 21-day lunar cycle challenge suits your pace.',
  libra: 'Balance is your theme — Dream Interpretation Basics is worth a read.',
  scorpio: 'Intensity is natural to you — the Moon Sign story quiz goes deep.',
  sagittarius: 'You crave meaning in motion — the Shaman Path quiz is a strong match.',
  capricorn: 'Discipline is your edge — a structured challenge will click for you.',
  aquarius: 'Original thinking suits you — the Witch Type quiz has an unconventional answer.',
  pisces: 'Intuition runs deep for you — Guided Starseed Meditation is worth the ten minutes.',
}
const SIGN_READING_BLURB_ES: Record<string, string> = {
  aries: 'La energía audaz encaja con lecturas rápidas y directas — empieza con el test del Camino chamánico.',
  taurus: 'Respondes bien a las prácticas de arraigo — prueba el Ritual de intención de luna nueva.',
  gemini: 'La curiosidad es tu fuerza — el test del Tipo de bruja se hizo para una mente como la tuya.',
  cancer: 'La profundidad emocional es tu don — hoy la Práctica de sanación con sonido resonará contigo.',
  leo: 'Brillas más a través del autodescubrimiento — el test del Arquetipo femenino te queda muy bien.',
  virgo: 'Te gusta la estructura — el reto de 21 días del ciclo lunar se ajusta a tu ritmo.',
  libra: 'El equilibrio es tu tema — vale la pena leer los Fundamentos de interpretación de sueños.',
  scorpio: 'La intensidad es natural en ti — el test de la Historia del signo lunar profundiza de verdad.',
  sagittarius: 'Buscas sentido en movimiento — el test del Camino chamánico encaja muy bien contigo.',
  capricorn: 'La disciplina es tu fuerte — un reto estructurado te va a funcionar.',
  aquarius: 'El pensamiento original te define — el test del Tipo de bruja te dará una respuesta poco convencional.',
  pisces: 'Tu intuición es profunda — vale la pena dedicar diez minutos a la Meditación guiada del alma estelar.',
}
export function getSignReadingBlurb(signId: string, locale: Locale = 'en'): string | undefined {
  return (locale === 'es' ? SIGN_READING_BLURB_ES : SIGN_READING_BLURB_EN)[signId]
}
/** @deprecated use getSignReadingBlurb(signId, locale) */
export const SIGN_READING_BLURB = SIGN_READING_BLURB_EN

// ─── Discover tab content (courses, articles, video practices) ───────────────
// Every item is tagged with a real category so the category chips actually
// filter the grid instead of just changing color when tapped.

export type DiscoverCategory = 'Energy' | 'Manifestation' | 'Relationships'

// REAL BUG FOUND (pre-launch audit): every course here used to have an
// `author` field with an invented name — "Daria Frost", "Victoria Starr",
// "Luna Verner", "Cyrus Mystery" — the exact same fabricated-psychic-persona
// pattern that was deliberately purged from the old EXPERTS array elsewhere
// in this file (see the "Mock Data" comment above) for being fake. Two of
// the four were also marked `comingSoon: false` ("available now"), but
// tapping the card did nothing either way — there's no course-viewing
// screen built yet. Per your call, this stays as an honest "coming soon"
// teaser rather than being deleted outright: no author byline (nothing to
// invent a name for), and every entry marked comingSoon so the UI doesn't
// claim any of them are actually available yet.
// `image` values are real, original AI-generated cover art — bold
// color-field + one clean icon, styled after Nebula's card-forward look but
// built entirely in Sensora's own palette (violet/magenta/gold). No stock
// photos, nothing borrowed. Embedded directly as base64 (see lib/discover-art.ts)
// rather than shipped as separate files under public/ — same convention the
// landing page already uses for its real screenshots.
// BATTLE-PASS REDESIGN (your call: "зроби діскавер як батл пас, за певну
// кількість доларів відкриваються якісь квізи, перший квіз після 20 доларів,
// інший після 50"): `locked: boolean` is gone — a quiz now unlocks once the
// signed-in client's real lifetime spend on paid chat minutes (summed from
// completed session transactions, same number shown on the Profile screen)
// reaches `unlockSpend` dollars. 0 means always unlocked. This rewards
// actually using Sensora, not just topping up a balance that's never spent.
export interface DiscoverQuiz {
  id: string
  icon: string
  title: string
  category: DiscoverCategory
  unlockSpend: number
  image: string
}

// Cut down from 6 quizzes to the 3 strongest ones (your call: "прибрати
// більшість квізів залишити тільки норм... максимально почистити"). Kept:
// dq4 (attachment style — the best hook, free to try), dq1 (manifestation
// blocks), dq3 (intuition blocks). Cut: dq2 (body wisdom, weaker/redundant
// hook), dq5 (near-duplicate of dq1's "vision board" theme), dq6 (the
// "magical archetype" quiz — cut specifically because it made confident,
// fortune-telling-style claims like "you can foresee events" or "past
// lives," which is exactly the kind of thing that could contradict what a
// real chatter says in a live reading afterward).
// EXPANDED (your call: "дописати квізи... по 3 квізи в одній стрічці"): back
// up to 6 quizzes so Discover is two rows of three. Ordered by unlockSpend so
// the grid reads as a ladder: free → $10 → $20 / $35 → $50 → $75.
const DISCOVER_QUIZZES_EN: DiscoverQuiz[] = [
  { id: 'dq4', icon: '\u{1F495}', title: 'What is your attachment style?', category: 'Relationships', unlockSpend: 0, image: DQ4_IMG },
  { id: 'dq5', icon: '\u{1F319}', title: 'How do you recharge your energy?', category: 'Energy', unlockSpend: 10, image: AR1_IMG },
  { id: 'dq1', icon: '\u{1F4A1}', title: 'Why isn’t your dream life a reality yet?', category: 'Manifestation', unlockSpend: 20, image: DQ1_IMG },
  { id: 'dq6', icon: '\u{1F54A}', title: 'What boundaries do you need?', category: 'Relationships', unlockSpend: 35, image: AR6_IMG },
  { id: 'dq3', icon: '✨', title: 'What’s blocking your intuition?', category: 'Energy', unlockSpend: 50, image: DQ3_IMG },
  { id: 'dq7', icon: '\u{1F31F}', title: 'What are you really reaching for?', category: 'Manifestation', unlockSpend: 75, image: AR5_IMG },
]
const DISCOVER_QUIZZES_ES: DiscoverQuiz[] = [
  { id: 'dq4', icon: '\u{1F495}', title: '¿Cuál es tu estilo de apego?', category: 'Relationships', unlockSpend: 0, image: DQ4_IMG },
  { id: 'dq5', icon: '\u{1F319}', title: '¿Cómo recargas tu energía?', category: 'Energy', unlockSpend: 10, image: AR1_IMG },
  { id: 'dq1', icon: '\u{1F4A1}', title: '¿Por qué tu vida soñada aún no es realidad?', category: 'Manifestation', unlockSpend: 20, image: DQ1_IMG },
  { id: 'dq6', icon: '\u{1F54A}', title: '¿Qué límites necesitas?', category: 'Relationships', unlockSpend: 35, image: AR6_IMG },
  { id: 'dq3', icon: '✨', title: '¿Qué está bloqueando tu intuición?', category: 'Energy', unlockSpend: 50, image: DQ3_IMG },
  { id: 'dq7', icon: '\u{1F31F}', title: '¿Qué estás buscando de verdad?', category: 'Manifestation', unlockSpend: 75, image: AR5_IMG },
]
export function getDiscoverQuizzes(locale: Locale = 'en'): DiscoverQuiz[] {
  return locale === 'es' ? DISCOVER_QUIZZES_ES : DISCOVER_QUIZZES_EN
}
/** @deprecated use getDiscoverQuizzes(locale) */
export const DISCOVER_QUIZZES = DISCOVER_QUIZZES_EN

export interface DiscoverArticle {
  id: string
  title: string
  excerpt: string
  category: DiscoverCategory
  readMins: number
  art: 'nebula' | 'moon' | 'lotus' | 'tarot'
  image: string
  locked: boolean
  body: string[]
}

const DISCOVER_ARTICLES_EN: DiscoverArticle[] = [
  { id: 'ar1', title: 'Grounding Your Energy Before a Big Decision', excerpt: 'A short daily practice to clear scattered thoughts before you choose.', category: 'Energy', readMins: 4, art: 'nebula', image: AR1_IMG, locked: false, body: [
    'Before you decide anything that matters, spend two minutes doing nothing but naming what you physically feel — tight shoulders, a fast pulse, a shallow breath. Decisions made from a scattered body tend to just repeat whatever pattern got you scattered in the first place.',
    'Ground yourself by picking one point of contact — your feet on the floor, your hands on a desk — and staying with that sensation for ten slow breaths. This isn\'t about clearing your mind completely, it\'s about giving your nervous system one steady thing to hold onto.',
    'Only once your breathing has actually slowed should you return to the decision. Notice whether the "right" choice still feels urgent, or whether some of that urgency was just unprocessed adrenaline. Real clarity is usually quieter than it first appears.',
  ] },
  { id: 'ar2', title: 'Writing a Manifestation List That Actually Works', excerpt: 'Why vague wishes fail and how to phrase intentions the universe can act on.', category: 'Manifestation', readMins: 5, art: 'moon', image: AR2_IMG, locked: true, body: [
    '"I want to be happier" gives you nothing to act on and nothing to notice when it happens. Specificity is what makes an intention usable — not because the universe needs exact wording, but because you do.',
    'Rewrite each wish as a sentence with a verb you control: not "more abundance" but "I ask for and accept help when I need it." Not "a better relationship" but "I say what I actually mean in the first conversation, not the fifth."',
    'Read your list once a week, not once a day — daily repetition turns into background noise fast. A weekly check-in keeps each line meaningful enough that you\'ll actually notice the moment it starts coming true.',
  ] },
  { id: 'ar3', title: 'Reading the Signs Your Relationship Is Healing', excerpt: 'Subtle shifts that mean a rocky patch is turning a corner.', category: 'Relationships', readMins: 6, art: 'lotus', image: AR3_IMG, locked: true, body: [
    'Healing rarely looks dramatic. The first sign is usually smaller: an argument that used to spiral for days now resolves in an hour, because one of you stopped needing to win it.',
    'Watch for repair attempts landing — a joke that lightens the room, an apology that gets accepted instead of relitigated. If those attempts are starting to work again, that\'s more meaningful than a single good week.',
    'The clearest sign is boredom returning in a good way: ordinary time together stops feeling like it needs to be managed. Calm is underrated evidence that something is actually working.',
  ] },
  { id: 'ar4', title: 'Clearing Stagnant Energy at Home', excerpt: 'A five-minute ritual for the spaces where you feel stuck.', category: 'Energy', readMins: 3, art: 'nebula', image: AR4_IMG, locked: false, body: [
    'Stagnation collects in the corners you stop seeing — the chair with clothes on it, the drawer you avoid opening. Start there, not with the whole room; finishing one small spot beats abandoning a big one.',
    'Open a window for the five minutes you\'re working, even in the cold. Moving air does something moving your hands alone doesn\'t — it changes how the room actually feels, not just how it looks.',
    'End by placing one object deliberately: a plant, a candle, anything you chose on purpose. It marks the space as tended again, which matters more than it sounds like it should.',
  ] },
  { id: 'ar5', title: 'The Difference Between Wanting and Attracting', excerpt: 'Why chasing an outcome pushes it away, and what to do instead.', category: 'Manifestation', readMins: 4, art: 'tarot', image: AR5_IMG, locked: true, body: [
    'Wanting is a state of lack — it\'s organized around not having something yet. Attracting, as the idea is usually meant, is acting from the version of you that already has it. Those two produce very different behavior.',
    'Chasing shows up as over-explaining, checking too often, over-preparing for rejection. Attracting looks like doing the work and then actually stepping back — not from indifference, but from trust that you\'ve done your part.',
    'If you notice yourself chasing, the fix isn\'t to want it less — it\'s to find one small action that doesn\'t depend on the outcome at all, and do that instead today.',
  ] },
  { id: 'ar6', title: 'How to Set a Boundary Without Guilt', excerpt: 'Scripts for the conversations you’ve been avoiding.', category: 'Relationships', readMins: 5, art: 'lotus', image: AR6_IMG, locked: true, body: [
    'Guilt shows up because most of us were taught that a boundary is a rejection. It isn\'t — it\'s information about what you can actually offer right now, which is more honest than agreeing and resenting it later.',
    'A boundary doesn\'t need a justification essay. "I can\'t take that on this week" is a complete sentence. Adding three paragraphs of reasons usually just invites someone to argue with the reasons.',
    'Expect the first few boundaries to feel terrible even when they\'re right — that discomfort is just unfamiliarity, not proof you did something wrong. It gets quieter each time.',
  ] },
]
const DISCOVER_ARTICLES_ES: DiscoverArticle[] = [
  { id: 'ar1', title: 'Cómo enraizar tu energía antes de una gran decisión', excerpt: 'Una práctica diaria corta para despejar pensamientos dispersos antes de elegir.', category: 'Energy', readMins: 4, art: 'nebula', image: AR1_IMG, locked: false, body: [
    'Antes de decidir algo que importa, dedica dos minutos solo a nombrar lo que sientes físicamente — hombros tensos, pulso rápido, respiración superficial. Las decisiones tomadas desde un cuerpo disperso suelen repetir el mismo patrón que causó la dispersión.',
    'Enraízate eligiendo un punto de contacto — tus pies en el suelo, tus manos en una mesa — y quédate con esa sensación durante diez respiraciones lentas. No se trata de vaciar la mente por completo, sino de darle a tu sistema nervioso algo estable a lo que sujetarse.',
    'Vuelve a la decisión solo cuando tu respiración realmente se haya calmado. Observa si la elección "correcta" todavía se siente urgente, o si parte de esa urgencia era solo adrenalina sin procesar. La claridad real suele ser más silenciosa de lo que parece al principio.',
  ] },
  { id: 'ar2', title: 'Cómo escribir una lista de manifestación que de verdad funcione', excerpt: 'Por qué los deseos vagos fallan y cómo formular intenciones con las que el universo pueda trabajar.', category: 'Manifestation', readMins: 5, art: 'moon', image: AR2_IMG, locked: true, body: [
    '"Quiero ser más feliz" no te da nada sobre lo que actuar ni nada que notar cuando suceda. La especificidad es lo que hace que una intención sea utilizable — no porque el universo necesite palabras exactas, sino porque tú las necesitas.',
    'Reescribe cada deseo como una frase con un verbo que controles: no "más abundancia" sino "pido y acepto ayuda cuando la necesito". No "una mejor relación" sino "digo lo que realmente quiero decir en la primera conversación, no en la quinta".',
    'Lee tu lista una vez por semana, no todos los días — la repetición diaria se convierte rápido en ruido de fondo. Una revisión semanal mantiene cada línea lo bastante significativa como para que realmente notes el momento en que empiece a cumplirse.',
  ] },
  { id: 'ar3', title: 'Cómo leer las señales de que tu relación está sanando', excerpt: 'Cambios sutiles que indican que una etapa difícil está dando la vuelta.', category: 'Relationships', readMins: 6, art: 'lotus', image: AR3_IMG, locked: true, body: [
    'Sanar rara vez se ve dramático. La primera señal suele ser más pequeña: una discusión que antes se alargaba días ahora se resuelve en una hora, porque uno de los dos dejó de necesitar ganarla.',
    'Fíjate en si los intentos de reparación empiezan a funcionar — un chiste que alivia el ambiente, una disculpa que se acepta en vez de volver a discutirse. Si esos intentos empiezan a surtir efecto de nuevo, eso importa más que una sola buena semana.',
    'La señal más clara es que vuelva el aburrimiento de buena manera: el tiempo ordinario juntos deja de sentirse como algo que hay que gestionar. La calma es una prueba subestimada de que algo realmente está funcionando.',
  ] },
  { id: 'ar4', title: 'Cómo limpiar la energía estancada en casa', excerpt: 'Un ritual de cinco minutos para los espacios donde te sientes estancada.', category: 'Energy', readMins: 3, art: 'nebula', image: AR4_IMG, locked: false, body: [
    'El estancamiento se acumula en los rincones que dejas de ver — la silla con ropa encima, el cajón que evitas abrir. Empieza ahí, no con toda la habitación; terminar un lugar pequeño es mejor que abandonar uno grande.',
    'Abre una ventana durante los cinco minutos que estés trabajando, incluso con frío. El aire en movimiento hace algo que mover solo las manos no hace — cambia cómo se siente realmente la habitación, no solo cómo se ve.',
    'Termina colocando un objeto a propósito: una planta, una vela, cualquier cosa elegida deliberadamente. Marca el espacio como cuidado de nuevo, y eso importa más de lo que parece.',
  ] },
  { id: 'ar5', title: 'La diferencia entre querer y atraer', excerpt: 'Por qué perseguir un resultado lo aleja, y qué hacer en su lugar.', category: 'Manifestation', readMins: 4, art: 'tarot', image: AR5_IMG, locked: true, body: [
    'Querer es un estado de carencia — se organiza alrededor de no tener algo todavía. Atraer, como se suele entender la idea, es actuar desde la versión de ti que ya lo tiene. Esos dos estados producen comportamientos muy distintos.',
    'Perseguir se nota en explicar de más, revisar demasiado seguido, prepararte en exceso para el rechazo. Atraer se parece a hacer el trabajo y luego dar realmente un paso atrás — no por indiferencia, sino por confianza en que ya hiciste tu parte.',
    'Si notas que estás persiguiendo, la solución no es querer menos — es encontrar una pequeña acción que no dependa en absoluto del resultado, y hacer eso hoy en su lugar.',
  ] },
  { id: 'ar6', title: 'Cómo poner un límite sin culpa', excerpt: 'Guiones para las conversaciones que has estado evitando.', category: 'Relationships', readMins: 5, art: 'lotus', image: AR6_IMG, locked: true, body: [
    'La culpa aparece porque a la mayoría nos enseñaron que un límite es un rechazo. No lo es — es información sobre lo que realmente puedes ofrecer ahora mismo, lo cual es más honesto que aceptar y resentirlo después.',
    'Un límite no necesita un ensayo de justificación. "No puedo encargarme de eso esta semana" es una frase completa. Añadir tres párrafos de razones suele solo invitar a que alguien discuta esas razones.',
    'Espera que los primeros límites se sientan horribles aunque sean correctos — esa incomodidad es solo falta de costumbre, no prueba de que hiciste algo mal. Se vuelve más tranquilo cada vez.',
  ] },
]
export function getDiscoverArticles(locale: Locale = 'en'): DiscoverArticle[] {
  return locale === 'es' ? DISCOVER_ARTICLES_ES : DISCOVER_ARTICLES_EN
}
/** @deprecated use getDiscoverArticles(locale) */
export const DISCOVER_ARTICLES = DISCOVER_ARTICLES_EN

// The "Watch & practice" video section used to live here (DISCOVER_VIDEOS +
// its PRACTICE_STEPS vi1-vi4 entries below) — removed at your request. No
// video content ships in Discover anymore.

// ─── Interactive quiz/practice content ─────────────────────────────────────
// Real questions and real guided steps, shared by the Discover and Readings
// screens so every card actually opens something to answer or follow instead
// of sitting there as a decorative button.

// An option can be a plain string (legacy quizzes — q1-q4 below, used by
// readings-screen.tsx) or a { text, outcome } pair. `outcome` is a short key
// (e.g. 'A'/'B'/'C'/'D') that QuizModal tallies across every question; the
// key with the most picks wins and its entry in `results` is shown. Quizzes
// with no `outcome` on any option (or no `results` map) just fall back to
// the single static `result` string, exactly like before — nothing about
// the older quizzes changes.
export type QuizOption = string | { text: string; outcome: string }

// `art` names one of the illustrations already in components/magic-art.tsx
// — real, in-brand icons (not stock photos or invented artwork), shown next
// to each question so every quiz has a thematic image instead of plain text.
export type QuizArtKey = 'moon' | 'crystal' | 'tarot' | 'zodiac' | 'nebula' | 'witch' | 'lotus' | 'crescent' | 'flame'

export interface QuizContent {
  questions: { q: string; art?: QuizArtKey; options: QuizOption[] }[]
  result?: string
  // Keyed by the same `outcome` strings used in `options` above.
  results?: Record<string, { title: string; body: string }>
}

const QUIZ_CONTENT_EN: Record<string, QuizContent> = {
  q1: {
    questions: [
      { q: 'A ritual works best for you when it is:', options: ['Precise and repeatable', 'Improvised in the moment', 'Shared with others'] },
      { q: 'You\'re drawn to:', options: ['Herbs and plants', 'Candles and fire', 'The moon and tides'] },
    ],
    result: 'Your Witch Type: the Hearth Keeper — grounded, practical magic built from repetition and care, not spectacle.',
  },
  q2: {
    questions: [
      { q: 'When something feels wrong, you:', options: ['Sit with the discomfort', 'Move your body until it shifts', 'Talk it through out loud'] },
      { q: 'Your energy usually runs:', options: ['Steady and slow-building', 'In sudden bursts', 'In cycles you can predict'] },
    ],
    result: 'Your Shaman Path: the Way of Fire — transformation through intensity, not avoidance. You process by moving through, not around.',
  },
  q3: {
    questions: [
      { q: 'You feel most yourself when:', options: ['Creating something', 'Comforting someone', 'Standing your ground'] },
      { q: 'Rest, to you, looks like:', options: ['Stillness and quiet', 'Being fully seen', 'Doing something with your hands'] },
    ],
    result: 'Your Feminine Archetype: the Weaver — you build steady, lasting things out of care that others don\'t always notice until it\'s gone.',
  },
  q4: {
    questions: [
      { q: 'Your emotions tend to:', options: ['Run deep and private', 'Show clearly on your face', 'Take a while to surface'] },
      { q: 'A full moon usually makes you feel:', options: ['Restless', 'Reflective', 'Unusually social'] },
    ],
    result: 'Your Moon Sign story: an internal world richer than most people ever see — you feel first and explain later, if at all.',
  },
  dq1: {
    questions: [
      { q: 'When an idea excites you, what usually happens next?', art: 'crystal', options: [
        { text: 'I write it down and wait for "the right time" to start.', outcome: 'A' },
        { text: 'I start planning every detail before taking a single step.', outcome: 'B' },
        { text: 'I jump in immediately, then lose momentum within days.', outcome: 'C' },
      ] },
      { q: 'Your biggest obstacle to your goals is usually:', art: 'moon', options: [
        { text: 'A feeling that it isn\'t the right moment yet.', outcome: 'A' },
        { text: 'Never feeling "ready enough" to begin.', outcome: 'B' },
        { text: 'Losing interest once it gets hard.', outcome: 'C' },
      ] },
      { q: 'When something doesn\'t go as planned, you:', art: 'flame', options: [
        { text: 'Take it as a sign to wait a little longer.', outcome: 'A' },
        { text: 'Redo the whole plan from scratch.', outcome: 'B' },
        { text: 'Assume it wasn\'t meant to be and move on.', outcome: 'C' },
      ] },
      { q: 'Looking back at a goal you didn\'t reach, the honest reason is:', art: 'tarot', options: [
        { text: 'You were waiting for permission that never came.', outcome: 'A' },
        { text: 'You never actually finished planning it.', outcome: 'B' },
        { text: 'You stopped at the first real obstacle.', outcome: 'C' },
      ] },
      { q: 'What would help you most right now?', art: 'nebula', options: [
        { text: 'A deadline that forces you to start today.', outcome: 'A' },
        { text: 'Permission to start messy and fix it later.', outcome: 'B' },
        { text: 'A reason to keep going past the first setback.', outcome: 'C' },
      ] },
    ],
    result: 'Your dream life isn\'t missing effort — it\'s missing a next action small enough to actually start today.',
    results: {
      A: { title: 'The Waiter', body: 'You\'re not lacking ambition — you\'re lacking a start date. Somewhere along the way "the right time" became a condition instead of a choice, and conditions can always be pushed back one more week. Pick something small enough to do today, before you feel ready.' },
      B: { title: 'The Perfectionist', body: 'Planning has quietly become a way to feel productive without risking failure — a finished plan can\'t go wrong, because it never has to leave the page. Your next chapter starts the day you let a plan be good enough instead of complete.' },
      C: { title: 'The Doubter', body: 'You start strong, but the first real obstacle gets treated as proof it wasn\'t meant to be, when it\'s usually just proof you\'re doing something that matters. The goal isn\'t fewer setbacks — it\'s deciding in advance that one setback doesn\'t end the attempt.' },
    },
  },
  dq3: {
    questions: [
      { q: 'When your gut says one thing and logic says another, you usually:', art: 'witch', options: [
        { text: 'Trust the gut — logic is often just catching up.', outcome: 'A' },
        { text: 'Doubt the gut and wait for proof before I act.', outcome: 'B' },
        { text: 'Freeze between them and end up deciding late, or not at all.', outcome: 'C' },
      ] },
      { q: 'Before a big decision, your mind is usually:', art: 'crystal', options: [
        { text: 'Fairly quiet — I already have a sense of the answer.', outcome: 'A' },
        { text: 'Looping the same worry over and over.', outcome: 'B' },
        { text: 'Full of other people\'s opinions I can\'t filter out.', outcome: 'C' },
      ] },
      { q: 'When a gut feeling has been wrong before, what did you take from it?', art: 'nebula', options: [
        { text: 'It happens sometimes — I still trust myself overall.', outcome: 'A' },
        { text: 'That I probably can\'t trust my instincts.', outcome: 'B' },
        { text: 'I\'m honestly not sure — too much else was going on to tell.', outcome: 'C' },
      ] },
      { q: 'Your environment right before you need to decide something is usually:', art: 'tarot', options: [
        { text: 'Quiet enough that I can actually think.', outcome: 'A' },
        { text: 'Quiet, but my mind isn\'t.', outcome: 'B' },
        { text: 'Full of notifications, opinions, and noise.', outcome: 'C' },
      ] },
      { q: 'What would help you trust your intuition more?', art: 'flame', options: [
        { text: 'Nothing much — I mostly already do.', outcome: 'A' },
        { text: 'Proof that it\'s right before I commit to it.', outcome: 'B' },
        { text: 'Fewer voices in my head that aren\'t mine.', outcome: 'C' },
      ] },
    ],
    result: 'What\'s blocking your intuition is usually the freeze, not the signal — your gut is already answering, you\'re just not letting it finish.',
    results: {
      A: { title: 'Nothing much — you\'re already listening', body: 'Your intuition and your decisions are mostly in sync — the block, when it happens, is small and temporary rather than a pattern. Keep the quiet moments before a decision; that\'s what\'s letting the signal through. (This is a light self-reflection prompt, not a clinical assessment.)' },
      B: { title: 'Self-Doubt', body: 'The signal is coming through fine — it\'s the demand for proof beforehand that\'s blocking it. Intuition rarely arrives with evidence attached; it arrives first, and the evidence catches up after you\'ve already acted on it a few times. (This is a light self-reflection prompt, not a clinical assessment.)' },
      C: { title: 'Noise & Distraction', body: 'Your own intuition isn\'t weak — it\'s just outnumbered by everyone else\'s opinions and a constant stream of notifications. Ten quiet minutes with no input from anyone else, before you decide anything that matters, is often all it takes to hear it again. (This is a light self-reflection prompt, not a clinical assessment.)' },
    },
  },
  dq4: {
    questions: [
      { q: 'In a new relationship, you tend to:', art: 'lotus', options: [
        { text: 'Get close at a steady pace and trust it to hold.', outcome: 'A' },
        { text: 'Move close quickly, then worry about losing it.', outcome: 'B' },
        { text: 'Keep some distance, even when things are going well.', outcome: 'C' },
      ] },
      { q: 'When a partner doesn\'t reply for a few hours, you:', art: 'crescent', options: [
        { text: 'Assume they\'re busy and carry on with your day.', outcome: 'A' },
        { text: 'Start replaying the last conversation for what went wrong.', outcome: 'B' },
        { text: 'Barely notice — and if I do, I don\'t chase it.', outcome: 'C' },
      ] },
      { q: 'Conflict in a relationship makes you want to:', art: 'tarot', options: [
        { text: 'Talk it through, even if it\'s uncomfortable.', outcome: 'A' },
        { text: 'Fix it immediately — I can\'t sit with the tension.', outcome: 'B' },
        { text: 'Pull back and handle it on my own first.', outcome: 'C' },
      ] },
      { q: 'What you need most from a partner is:', art: 'zodiac', options: [
        { text: 'Consistency — showing up is more important than grand gestures.', outcome: 'A' },
        { text: 'Frequent reassurance that I still matter to them.', outcome: 'B' },
        { text: 'Enough space to still feel like my own person.', outcome: 'C' },
      ] },
      { q: 'Being fully depended on by someone feels:', art: 'moon', options: [
        { text: 'Natural, as long as it goes both ways.', outcome: 'A' },
        { text: 'Reassuring — it means they won\'t leave.', outcome: 'B' },
        { text: 'A little heavy, even when I care about them.', outcome: 'C' },
      ] },
    ],
    result: 'Your attachment style leans toward needing consistency more than intensity — steady reassurance matters more to you than grand gestures.',
    results: {
      A: { title: 'Secure', body: 'You tend to trust that a relationship can hold both closeness and honesty at the same time — conflict doesn\'t feel like a threat to the whole thing. This isn\'t about not having doubts; it\'s that you can voice them without expecting the relationship to end over it. (This is a light self-reflection prompt, not a clinical assessment.)' },
      B: { title: 'Anxious', body: 'Silence or distance from someone you care about tends to read as danger, even when nothing is actually wrong — so you reach for reassurance to quiet that alarm. The goal isn\'t to need less; it\'s learning to sit with a few hours of not-knowing without treating it as proof of loss. (This is a light self-reflection prompt, not a clinical assessment.)' },
      C: { title: 'Avoidant', body: 'Closeness is fine in smaller doses — it\'s the feeling of being fully depended on, or fully needing someone, that tends to make you pull back. That instinct once kept you safe; the practice now is staying in the room for one more uncomfortable minute instead of automatically creating space. (This is a light self-reflection prompt, not a clinical assessment.)' },
    },
  },
  // ADDED (your call: "дописати квізи" — 3 new quizzes so Discover has 6, two
  // rows of three). Same shape/tone as dq1/dq3/dq4: light self-reflection,
  // three outcomes, no predictions or confident claims about the future.
  dq5: {
    questions: [
      { q: 'After a draining week, what sounds best?', art: 'moon', options: [
        { text: 'A quiet evening completely to myself.', outcome: 'A' },
        { text: 'Dinner with a few people who get me.', outcome: 'B' },
        { text: 'A long walk, a workout, or a dance class.', outcome: 'C' },
      ] },
      { q: 'When you feel overwhelmed, your first instinct is to:', art: 'crescent', options: [
        { text: 'Close the door and be still.', outcome: 'A' },
        { text: 'Call or text someone.', outcome: 'B' },
        { text: 'Move my body until it eases.', outcome: 'C' },
      ] },
      { q: 'Your ideal free Sunday looks like:', art: 'lotus', options: [
        { text: 'A slow morning, a book, no plans.', outcome: 'A' },
        { text: 'Brunch and a long conversation.', outcome: 'B' },
        { text: 'A hike, a swim, or something active outside.', outcome: 'C' },
      ] },
      { q: 'You know you\'ve recharged when:', art: 'nebula', options: [
        { text: 'My head finally feels quiet.', outcome: 'A' },
        { text: 'I feel connected to someone again.', outcome: 'B' },
        { text: 'My body feels light and awake.', outcome: 'C' },
      ] },
    ],
    result: 'You recharge in a way that\'s specific to you — and noticing it is the first step to protecting it.',
    results: {
      A: { title: 'The Quiet Recharger', body: 'Your energy comes back in stillness. Time alone isn\'t avoidance for you — it\'s how you refill. The practice is protecting that time before the week is full, instead of hoping a gap appears. (This is a light self-reflection prompt, not a clinical assessment.)' },
      B: { title: 'The Connected Recharger', body: 'You refill through other people — the right conversation can reset a whole week. The practice is choosing who you recharge with, since the wrong company can drain what the right company restores. (This is a light self-reflection prompt, not a clinical assessment.)' },
      C: { title: 'The Moving Recharger', body: 'Stress sits in your body, and movement is how you release it. Thinking your way out rarely works for you — a walk usually does. The practice is moving earlier, before the overwhelm builds. (This is a light self-reflection prompt, not a clinical assessment.)' },
    },
  },
  dq6: {
    questions: [
      { q: 'A friend asks for a last-minute favor when you\'re tired. You:', art: 'witch', options: [
        { text: 'Say yes, then resent how much of my week it took.', outcome: 'A' },
        { text: 'Help, but carry their stress around for days.', outcome: 'B' },
        { text: 'Want to say no but can\'t find the words.', outcome: 'C' },
      ] },
      { q: 'After spending time with someone who\'s upset, you tend to:', art: 'crystal', options: [
        { text: 'Realize my own plans got pushed aside.', outcome: 'A' },
        { text: 'Take their mood home with me.', outcome: 'B' },
        { text: 'Leave without having said what I needed.', outcome: 'C' },
      ] },
      { q: 'The hardest sentence for you to say is:', art: 'tarot', options: [
        { text: '"I can\'t this week."', outcome: 'A' },
        { text: '"That\'s not mine to fix."', outcome: 'B' },
        { text: '"This is what I need."', outcome: 'C' },
      ] },
      { q: 'What would help most right now?', art: 'flame', options: [
        { text: 'A calendar with some space deliberately left empty.', outcome: 'A' },
        { text: 'A way to separate my feelings from theirs.', outcome: 'B' },
        { text: 'One simple sentence I can say without over-explaining.', outcome: 'C' },
      ] },
    ],
    result: 'The boundary you need most is usually the one you find hardest to say out loud.',
    results: {
      A: { title: 'A Time Boundary', body: 'Your yeses are generous, but they add up faster than your hours do. The boundary you need is around your calendar — not saying no to people, but saying "not this week" before you\'re already exhausted. (This is a light self-reflection prompt, not a clinical assessment.)' },
      B: { title: 'An Emotional Boundary', body: 'You feel other people\'s moods as if they were yours. That\'s empathy, but it needs an edge. The boundary is a small ritual of handing the feeling back — "this is theirs, I can care without carrying it." (This is a light self-reflection prompt, not a clinical assessment.)' },
      C: { title: 'A Communication Boundary', body: 'You often know what you need long before you say it. The boundary isn\'t a wall — it\'s a short, kind sentence said early, instead of a long explanation said too late. (This is a light self-reflection prompt, not a clinical assessment.)' },
    },
  },
  dq7: {
    questions: [
      { q: 'When you picture your ideal year, the first thing you see is:', art: 'zodiac', options: [
        { text: 'A calm, secure home and routine.', outcome: 'A' },
        { text: 'A new challenge or a skill I\'ve mastered.', outcome: 'B' },
        { text: 'More time with people who feel like family.', outcome: 'C' },
      ] },
      { q: 'You feel most energized when:', art: 'flame', options: [
        { text: 'Things feel stable and predictable.', outcome: 'A' },
        { text: 'I\'m learning something that stretches me.', outcome: 'B' },
        { text: 'I\'m surrounded by people I love.', outcome: 'C' },
      ] },
      { q: 'A free weekend and a free budget. You:', art: 'crystal', options: [
        { text: 'Make my space exactly how I want it.', outcome: 'A' },
        { text: 'Take a course or a trip on my own.', outcome: 'B' },
        { text: 'Host or visit the people I miss.', outcome: 'C' },
      ] },
      { q: 'The thing you\'d regret not trying is:', art: 'moon', options: [
        { text: 'Building real security.', outcome: 'A' },
        { text: 'Stretching beyond what\'s comfortable.', outcome: 'B' },
        { text: 'Deepening a relationship that matters.', outcome: 'C' },
      ] },
    ],
    result: 'What you keep reaching for says a lot about what you value right now.',
    results: {
      A: { title: 'Stability', body: 'What you keep reaching for is steadiness — a home, a rhythm, something you can rely on. That\'s a real value, not a lack of ambition. The reflection is whether your current plans actually build it, or just talk about it. (This is a light self-reflection prompt, not a clinical assessment.)' },
      B: { title: 'Growth', body: 'You reach for challenge — the version of you that\'s a bit better at something than last year. The reflection is making sure the stretch has a direction, so growth doesn\'t turn into restlessness. (This is a light self-reflection prompt, not a clinical assessment.)' },
      C: { title: 'Connection', body: 'You keep reaching for people — closeness, belonging, being known. The reflection is whether your time currently goes to the relationships you\'d actually choose, or just the ones that are easiest to keep. (This is a light self-reflection prompt, not a clinical assessment.)' },
    },
  },
}

const QUIZ_CONTENT_ES: Record<string, QuizContent> = {
  q1: {
    questions: [
      { q: 'Un ritual te funciona mejor cuando es:', options: ['Preciso y repetible', 'Improvisado en el momento', 'Compartido con otros'] },
      { q: 'Te atraen:', options: ['Las hierbas y las plantas', 'Las velas y el fuego', 'La luna y las mareas'] },
    ],
    result: 'Tu tipo de bruja: la Guardiana del hogar — magia práctica y arraigada, construida con repetición y cuidado, no con espectáculo.',
  },
  q2: {
    questions: [
      { q: 'Cuando algo se siente mal, tú:', options: ['Te quedas con la incomodidad', 'Mueves el cuerpo hasta que cambia', 'Lo hablas en voz alta'] },
      { q: 'Tu energía suele ser:', options: ['Estable y de crecimiento lento', 'En ráfagas repentinas', 'En ciclos predecibles'] },
    ],
    result: 'Tu camino chamánico: el Camino del Fuego — transformación a través de la intensidad, no de la evasión. Procesas atravesando, no rodeando.',
  },
  q3: {
    questions: [
      { q: 'Te sientes más tú misma cuando:', options: ['Creas algo', 'Consuelas a alguien', 'Defiendes tu posición'] },
      { q: 'El descanso, para ti, se parece a:', options: ['Quietud y silencio', 'Ser vista por completo', 'Hacer algo con las manos'] },
    ],
    result: 'Tu arquetipo femenino: la Tejedora — construyes cosas estables y duraderas con un cuidado que otros no siempre notan hasta que desaparece.',
  },
  q4: {
    questions: [
      { q: 'Tus emociones tienden a:', options: ['Ser profundas y privadas', 'Mostrarse claramente en tu rostro', 'Tardar en salir a la superficie'] },
      { q: 'La luna llena suele hacerte sentir:', options: ['Inquieta', 'Reflexiva', 'Inusualmente sociable'] },
    ],
    result: 'La historia de tu signo lunar: un mundo interior más rico de lo que la mayoría llega a ver — sientes primero y explicas después, si es que lo haces.',
  },
  dq1: {
    questions: [
      { q: '¿Qué suele pasar cuando una idea te emociona?', art: 'crystal', options: [
        { text: 'La anoto y espero "el momento adecuado" para empezar.', outcome: 'A' },
        { text: 'Empiezo a planear cada detalle antes de dar un solo paso.', outcome: 'B' },
        { text: 'Me lanzo de inmediato y luego pierdo el impulso en pocos días.', outcome: 'C' },
      ] },
      { q: 'Tu mayor obstáculo para tus metas suele ser:', art: 'moon', options: [
        { text: 'La sensación de que todavía no es el momento adecuado.', outcome: 'A' },
        { text: 'Nunca sentirte "lo suficientemente lista" para empezar.', outcome: 'B' },
        { text: 'Perder el interés en cuanto se complica.', outcome: 'C' },
      ] },
      { q: 'Cuando algo no sale como lo planeaste, tú:', art: 'flame', options: [
        { text: 'Lo tomas como una señal de esperar un poco más.', outcome: 'A' },
        { text: 'Rehaces todo el plan desde cero.', outcome: 'B' },
        { text: 'Asumes que no estaba destinado a ser y sigues adelante.', outcome: 'C' },
      ] },
      { q: 'Mirando atrás a una meta que no alcanzaste, la razón honesta es:', art: 'tarot', options: [
        { text: 'Estabas esperando un permiso que nunca llegó.', outcome: 'A' },
        { text: 'Nunca terminaste realmente de planearlo.', outcome: 'B' },
        { text: 'Te detuviste en el primer obstáculo real.', outcome: 'C' },
      ] },
      { q: '¿Qué te ayudaría más justo ahora?', art: 'nebula', options: [
        { text: 'Una fecha límite que te obligue a empezar hoy.', outcome: 'A' },
        { text: 'Permiso para empezar de forma imperfecta y arreglarlo después.', outcome: 'B' },
        { text: 'Una razón para seguir después del primer tropiezo.', outcome: 'C' },
      ] },
    ],
    result: 'A tu vida soñada no le falta esfuerzo — le falta una siguiente acción lo bastante pequeña como para empezar hoy de verdad.',
    results: {
      A: { title: 'La que espera', body: 'No te falta ambición — te falta una fecha de inicio. En algún momento "el momento adecuado" se convirtió en una condición en lugar de una elección, y las condiciones siempre se pueden posponer una semana más. Elige algo lo bastante pequeño para hacer hoy, antes de sentirte lista.' },
      B: { title: 'La perfeccionista', body: 'Planear se ha convertido silenciosamente en una forma de sentirte productiva sin arriesgarte a fallar — un plan terminado no puede salir mal, porque nunca tiene que salir del papel. Tu próximo capítulo empieza el día en que dejes que un plan sea suficientemente bueno en lugar de completo.' },
      C: { title: 'La que duda', body: 'Empiezas con fuerza, pero tratas el primer obstáculo real como prueba de que no estaba destinado a ser, cuando suele ser solo prueba de que estás haciendo algo que importa. La meta no es tener menos tropiezos — es decidir de antemano que un tropiezo no termina el intento.' },
    },
  },
  dq3: {
    questions: [
      { q: 'Cuando tu instinto dice una cosa y la lógica otra, tú normalmente:', art: 'witch', options: [
        { text: 'Confías en el instinto — la lógica suele solo ir detrás.', outcome: 'A' },
        { text: 'Dudas del instinto y esperas pruebas antes de actuar.', outcome: 'B' },
        { text: 'Te paralizas entre los dos y terminas decidiendo tarde, o no decides.', outcome: 'C' },
      ] },
      { q: 'Antes de una gran decisión, tu mente suele estar:', art: 'crystal', options: [
        { text: 'Bastante tranquila — ya tengo una idea de la respuesta.', outcome: 'A' },
        { text: 'Repitiendo la misma preocupación una y otra vez.', outcome: 'B' },
        { text: 'Llena de opiniones ajenas que no puedo filtrar.', outcome: 'C' },
      ] },
      { q: 'Cuando una corazonada resultó equivocada antes, ¿qué aprendiste de eso?', art: 'nebula', options: [
        { text: 'A veces pasa — en general sigo confiando en mí misma.', outcome: 'A' },
        { text: 'Que probablemente no puedo confiar en mis instintos.', outcome: 'B' },
        { text: 'Sinceramente no estoy segura — pasaba demasiado para saberlo.', outcome: 'C' },
      ] },
      { q: 'Tu entorno justo antes de tener que decidir algo suele ser:', art: 'tarot', options: [
        { text: 'Lo bastante tranquilo como para pensar de verdad.', outcome: 'A' },
        { text: 'Tranquilo, pero mi mente no lo está.', outcome: 'B' },
        { text: 'Lleno de notificaciones, opiniones y ruido.', outcome: 'C' },
      ] },
      { q: '¿Qué te ayudaría a confiar más en tu intuición?', art: 'flame', options: [
        { text: 'No mucho — en general ya lo hago.', outcome: 'A' },
        { text: 'Una prueba de que tiene razón antes de comprometerme.', outcome: 'B' },
        { text: 'Menos voces en mi cabeza que no son la mía.', outcome: 'C' },
      ] },
    ],
    result: 'Lo que bloquea tu intuición suele ser la parálisis, no la señal — tu instinto ya está respondiendo, solo no lo dejas terminar.',
    results: {
      A: { title: 'No mucho — ya estás escuchando', body: 'Tu intuición y tus decisiones están en general sincronizadas — el bloqueo, cuando ocurre, es pequeño y temporal, no un patrón. Conserva los momentos de calma antes de decidir; eso es lo que deja pasar la señal. (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
      B: { title: 'Inseguridad', body: 'La señal llega bien — lo que la bloquea es la exigencia de pruebas por adelantado. La intuición rara vez llega con evidencia; llega primero, y la evidencia la alcanza después de que ya actuaste sobre ella unas cuantas veces. (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
      C: { title: 'Ruido y distracción', body: 'Tu propia intuición no es débil — simplemente la superan en número las opiniones de los demás y un flujo constante de notificaciones. Diez minutos de silencio sin ninguna opinión externa, antes de decidir algo que importa, suele ser todo lo que se necesita para volver a escucharla. (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
    },
  },
  dq4: {
    questions: [
      { q: 'En una relación nueva, tú tiendes a:', art: 'lotus', options: [
        { text: 'Acercarte a un ritmo estable y confiar en que se sostendrá.', outcome: 'A' },
        { text: 'Acercarte rápido, y luego preocuparte por perderlo.', outcome: 'B' },
        { text: 'Mantener cierta distancia, incluso cuando todo va bien.', outcome: 'C' },
      ] },
      { q: 'Cuando tu pareja no responde en unas horas, tú:', art: 'crescent', options: [
        { text: 'Asumes que está ocupada y sigues con tu día.', outcome: 'A' },
        { text: 'Empiezas a repasar la última conversación buscando qué salió mal.', outcome: 'B' },
        { text: 'Apenas lo notas — y si lo noto, no insisto.', outcome: 'C' },
      ] },
      { q: 'El conflicto en una relación te hace querer:', art: 'tarot', options: [
        { text: 'Hablarlo, aunque sea incómodo.', outcome: 'A' },
        { text: 'Arreglarlo de inmediato — no puedo quedarme con la tensión.', outcome: 'B' },
        { text: 'Retirarte y lidiar con ello sola primero.', outcome: 'C' },
      ] },
      { q: 'Lo que más necesitas de una pareja es:', art: 'zodiac', options: [
        { text: 'Constancia — que esté presente importa más que los gestos grandiosos.', outcome: 'A' },
        { text: 'Que me asegure con frecuencia que todavía le importo.', outcome: 'B' },
        { text: 'Suficiente espacio para seguir sintiéndome yo misma.', outcome: 'C' },
      ] },
      { q: 'Que alguien dependa por completo de ti se siente:', art: 'moon', options: [
        { text: 'Natural, siempre que sea mutuo.', outcome: 'A' },
        { text: 'Reconfortante — significa que no se va a ir.', outcome: 'B' },
        { text: 'Un poco pesado, aunque me importe de verdad.', outcome: 'C' },
      ] },
    ],
    result: 'Tu estilo de apego se inclina más hacia necesitar constancia que intensidad — la seguridad estable te importa más que los gestos grandiosos.',
    results: {
      A: { title: 'Seguro', body: 'Tiendes a confiar en que una relación puede sostener cercanía y honestidad a la vez — el conflicto no se siente como una amenaza para todo lo demás. No se trata de no tener dudas; se trata de poder expresarlas sin esperar que la relación termine por eso. (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
      B: { title: 'Ansioso', body: 'El silencio o la distancia de alguien que te importa suele leerse como peligro, incluso cuando en realidad nada está mal — así que buscas que te tranquilicen para calmar esa alarma. La meta no es necesitar menos; es aprender a quedarte con unas horas de no saber sin tratarlo como prueba de pérdida. (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
      C: { title: 'Evasivo', body: 'La cercanía está bien en dosis pequeñas — es la sensación de que alguien depende por completo de ti, o de necesitar por completo a alguien, lo que suele hacerte retirarte. Ese instinto una vez te mantuvo a salvo; la práctica ahora es quedarte en la sala un minuto incómodo más en lugar de crear distancia automáticamente. (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
    },
  },
  dq5: {
    questions: [
      { q: 'Después de una semana agotadora, ¿qué suena mejor?', art: 'moon', options: [
        { text: 'Una tarde tranquila totalmente para mí.', outcome: 'A' },
        { text: 'Una cena con pocas personas que me entienden.', outcome: 'B' },
        { text: 'Una caminata larga, ejercicio o una clase de baile.', outcome: 'C' },
      ] },
      { q: 'Cuando te sientes abrumada, tu primer instinto es:', art: 'crescent', options: [
        { text: 'Cerrar la puerta y quedarme quieta.', outcome: 'A' },
        { text: 'Llamar o escribirle a alguien.', outcome: 'B' },
        { text: 'Mover el cuerpo hasta que se calme.', outcome: 'C' },
      ] },
      { q: 'Tu domingo libre ideal se ve así:', art: 'lotus', options: [
        { text: 'Una mañana lenta, un libro, sin planes.', outcome: 'A' },
        { text: 'Un brunch y una larga conversación.', outcome: 'B' },
        { text: 'Una excursión, nadar o algo activo al aire libre.', outcome: 'C' },
      ] },
      { q: 'Sabes que te has recargado cuando:', art: 'nebula', options: [
        { text: 'Por fin mi cabeza se siente en calma.', outcome: 'A' },
        { text: 'Me siento conectada con alguien otra vez.', outcome: 'B' },
        { text: 'Mi cuerpo se siente ligero y despierto.', outcome: 'C' },
      ] },
    ],
    result: 'Te recargas de una forma que es solo tuya — y notarla es el primer paso para protegerla.',
    results: {
      A: { title: 'La que se recarga en calma', body: 'Tu energía vuelve en la quietud. El tiempo a solas no es evasión para ti — es cómo te llenas de nuevo. La práctica es proteger ese tiempo antes de que la semana se llene, en lugar de esperar a que aparezca un hueco. (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
      B: { title: 'La que se recarga conectando', body: 'Te llenas a través de otras personas — la conversación adecuada puede reiniciar toda una semana. La práctica es elegir con quién te recargas, porque la compañía equivocada puede agotar lo que la adecuada restaura. (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
      C: { title: 'La que se recarga en movimiento', body: 'El estrés se queda en tu cuerpo y el movimiento es cómo lo sueltas. Pensar para salir del paso rara vez te funciona — una caminata casi siempre sí. La práctica es moverte antes, antes de que el agobio crezca. (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
    },
  },
  dq6: {
    questions: [
      { q: 'Una amiga te pide un favor de última hora cuando estás cansada. Tú:', art: 'witch', options: [
        { text: 'Digo que sí y luego me molesta cuánto de mi semana se llevó.', outcome: 'A' },
        { text: 'Ayudo, pero cargo con su estrés durante días.', outcome: 'B' },
        { text: 'Quiero decir que no pero no encuentro las palabras.', outcome: 'C' },
      ] },
      { q: 'Después de pasar tiempo con alguien que está mal, sueles:', art: 'crystal', options: [
        { text: 'Darme cuenta de que mis propios planes quedaron de lado.', outcome: 'A' },
        { text: 'Llevarme su estado de ánimo a casa.', outcome: 'B' },
        { text: 'Irme sin haber dicho lo que necesitaba.', outcome: 'C' },
      ] },
      { q: 'La frase que más te cuesta decir es:', art: 'tarot', options: [
        { text: '"Esta semana no puedo."', outcome: 'A' },
        { text: '"Eso no me toca a mí arreglarlo."', outcome: 'B' },
        { text: '"Esto es lo que necesito."', outcome: 'C' },
      ] },
      { q: '¿Qué te ayudaría más ahora mismo?', art: 'flame', options: [
        { text: 'Un calendario con algo de espacio vacío a propósito.', outcome: 'A' },
        { text: 'Una forma de separar mis sentimientos de los suyos.', outcome: 'B' },
        { text: 'Una frase simple que pueda decir sin sobreexplicar.', outcome: 'C' },
      ] },
    ],
    result: 'El límite que más necesitas suele ser el que más te cuesta decir en voz alta.',
    results: {
      A: { title: 'Un límite de tiempo', body: 'Tus síes son generosos, pero se acumulan más rápido que tus horas. El límite que necesitas está en tu calendario — no decir no a la gente, sino decir "esta semana no" antes de estar agotada. (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
      B: { title: 'Un límite emocional', body: 'Sientes el estado de ánimo de los demás como si fuera tuyo. Eso es empatía, pero necesita un borde. El límite es un pequeño ritual de devolver el sentimiento — "esto es suyo, puedo importarme sin cargarlo". (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
      C: { title: 'Un límite de comunicación', body: 'A menudo sabes lo que necesitas mucho antes de decirlo. El límite no es un muro — es una frase corta y amable dicha pronto, en lugar de una explicación larga dicha demasiado tarde. (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
    },
  },
  dq7: {
    questions: [
      { q: 'Cuando imaginas tu año ideal, lo primero que ves es:', art: 'zodiac', options: [
        { text: 'Un hogar y una rutina tranquilos y seguros.', outcome: 'A' },
        { text: 'Un nuevo reto o una habilidad dominada.', outcome: 'B' },
        { text: 'Más tiempo con personas que se sienten como familia.', outcome: 'C' },
      ] },
      { q: 'Te sientes con más energía cuando:', art: 'flame', options: [
        { text: 'Todo se siente estable y predecible.', outcome: 'A' },
        { text: 'Estoy aprendiendo algo que me exige.', outcome: 'B' },
        { text: 'Estoy rodeada de gente que quiero.', outcome: 'C' },
      ] },
      { q: 'Un fin de semana libre y presupuesto libre. Tú:', art: 'crystal', options: [
        { text: 'Dejo mi espacio exactamente como quiero.', outcome: 'A' },
        { text: 'Hago un curso o un viaje por mi cuenta.', outcome: 'B' },
        { text: 'Recibo o visito a las personas que extraño.', outcome: 'C' },
      ] },
      { q: 'Lo que lamentarías no haber intentado es:', art: 'moon', options: [
        { text: 'Construir una seguridad real.', outcome: 'A' },
        { text: 'Ir más allá de lo cómodo.', outcome: 'B' },
        { text: 'Profundizar una relación que importa.', outcome: 'C' },
      ] },
    ],
    result: 'Lo que sigues buscando dice mucho de lo que valoras ahora mismo.',
    results: {
      A: { title: 'Estabilidad', body: 'Lo que sigues buscando es firmeza — un hogar, un ritmo, algo en lo que puedas confiar. Es un valor real, no falta de ambición. La reflexión es si tus planes actuales realmente la construyen, o solo hablan de ella. (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
      B: { title: 'Crecimiento', body: 'Buscas el reto — la versión de ti que es un poco mejor en algo que el año pasado. La reflexión es asegurarte de que ese estiramiento tenga dirección, para que el crecimiento no se convierta en inquietud. (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
      C: { title: 'Conexión', body: 'Sigues buscando a las personas — cercanía, pertenencia, ser conocida. La reflexión es si tu tiempo va hoy a las relaciones que realmente elegirías, o solo a las más fáciles de mantener. (Esto es una pregunta ligera de autorreflexión, no una evaluación clínica.)' },
    },
  },
}
export function getQuizContent(locale: Locale = 'en'): Record<string, QuizContent> {
  return locale === 'es' ? QUIZ_CONTENT_ES : QUIZ_CONTENT_EN
}
/** @deprecated use getQuizContent(locale) */
export const QUIZ_CONTENT = QUIZ_CONTENT_EN

const PRACTICE_STEPS_EN: Record<string, string[]> = {
  p1: [
    'Sit or lie down somewhere you won\'t be interrupted for ten minutes.',
    'Close your eyes and take five slow breaths, letting each exhale be longer than the inhale.',
    'Imagine a point of light above you, gently lowering into the crown of your head.',
    'Let that light move slowly down through your body, pausing anywhere that feels tense.',
    'When it reaches your feet, sit for one more minute before opening your eyes.',
  ],
  p2: [
    'Put on any low, steady hum — a fan, white noise, or a single sustained note.',
    'Breathe in for four counts, hold for four, out for six.',
    'Let your jaw, shoulders, and hands unclench on each exhale.',
    'Continue for five minutes, then sit in the silence after for thirty seconds before moving.',
  ],
  p3: [
    'Keep a notebook by your bed and write down anything you remember the instant you wake — even fragments.',
    'Note the strongest emotion in the dream before the plot details, since feeling fades fastest.',
    'Look for one repeating symbol or place across a week of entries.',
    'Ask what that symbol means to you specifically, not what a dictionary says it means in general.',
  ],
  p4: [
    'Light a candle somewhere you can see it clearly without straining.',
    'Write one sentence naming what you\'re inviting in this cycle — specific, not vague.',
    'Read it once out loud, then let the candle burn for at least ten minutes while you sit with it.',
    'Extinguish it deliberately rather than letting it burn out on its own.',
  ],
}
const PRACTICE_STEPS_ES: Record<string, string[]> = {
  p1: [
    'Siéntate o acuéstate en algún lugar donde no te interrumpan durante diez minutos.',
    'Cierra los ojos y haz cinco respiraciones lentas, dejando que cada exhalación sea más larga que la inhalación.',
    'Imagina un punto de luz sobre ti, descendiendo suavemente hasta la coronilla de tu cabeza.',
    'Deja que esa luz baje lentamente por todo tu cuerpo, deteniéndose donde sientas tensión.',
    'Cuando llegue a tus pies, quédate sentada un minuto más antes de abrir los ojos.',
  ],
  p2: [
    'Pon un zumbido suave y constante — un ventilador, ruido blanco o una sola nota sostenida.',
    'Inhala contando hasta cuatro, retén cuatro, exhala contando hasta seis.',
    'Deja que tu mandíbula, hombros y manos se relajen con cada exhalación.',
    'Continúa durante cinco minutos, y luego quédate en silencio treinta segundos más antes de moverte.',
  ],
  p3: [
    'Ten un cuaderno junto a tu cama y anota todo lo que recuerdes en el instante en que despiertes — incluso fragmentos.',
    'Anota primero la emoción más fuerte del sueño, antes que los detalles de la trama, porque el sentimiento se desvanece más rápido.',
    'Busca un símbolo o lugar que se repita a lo largo de una semana de anotaciones.',
    'Pregúntate qué significa ese símbolo específicamente para ti, no lo que dice un diccionario que significa en general.',
  ],
  p4: [
    'Enciende una vela en algún lugar donde puedas verla con claridad sin forzar la vista.',
    'Escribe una frase que nombre lo que estás invitando en este ciclo — específica, no vaga.',
    'Léela una vez en voz alta, y luego deja que la vela arda al menos diez minutos mientras te quedas con ella.',
    'Apágala deliberadamente en lugar de dejar que se consuma sola.',
  ],
}
export function getPracticeSteps(locale: Locale = 'en'): Record<string, string[]> {
  return locale === 'es' ? PRACTICE_STEPS_ES : PRACTICE_STEPS_EN
}
/** @deprecated use getPracticeSteps(locale) */
export const PRACTICE_STEPS = PRACTICE_STEPS_EN

const CHALLENGE_PREVIEW_EN: Record<string, string[]> = {
  c1: [
    'Day 1: Notice one moment today where you shrink yourself to be easier to be around — just notice, don\'t fix it yet.',
    'Day 2: Wear or do one small thing today purely because it pleases you, not because it\'s useful.',
    'Day 3: Say one "no" you\'ve been avoiding, even a small one.',
  ],
  c2: [
    'Day 1: Name the emotion you\'re avoiding today in one word, out loud, alone.',
    'Day 2: Write for five minutes about what that emotion is protecting you from.',
    'Day 3: Do one physical release — a walk, stretching, or shaking out your hands — before bed.',
  ],
  c3: [
    'New Moon: Write down one thing you\'re starting this cycle.',
    'First Quarter: Take one concrete action on it, even a small one.',
    'Full Moon: Notice what\'s come to light — good or uncomfortable — and let it be information.',
  ],
}
const CHALLENGE_PREVIEW_ES: Record<string, string[]> = {
  c1: [
    'Día 1: Nota hoy un momento en el que te achicas para que sea más fácil estar contigo — solo nótalo, aún no lo arregles.',
    'Día 2: Ponte o haz hoy algo pequeño solo porque te gusta, no porque sea útil.',
    'Día 3: Di un "no" que has estado evitando, aunque sea pequeño.',
  ],
  c2: [
    'Día 1: Nombra en una palabra la emoción que hoy estás evitando — en voz alta, a solas.',
    'Día 2: Escribe durante cinco minutos sobre de qué te protege esa emoción.',
    'Día 3: Haz una liberación física — un paseo, estiramientos o sacudir las manos — antes de dormir.',
  ],
  c3: [
    'Luna nueva: Escribe una cosa que estás empezando en este ciclo.',
    'Cuarto creciente: Da un paso concreto en esa dirección, aunque sea pequeño.',
    'Luna llena: Nota lo que salió a la luz — bueno o incómodo — y deja que sea solo información.',
  ],
}
export function getChallengePreview(locale: Locale = 'en'): Record<string, string[]> {
  return locale === 'es' ? CHALLENGE_PREVIEW_ES : CHALLENGE_PREVIEW_EN
}
/** @deprecated use getChallengePreview(locale) */
export const CHALLENGE_PREVIEW = CHALLENGE_PREVIEW_EN

const EXPERT_RESPONSES_EN: Record<string, string[]> = {
  '1': [
    'Welcome! I’m Luna, your astrologer. We have 3 free minutes today. Tell me what’s on your mind?',
    'Interesting question. Your natal chart shows an important transit right now...',
    'Jupiter is currently moving through your 7th house — this is a time for new relationships and partnerships.',
    'Your Venus in Scorpio explains the depth of what you’re feeling. Let’s look at this month’s transits...',
    'I’d pay attention to the full moon on the 15th — it activates your 2nd house of finances.',
  ],
  '2': [
    'Hi! I’m Daria. Let me pull the cards... What would you like to explore today?',
    'The cards show an interesting situation. The reversed Moon points to hidden emotions...',
    'The Ace of Cups in the future position — a very good sign for relationships!',
    'The cards speak of an important choice ahead of you. Trust your intuition.',
  ],
  '3': [
    'Good day! Alex here. Which numbers are shaping your path?',
    'The number 7 in your core numbers gives you a special depth of thinking...',
    'Your personal year number 3 — a year of creativity and new beginnings.',
  ],
  '4': [
    'Welcome! I’m Victoria, a synastry astrologer. Tell me about your relationship?',
    'The synastry between your two charts shows a strong Mars-Venus aspect — passion and attraction.',
    'For long-term relationships, Saturn matters more — it brings stability and commitment.',
    'Your charts pair well! There’s some tension, but it will only strengthen the bond.',
  ],
  '5': [
    'Mystery welcomes you! The oracle cards are ready to reveal answers...',
    'Archangel Michael points to protection and clarity on your path.',
    'The "New Beginnings" card — your sign to act without hesitation.',
  ],
  '6': [
    'Maria welcomes you! Let’s combine numbers and stars for a precise picture...',
    'Your birth number 9 points to the completion of an important cycle.',
    'Saturn is forming a beautiful trine for you right now — an ideal time for any serious step.',
  ],
}
const EXPERT_RESPONSES_ES: Record<string, string[]> = {
  '1': [
    '¡Bienvenida! Soy Luna, tu astróloga. Hoy tenemos 3 minutos gratis. ¿Cuéntame qué tienes en mente?',
    'Pregunta interesante. Tu carta natal muestra ahora mismo un tránsito importante...',
    'Júpiter está pasando ahora por tu casa 7 — este es un momento para nuevas relaciones y asociaciones.',
    'Tu Venus en Escorpio explica la profundidad de lo que estás sintiendo. Veamos los tránsitos de este mes...',
    'Yo prestaría atención a la luna llena del día 15 — activa tu casa 2 de las finanzas.',
  ],
  '2': [
    '¡Hola! Soy Daria. Déjame sacar las cartas... ¿Qué te gustaría explorar hoy?',
    'Las cartas muestran una situación interesante. La Luna invertida señala emociones ocultas...',
    '¡El As de Copas en la posición del futuro — una muy buena señal para las relaciones!',
    'Las cartas hablan de una elección importante por delante. Confía en tu intuición.',
  ],
  '3': [
    '¡Buen día! Soy Alex. ¿Qué números están moldeando tu camino?',
    'El número 7 en tus números centrales te da una profundidad de pensamiento especial...',
    'Tu año personal número 3 — un año de creatividad y nuevos comienzos.',
  ],
  '4': [
    '¡Bienvenida! Soy Victoria, astróloga en sinastría. ¿Me cuentas sobre tu relación?',
    'La sinastría entre vuestras dos cartas muestra un fuerte aspecto Marte-Venus — pasión y atracción.',
    'Para las relaciones a largo plazo, Saturno importa más — trae estabilidad y compromiso.',
    '¡Vuestras cartas combinan bien! Hay algo de tensión, pero solo fortalecerá el vínculo.',
  ],
  '5': [
    '¡El misterio te da la bienvenida! Las cartas del oráculo están listas para revelar respuestas...',
    'El Arcángel Miguel señala protección y claridad en tu camino.',
    'La carta "Nuevos comienzos" — tu señal para actuar sin dudar.',
  ],
  '6': [
    '¡María te da la bienvenida! Combinemos números y estrellas para una imagen precisa...',
    'Tu número de nacimiento 9 señala la finalización de un ciclo importante.',
    'Saturno está formando ahora mismo un hermoso trígono para ti — un momento ideal para cualquier paso serio.',
  ],
}
export function getExpertResponses(locale: Locale = 'en'): Record<string, string[]> {
  return locale === 'es' ? EXPERT_RESPONSES_ES : EXPERT_RESPONSES_EN
}
/** @deprecated use getExpertResponses(locale) */
export const EXPERT_RESPONSES = EXPERT_RESPONSES_EN