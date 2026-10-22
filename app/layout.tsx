// FILE PATH: app/layout.tsx
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Fraunces } from 'next/font/google'
import { LanguageProvider } from '@/components/language-provider'
import { ThemeProvider } from '@/components/theme-provider'
import { CookieNoticeBanner } from '@/components/cookie-notice-banner'
import { NativeShellInit } from '@/components/native-shell-init'
import './globals.css'

// REAL BUG FOUND AND FIXED: this used to `import { THEME_STORAGE_KEY }` from
// theme-provider.tsx (a 'use client' file) and interpolate it into the
// script below (`localStorage.getItem('${THEME_STORAGE_KEY}')`). That
// doesn't work the way it looks — layout.tsx is a Server Component, and
// Next.js does NOT let a Server Component read the actual runtime value of
// a plain export from a Client Component module; it replaces it with an
// internal reference stub instead. The deployed page was literally shipping
// `localStorage.getItem('function(){throw Error("Attempted to call
// THEME_STORAGE_KEY() from the server...")}')` to every visitor — confirmed
// by fetching the live HTML directly. Harmless on its own (wrapped in
// try/catch, silently returns null), but a real, verified bug: it meant a
// person's manually-picked Light/Dark choice was never actually being read
// back on the next page load, always silently falling back to 'system'.
// Fixed by hardcoding the literal string here instead of importing it
// across the server/client boundary. MUST stay in sync by hand with
// `THEME_STORAGE_KEY` in components/theme-provider.tsx if that ever changes
// (a plain string constant, not expected to change often).
//
// Runs before React hydrates, so the correct theme is already on screen
// for the very first paint instead of flashing dark-then-light (or vice
// versa) a moment after load. Mirrors exactly what ThemeProvider itself
// resolves on mount — 'system' falls back to prefers-color-scheme — so the
// two never disagree. Safe as inline JS: it only reads
// localStorage/matchMedia and sets a data attribute, nothing that touches
// user data or the network.
const THEME_INIT_SCRIPT = `
(function() {
  try {
    var stored = localStorage.getItem('sensora_theme');
    var mode = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
    var resolved = mode === 'system'
      ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : mode;
    document.documentElement.dataset.theme = resolved;
    document.documentElement.style.colorScheme = resolved;
  } catch (e) {}
})();
`

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
})

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-serif',
  style: ['normal', 'italic'],
})

export const metadata: Metadata = {
  title: 'SENSORA — Your Guide to the Unseen',
  description: 'A real-time esoteric consultations platform. Astrology, numerology, Tarot, and compatibility.',
  generator: 'v0.app',
  icons: {
    // sensora-icon.png was a separately-drawn, glossier asset that didn't
    // match the real logo's line work or gradient — sensora-icon-512.png is
    // the honest replacement: the actual ribbon+spark mark from
    // sensora-logo.png, cropped and centered on a rounded-square card.
    icon: '/sensora-icon-512.png',
    apple: '/sensora-icon-512.png',
  },
}

export const viewport: Viewport = {
  // Actual literal colors — this becomes a <meta name="theme-color"> tag
  // the browser chrome reads directly, outside the CSS cascade, so it
  // can't reference a var(--token). Two entries so the OS-level browser
  // chrome (status bar / tab color) still matches whichever theme the
  // system is in even before the app's own JS-driven toggle has a chance
  // to run once.
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#120B2C' },
    { media: '(prefers-color-scheme: light)', color: '#FAF7FF' },
  ],
  width: 'device-width',
  initialScale: 1,
  // FIX (2026-09-10, native-readiness audit): was missing entirely. Without
  // viewport-fit=cover, iOS treats the WKWebView content area as if there's
  // no notch/Dynamic Island/home-indicator at all — it just insets the whole
  // page below them instead of ever drawing under them, which also means
  // every env(safe-area-inset-*) value used in CSS reports 0px, since there's
  // no unsafe area to describe. bottom-nav.tsx already depends on
  // safe-area-inset-bottom actually being non-zero; without this line that
  // padding was silently a no-op on real notched devices.
  viewportFit: 'cover',
  // App-shell UI (h-dvh, overflow-hidden body, native Capacitor wrapper) —
  // not a content site people need to pinch-zoom to read. Locking this
  // matches how the app already behaves once wrapped as a native iOS/Android
  // app (no double-tap-to-zoom there either), and avoids an accidental pinch
  // stretching the fixed-layout screens on web/PWA use too.
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable} bg-[var(--bg-void)]`}>
      <head>
        {/* Discourages Chrome's automatic "translate this page?" prompt at the
            browser level. Doesn't fully block it (users can still force
            Translate manually), but the per-form `translate="no"` guards on
            /crm/apply, /crm/activate and /crm/login are the real protection —
            see the comments there for why: auto-translate rewriting DOM text
            nodes conflicts with React's own updates on forms with live state
            (character counters, enabled/disabled buttons), and can make a
            perfectly working form look broken. */}
        <meta name="google" content="notranslate" />
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="antialiased font-sans bg-[var(--bg-void)] text-[var(--text-primary)] h-dvh overflow-hidden overscroll-none">
        <ThemeProvider>
          <LanguageProvider>
            {children}
            <CookieNoticeBanner />
            <NativeShellInit />
            {process.env.NODE_ENV === 'production' && <Analytics />}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}