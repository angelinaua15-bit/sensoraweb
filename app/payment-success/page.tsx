'use client'

// FILE PATH: app/payment-success/page.tsx
// Real, reachable landing page — this is where Stripe Checkout's
// success_url/cancel_url send the browser after someone pays (or cancels)
// for a minute package (see app/api/wallet/minute-package/checkout/
// route.ts). Not the same thing as the old components/screens/
// payment-success-screen.tsx that was deleted in §68 for being an
// unreachable, fake-data file with nothing wired to it — this one is a real
// public Next.js page at sensora.space/payment-success, reached by an actual
// external redirect from Stripe, same category as /terms, /privacy, /refund.
//
// This page does NOT credit the wallet (or mark a personal reading paid) —
// that already happened (or is about to, within seconds) via the Stripe
// webhook, independent of whether anyone ever loads this page. It's purely
// informational: confirm what happened and point the person back to the
// app. The session_id query param is used only to ask Stripe (via a tiny
// read-only check) whether that specific Checkout Session shows as paid, so
// this page can say something honest rather than generic — it never trusts
// the query string alone.
//
// `kind` query param (2026-09-08, added alongside real personal-reading
// payment): distinguishes which product this redirect is for, since the two
// resolve differently server-side and the copy below shouldn't claim
// "minutes will appear in your wallet" for a $50 flat-fee video request
// that never touches wallet minutes at all. Defaults to the original
// minute-package copy when absent, so old/bookmarked Checkout links with no
// kind param still read correctly.
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

function PaymentStatus() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const cancelled = params.get('cancelled') === '1'
  const isReading = params.get('kind') === 'reading'
  const [status, setStatus] = useState<'checking' | 'paid' | 'pending' | 'unknown'>(
    cancelled ? 'unknown' : sessionId ? 'checking' : 'unknown',
  )

  useEffect(() => {
    if (cancelled || !sessionId) return
    let cancelledEffect = false
    // Same generic, product-agnostic status check either way — it just asks
    // Stripe whether this session id is paid, regardless of what it paid for.
    fetch(`/api/wallet/minute-package/checkout/status?session_id=${encodeURIComponent(sessionId)}`)
      .then(res => res.json())
      .then(data => { if (!cancelledEffect) setStatus(data.paid ? 'paid' : 'pending') })
      .catch(() => { if (!cancelledEffect) setStatus('unknown') })
    return () => { cancelledEffect = true }
  }, [sessionId, cancelled])

  if (cancelled) {
    return (
      <>
        <h1 className="text-[var(--text-primary)] text-2xl font-serif mb-2">Payment cancelled</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          No charge was made. You can return to the Sensora app and try again whenever you're ready.
        </p>
      </>
    )
  }

  if (status === 'checking') {
    return (
      <>
        <h1 className="text-[var(--text-primary)] text-2xl font-serif mb-2">Checking your payment…</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">One moment.</p>
      </>
    )
  }

  if (status === 'paid') {
    return (
      <>
        <h1 className="text-[var(--text-primary)] text-2xl font-serif mb-2">Thank you — payment received</h1>
        <p className="text-[var(--text-muted)] text-sm leading-relaxed">
          {isReading
            ? 'A reader will start recording your personal tarot spread video shortly. Return to the app to check its status.'
            : 'Your minutes will appear in your Sensora wallet automatically, usually within a few seconds. Return to the app to see your updated balance.'}
        </p>
      </>
    )
  }

  return (
    <>
      <h1 className="text-[var(--text-primary)] text-2xl font-serif mb-2">Payment received</h1>
      <p className="text-[var(--text-muted)] text-sm leading-relaxed">
        {isReading
          ? "We're confirming it now — your personal reading request will move to \"waiting to be recorded\" automatically once that's done, usually within a few seconds. Return to the app to check its status. If it doesn't update within a few minutes, contact support and we'll check it by hand."
          : "We're confirming it now — your minutes will appear in your Sensora wallet automatically once that's done, usually within a few seconds. Return to the app to see your updated balance. If it doesn't update within a few minutes, contact support and we'll check it by hand."}
      </p>
    </>
  )
}

export default function PaymentSuccessPage() {
  return (
    <div className="h-dvh overflow-y-auto sensora-bg flex items-center justify-center px-6">
      <div className="max-w-sm w-full text-center py-10">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,rgba(217,70,239,0.25),rgba(217,70,239,0.1))', border: '1.5px solid rgba(217,70,239,0.5)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D946EF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
        </div>
        <Suspense fallback={<p className="text-[var(--text-muted)] text-sm">Loading…</p>}>
          <PaymentStatus />
        </Suspense>
        <Link href="/" className="inline-block mt-6 text-[#9D5FF5] text-xs underline">
          ← Back to Sensora
        </Link>
      </div>
    </div>
  )
}