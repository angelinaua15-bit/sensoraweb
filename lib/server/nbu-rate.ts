// FILE PATH: lib/server/nbu-rate.ts
// Fetches REAL, official exchange rates from the National Bank of Ukraine's
// own public REST API — no key required, no scraping, this is their
// documented OpenData service:
// https://bank.gov.ua/admin_uploads/article/Instr_API_KURS_VAL_data_Full_eng.pdf
//
// WHY THIS EXISTS: LiqPay's manual merchant review rejected the activation
// request with "На сайті не вказано вартість товарів або послуг. Додайте на
// ваш сайт актуальні ціни в гривнях..." — they want real UAH prices shown on
// the public /pricing page. The very first version of app/pricing/page.tsx
// deliberately did NOT show a UAH price because no confirmed, non-invented
// exchange rate was available — inventing one would have violated "no
// fakes". This is that rate, sourced for real from NBU's own published
// numbers.
//
// EUR ADDED (2026-08-28): the pricing page shows two real prices in two real
// currencies now — the live per-minute rate in USD (FIXED_PRICE_PER_MIN,
// unchanged) and the minute-package sticker prices in EUR (Stripe settlement
// currency). Converting the EUR package prices to UAH with the USD→UAH rate
// would silently produce a wrong number — a real "fake numbers" bug, not a
// cosmetic one — so this now fetches both rates for real from NBU, and the
// pricing page must use the matching one for each price.
//
// If the NBU API is ever unreachable, this returns null — the pricing page
// must treat that as "omit the UAH figure for now", never fall back to a
// guessed number.
export interface NbuRate {
  usdToUah: number
  eurToUah: number
  asOfDate: string // NBU's own "exchangedate", e.g. "07.08.2026"
}

let cached: { rate: NbuRate; fetchedAtMs: number } | null = null
const CACHE_MS = 60 * 60 * 1000 // 1 hour — NBU publishes this once a day, no need to hit it every request

async function fetchNbuRate(valcode: 'USD' | 'EUR'): Promise<{ rate: number; asOfDate: string } | null> {
  // BUG FIX (found while diagnosing LiqPay's "site doesn't work" crawler
  // rejection): this fetch had no timeout. /pricing is an async Server
  // Component that awaits this call on every render Next.js doesn't already
  // have cached — if bank.gov.ua is ever slow to respond (a Ukrainian
  // government server, not guaranteed fast from wherever Vercel runs the
  // function), the whole page render hangs until Vercel's own function
  // timeout kills it, which comes back to a visitor (or an automated
  // reviewer) as a failed/broken page. AbortSignal.timeout() caps this at 4s
  // so a slow NBU response degrades to "no UAH price shown this render"
  // instead of taking the whole page down.
  const res = await fetch(
    `https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=${valcode}&json`,
    { next: { revalidate: 3600 }, signal: AbortSignal.timeout(4000) },
  )
  if (!res.ok) return null
  const data = await res.json()
  const row = Array.isArray(data) ? data[0] : null
  const rate = Number(row?.rate)
  if (!row || !Number.isFinite(rate) || rate <= 0) return null
  return { rate, asOfDate: String(row.exchangedate ?? '') }
}

export async function getNbuUsdRate(): Promise<NbuRate | null> {
  if (cached && Date.now() - cached.fetchedAtMs < CACHE_MS) {
    return cached.rate
  }
  try {
    const [usd, eur] = await Promise.all([fetchNbuRate('USD'), fetchNbuRate('EUR')])
    if (!usd || !eur) return cached?.rate ?? null
    const result: NbuRate = { usdToUah: usd.rate, eurToUah: eur.rate, asOfDate: usd.asOfDate }
    cached = { rate: result, fetchedAtMs: Date.now() }
    return result
  } catch {
    // Network hiccup or NBU downtime — serve the last good cached rate if we
    // have one (better than nothing, still a real number NBU actually
    // published), otherwise null. Never synthesize a number here.
    return cached?.rate ?? null
  }
}