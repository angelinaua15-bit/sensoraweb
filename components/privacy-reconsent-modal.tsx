'use client'

// FILE PATH: components/privacy-reconsent-modal.tsx
// Added 2026-09-10 — see the needsPrivacyReconsent comment in
// app/api/wallet/route.ts for the full story: lib/legal-content.ts has
// claimed for months that a materially updated Privacy Policy would
// re-prompt existing users, but nothing ever actually did that. This modal
// is the real, blocking re-confirmation step: shown once per app open when
// the server says the signed-in account's stored privacy_policy_version
// doesn't match the current one, and cannot be dismissed without agreeing —
// same principle as the original signup checkbox, just re-run for an
// existing account instead of skipped for one.
import { useState } from 'react'
import Link from 'next/link'
import ModalPortal from '@/components/modal-portal'
import { useLanguage } from '@/components/language-provider'

interface Props {
  onAgree: () => Promise<void> | void
}

export default function PrivacyReconsentModal({ onAgree }: Props) {
  const { t } = useLanguage()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleAgree = async () => {
    setSaving(true)
    setError(null)
    try {
      await onAgree()
    } catch {
      setError(t('privacyUpdate.error'))
      setSaving(false)
    }
  }

  return (
    <ModalPortal>
      {/* BUG FIX (light theme): this modal was the one place in the app that
          didn't follow the shared modal pattern used everywhere else
          (premium-modal.tsx, content-modals.tsx, fortune-wheel-modal.tsx,
          the registration-screen.tsx policy sheet) — it hardcoded a literal
          black scrim (`rgba(0,0,0,0.6)`) instead of `var(--scrim)`, and used
          `var(--surface-1)` — a near-transparent overlay TINT meant to sit on
          top of a solid card, not serve as the card itself — as the entire
          panel background. In dark mode that accidentally still looked like
          a plausible dark panel; in light mode the ~5%-opacity violet tint
          let the black scrim show straight through, so the "Privacy Policy
          updated" panel that blocks the app on open rendered as a
          low-contrast dark box with dark text on it instead of a proper
          light card. Switched to the same var(--scrim) + solid
          bg-mid/bg-void gradient every other modal already uses. */}
      <div className="fixed inset-0 z-[1000] flex items-center justify-center px-5" style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}>
        <div className="w-full max-w-sm rounded-2xl p-5 flex flex-col gap-3" style={{ background: 'linear-gradient(180deg,var(--bg-mid),var(--bg-void))', border: '1px solid rgba(217,70,239,0.25)' }}>
          <h2 className="text-[var(--text-primary)] text-base font-serif">{t('privacyUpdate.title')}</h2>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed">
            {t('privacyUpdate.body')}
          </p>
          <Link href="/privacy" target="_blank" className="text-[#9D5FF5] text-sm underline w-fit">
            {t('privacyUpdate.read')}
          </Link>
          {error && <p className="text-xs" style={{ color: '#F87171' }}>{error}</p>}
          <button
            onClick={handleAgree}
            disabled={saving}
            className="mt-2 text-sm px-4 py-3 rounded-xl font-medium text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}
          >
            {saving ? t('privacyUpdate.saving') : t('privacyUpdate.agree')}
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}
