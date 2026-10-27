'use client'

// FILE PATH: components/screens/registration-screen.tsx
import { useState } from 'react'
import { PRIVACY_POLICY_SECTIONS, PRIVACY_POLICY_UPDATED } from '@/lib/legal-content'
import { isValidEmail, isValidPhoneE164, COUNTRY_DIALS, calculateAge } from '@/lib/validation'
import BirthDateSelect from '@/components/ui/birth-date-select'
import OAuthButtons from '@/components/oauth-buttons'
import { useLanguage } from '@/components/language-provider'

interface Props {
  birthDate: string
  // REAL FEATURE CHANGED ("прибрати код підтвердження емейл, легша
  // реєстрація"): used to be { name, contact, devCode? } — the app/page.tsx
  // parent would stash those and route to a dedicated OTP-entry screen.
  // Registration now signs the person in directly (see
  // app/api/auth/register/route.ts), so this carries the same shape as
  // onOAuthComplete below and both go straight to `home`.
  onRegistered: (params: { userId: string; name: string; contact: string; balance: number }) => void
  onOAuthComplete: (params: { userId: string; name: string; balance: number }) => void
}

// Eye / eye-off toggle icons for the password fields below.
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

export default function RegisterScreen({ birthDate: initialBirthDate, onRegistered, onOAuthComplete }: Props) {
  const { t } = useLanguage()
  // Date of birth is asked right here now (the separate quiz screen before
  // registration was removed). Needed for the 18+ check and the zodiac sign.
  const [birthDate, setBirthDate] = useState(initialBirthDate || '')
  const [tab, setTab] = useState<'email' | 'phone'>('email')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  // Ukraine first (the app's primary market) — real dial codes, see
  // lib/validation.ts. The phone number people actually type is just the
  // local part; the dial code is composed on submit into a real E.164-ish
  // string ("+380501234567") so a bare 7-digit scribble can't be saved as
  // someone's whole phone number.
  const [countryDial, setCountryDial] = useState(COUNTRY_DIALS[0].dial)
  const [phoneLocal, setPhoneLocal] = useState('')
  // Real password + bio, collected once at registration (applies to both
  // the Email and Phone tabs) — previously this screen only asked for a
  // contact method and never set a password at all, so there was no way to
  // log back in later without a fresh OTP code every time.
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // Show/hide toggles for the two password fields — off by default (masked),
  // each field has its own independent toggle so revealing one doesn't
  // reveal the other.
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Real consent gate, mirroring Nebula's registration flow — both submit
  // paths below are disabled until this is checked, and the server
  // independently rejects the request without it too (see
  // app/api/auth/register/route.ts and app/api/auth/oauth/route.ts), so this
  // isn't just a UI-only checkbox.
  const [agreedToPrivacy, setAgreedToPrivacy] = useState(false)
  const [showPolicy, setShowPolicy] = useState(false)

  const handleSubmit = async () => {
    // Real format moderation, not just "is something typed in the box" —
    // the same isValidEmail/isValidPhoneE164 rules are re-checked
    // server-side in app/api/auth/register/route.ts, since a client-only
    // check can be bypassed by calling the API directly.
    const contact = tab === 'email' ? email.trim() : `${countryDial}${phoneLocal.replace(/\D/g, '')}`
    if (tab === 'email' && !email.trim()) {
      setError(t('register.enterEmail'))
      return
    }
    if (tab === 'phone' && !phoneLocal.trim()) {
      setError(t('register.enterPhone'))
      return
    }
    if (tab === 'email' && !isValidEmail(contact)) {
      setError(t('register.invalidEmail'))
      return
    }
    if (tab === 'phone' && !isValidPhoneE164(contact)) {
      setError(t('register.invalidPhone'))
      return
    }
    if (!birthDate) {
      setError(t('miniTest.enterBirthDate'))
      return
    }
    {
      const d = new Date(birthDate)
      if (isNaN(d.getTime()) || d > new Date()) {
        setError(t('miniTest.invalidBirthDate'))
        return
      }
      if (calculateAge(d) < 18) {
        setError(t('miniTest.under18'))
        return
      }
    }
    if (password.length < 8) {
      setError(t('register.passwordTooShort'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('register.passwordsMismatch'))
      return
    }
    if (!agreedToPrivacy) {
      setError(t('register.mustAgree'))
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, contact, birthDate, privacyAccepted: agreedToPrivacy, password }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('register.registrationFailed'))
      onRegistered({ userId: data.user.id, name: data.user.name || name || contact, contact, balance: data.balance })
    } catch (e: any) {
      setError(e.message || t('register.somethingWrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      // h-full + overflow-y-auto, not min-h-screen: the app shell (app/page.tsx)
      // wraps every screen in <main className="h-dvh overflow-hidden">, which
      // clips anything taller than the viewport and blocks the page from
      // scrolling — min-h-screen alone did nothing there, since the ancestor
      // itself can't scroll. This screen has enough fields (name, email/phone,
      // password, confirm password, bio, checkbox, button, OAuth) to run
      // taller than most phone screens, so without this the "Continue" button
      // was pushed below the fold with no way to reach it.
      className="h-full overflow-y-auto flex flex-col px-8 pt-10 pb-14 notranslate"
      translate="no"
      style={{ background: 'linear-gradient(180deg,var(--bg-void) 0%,var(--bg-deep) 100%)' }}
    >
      <div className="mb-7">
        <h2 className="text-[var(--text-primary)] text-xl font-serif font-light">{t('register.title')}</h2>
        <p className="text-[var(--text-dim)] text-sm mt-1">{t('register.subtitle')}</p>
      </div>

      {/* Name */}
      <div className="mb-4">
        <label className="text-[var(--text-muted)] text-xs mb-1.5 block">{t('register.yourName')}</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t('register.namePlaceholder')}
          className="w-full px-4 py-3.5 rounded-2xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none"
          style={{ background:'var(--surface-1)', border:'1px solid rgba(124,58,237,0.3)' }}
        />
      </div>

      {/* Date of birth */}
      <div className="mb-4">
        <label className="text-[var(--text-muted)] text-xs mb-1.5 block">{t('miniTest.dateOfBirth')}</label>
        <BirthDateSelect value={birthDate} onChange={v => { setBirthDate(v); setError(null) }} />
      </div>

      {/* Tab toggle */}
      <div className="flex rounded-2xl p-1 mb-4" style={{ background:'var(--bg-elevated)' }}>
        {(['email','phone'] as const).map(tabId => (
          <button key={tabId} onClick={() => setTab(tabId)}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: tab === tabId ? 'linear-gradient(135deg,#7C3AED,#D946EF)' : 'transparent', color: tab === tabId ? '#fff' : 'var(--text-muted)' }}
          >
            {tabId === 'email' ? t('register.email') : t('register.phone')}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="mb-2">
        <label className="text-[var(--text-muted)] text-xs mb-1.5 block">{tab === 'email' ? t('register.email') : t('register.phone')}</label>
        {tab === 'email' ? (
          <input
            type="email"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(null) }}
            placeholder="you@example.com"
            className="w-full px-4 py-3.5 rounded-2xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none"
            style={{ background:'var(--surface-1)', border:'1px solid rgba(124,58,237,0.3)' }}
          />
        ) : (
          <div className="flex gap-2">
            <select
              aria-label={t('register.countryCode')}
              value={countryDial}
              onChange={e => { setCountryDial(e.target.value); setError(null) }}
              className="px-2.5 py-3.5 rounded-2xl text-sm text-[var(--text-primary)] outline-none flex-shrink-0 appearance-none text-center cursor-pointer"
              style={{ background:'var(--surface-1)', border:'1px solid rgba(124,58,237,0.3)', colorScheme: 'dark' }}
            >
              {COUNTRY_DIALS.map(c => (
                <option key={c.iso} value={c.dial} style={{ background: 'var(--bg-mid)', color: 'var(--text-primary)' }}>
                  {c.flag} {c.dial}
                </option>
              ))}
            </select>
            <input
              type="tel"
              inputMode="numeric"
              value={phoneLocal}
              onChange={e => { setPhoneLocal(e.target.value.replace(/[^\d\s()-]/g, '')); setError(null) }}
              placeholder={t('register.phonePlaceholder')}
              className="flex-1 min-w-0 px-4 py-3.5 rounded-2xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none"
              style={{ background:'var(--surface-1)', border:'1px solid rgba(124,58,237,0.3)' }}
            />
          </div>
        )}
      </div>

      {/* Password — applies to both Email and Phone tabs, so this account can
          be logged back into directly (see login-screen.tsx) instead of
          needing a fresh OTP code every single time. */}
      <div className="mb-4">
        <label className="text-[var(--text-muted)] text-xs mb-1.5 block">{t('register.createPassword')}</label>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => { setPassword(e.target.value); setError(null) }}
            placeholder={t('register.passwordPlaceholder')}
            className="w-full pl-4 pr-11 py-3.5 rounded-2xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none"
            style={{ background:'var(--surface-1)', border:'1px solid rgba(124,58,237,0.3)' }}
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            aria-label={showPassword ? t('register.hidePassword') : t('register.showPassword')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center"
          >
            {showPassword ? EyeOffIcon : EyeIcon}
          </button>
        </div>
      </div>
      <div className="mb-4">
        <label className="text-[var(--text-muted)] text-xs mb-1.5 block">{t('register.confirmPassword')}</label>
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={e => { setConfirmPassword(e.target.value); setError(null) }}
            placeholder={t('register.confirmPasswordPlaceholder')}
            className="w-full pl-4 pr-11 py-3.5 rounded-2xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none"
            style={{ background:'var(--surface-1)', border:'1px solid rgba(124,58,237,0.3)' }}
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(v => !v)}
            aria-label={showConfirmPassword ? t('register.hidePassword') : t('register.showPassword')}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center"
          >
            {showConfirmPassword ? EyeOffIcon : EyeIcon}
          </button>
        </div>
      </div>

      {/* Real consent checkbox, not decorative — both submit buttons below
          stay disabled until this is checked, and the server enforces it
          independently too. */}
      <label className="flex items-start gap-2.5 mt-3 mb-1 cursor-pointer">
        <input
          type="checkbox"
          checked={agreedToPrivacy}
          onChange={e => setAgreedToPrivacy(e.target.checked)}
          className="mt-0.5 w-4 h-4 flex-shrink-0 accent-[#D946EF]"
        />
        <span className="text-[var(--text-muted)] text-xs leading-relaxed">
          {t('register.agreeToPrefix')}{' '}
          <button type="button" onClick={() => setShowPolicy(true)} className="text-[#D946EF] underline underline-offset-2">
            {t('register.privacyPolicy')}
          </button>
        </span>
      </label>

      {error && <p className="text-[#EF4444] text-xs mb-2">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={loading || !agreedToPrivacy}
        className="w-full py-4 rounded-2xl text-white font-semibold text-base mt-2 active:scale-95 transition-transform disabled:opacity-60"
        style={{ background:'linear-gradient(135deg,#7C3AED,#D946EF)', boxShadow:'0 8px 32px rgba(217,70,239,0.35)' }}
      >
        {loading ? t('register.creatingAccount') : t('register.continue')}
      </button>

      <div className="flex items-center gap-3 my-5">
        <div className="flex-1 h-px" style={{ background:'var(--surface-1)' }} />
        <span className="text-[var(--text-dim)] text-xs">{t('register.orContinueWith')}</span>
        <div className="flex-1 h-px" style={{ background:'var(--surface-1)' }} />
      </div>

      {/* THE ACTUAL BUG THAT WAS BREAKING THE WHOLE SITE: this used to be a
          leftover copy of the OLD inline Google/Apple buttons block (from
          before oauth-buttons.tsx existed), referencing GOOGLE_CLIENT_ID,
          googleBtnRef, setOauthError, GoogleIcon, handleAppleSignIn,
          oauthLoading, AppleIcon, oauthError — NONE of which are defined
          anywhere in this file anymore (they only exist inside
          oauth-buttons.tsx now). React doesn't catch a ReferenceError
          thrown during render — with no error boundary above it, it takes
          down the entire page, which is exactly what "This page couldn't
          load" was: not a network/hosting issue, not a Vercel outage, a
          real crash on every visit to this screen (reached right after the
          mini-test's "Get Started" button, matching what was reported).
          Confirmed directly from the browser's own error overlay this time
          — not a guess. Fixed by actually using the shared OAuthButtons
          component (already imported at the top of this file, but never
          rendered) instead of the dead leftover markup. */}
      <OAuthButtons name={name} birthDate={birthDate} agreedToPrivacy={agreedToPrivacy} onComplete={onOAuthComplete} />

      {showPolicy && (
        <div className="fixed inset-0 z-[500] flex items-end sm:items-center justify-center" style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl flex flex-col" style={{ background: 'linear-gradient(180deg,var(--bg-mid),var(--bg-void))', border: '1px solid rgba(217,70,239,0.25)', maxHeight: '86vh' }}>
            <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--surface-1)' }}>
              <p className="text-[var(--text-primary)] text-sm font-serif">{t('register.privacyPolicy')}</p>
              <button onClick={() => setShowPolicy(false)} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: 'var(--surface-1)' }} aria-label={t('register.close')}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <p className="text-[var(--text-dim)] text-[10px] mb-4">{t('register.lastUpdated', { date: PRIVACY_POLICY_UPDATED })}</p>
              <div className="flex flex-col gap-4">
                {PRIVACY_POLICY_SECTIONS.map(section => (
                  <div key={section.heading}>
                    <h4 className="text-[var(--text-primary)] text-xs font-medium mb-1.5">{section.heading}</h4>
                    <div className="flex flex-col gap-1.5">
                      {section.body.map((paragraph, i) => (
                        <p key={i} className="text-[var(--text-muted)] text-[11px] leading-relaxed">{paragraph}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-6 pt-3 pb-6 flex-shrink-0">
              <button
                onClick={() => { setAgreedToPrivacy(true); setShowPolicy(false) }}
                className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}
              >
                {t('register.iAgree')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
