'use client'

// FILE PATH: components/screens/wallet-screen.tsx
//
// UNIFIED with real payment (your explicit instruction): this used to show
// its own separate $10/$20/$50 demo presets, wired to a "credit instantly,
// no real charge" checkout — a second, disconnected top-up path sitting
// right next to the 4 minute packages sold via components/premium-modal.tsx.
// It now shows the exact same 4 real packages and goes through the exact
// same real flow: tap Buy → a pending request + real Stripe Checkout
// Session are created server-side → the Checkout URL opens here → you pay
// on Stripe's own secure page → the wallet is credited automatically the
// instant Stripe's webhook confirms the payment (see
// app/api/webhooks/stripe/route.ts) — an admin "Confirm" in the CRM is only
// a fallback, not the normal path. Nothing here pretends money moved before
// it did.
import { useState } from 'react'
import { useLanguage } from '@/components/language-provider'
import { MINUTE_PACKAGES, PRICE_PER_MIN_USD } from '@/lib/minute-packages'
import { useFreeTrialAvailable } from '@/lib/use-free-trial'

const PACKAGES = MINUTE_PACKAGES.map(p => ({
  ...p,
  badge: p.id === 'mp30',
  save: p.id === 'mp120',
}))

interface Props {
  balance: number
  userId?: string | null
  userName?: string
  onBack: () => void
}

export default function WalletScreen({ balance, userId, userName, onBack }: Props) {
  const { t } = useLanguage()
  // REAL FEATURE ADDED ("3 хв безкоштовні... у меню де пакети з оплатами...
  // і щоб зникало після використання"): read-only check, same as the Today
  // screen — see lib/use-free-trial.ts. Disappears on its own once the
  // trial's actually been spent in a real chat.
  const freeTrialAvailable = useFreeTrialAvailable(userId ?? null)
  const [pkg, setPkg] = useState<typeof PACKAGES[number]['id']>('mp30')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Real Stripe Checkout URL + amount, once the pending request exists —
  // see the file header comment. Balance is deliberately NOT updated here;
  // it changes once the Stripe webhook (or, as a fallback, an admin)
  // confirms the payment.
  const [pending, setPending] = useState<{ checkoutUrl: string; amount: number; minutes: number } | null>(null)

  // UPDATED (2026-09-07, explicit call): packages are billed in USD again —
  // Stripe charges the client this exact number, no live-estimate
  // conversion needed anymore (that's the OLD §73 approach, from when the
  // real charge was EUR and $ was only a display estimate). Stripe's own
  // settlement account still converts to EUR behind the scenes.
  const selected = PACKAGES.find(p => p.id === pkg)!

  const handleBuy = async () => {
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

  if (pending) {
    return (
      <div className="flex flex-col h-full sensora-bg items-center justify-center px-8 text-center gap-4">
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
        <button onClick={onBack}
          className="w-full py-3 rounded-2xl text-sm font-medium"
          style={{ color: 'var(--text-dim)' }}>
          {t('premium.great')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <button onClick={onBack}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <h2 className="text-[var(--text-primary)] text-lg font-medium">{t('wallet.title')}</h2>
        </div>

        <div className="p-5 rounded-3xl mb-5"
          style={{ background:'linear-gradient(135deg,#6D28D9,#A855F7)', border:'1px solid rgba(124,58,237,0.35)' }}>
          {/* REAL FEATURE CHANGED (your call: "все має бути і всюди в
              хвилинах" — no $ shown for balance anywhere). This used to
              show the raw dollar figure as the big number with an
              "≈X minutes" estimate underneath — now minutes IS the big
              number (same real $2/min rate, PRICE_PER_MIN_USD in
              lib/minute-packages.ts), and the now-redundant second line is
              gone rather than repeating the same number twice. Package
              prices below still show $ — that's the real amount Stripe
              actually charges, which has to stay visible for an honest
              checkout regardless of how the balance itself is displayed. */}
          <p className="text-white/80 text-xs font-medium mb-1 tracking-wider">{t('wallet.yourBalance')}</p>
          <h3 className="text-white text-4xl font-serif font-light mb-4">
            {t('wallet.minutesShort', { mins: Math.floor(balance / PRICE_PER_MIN_USD) })}
          </h3>
        </div>

        {freeTrialAvailable && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-2xl mb-4"
            style={{ background: 'rgba(245,197,66,0.1)', border: '1px solid rgba(245,197,66,0.3)' }}>
            <span className="text-lg flex-shrink-0">🎁</span>
            <p className="text-sm font-medium" style={{ color: '#F5C542' }}>{t('wallet.freeTrialAvailable')}</p>
          </div>
        )}

        {/* Real Wise packages — same 4 tiers, same data, same checkout route
            as components/premium-modal.tsx. */}
        <h3 className="text-[var(--text-primary)] text-base font-medium mb-3">{t('wallet.chooseAmount')}</h3>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {PACKAGES.map(p => {
            const active = pkg === p.id
            return (
              <button key={p.id} onClick={() => setPkg(p.id)}
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
      </div>

      <div className="px-4 pb-6 pt-3 flex-shrink-0">
        {error && (
          <div className="rounded-2xl p-3 mb-3 text-center" style={{ background: 'rgba(239,68,68,0.08)', border: '1px dashed rgba(239,68,68,0.3)' }}>
            <p className="text-[#EF4444] text-xs leading-relaxed">{error}</p>
          </div>
        )}
        <button onClick={handleBuy} disabled={loading}
          className="w-full py-4 rounded-2xl text-white font-semibold text-base active:scale-95 transition-transform disabled:opacity-60"
          style={{ background:'linear-gradient(135deg,#7C3AED,#D946EF)', boxShadow:'0 8px 32px rgba(217,70,239,0.4)' }}>
          {loading ? t('premium.preparingPayment') : t('premium.buyButton', { base: selected.baseMinutes, bonus: selected.bonusMinutes, symbol: '$', price: selected.priceUsd })}
        </button>
        <div className="flex items-center justify-center gap-1.5 mt-4 text-[var(--text-dim)] text-[10px]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
          {t('premium.stripePaymentFooter')}
        </div>
      </div>
    </div>
  )
}