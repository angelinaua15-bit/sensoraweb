'use client'

// FILE PATH: components/premium-modal.tsx
// History: was a 3-tier "unlimited chat minutes" Stripe subscription →
// 4 one-time minute-package purchases via Stripe Checkout (Ukraine-linked
// account, no valid payout country — removed) → a free-credit dev stub → a
// real Monobank checkout → a real LiqPay checkout → LiqPay pulled back out
// → an honest instant-credit demo → real Wise pay-by-link payments (manual
// admin confirmation, no webhook) → NOW (2026-08-28): real Stripe Checkout
// again, this time via a Poland-registered company account (Altair
// Solutions Sp. z o.o.) with a valid payout country. "Buy" calls
// app/api/wallet/minute-package/checkout/route.ts,
// which creates a pending request + a real Stripe Checkout Session and hands
// back the Checkout URL — it does NOT credit the wallet itself. The minutes
// appear automatically the instant Stripe's webhook confirms the payment
// (see app/api/webhooks/stripe/route.ts); an admin manual confirm in the CRM
// is only a fallback now, not the normal path like it was with Wise.
//
// Dima's per-minute-consistency concern (KING KONG LAB thread) is still
// resolved the same way regardless of payment provider: the real in-chat
// rate is always FIXED_PRICE_PER_MIN, a package only changes how many
// prepaid minutes you get for the money, never the per-minute price once
// you're actually chatting.
import { useState } from 'react'
import { ZodiacWheelArt, TarotCardArt, NebulaOrbArt, CrystalBallArt, MysticOrbArt } from '@/components/magic-art'
import ModalPortal from '@/components/modal-portal'
import { MINUTE_PACKAGES } from '@/lib/minute-packages'
import { useLanguage } from '@/components/language-provider'
import { useFreeTrialAvailable } from '@/lib/use-free-trial'

interface Props {
  onClose: () => void
  userId?: string | null
  userName?: string
  contact?: string
  // Lets the parent screen's wallet-balance state reflect a purchase
  // immediately, without a full reload — same reasoning as handleTopup in
  // app/page.tsx.
  onCredited?: (balance: number) => void
}

// Honest note: these slides used to promise "full birth chart", "priority
// Masters access" and "ad-free horoscope" as Premium-subscription perks.
// Since this modal no longer sells that subscription, and buying a minute
// package doesn't grant those three things, the slides below only describe
// what a minute-package purchase actually does — nothing implied here that
// the purchase doesn't deliver. If natal chart / priority / ad-free are
// meant to come back as their own paid perk, that's a separate decision to
// make (and build) — not something this modal should silently keep
// promising.
// title/sub are i18n keys resolved with t() at render time, not literal
// strings — this used to be hardcoded English (see wallet-screen.tsx for
// the same pattern), which is why this modal always rendered in English
// even when the rest of the app was switched to Ukrainian.
const SLIDES = [
  { art: <MysticOrbArt size={110} />, titleKey: 'premium.slide1Title', subKey: 'premium.slide1Sub' },
  { art: <ZodiacWheelArt size={130} />, titleKey: 'premium.slide2Title', subKey: 'premium.slide2Sub' },
  { art: <TarotCardArt size={72} symbol="♡" />, titleKey: 'premium.slide3Title', subKey: 'premium.slide3Sub' },
  { art: <CrystalBallArt size={100} />, titleKey: 'premium.slide4Title', subKey: 'premium.slide4Sub' },
]

// Real, confirmed numbers (not display-only estimates) — kept in sync with
// lib/minute-packages.ts, the single source of truth also used server-side.
// `badge`/`save` are booleans here, not display text — the actual "POPULAR"
// / "Best value" text is resolved with t() at render time inside the
// component below.
const PACKAGES = MINUTE_PACKAGES.map(p => ({
  ...p,
  badge: p.id === 'mp30',
  save: p.id === 'mp120',
}))

