'use client'

// FILE PATH: components/screens/payment-success-screen.tsx
import { useLanguage } from '@/components/language-provider'

interface Props {
  amount: number
  newBalance: number
  onDone: () => void
}

export default function PaymentSuccessScreen({ amount, newBalance, onDone }: Props) {
  const { t } = useLanguage()
  return (
    <div className="h-full overflow-y-auto flex flex-col items-center justify-between px-8 py-20"
      style={{ background: 'linear-gradient(180deg,var(--bg-void) 0%,var(--bg-deep) 100%)' }}>
      <div />

      <div className="flex flex-col items-center gap-6 text-center w-full">
        {/* Check circle */}
        <div className="relative">
          <div className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.25),rgba(34,197,94,0.1))', border: '1.5px solid rgba(34,197,94,0.5)', boxShadow: '0 0 48px rgba(34,197,94,0.2)' }}>
            <svg width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        <div>
          {/* BUG FIX (code audit, demo mode): said "PAYMENT SUCCESSFUL" and
              "A receipt has been sent to your email" below — both were
              honest while a real processor (Monobank/LiqPay) actually
              charged a card and could actually email a receipt. Now that
              this credits the wallet directly with no real charge behind
              it, leaving that copy in place would be exactly the kind of
              fake the app owner has been explicit about never wanting. */}
          <p className="text-[var(--text-muted)] text-xs font-medium mb-1 tracking-widest">{t('paymentSuccess.demoTopUp')}</p>
          <h2 className="text-[#22C55E] text-4xl font-serif font-light">+${amount.toFixed(2)}</h2>
          <p className="text-[var(--text-muted)] text-sm mt-1">{t('paymentSuccess.addedToBalance')}</p>
        </div>

        {/* Receipt */}
        <div className="w-full max-w-xs rounded-3xl p-5"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }}>
          <div className="flex justify-between mb-3">
            <span className="text-[var(--text-muted)] text-sm">{t('paymentSuccess.topUp')}</span>
            <span className="text-[#22C55E] font-semibold">+${amount.toFixed(2)}</span>
          </div>
          <div className="h-px mb-3" style={{ background: 'var(--surface-1)' }} />
          <div className="flex justify-between">
            <span className="text-[var(--text-muted)] text-sm">{t('paymentSuccess.newBalance')}</span>
            <span className="text-[#F5C542] font-semibold">${newBalance.toFixed(2)}</span>
          </div>
        </div>

        <p className="text-[var(--text-dim)] text-xs">{t('paymentSuccess.demoNote')}</p>
      </div>

      <button onClick={onDone}
        className="w-full max-w-xs py-4 rounded-2xl text-white font-semibold text-base active:scale-95 transition-transform"
        style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)', boxShadow: '0 8px 32px rgba(217,70,239,0.4)' }}>
        {t('paymentSuccess.great')}
      </button>
    </div>
  )
}