'use client'

// FILE PATH: components/language-toggle.tsx
// Compact EN/UK two-way switch — same visual pattern as theme-toggle.tsx,
// sized for the CRM sidebar where there isn't room for the client app's
// full flag-and-label modal (see settings-screen.tsx for that version).
// Both read/write the same LanguageProvider — switching here changes the
// same locale a client would see, since staff and clients share one
// LanguageProvider (see app/layout.tsx).
import { useLanguage } from '@/components/language-provider'
import type { Locale } from '@/lib/i18n'

interface Props {
  className?: string
}

const OPTIONS: { id: Locale; label: string }[] = [
  { id: 'en', label: 'EN' },
  { id: 'es', label: 'ES' },
]

export default function LanguageToggle({ className = '' }: Props) {
  const { locale, setLocale } = useLanguage()

  return (
    <div
      className={`inline-flex items-center gap-0.5 p-1 rounded-full ${className}`}
      style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }}
      role="radiogroup"
      aria-label="Language"
    >
      {OPTIONS.map(opt => {
        const active = locale === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setLocale(opt.id)}
            className="flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              background: active ? 'linear-gradient(135deg,#7C3AED,#D946EF)' : 'transparent',
              color: active ? '#fff' : 'var(--text-dim)',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}