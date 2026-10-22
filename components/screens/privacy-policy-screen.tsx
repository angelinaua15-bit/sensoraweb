'use client'

// FILE PATH: components/screens/privacy-policy-screen.tsx
// Real, readable policy content from lib/legal-content.ts — the same
// content shown inline during registration, and reachable afterward from
// Settings → Privacy Policy (previously a dead row with no action).
import { PRIVACY_POLICY_SECTIONS, PRIVACY_POLICY_UPDATED } from '@/lib/legal-content'
import { useLanguage } from '@/components/language-provider'

interface Props {
  onBack: () => void
}

export default function PrivacyPolicyScreen({ onBack }: Props) {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--surface-1)' }}>
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-1)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <p className="text-[var(--text-primary)] text-sm font-medium">{t('register.privacyPolicy')}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6">
        <p className="text-[var(--text-dim)] text-[11px] mb-5">{t('register.lastUpdated', { date: PRIVACY_POLICY_UPDATED })}</p>
        <div className="flex flex-col gap-5">
          {PRIVACY_POLICY_SECTIONS.map(section => (
            <div key={section.heading}>
              <h3 className="text-[var(--text-primary)] text-sm font-medium mb-2">{section.heading}</h3>
              <div className="flex flex-col gap-2">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="text-[var(--text-muted)] text-xs leading-relaxed">{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}