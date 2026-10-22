'use client'

// FILE PATH: components/screens/splash-screen.tsx
import { useEffect, useState } from 'react'
import Link from 'next/link'
import SensoraLogo from '@/components/brand/sensora-logo'
import { useLanguage } from '@/components/language-provider'

interface Props {
  onStart: () => void
  // Was missing entirely — "Already have an account? Log in" used to call
  // the exact same onStart() as "Get Started", so returning users always
  // landed back in registration. Now a real, separate destination.
  onLogin: () => void
}

export default function SplashScreen({ onStart, onLogin }: Props) {
  const { t } = useLanguage()
  const LOADER_LINES = [t('splash.loader.0'), t('splash.loader.1'), t('splash.loader.2')]
  const [loading, setLoading] = useState(true)
  const [lineIndex, setLineIndex] = useState(0)

  // A short, on-brand "awakening" loading cycle plays once whenever the app
  // is opened, then reveals the real splash content — instead of a blank
  // screen or a generic spinner.
  useEffect(() => {
    const lineTimer = setInterval(() => {
      setLineIndex(i => Math.min(i + 1, LOADER_LINES.length - 1))
    }, 550)
    const doneTimer = setTimeout(() => setLoading(false), 1750)
    return () => { clearInterval(lineTimer); clearTimeout(doneTimer) }
  }, [])

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-6 sensora-bg">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full sensora-loader-ring" style={{ padding: 3 }}>
            <div className="w-full h-full rounded-full" style={{ background: 'var(--bg-void)' }} />
          </div>
          {/* The clean logo mark sitting inside the spinning ring — was the
              hand-traced SVG (SensoraLogo, loop mode), which reads as a messy
              scribble at this size. The ring itself already communicates
              "loading", so a static, correctly-drawn mark reads better here
              than an animated-but-crooked one. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sensora-mark.png" alt="Sensora" className="relative z-10" style={{ height: 44, width: 'auto' }} />
        </div>
        <p className="text-[var(--text-muted)] text-xs tracking-wide transition-opacity duration-300">
          {LOADER_LINES[lineIndex]}
        </p>
      </div>
    )
  }

  return (
    <div
      className="h-full flex flex-col items-center justify-between px-8 relative overflow-hidden sensora-bg screen-enter"
      // FIX (2026-09-10, native-readiness audit): was a flat pt-16/pb-14 —
      // on a notched device with viewport-fit=cover now enabled, this content
      // could sit under the notch/Dynamic Island at top or the home
      // indicator at bottom without this. calc() keeps the original spacing
      // and just adds the real inset on top of it (0px on non-notched
      // devices, so nothing changes there).
      // UPDATED (2026-09-19): the top inset moved to the shared <main> in
      // app/page.tsx, which now reserves safe-area-inset-top for every
      // screen (this one included) — keeping it here too would have added
      // it twice and pushed this screen's content down further than every
      // other screen. Bottom stays local since nothing else reserves it.
      style={{
        paddingTop: '4rem',
        paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle,rgba(124,58,237,0.55) 0%,transparent 70%)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-52 h-52 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle,rgba(217,70,239,0.45) 0%,transparent 70%)' }} />
      </div>

      <div className="flex flex-col items-center gap-4 relative z-10">
        {/* Real logo artwork — the wordmark is already baked into this image,
            so no separate "SENSORA" text is rendered below it here (unlike
            the small SVG-mark badges elsewhere, which still pair with
            separate HTML text). Requires /public/sensora-logo.png in the
            project — see the file-delivery note for this file. */}
        <SensoraLogo size={220} drawOn variant="photo" />
        <p className="text-[var(--text-muted)] text-sm tracking-wide -mt-2">{t('splash.tagline')}</p>
        <div className="flex gap-2">
          <span className="w-6 h-1.5 rounded-full bg-[#D946EF]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)]" />
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--text-dim)]" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 w-full max-w-xs relative z-10">
        <button
          onClick={onStart}
          className="w-full py-4 rounded-2xl text-white font-semibold text-base tracking-wide active:scale-95 transition-transform"
          style={{ background:'linear-gradient(135deg,#7C3AED,#D946EF)', boxShadow:'0 8px 32px rgba(217,70,239,0.4)' }}
        >
          {t('splash.getStarted')}
        </button>
        {/* Was a barely-visible small underlined text link doing nothing
            different from "Get Started" above — now a real, clearly visible
            secondary button that goes to an actual login screen. */}
        <button
          onClick={onLogin}
          className="w-full py-3.5 rounded-2xl font-semibold text-base tracking-wide active:scale-95 transition-transform"
          style={{ background: 'var(--surface-1)', border: '1.5px solid rgba(157,95,245,0.55)', color: 'var(--text-primary)' }}
        >
          {t('splash.alreadyHaveAccount')}
        </button>
        <p className="text-[var(--text-dim)] text-[11px] text-center leading-relaxed mt-1">
          {t('splash.agreeToTermsPrefix')}{' '}
          <Link href="/terms" className="text-[#9D5FF5] underline">{t('splash.termsOfUse')}</Link>
          {' '}{t('splash.and')}{' '}
          <Link href="/privacy" className="text-[#9D5FF5] underline">{t('splash.privacyPolicy')}</Link>
        </p>
        {/* Publicly visible, unlinked-to-app-state legal/contact row — added
            so a payment provider's site check (or an app-store reviewer)
            finds real terms/refund/contact info by just loading
            sensora.space, without signing in or navigating the app. See
            app/terms, app/privacy, app/refund, app/contacts. */}
        <p className="text-[var(--text-dim)] text-[10px] text-center leading-relaxed mt-2">
          <Link href="/refund" className="underline">{t('splash.refundPolicy')}</Link>
          {' · '}
          <Link href="/cookies" className="underline">{t('splash.cookiePolicy')}</Link>
          {' · '}
          <Link href="/contacts" className="underline">{t('splash.contact')}</Link>
        </p>
      </div>
    </div>
  )
}