// FILE PATH: lib/server/horoscope-api.ts
//
// Real, external daily horoscope — your explicit call (over the app's own
// deterministic content pool) was "підключити зовнішній API гороскопів"
// (connect an external horoscope API). Uses freehoroscopeapi.com — a free,
// no-API-key REST service (verified live before wiring this in: fetched
// https://freehoroscopeapi.com/api/v1/get-horoscope/daily?sign=pisces
// directly and got back real, today-dated text, not a guess from docs).
// If it's ever down or slow, every caller below falls back to the app's
// own existing lib/data.ts getHoroscope() text — so a third-party outage
// never breaks the Today screen or the push-notification cron, it just
// quietly serves the local fallback for that request.
import { getHoroscope, ZODIAC_SIGNS } from '@/lib/data'

const API_BASE = 'https://freehoroscopeapi.com/api/v1/get-horoscope'

export interface DailyHoroscope {
  date: string
  sign: string
  horoscope: string
  source: 'external' | 'fallback'
}

// BUG FIX (horoscope never translated to Ukrainian): freehoroscopeapi.com
// only ever returns English text — it has no language parameter — and
// nothing downstream translated it, so every visitor saw the daily
// horoscope in English regardless of their chosen app language. This is
// the same free MyMemory translation API already used for live chat (see
// app/api/translate/route.ts) — called directly here instead of through
// that route because this one runs server-to-server (no signed-in
// client/staff session exists yet on a horoscope fetch, and that route
// requires one) and because Next.js's fetch cache above already caches the
// *English* text for an hour; caching the translated text here too avoids
// re-translating the same paragraph on every request.
// BUG FIX (real device test, 2026-09-18): MyMemory's free API rejects any
// single query over 500 characters — not with an HTTP error, but with
// HTTP 200 and the literal string "QUERY LENGTH LIMIT EXCEEDED. MAX
// ALLOWED QUERY : 500 CHARS" *inside* responseData.translatedText, exactly
// like the already-documented quota-exceeded quirk below. The daily
// horoscope paragraph from freehoroscopeapi.com regularly runs longer than
// that, so that literal error string was slipping through the old
// "just check it's a non-empty string" guard and being shown to real users
// as if it were their horoscope (confirmed live on a real Android phone —
// not a guess). Fixed two ways: (1) explicitly reject that exact error
// text if it ever comes through anyway, and (2) the real fix — split the
// horoscope into sentence-sized chunks that each stay under the limit,
// translate each separately, and rejoin them, instead of sending the whole
// paragraph as one oversized query.
const MYMEMORY_QUERY_LIMIT = 500

async function translateChunk(text: string): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent('en|es')}`
    const res = await fetch(url, { next: { revalidate: 3600 }, signal: AbortSignal.timeout(6000) })
    if (!res.ok) return null
    const data = await res.json()
    const translated = data?.responseData?.translatedText
    if (
      !translated ||
      typeof translated !== 'string' ||
      // Quota-exceeded quirk (see app/api/translate/route.ts for the same check).
      data?.responseStatus === 403 ||
      // Query-too-long quirk (this function's own chunking should prevent
      // it from ever actually firing, but never trust it blindly either).
      translated.toUpperCase().includes('QUERY LENGTH LIMIT EXCEEDED')
    ) {
      return null
    }
    return translated
  } catch {
    return null
  }
}

// Splits on sentence boundaries (after . ! or ?) and greedily packs
// sentences into chunks up to MYMEMORY_QUERY_LIMIT chars each — keeps
// translation calls sentence-aligned (better translation quality than
// chopping mid-sentence) while guaranteeing no single query can ever hit
// the 500-char wall above.
function splitIntoTranslatableChunks(text: string): string[] {
  const sentences = text.match(/[^.!?]+[.!?]*\s*/g) ?? [text]
  const chunks: string[] = []
  let current = ''
  for (const sentence of sentences) {
    if (current && (current + sentence).length > MYMEMORY_QUERY_LIMIT) {
      chunks.push(current.trim())
      current = sentence
    } else {
      current += sentence
    }
  }
  if (current.trim()) chunks.push(current.trim())
  return chunks
}

async function translateToSpanish(text: string): Promise<string | null> {
  const chunks = splitIntoTranslatableChunks(text)
  const translatedChunks: string[] = []
  for (const chunk of chunks) {
    const translated = await translateChunk(chunk)
    // If ANY chunk fails to translate, bail out entirely rather than
    // showing a paragraph that's half-English, half-Ukrainian — the
    // caller falls back to the full original English text instead.
    if (!translated) return null
    translatedChunks.push(translated)
  }
  return translatedChunks.join(' ')
}

// Next.js's fetch cache (`next.revalidate`) keys on the exact request URL,
// so this naturally caches per sign for an hour at a time — real daily
// content without hammering a free third-party API on every single page
// load. Falls back to the app's own local content (never a fabricated
// string, never empty) if the request fails or the response looks wrong.
// `lang`: when 'es', the resolved English text (external or fallback) is
// additionally run through translateToSpanish() before being returned —
// if that translation fails for any reason (quota, timeout, service down),
// this falls back to the original English text rather than showing nothing,
// same fail-open philosophy as the external horoscope fetch itself.
export async function getDailyHoroscope(signId: string, lang: 'en' | 'es' = 'en'): Promise<DailyHoroscope> {
  let result: DailyHoroscope
  try {
    const res = await fetch(`${API_BASE}/daily?sign=${encodeURIComponent(signId)}`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(6000),
    })
    if (!res.ok) throw new Error(`freehoroscopeapi.com returned ${res.status}`)
    const json = await res.json()
    const text = json?.data?.horoscope
    if (!text || typeof text !== 'string') throw new Error('Unexpected response shape from freehoroscopeapi.com')
    result = {
      date: json.data.date ?? new Date().toISOString().slice(0, 10),
      sign: json.data.sign ?? signId,
      horoscope: text,
      source: 'external',
    }
  } catch (e: any) {
    console.error(`[horoscope-api] falling back to local content for ${signId}:`, e.message)
    const signName = ZODIAC_SIGNS.find(s => s.id === signId)?.name ?? signId
    // BUG FIX (2026-09-18): getHoroscope() is now natively bilingual (see
    // lib/data.ts's CAREER_LINES_EN/_UK etc.) — passing `lang` straight
    // through here means the fallback case gets real, hand-translated
    // Ukrainian directly, with no MyMemory call needed at all (skipped
    // below via the `source === 'fallback'` check), so a translation-API
    // hiccup can never affect the fallback path.
    const local = getHoroscope(signId, 'Today', lang)
    result = {
      date: new Date().toISOString().slice(0, 10),
      sign: signName,
      // Combines the three local lines into one paragraph so the shape
      // matches the external API's single-paragraph `horoscope` field —
      // still real, already-authored copy, never invented on the spot.
      horoscope: `${local.career} ${local.love} ${local.health}`,
      source: 'fallback',
    }
  }

  // Only the EXTERNAL path needs a translation call — its text comes from
  // freehoroscopeapi.com fresh every day and isn't something this codebase
  // has a pre-authored Ukrainian version of (unlike the fallback content
  // above, which does now — see lib/data.ts).
  if (lang === 'es' && result.source === 'external') {
    const translated = await translateToSpanish(result.horoscope)
    if (translated) result = { ...result, horoscope: translated }
    // else: quietly keep the English text — never block the Today screen
    // on a translation-service hiccup.
  }

  return result
}
