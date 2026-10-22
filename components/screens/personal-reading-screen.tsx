'use client'

// FILE PATH: components/screens/personal-reading-screen.tsx
// The destination behind the "Personal Tarot Spread Video" banner on the
// Today screen (see today-widgets.tsx -> PersonalTarotVideoBanner). A real
// order flow: the client writes what they want the spread to be about,
// submits the request (POST /api/personal-reading), pays via real Stripe
// Checkout, and a staff member later records and uploads an actual video
// for it once the payment is confirmed.
//
// REAL PAYMENT (2026-09-08): this used to submit the request with no
// payment step at all ("Payment is arranged directly with our team"). Now
// submitting opens real Stripe Checkout, same "tap Buy → pay on Stripe's
// own page → confirmed automatically by webhook" flow as
// components/screens/wallet-screen.tsx uses for minute packages — nothing
// here pretends a charge happened before Stripe actually confirms it.
import { useState, useEffect } from 'react'
import { PERSONAL_READING_PRICE } from '@/lib/personal-reading'
// Real vector art (same library used elsewhere) in place of the plain 🎴
// emoji this screen used to lead with.
import { TarotCardArt } from '@/components/magic-art'
import { Capacitor } from '@capacitor/core'
import { useLanguage } from '@/components/language-provider'

