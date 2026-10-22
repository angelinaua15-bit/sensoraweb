'use client'

// FILE PATH: components/screens/login-screen.tsx
// Real returning-user sign-in — email/phone + password, checked against
// app/api/auth/login/route.ts. This did not exist before: the splash
// screen's "Already have an account? Log in" button used to just call the
// same onStart() as "Get Started", dumping returning users straight back
// into registration. This is the actual destination for that button now.
import { useState } from 'react'
// Real "Continue with Google" / "Continue with Apple" — added per user
// request, since these were previously only reachable from the sign-up
// screen. Anyone whose account was originally created with Google/Apple had
// no way to get back in, because they never set a password. The SAME
// server route (app/api/auth/oauth/route.ts) that creates new accounts also
// looks up an existing one first, so these buttons work here as a real
// "log in with Google/Apple" without any separate endpoint.
import OAuthButtons from '@/components/oauth-buttons'
import { useLanguage } from '@/components/language-provider'

interface Props {
  onBack: () => void
  onLoggedIn: (params: { userId: string; name: string; balance: number; contact: string }) => void
  // REAL BUG FOUND (pre-launch audit): "Don't have an account? Sign up"
  // below used to just call onBack (→ Splash), costing a real new user one
  // extra tap ("Get Started" on Splash) to actually reach the sign-up flow
  // — the label promised "Sign up," the button did "go back." This goes
  // straight to onboarding instead (same first step Splash's own "Get
  // Started" uses) rather than straight to the register screen, since
  // registration depends on birth date/category collected during
  // onboarding → mini-test first.
  onRegister: () => void
}

// Show/hide toggle icons for the password field — same pair used in
// registration-screen.tsx, kept local here since this file has no shared
// icon module to import from.
const EyeIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
const EyeOffIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.3 20.3 0 0 1 4.22-5.36M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a20.3 20.3 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)

export default function LoginScreen({ onBack, onLoggedIn, onRegister }: Props) {
  const { t } = useLanguage()
  const [contact, setContact] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!contact.trim() || !password) {
      setError(t('login.enterCredentials'))
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact: contact.trim(), password }),
      })
      const raw = await res.text()
      let data: any = null
      try { data = raw ? JSON.parse(raw) : null } catch { /* not JSON — server error page */ }
      if (!res.ok) {
        setError(data?.error ?? t('login.serverError', { status: res.status }))
        return
      }
      if (!data?.user?.id) {
        setError(t('login.unexpectedResponse'))
        return
      }
      onLoggedIn({ userId: data.user.id, name: data.user.name, balance: data.balance ?? 0, contact: contact.trim() })
    } catch (err) {
      setError(t('login.networkError', { msg: err instanceof Error ? err.message : 'try again' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      // Same fix as registration-screen.tsx: h-full + overflow-y-auto instead
      // of min-h-screen, since the app shell clips overflow and doesn't
      // scroll on its own — see the longer note there.
      className="h-full overflow-y-auto flex flex-col px-8 pt-10 pb-14 notranslate"
      translate="no"
      style={{ background: 'linear-gradient(180deg,var(--bg-void) 0%,var(--bg-deep) 100%)' }}
    >
      <button onClick={onBack} className="text-[var(--text-dim)] text-sm mb-6 self-start flex items-center gap-1.5">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        {t('login.back')}
      </button>

      <div className="mb-7">
        <h2 className="text-[var(--text-primary)] text-xl font-serif font-light">{t('login.title')}</h2>
        <p className="text-[var(--text-dim)] text-sm mt-1">{t('login.subtitle')}</p>
      </div>

      <form onSubmit={submit}>
        <label className="block mb-4">
          <span className="text-[var(--text-muted)] text-xs mb-1.5 block">{t('login.emailOrPhone')}</span>
          <input
            value={contact}
            onChange={e => { setContact(e.target.value); setError(null) }}
            placeholder="you@example.com or +380..."
            className="w-full px-4 py-3.5 rounded-2xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none"
            style={{ background: 'var(--surface-1)', border: '1px solid rgba(124,58,237,0.3)' }}
          />
        </label>

        <label className="block mb-2">
          <span className="text-[var(--text-muted)] text-xs mb-1.5 block">{t('login.password')}</span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => { setPassword(e.target.value); setError(null) }}
              placeholder="••••••••"
              className="w-full pl-4 pr-11 py-3.5 rounded-2xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none"
              style={{ background: 'var(--surface-1)', border: '1px solid rgba(124,58,237,0.3)' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center"
            >
              {showPassword ? EyeOffIcon : EyeIcon}
            </button>
          </div>
        </label>

        {error && <p className="text-[#EF4444] text-xs mb-2 mt-2 leading-relaxed">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl text-white font-semibold text-base mt-4 active:scale-95 transition-transform disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)', boxShadow: '0 8px 32px rgba(217,70,239,0.35)' }}
        >
          {loading ? t('login.signingIn') : t('login.logIn')}
        </button>

        <button type="button" onClick={onRegister} className="w-full text-center text-[var(--text-muted)] text-sm mt-5 underline underline-offset-4 opacity-80">
          {t('login.noAccount')}
        </button>
      </form>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px" style={{ background: 'var(--surface-1)' }} />
        <span className="text-[var(--text-dim)] text-xs">{t('login.orContinueWith')}</span>
        <div className="flex-1 h-px" style={{ background: 'var(--surface-1)' }} />
      </div>

      {/* No agreedToPrivacy prop passed here on purpose — an account signing
          in with Google/Apple already agreed to the Privacy Policy the
          first time it was created, so the buttons are active immediately
          rather than gated behind a checkbox that doesn't exist on this
          screen. See app/api/auth/oauth/route.ts: it only requires
          privacyAccepted when actually creating a brand-new account. */}
      <OAuthButtons onComplete={onLoggedIn} />
    </div>
  )
}