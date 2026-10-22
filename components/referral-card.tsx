'use client'

// FILE PATH: components/referral-card.tsx
import { useEffect, useState, useCallback } from 'react'
import { useLanguage } from '@/components/language-provider'
import { PRICE_PER_MIN_USD, REFERRAL_BONUS_USD } from '@/lib/minute-packages'

// REAL FEATURE CHANGED (your call: "$ взагалі не фігурують" — no dollar signs
// anywhere in the app UI). The referral reward is real money internally
// ($0.10/friend, see lib/server/db.ts redeemReferral), but at the new $2/min
// display rate that's 3 seconds — too small to show as "0 min" without
// looking broken. Shown in seconds here instead, everywhere else in minutes.
const REFERRAL_BONUS_SEC = Math.round((REFERRAL_BONUS_USD / PRICE_PER_MIN_USD) * 60)

interface Props {
  userId?: string | null
  userName?: string
  // Optional: same sign-out reset used by settings-screen.tsx's own
  // session-expired handling (see handleDeleteAccount there). Only relevant
  // for the 401 case below — if not passed, the card just shows a "Sign in
  // again" message without an automatic action.
  onSessionExpired?: () => void
}

interface Stats {
  inviteCode: string
  totalReferred: number
  totalEarned: number
}

// Real invite code + real stats — generated and persisted server-side
// (lib/server/db.ts getOrCreateInviteCode), redemptions tracked in Supabase,
// rewards credited to actual wallet balances via the same topUp() path
// Stripe uses. Not a static "share Sensora with friends!" banner with
// nothing behind it.
export default function ReferralCard({ userId, userName, onSessionExpired }: Props) {
  const { t } = useLanguage()
  const [stats, setStats] = useState<Stats | null>(null)
  const [loadError, setLoadError] = useState<'expired' | 'other' | null>(null)
  const [copied, setCopied] = useState(false)
  const [showRedeem, setShowRedeem] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [redeemMessage, setRedeemMessage] = useState<{ ok: boolean; text: string } | null>(null)

  // BUG FIX (reported: card stuck forever on "Loading your invite code…",
  // then follow-up: a static "session expired, tap to sign in again" card
  // was the wrong shape for this — a dead-end error is still a dead end
  // even with a button on it, and support-in-app-review-quality UI on a
  // card most people won't read closely just reads as "broken"). Three real
  // problems, now fixed:
  //  1. This used to pass ?userId=... in the query string, a leftover from
  //     before /api/referral was secured to always use the session cookie
  //     instead (see the BUG FIX comment in app/api/referral/route.ts) —
  //     harmless since the server ignores it now, but misleading to read,
  //     so it's gone.
  //  2. On any non-ok response (most commonly 401, for the exact same
  //     reason account deletion could 401 — see settings-screen.tsx's
  //     handleDeleteAccount fix: a session that started before the
  //     httpOnly cookie existed has no valid cookie to send), this used to
  //     silently resolve to `null` and just... stop, leaving `stats`
  //     permanently null and the card stuck on its loading state forever.
  //  3. Once that started surfacing a real error, a 401 specifically now
  //     signs the person out and sends them back to splash automatically
  //     (same pattern as handleDeleteAccount) instead of leaving a card
  //     sitting there asking them to tap something — one less dead end,
  //     consistent with how the rest of the app already handles an expired
  //     session. A non-401 failure (offline, server error) still shows a
  //     real, dismissable message with Try again, since that one isn't
  //     something signing out again would fix.
  const loadStats = useCallback(() => {
    setLoadError(null)
    fetch('/api/referral')
      .then(res => {
        if (res.status === 401) {
          if (onSessionExpired) { onSessionExpired(); return null }
          setLoadError('expired')
          return null
        }
        if (!res.ok) { setLoadError('other'); return null }
        return res.json()
      })
      .then(data => { if (data) setStats(data) })
      .catch(() => setLoadError('other'))
  }, [onSessionExpired])

  useEffect(() => { loadStats() }, [loadStats])

  const redeemCode = useCallback(async () => {
    if (!codeInput.trim()) return
    setRedeeming(true)
    setRedeemMessage(null)
    try {
      const res = await fetch('/api/referral', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeInput.trim(), userId: userId ?? 'u1', userName: userName ?? '' }),
      })
      const data = await res.json()
      if (res.ok) {
        setRedeemMessage({ ok: true, text: t('referral.redeemSuccess') })
        setCodeInput('')
        loadStats() // this user's own balance/stats don't change from redeeming, but harmless to refresh
      } else {
        setRedeemMessage({ ok: false, text: data.error ?? t('common.networkError') })
      }
    } catch {
      setRedeemMessage({ ok: false, text: t('common.networkError') })
    } finally {
      setRedeeming(false)
    }
  }, [codeInput, userId, userName, t, loadStats])

  const share = useCallback(async () => {
    if (!stats) return
    // A real, working link — not just a plain-text code — so whoever
    // receives it can tap straight through into the app with the referral
    // code already attached (?ref=CODE, read by app/page.tsx on mount and
    // auto-redeemed once their account exists).
    const shareUrl = `${window.location.origin}/?ref=${encodeURIComponent(stats.inviteCode)}`
    // BUG FIX: this used to say "we both get $0.10 credit" — factually
    // wrong twice over (only the referrer gets rewarded, see the
    // redeemReferral bug-fix comment in lib/server/db.ts, and it's no
    // longer shown in dollars anyway). Now matches what actually happens.
    const text = `Join me on Sensora — use my invite code ${stats.inviteCode} and I get ${REFERRAL_BONUS_SEC}s of free chat minutes when you join: ${shareUrl}`
    if (navigator.share) {
      try { await navigator.share({ title: 'Sensora', text, url: shareUrl }) } catch { /* user cancelled the share sheet */ }
      return
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable — code is still visible on screen to copy manually */ }
  }, [stats])

  if (loadError) {
    return (
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
        <p className="text-[var(--text-muted)] text-xs mb-3 leading-relaxed">
          {loadError === 'expired' ? t('referral.loadErrorExpired') : t('referral.loadErrorOther')}
        </p>
        {loadError === 'expired' && onSessionExpired ? (
          <button onClick={onSessionExpired}
            className="text-xs font-semibold px-3 py-1.5 rounded-full text-white"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
            {t('referral.signInAgain')}
          </button>
        ) : (
          <button onClick={loadStats}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: 'var(--surface-2)', color: 'var(--text-accent-soft)' }}>
            {t('referral.tryAgain')}
          </button>
        )}
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="rounded-2xl p-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
        <p className="text-[var(--text-dim)] text-xs">{t('referral.loadingCode')}</p>
      </div>
    )
  }

  return (
    // Background used to be `135deg,#4C1D95,var(--bg-elevated)` — in light
    // theme --bg-elevated is a near-white lavender, so the card swung from
    // dark purple in one corner to almost-white in the other. Text colors
    // here were theme tokens (var(--text-primary), var(--text-accent-soft))
    // meant for the app's normal background, so depending on which corner
    // they landed near, they read fine or nearly invisible — same root
    // cause as the wallet balance card. Fixed gradient (no theme variable)
    // + explicit white text everywhere below solves it for both themes.
    <div className="rounded-2xl p-4" style={{ background: 'linear-gradient(135deg,#6D28D9,#A855F7)', border: '1px solid rgba(217,70,239,0.25)' }}>
      <p className="text-white text-sm font-semibold mb-1">{t('referral.title')}</p>
      <p className="text-white/80 text-[11px] mb-3">{t('referral.subtitle', { sec: REFERRAL_BONUS_SEC })}</p>
      <div className="flex items-center justify-between rounded-xl px-4 py-2.5 mb-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
        <span className="text-[#F5C542] text-base font-mono tracking-widest">{stats.inviteCode}</span>
        <button onClick={share} className="text-xs font-semibold text-white px-3 py-1.5 rounded-full" style={{ background: 'rgba(0,0,0,0.3)' }}>
          {copied ? t('referral.copied') : t('referral.share')}
        </button>
      </div>
      <div className="flex gap-4 text-center mb-3">
        <div className="flex-1">
          <p className="text-white text-lg font-semibold">{stats.totalReferred}</p>
          <p className="text-white/80 text-[10px]">{t('referral.friendsJoined')}</p>
        </div>
        <div className="flex-1">
          <p className="text-white text-lg font-semibold">
            {t('referral.earnedSoFarSec', { sec: Math.round((stats.totalEarned / PRICE_PER_MIN_USD) * 60) })}
          </p>
          <p className="text-white/80 text-[10px]">{t('referral.earnedSoFar')}</p>
        </div>
      </div>

      {showRedeem ? (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())} placeholder={t('referral.enterCodePlaceholder')}
              className="flex-1 rounded-xl px-3 py-2 text-sm text-white outline-none font-mono tracking-widest placeholder-white/50"
              style={{ background: 'rgba(0,0,0,0.25)', border: '1px solid rgba(255,255,255,0.25)' }} />
            <button onClick={redeemCode} disabled={redeeming || !codeInput.trim()}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: 'rgba(0,0,0,0.3)' }}>
              {redeeming ? t('referral.redeeming') : t('referral.redeem')}
            </button>
          </div>
          {redeemMessage && (
            <p className="text-[11px]" style={{ color: redeemMessage.ok ? '#4ADE80' : '#FCA5A5' }}>{redeemMessage.text}</p>
          )}
        </div>
      ) : (
        <button onClick={() => setShowRedeem(true)} className="text-white/80 text-[11px] underline underline-offset-2">
          {t('referral.haveCode')}
        </button>
      )}
    </div>
  )
}