// REAL APP STORE RISK GUARD (2026-09-10): checked Apple's current App Review
// Guidelines before writing this. Guideline 3.1.3(d)'s "person-to-person
// services" exemption — the one that plausibly covers live per-minute chat
// with a real expert — explicitly requires the service to be REAL-TIME.
// This screen is the opposite: a client submits a request, and a reader
// records and delivers a video LATER. That's exactly the "asynchronous"
// case Apple's own guideline calls out as needing real Apple In-App
// Purchase, not an external processor. Paying via Stripe Checkout for this
// specific product on iOS is a concrete, foreseeable rejection reason, so
// this is gated off on the native iOS build only (web, Android, and the
// Telegram Mini App are unaffected) until either Apple IAP is wired in for
// this product specifically, or it's dropped from the iOS build's feature
// set entirely — a real decision for Angelina to make, not something to
// guess at here.
function isNativeIOS(): boolean {
  try { return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios' } catch { return false }
}

interface PersonalReading {
  id: string
  requestNote: string
  price: number
  status: 'requested' | 'in_progress' | 'delivered'
  paymentStatus: 'unpaid' | 'paid' | 'failed'
  paymentLink: string | null
  videoUrl: string | null
  createdAt: string
  deliveredAt: string | null
}

interface Props {
  userId?: string | null
  userName?: string
  onBack: () => void
}

export default function PersonalReadingScreen({ userId, userName, onBack }: Props) {
  const { t } = useLanguage()
  const [readings, setReadings] = useState<PersonalReading[]>([])
  const [loading, setLoading] = useState(true)
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Real Stripe Checkout URL, once the pending (unpaid) request exists —
  // same pattern as wallet-screen.tsx's `pending` state. The request is
  // already saved server-side at this point; this is purely "go pay now".
  const [pendingCheckout, setPendingCheckout] = useState<string | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/personal-reading')
      const data = await res.json()
      if (res.ok) setReadings(data.readings ?? [])
    } catch {
      // Best-effort — the request form below still works even if the
      // history fails to load.
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const submit = async () => {
    if (!note.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/personal-reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestNote: note.trim(), userName }),
      })
      const data = await res.json()
      if (data.reading) {
        setReadings(prev => [data.reading, ...prev])
        setNote('')
      }
      if (data.checkoutUrl) {
        setPendingCheckout(data.checkoutUrl)
      } else if (!res.ok) {
        setError(data?.error ?? t('personalReading.paymentStartError'))
      }
    } catch {
      setError(t('personalReading.networkError'))
    } finally {
      setSubmitting(false)
    }
  }

  const statusLabel = (r: PersonalReading) => {
    if (r.paymentStatus === 'unpaid') return t('personalReading.awaitingPayment')
    if (r.paymentStatus === 'failed') return t('personalReading.paymentFailed')
    return r.status === 'requested' ? t('personalReading.waitingToBeRecorded') : r.status === 'in_progress' ? t('personalReading.beingRecorded') : t('personalReading.delivered')
  }

  const statusColor = (r: PersonalReading) => {
    if (r.status === 'delivered') return '#22C55E'
    if (r.paymentStatus === 'failed') return '#EF4444'
    return '#F5C542'
  }

  // See the isNativeIOS() comment above — blocks the whole feature on the
  // native iOS build rather than letting someone reach a Stripe Checkout
  // link Apple would flag. Existing unpaid requests (from before this guard
  // existed, or made on web/Android) still show the "go pay now" screen
  // below on other platforms; on iOS this replaces both that screen and the
  // request form.
  if (isNativeIOS()) {
    return (
      <div className="flex flex-col h-full sensora-bg items-center justify-center px-8 text-center gap-3">
        <TarotCardArt size={48} symbol="🎴" />
        <p className="text-[var(--text-primary)] text-sm font-medium">{t('personalReading.notOnIos')}</p>
        <p className="text-[var(--text-dim)] text-xs leading-relaxed">
          {t('personalReading.notOnIosHint')}
        </p>
        <button onClick={onBack}
          className="mt-2 text-xs px-4 py-2.5 rounded-xl font-medium text-white"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {t('personalReading.back')}
        </button>
      </div>
    )
  }

  // Same "go pay now" screen as wallet-screen.tsx's `pending` state — the
  // request already exists server-side (unpaid) at this point.
  if (pendingCheckout) {
    return (
      <div className="flex flex-col h-full sensora-bg items-center justify-center px-8 text-center gap-4">
        <div className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,rgba(217,70,239,0.25),rgba(217,70,239,0.1))', border: '1.5px solid rgba(217,70,239,0.5)' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#D946EF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          </svg>
        </div>
        <div>
          <p className="text-[var(--text-muted)] text-xs font-medium mb-1 tracking-widest">{t('personalReading.payToContinue')}</p>
          <h3 className="text-[var(--text-primary)] text-2xl font-serif font-light">${PERSONAL_READING_PRICE}</h3>
          <p className="text-[var(--text-muted)] text-xs mt-1">{t('personalReading.savedNote')}</p>
        </div>
        <a href={pendingCheckout} target="_blank" rel="noopener noreferrer"
          className="w-full py-4 rounded-2xl text-white font-semibold text-sm active:scale-95 transition-transform text-center"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)', boxShadow: '0 8px 32px rgba(217,70,239,0.35)' }}>
          {t('personalReading.payNow')}
        </a>
        <button onClick={() => setPendingCheckout(null)}
          className="w-full py-3 rounded-2xl text-sm font-medium"
          style={{ color: 'var(--text-dim)' }}>
          {t('personalReading.done')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--surface-1)' }}>
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-1)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <p className="text-[var(--text-primary)] text-sm font-medium">{t('personalReading.title')}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        <div className="rounded-2xl p-4 mb-5 flex gap-3.5" style={{ background: 'var(--surface-1)', border: '1px solid rgba(217,70,239,0.25)' }}>
          <div className="flex-shrink-0" style={{ filter: 'drop-shadow(0 6px 16px rgba(124,58,237,0.35))' }}>
            <TarotCardArt size={44} symbol="🎴" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--text-primary)] text-sm font-semibold mb-1">{t('personalReading.cardTitle')}</p>
            <p className="text-[var(--text-muted)] text-xs leading-relaxed">
              {t('personalReading.cardBody', { price: PERSONAL_READING_PRICE })}
            </p>
          </div>
        </div>

        <p className="text-[var(--text-primary)] text-xs font-semibold mb-2">{t('personalReading.whatAbout')}</p>
        <textarea value={note} onChange={e => setNote(e.target.value)} rows={4}
          placeholder={t('personalReading.notePlaceholder')}
          className="w-full px-3.5 py-3 rounded-2xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none mb-2"
          style={{ background: 'var(--surface-1)' }} />
        {error && <p className="text-[#EF4444] text-[11px] mb-2">{error}</p>}
        <button onClick={submit} disabled={submitting || !note.trim()}
          className="w-full px-4 py-3 rounded-full text-white text-sm font-semibold disabled:opacity-50 mb-6"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {submitting ? t('personalReading.sending') : t('personalReading.requestPrice', { price: PERSONAL_READING_PRICE })}
        </button>

        {!loading && readings.length > 0 && (
          <>
            <p className="text-[var(--text-primary)] text-xs font-semibold mb-2">{t('personalReading.yourRequests')}</p>
            <div className="flex flex-col gap-2.5">
              {readings.map(r => (
                <div key={r.id} className="rounded-2xl p-3.5" style={{ background: 'var(--surface-1)' }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: statusColor(r) === '#22C55E' ? 'rgba(34,197,94,0.15)' : statusColor(r) === '#EF4444' ? 'rgba(239,68,68,0.15)' : 'rgba(245,197,66,0.15)',
                        color: statusColor(r),
                      }}>
                      {statusLabel(r)}
                    </span>
                    <span className="text-[var(--text-dim)] text-[10px]">{r.createdAt}</span>
                  </div>
                  <p className="text-[var(--text-muted)] text-xs leading-relaxed mb-2">{r.requestNote}</p>
                  {r.paymentStatus === 'unpaid' && r.paymentLink && (
                    <a href={r.paymentLink} target="_blank" rel="noopener noreferrer"
                      className="inline-block text-[11px] font-semibold px-3 py-1.5 rounded-full text-white"
                      style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
                      {t('personalReading.payNowPrice', { price: r.price })}
                    </a>
                  )}
                  {r.status === 'delivered' && r.videoUrl && (
                    // eslint-disable-next-line jsx-a11y/media-has-caption
                    <video src={r.videoUrl} controls className="w-full rounded-xl" style={{ maxHeight: 280 }} />
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}