export default function PremiumModal({ onClose, userId, userName, onCredited }: Props) {
  // REAL FEATURE ADDED ("тут має бути рядок про безкоштовні 3 хв"): same
  // read-only check as the wallet/Today/expert screens — see
  // lib/use-free-trial.ts. Disappears on its own once the trial's actually
  // been spent in a real chat.
  const freeTrialAvailable = useFreeTrialAvailable(userId ?? null)
  const { t } = useLanguage()
  const [slide, setSlide] = useState(0)
  const [pkg, setPkg] = useState<typeof PACKAGES[number]['id']>('mp30')
  const [showDemoNote, setShowDemoNote] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // REAL STRIPE PAYMENT — set once the pending request + Checkout Session
  // are created server-side (createStripeTopupRequest), holding the real
  // Checkout URL + amount so this modal can show "pay here, then wait for
  // confirmation" instead of pretending the minutes are already in the
  // wallet. onCredited is deliberately NOT called here — the wallet balance
  // changes automatically once Stripe's webhook confirms the payment (see
  // app/api/webhooks/stripe/route.ts), which normally happens within
  // seconds, well before this modal would even be closed.
  const [pending, setPending] = useState<{ checkoutUrl: string; amount: number; minutes: number } | null>(null)

  // UPDATED (2026-09-07, explicit call): packages are billed in USD again —
  // Stripe charges the client this exact number, no live-estimate
  // conversion needed anymore (that's the OLD §73 approach, from when the
  // real charge was EUR and $ was only a display estimate — see CHANGES.md
  // if that reasoning needs to come back). Stripe's own settlement account
  // still converts to EUR behind the scenes; that's Stripe's job, not this
  // component's.
  const selected = PACKAGES.find(p => p.id === pkg)!

  const handleBuy = async () => {
    if (!userId) {
      // No signed-in account to attach the purchase to (e.g. viewing this
      // before finishing onboarding).
      setShowDemoNote(true)
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/wallet/minute-package/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageId: pkg, userName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('premium.genericError'))
      setPending({ checkoutUrl: data.checkoutUrl, amount: data.amount, minutes: data.minutes })
    } catch (e: any) {
      setError(e.message || t('premium.genericError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
      style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pt-5 pb-7 flex flex-col"
        style={{ background: 'linear-gradient(180deg,var(--bg-mid),var(--bg-void))', border: '1px solid rgba(217,70,239,0.25)', maxHeight: '94vh', overflowY: 'auto' }}>

        <div className="w-full flex items-center justify-between mb-5">
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: 'var(--surface-1)' }} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <h2 className="text-[var(--text-primary)] text-sm font-serif tracking-wide">{t('premium.title')}</h2>
          <span className="w-8" />
        </div>

        {pending ? (
          <div className="flex flex-col items-center text-center gap-4 py-4 screen-enter">
            <div className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,rgba(217,70,239,0.25),rgba(217,70,239,0.1))', border: '1.5px solid rgba(217,70,239,0.5)' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D946EF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
              </svg>
            </div>
            <div>
              <p className="text-[var(--text-muted)] text-xs font-medium mb-1 tracking-widest">{t('premium.payToContinue')}</p>
              <h3 className="text-[var(--text-primary)] text-2xl font-serif font-light">
                ${pending.amount}
              </h3>
              <p className="text-[var(--text-muted)] text-xs mt-1">{t('premium.pendingConfirmation', { minutes: pending.minutes })}</p>
            </div>
            <a href={pending.checkoutUrl} target="_blank" rel="noopener noreferrer"
              className="w-full py-4 rounded-2xl text-white font-semibold text-sm active:scale-95 transition-transform text-center"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)', boxShadow: '0 8px 32px rgba(217,70,239,0.35)' }}>
              {t('premium.payNow')}
            </a>
            <button onClick={onClose}
              className="w-full py-3 rounded-2xl text-sm font-medium"
              style={{ color: 'var(--text-dim)' }}>
              {t('premium.great')}
            </button>
          </div>
        ) : (
        <>
        {/* BUG FIX (your call: "треба прибрати ці крапки... вони зайві" —
            remove the dots). Worth noting what they actually did: there's no
            swipe gesture anywhere on this modal, so those dots were the ONLY
            way to move between the 4 slides — removing them with nothing to
            replace them would have silently locked 3 of 4 slides out of
            reach. Per your answer, kept it simple: no dots, no arrows,
            tapping the picture itself now advances to the next slide (wraps
            back to the first after the last one). */}
        <div key={slide} className="flex flex-col items-center text-center gap-4 mb-6 screen-enter">
          <button
            onClick={() => setSlide(s => (s + 1) % SLIDES.length)}
            aria-label="Next"
            className="sensora-glow-pulse rounded-full active:scale-95 transition-transform"
          >
            {SLIDES[slide].art}
          </button>
          <div>
            <h3 className="text-[var(--text-primary)] text-lg font-serif mb-1.5">{t(SLIDES[slide].titleKey)}</h3>
            <p className="text-[var(--text-muted)] text-xs leading-relaxed max-w-[260px] mx-auto">{t(SLIDES[slide].subKey)}</p>
          </div>
        </div>

        {freeTrialAvailable && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl mb-4"
            style={{ background: 'rgba(245,197,66,0.1)', border: '1px solid rgba(245,197,66,0.3)' }}>
            <span className="text-lg flex-shrink-0">🎁</span>
            <p className="text-sm font-medium" style={{ color: '#F5C542' }}>{t('wallet.freeTrialAvailable')}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          {PACKAGES.map(p => {
            const active = pkg === p.id
            return (
              <button key={p.id} onClick={() => { setPkg(p.id); setShowDemoNote(false) }}
                className="rounded-2xl p-3 text-left flex flex-col gap-1 relative transition-all"
                style={{
                  background: active ? 'linear-gradient(135deg, rgba(124,58,237,0.28), rgba(217,70,239,0.18))' : 'var(--surface-1)',
                  border: `1.5px solid ${active ? '#D946EF' : 'var(--surface-2)'}`,
                }}>
                {p.badge && (
                  <span className="absolute -top-2 left-2 text-[8px] px-1.5 py-0.5 rounded-full font-semibold"
                    style={{ background: '#D946EF', color: '#fff' }}>
                    {t('premium.popular')}
                  </span>
                )}
                <p className="text-[var(--text-primary)] text-[11px] font-semibold mt-1">{t('premium.minLabel', { mins: p.baseMinutes })}</p>
                <p className="text-[var(--text-primary)] text-sm font-bold">
                  ${p.priceUsd}
                </p>
                <p className="text-[var(--text-muted)] text-[9px]">{t('premium.bonusMinFree', { bonus: p.bonusMinutes })}</p>
                {p.save && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full self-start" style={{ background: 'rgba(34,197,94,0.2)', color: '#22C55E' }}>
                    {t('premium.bestValue')}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <p className="text-[var(--text-dim)] text-[10px] leading-relaxed mb-1 text-center">
          {t('premium.oneTimePurchase', { total: selected.baseMinutes + selected.bonusMinutes, base: selected.baseMinutes, bonus: selected.bonusMinutes, symbol: '$', price: selected.priceUsd })}
        </p>
        {showDemoNote && (
          <div className="rounded-2xl p-4 mb-3 text-center" style={{ background: 'rgba(245,197,66,0.08)', border: '1px dashed rgba(245,197,66,0.3)' }}>
            <p className="text-[#F5C542] text-xs font-medium mb-1">{t('premium.signInRequiredTitle')}</p>
            <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">
              {t('premium.signInRequiredBody')}
            </p>
          </div>
        )}
        {error && (
          <div className="rounded-2xl p-4 mb-3 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px dashed rgba(239,68,68,0.3)' }}>
            <p className="text-[#EF4444] text-xs font-medium mb-1">{t('premium.purchaseFailedTitle')}</p>
            <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">{error}</p>
          </div>
        )}
        <button
          onClick={handleBuy}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-white font-semibold text-sm active:scale-95 transition-transform disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)', boxShadow: '0 8px 32px rgba(217,70,239,0.35)' }}
        >
          {/* Shows base+bonus (e.g. "30 min +10 bonus"), not the combined
              total alone — a real bug you caught: the card above is
              headlined "30 MIN" (selected.baseMinutes), but this button used
              to say "Buy 40 minutes" (base+bonus combined), which reads as a
              mismatch with the card even though the price was always
              correct. Spelling out both numbers here ties it back to the
              card's own "+10 bonus min free" line instead of introducing a
              third, different-looking number. */}
          {loading ? t('premium.preparingPayment') : t('premium.buyButton', { base: selected.baseMinutes, bonus: selected.bonusMinutes, symbol: '$', price: selected.priceUsd })}
        </button>

        <div className="flex items-center justify-center gap-1.5 mt-4 text-[var(--text-dim)] text-[10px]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
          {t('premium.stripePaymentFooter')}
        </div>
        </>
        )}
      </div>
    </div>
    </ModalPortal>
  )
}