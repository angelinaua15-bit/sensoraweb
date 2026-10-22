// FILE PATH: app/pricing/page.tsx
// Public, crawlable pricing/services page — reachable at sensora.space/pricing
// without signing in. Added because LiqPay's manual review explicitly flagged
// two missing items: "Вартість товарів або послуг" (pricing) and
// "Інформація про товари або послуги" (service description). Every number
// here is a real, already-confirmed figure pulled from the actual billing
// code — not invented for this page:
//   - $2/min live-chat rate: FIXED_PRICE_PER_MIN in lib/server/db.ts
//   - first 3 minutes free: FreeMinutesBanner / "First 3 minutes free" copy
//     already shown in the app (expert-profile-screen.tsx)
//   - Minute packages: MINUTE_PACKAGES in lib/minute-packages.ts — the old
//     3-tier "unlimited" Premium subscription was replaced by one-time
//     prepaid-minute bundles (confirmed numbers, KING KONG LAB thread), so
//     this page shows those instead of the old $9.99/week-style plans.
// BUG FIX / REAL REQUIREMENT (LiqPay manual review, second rejection round):
// LiqPay's reviewer came back with a specific, concrete instruction —
// "На сайті не вказано вартість товарів або послуг. Додайте на ваш сайт
// актуальні ціни в гривнях..." (add real UAH prices to the site). The
// original version of this page deliberately left UAH out because no
// confirmed, non-invented exchange rate was available at the time — showing
// a made-up conversion would have been exactly the kind of fake number to
// avoid. That's resolved now: lib/server/nbu-rate.ts fetches the REAL,
// official USD→UAH rate straight from the National Bank of Ukraine's own
// public API (no key, no scraping — their documented OpenData service), so
// the UAH figure below is always a real number NBU actually published, with
// the rate and date shown for transparency. Sensora still BILLS in USD via
// LiqPay (that part is unchanged and doesn't need to change) — the UAH
// figure here is an indicative price for the exact purpose LiqPay's review
// asked for, not a second billing currency.
import Link from 'next/link'
import { FIXED_PRICE_PER_MIN } from '@/lib/server/db'
import { MINUTE_PACKAGES } from '@/lib/minute-packages'
import { getNbuUsdRate } from '@/lib/server/nbu-rate'

export const metadata = {
  title: 'Pricing — Sensora',
  description: 'Pricing for live psychic consultations and Sensora Premium.',
}

function formatUah(usd: number, rate: number): string {
  return Math.round(usd * rate).toLocaleString('uk-UA')
}

export default async function PricingPage() {
  const nbu = await getNbuUsdRate()
  return (
    <div className="h-dvh overflow-y-auto sensora-bg">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link href="/" className="text-[#9D5FF5] text-xs underline">
          ← Back to Sensora
        </Link>
        <h1 className="text-[var(--text-primary)] text-2xl font-serif mt-4 mb-1">Pricing</h1>
        <p className="text-[var(--text-dim)] text-[11px] mb-1">
          Live consultation minutes and minute packages are both billed in USD. Card payments are
          converted to your local currency automatically by our payment provider at checkout.
        </p>
        {nbu && (
          <p className="text-[var(--text-dim)] text-[11px] mb-8">
            Орієнтовні ціни в гривнях за офіційним курсом НБУ на {nbu.asOfDate}: 1 USD ≈ {nbu.usdToUah.toFixed(2)} ₴.
            Фактичне списання відбувається в доларах.
          </p>
        )}
        {!nbu && <div className="mb-8" />}

        <div className="flex flex-col gap-8 pb-16">
          <div>
            <h2 className="text-[var(--text-primary)] text-sm font-medium mb-2">Live psychic consultations</h2>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-2">
              One-on-one chat consultations with independent astrology, Tarot, and numerology
              experts ("chatters"), paid from your Sensora wallet.
            </p>
            <p className="text-[var(--text-primary)] text-lg font-semibold">
              ${FIXED_PRICE_PER_MIN.toFixed(2)} / minute
              {nbu && <span className="text-[var(--text-dim)] text-sm font-normal"> (≈ {formatUah(FIXED_PRICE_PER_MIN, nbu.usdToUah)} ₴)</span>}
            </p>
            <p className="text-[var(--text-dim)] text-xs mt-1">First 3 minutes of your first consultation are free.</p>
          </div>

          <div>
            <h2 className="text-[var(--text-primary)] text-sm font-medium mb-2">Minute packages (one-time purchase)</h2>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-3">
              Buy a block of consultation minutes upfront, at a discount, with bonus minutes included
              for free. No subscription, no auto-renewal — minutes are added to your wallet and spent
              at the same ${FIXED_PRICE_PER_MIN.toFixed(2)}/minute rate as any other consultation.
            </p>
            <div className="flex flex-col gap-2">
              {MINUTE_PACKAGES.map(p => (
                <div key={p.id} className="rounded-xl p-3 flex items-center justify-between" style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }}>
                  <p className="text-[var(--text-primary)] text-sm font-medium">
                    {p.baseMinutes} min + {p.bonusMinutes} bonus = {p.baseMinutes + p.bonusMinutes} min
                  </p>
                  <p className="text-[var(--text-primary)] text-sm font-semibold text-right">
                    ${p.priceUsd}
                    {nbu && <span className="text-[var(--text-dim)] text-xs font-normal block">≈ {formatUah(p.priceUsd, nbu.usdToUah)} ₴</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-[var(--text-primary)] text-sm font-medium mb-2">More information</h2>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed flex flex-col gap-1">
              <Link href="/terms" className="text-[#9D5FF5] underline w-fit">Terms of Use</Link>
              <Link href="/refund" className="text-[#9D5FF5] underline w-fit">Refund Policy</Link>
              <Link href="/contacts" className="text-[#9D5FF5] underline w-fit">Contact</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}