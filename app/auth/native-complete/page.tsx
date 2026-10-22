'use client'

// FILE PATH: app/auth/native-complete/page.tsx
// NEW (2026-09-18) — the last stop before handing control back to the
// native app after a system-browser Google sign-in (see
// app/api/auth/google/callback/route.ts for the full flow explanation).
//
// This page is loaded IN THE SYSTEM BROWSER (Safari/Chrome), not the app's
// own WebView — Google's redirect lands here with either a real session
// token (?status=ok&token=...) or an error/cancellation. It immediately
// tries to hand off to the native app via the sensora:// custom scheme,
// which components/oauth-buttons.tsx is listening for (App.addListener
// 'appUrlOpen', filtered to hostname 'oauth-callback' — see that file and
// the matching guard added in components/native-shell-init.tsx so its own,
// unrelated referral-link listener doesn't also try to handle this URL).
//
// The automatic redirect is attempted on mount, but some mobile browsers
// only allow a custom-scheme navigation from a real user tap (not a script
// running on page load) — so there's always a visible button too, not just
// a silent auto-redirect that might quietly do nothing.
import { Suspense, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'

// BUG FIX (build failure: "Error occurred prerendering page
// /auth/native-complete... exiting the build"): useSearchParams() opts a
// page out of static prerendering unless something above it in the tree is
// wrapped in <Suspense> — without that, Next.js's build step (this project
// uses Turbopack) fails the whole build instead of just skipping static
// generation for this one page. Split into an inner component that reads
// the params and an outer default export that wraps it in Suspense, which
// is Next.js's own documented fix for exactly this error.
export default function NativeAuthCompletePage() {
  return (
    <Suspense fallback={null}>
      <NativeAuthCompleteInner />
    </Suspense>
  )
}

function NativeAuthCompleteInner() {
  const params = useSearchParams()
  const status = params.get('status')
  const token = params.get('token')
  const message = params.get('message')

  const deepLink = useMemo(() => {
    const url = new URL('sensora://oauth-callback')
    if (status) url.searchParams.set('status', status)
    if (token) url.searchParams.set('token', token)
    if (message) url.searchParams.set('message', message)
    return url.toString()
  }, [status, token, message])

  useEffect(() => {
    // Best-effort automatic hand-off — see the button below for the
    // guaranteed path if the browser blocks this.
    window.location.replace(deepLink)
  }, [deepLink])

  const title =
    status === 'ok' ? 'Signed in' : status === 'cancelled' ? 'Sign-in cancelled' : 'Sign-in failed'
  const body =
    status === 'ok'
      ? 'You are signed in with Google. Return to the Sensora app to continue.'
      : status === 'cancelled'
        ? 'You closed the Google sign-in screen before finishing. You can close this tab and try again in the app.'
        : (message || 'Something went wrong verifying your Google sign-in. Close this tab and try again in the app.')

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        padding: 24,
        textAlign: 'center',
        background: '#120B2C',
        color: '#F5F3FF',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>{title}</h1>
      <p style={{ fontSize: 14, color: '#B4A9D6', maxWidth: 320, lineHeight: 1.5 }}>{body}</p>
      <a
        href={deepLink}
        style={{
          marginTop: 8,
          padding: '12px 24px',
          borderRadius: 999,
          background: 'linear-gradient(135deg,#7C3AED,#D946EF)',
          color: '#fff',
          fontWeight: 600,
          fontSize: 14,
          textDecoration: 'none',
        }}
      >
        Return to Sensora
      </a>
    </div>
  )
}
