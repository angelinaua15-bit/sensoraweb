'use client'

// FILE PATH: components/screens/low-balance-modal.tsx
import { MINUTE_PACKAGES } from '@/lib/minute-packages'
import { useLanguage } from '@/components/language-provider'

interface LowBalanceModalProps {
  onNavigate: (screen: string) => void
}

export function LowBalanceModal({ onNavigate }: LowBalanceModalProps) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col h-full relative">
      {/* Blurred background (simulating the chat behind) */}
      <div className="flex-1 relative overflow-hidden" style={{ background: 'var(--bg-void)' }}>
        {/* Dimmed chat preview */}
        <div className="p-4 opacity-30">
          <div className="flex gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--bg-elevated)]" />
            <div>
              <div className="h-2.5 w-36 rounded bg-[var(--bg-elevated)] mb-1.5" />
              <div className="h-2 w-48 rounded bg-[var(--bg-elevated)]" />
            </div>
          </div>
          <div className="flex justify-end mb-3">
            <div className="h-8 w-40 rounded-2xl bg-[var(--bg-elevated)]" />
          </div>
          <div className="flex gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-[var(--bg-elevated)]" />
            <div className="h-12 w-52 rounded-2xl bg-[var(--bg-elevated)]" />
          </div>
        </div>

        {/* Bottom sheet */}
        <div
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl px-5 pt-6"
          style={{
            background: 'linear-gradient(180deg, var(--bg-mid) 0%, var(--bg-deep) 100%)',
            border: '1px solid rgba(124,58,237,0.2)',
            borderBottom: 'none',
            // FIX (2026-09-10, native-readiness audit): bottom sheet pinned
            // to the true screen bottom — needed home-indicator safe-area
            // padding like the other bottom-docked elements.
            paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          {/* Handle */}
          <div className="w-10 h-1 rounded-full bg-[var(--bg-elevated)] mx-auto mb-5" />

          {/* Warning icon */}
          <div className="flex justify-center mb-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(245,197,66,0.15)', border: '1px solid rgba(245,197,66,0.3)' }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#F5C542" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
          </div>

          <h3 className="text-[var(--text-primary)] text-xl font-serif font-light text-center mb-2">
            {t('lowBalance.title')}
          </h3>
          <p className="text-[var(--text-muted)] text-sm text-center mb-6 leading-relaxed">
            {t('lowBalance.bodyLine1')}<br />{t('lowBalance.bodyLine2')}
          </p>

          {/* Amount options — real minute packages, real EUR prices from
              lib/minute-packages.ts (the same single source of truth
              wallet-screen.tsx and premium-modal.tsx use).
              BUG FIX (code audit): these three used to be hardcoded
              $10/$25/$50 + made-up bonus amounts with no onClick at all —
              dead, decorative buttons showing prices that didn't match what
              a tap through this modal would actually buy. Real checkout
              (package selection + Stripe Checkout) only lives on the Wallet
              screen, so tapping one of these takes you there — same as the
              "Top up balance" button below — rather than duplicating the
              checkout flow here. */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {/* mp_test (the temporary $1 test package) was removed from
                MINUTE_PACKAGES on 2026-09-08 once the Stripe webhook
                end-to-end test it existed for was confirmed working — plain
                slice(0, 3) is safe again, no filter needed. */}
            {MINUTE_PACKAGES.slice(0, 3).map((p, i) => (
              <button
                key={p.id}
                onClick={() => onNavigate('wallet')}
                className="py-3 rounded-2xl flex flex-col items-center gap-0.5"
                style={{
                  background: i === 1 ? 'rgba(217,70,239,0.15)' : 'var(--surface-1)',
                  border: `1px solid ${i === 1 ? 'rgba(217,70,239,0.4)' : 'var(--surface-2)'}`,
                }}
              >
                <span className="text-[var(--text-primary)] font-semibold text-base">${p.priceUsd}</span>
                <span className={`text-xs ${i === 1 ? 'text-[#D946EF]' : 'text-[var(--text-dim)]'}`}>
                  {p.baseMinutes}+{p.bonusMinutes} {t('lowBalance.minSuffix')}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={() => onNavigate('wallet')}
            className="btn-magenta w-full py-4 rounded-2xl text-white font-semibold text-base mb-3"
          >
            {t('lowBalance.topUp')}
          </button>
          <button
            onClick={() => onNavigate('home')}
            className="w-full text-center text-[var(--text-dim)] text-sm py-1"
          >
            {t('lowBalance.endSession')}
          </button>
        </div>
      </div>
    </div>
  )
}