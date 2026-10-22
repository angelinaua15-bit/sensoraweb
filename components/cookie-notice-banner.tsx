'use client'

// FILE PATH: components/cookie-notice-banner.tsx
// Added 2026-09-10 alongside the Cookie Policy rewrite (lib/legal-content.ts,
// app/cookies/page.tsx). A one-line, dismissible notice shown on first
// visit — the same transparency-best-practice pattern used by larger
// companies, even where (as explained in COOKIE_POLICY_SECTIONS section 4)
// nothing on the site legally requires opt-in consent: every cookie is
// either strictly necessary (login) or a first-party preference the user
// set themselves, and the one analytics tool in use (Vercel Web Analytics)
// is cookieless by design. This banner is a notice, not a consent gate —
// it never blocks any part of the app, and there is nothing to "accept" or
// "reject" by category because there is no optional/non-essential cookie
// on this site to begin with.
// Dismissal is remembered in localStorage — same mechanism, same
// disclosed-in-the-policy-itself pattern as sensora_theme/sensora_locale.
import { useEffect, useState } from 'react'
import Link from 'next/link'

const ACK_STORAGE_KEY = 'sensora_cookie_notice_ack'
// Bump this if the notice's substance changes materially — re-shows the
// banner once to previously-acknowledged visitors, same convention as
// PRIVACY_POLICY_VERSION in lib/legal-content.ts.
const ACK_VERSION = '2026-09-10'

export function CookieNoticeBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ACK_STORAGE_KEY)
      if (stored !== ACK_VERSION) setVisible(true)
    } catch {
      // localStorage unavailable — fail closed by just not showing the
      // banner rather than throwing; it's a notice, not a required gate.
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    try {
      window.localStorage.setItem(ACK_STORAGE_KEY, ACK_VERSION)
    } catch {
      /* non-fatal */
    }
  }

  if (!visible) return null

  // BUG FIX (real device screenshot): the old bottom-docked banner, with a
  // full paragraph of copy, sat directly on top of the splash screen's
  // "Already have an account? Log In" link and its own policy links — the
  // bottom of the screen is the most contested real estate in this app
  // (every screen has a bottom nav, chat input, or primary CTA down there),
  // so anything `fixed bottom-0` here was always going to collide with
  // something.
  // Redesigned as a slim, single-line, TOP-docked strip instead: much
  // shorter copy so it fits one line on a real phone, and the top of the
  // screen is otherwise unused space (below the status bar, above any
  // screen's own header) on every screen in this app. Also capped to the
  // app's own max-w-[480px] column (see app/page.tsx) so it doesn't span
  // the full viewport width on a tablet/desktop browser.
  return (
    <div
      className="fixed inset-x-0 top-0 z-[999] flex justify-center px-3"
      style={{ pointerEvents: 'none', paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))' }}
      role="region"
      aria-label="Cookie notice"
    >
      <div
        className="w-full max-w-[480px] rounded-full shadow-lg flex items-center gap-2 pl-4 pr-2 py-2"
        style={{
          background: 'rgba(22,9,46,0.92)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(157,95,245,0.35)',
          pointerEvents: 'auto',
        }}
      >
        <p className="text-white/85 text-[11px] leading-tight flex-1 truncate">
          We use cookies to keep you signed in — no tracking ads.{' '}
          <Link href="/cookies" className="text-[#D9C6FF] underline whitespace-nowrap">
            Cookie Policy
          </Link>
        </p>
        <button
          onClick={dismiss}
          aria-label="Dismiss"
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition-transform"
          style={{ background: '#9D5FF5', color: '#fff' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  )
}
