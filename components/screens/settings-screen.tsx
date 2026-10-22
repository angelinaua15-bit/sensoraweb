'use client'

// FILE PATH: components/screens/settings-screen.tsx
import { useState, useEffect } from 'react'
import PremiumModal from '@/components/premium-modal'
import ModalPortal from '@/components/modal-portal'
import PushNotificationsToggle from '@/components/push-notifications-toggle'
import ReferralCard from '@/components/referral-card'
import ThemeToggle from '@/components/theme-toggle'
import { useLanguage } from '@/components/language-provider'
import { LOCALES } from '@/lib/i18n'
import type { Screen } from '@/app/page'

interface Props {
  userId?: string | null
  userName: string
  contact?: string
  onBack: () => void
  onNavigate: (s: Screen) => void
  onSignOut: () => void
  // Real, permanent account deletion (Apple Guideline 5.1.1(v)) — see
  // app/api/account/delete/route.ts. Called after the account is actually
  // gone server-side; the parent (app/page.tsx) resets local state and
  // navigates back to splash, same as onSignOut, since there's nothing left
  // to sign back into.
  onAccountDeleted: () => void
  // One-shot: true when the person tapped "Notifications" from the Profile
  // screen (see profile-screen.tsx `onOpenNotifications`) rather than
  // arriving here normally — opens the notifications modal immediately on
  // mount instead of leaving them to find "Notifications" a second time.
  // `onNotificationsAutoOpened` tells the parent to clear the flag right
  // after, so a later, normal visit to Settings doesn't also auto-open it.
  openNotificationsOnMount?: boolean
  onNotificationsAutoOpened?: () => void
}

interface Row {
  label: string
  icon: JSX.Element
  action?: () => void
  note?: string
}

function Icon({ path }: { path: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

export default function SettingsScreen({ userId, userName, contact, onBack, onNavigate, onSignOut, onAccountDeleted, openNotificationsOnMount, onNotificationsAutoOpened }: Props) {
  const { t, locale, setLocale } = useLanguage()
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [showPremium, setShowPremium] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showLanguage, setShowLanguage] = useState(false)

  // See the Props comment above — captures the one-shot "open notifications
  // straight away" request from ProfileScreen. Runs once on mount only, so
  // navigating elsewhere within Settings afterward doesn't keep re-opening it.
  useEffect(() => {
    if (openNotificationsOnMount) {
      setShowNotifications(true)
      onNotificationsAutoOpened?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Real account deletion — requires typing DELETE (case-sensitive, matches
  // the placeholder shown) before the actual button becomes clickable, on
  // top of the confirmation panel itself, since this is genuinely
  // irreversible (see delete_client_account in Supabase / app/api/account/delete/route.ts).
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleDeleteAccount = async () => {
    setDeleteError(null)
    setDeleting(true)
    try {
      const res = await fetch('/api/account/delete', { method: 'POST' })
      if (!res.ok) {
        // BUG FIX (reported: "не працює кнопка... видалення" — delete kept
        // returning "Not authorized"). The account IS real, but the httpOnly
        // session cookie the account-delete route requires (added later, see
        // lib/server/session.ts) was never set for a session that started
        // before that cookie existed — the app was still only relying on
        // sessionStorage back then. That's not a fixable client bug, it's an
        // expired/missing credential: the right move is to sign the person
        // out cleanly and have them sign back in once, which mints a real
        // cookie, then delete works normally. Previously this just showed
        // the raw "Not authorized" string with no explanation and no way
        // forward — now it explains what happened and signs out for them
        // automatically instead of leaving them stuck on a dead-end error.
        if (res.status === 401) {
          setDeleteError(t('settings.deleteAccountSessionExpired'))
          setDeleting(false)
          setTimeout(() => onSignOut(), 1800)
          return
        }
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || t('settings.deleteAccountError'))
      }
      onAccountDeleted()
    } catch (e: any) {
      setDeleteError(e.message || t('settings.deleteAccountError'))
      setDeleting(false)
    }
  }

  const currentLocale = LOCALES.find(l => l.id === locale)

  // "Follow Us" used to be a row here with no real destination — no social
  // links exist in the code anywhere, so it did nothing when tapped. Per
  // your call ("прибрати пункт"), removed rather than left as another dead
  // chevron. Easy to bring back with a real URL later if/when there's an
  // actual account to link to.
  // BUG FIX (reported: "нормально зроби налаштування щоб не було не
  // робочих кнопок і дублювання"). Two real problems found here:
  //  1. "Account details" and "My Profile" both called
  //     `onNavigate('profile')` — the exact same destination, just two rows
  //     for it. Genuine duplication, not two different screens wearing
  //     similar names. Kept "Account details" (broader, matches what
  //     profile-screen.tsx actually shows: personal details + balance +
  //     web dashboard link), removed the redundant "My Profile" row.
  //  2. See the removed `payments` array below this one.
  const general: Row[] = [
    { label: t('settings.accountDetails'), icon: <Icon path="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />, action: () => onNavigate('profile') },
    { label: t('settings.consultationHistory'), icon: <Icon path="M3 3v18h18M7 15l4-6 4 3 5-7" />, action: () => onNavigate('consult-history') },
    { label: t('settings.unlockFeatures'), icon: <Icon path="M12 15v2M6 11V7a6 6 0 1 1 12 0v4M5 11h14v10H5Z" />, action: () => setShowPremium(true) },
    // BUG FIX (reported: "не робочих кнопок") — this row showed the same ">"
    // chevron as every actionable row above/below it but had no `action` at
    // all, so tapping it did nothing despite looking exactly as tappable as
    // "Consultation history" right next to it. Now opens a real mailto: to
    // the address it already displays.
    { label: t('settings.helpSupport'), icon: <Icon path="M12 18h.01M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2 2-2.5 3.5" />, note: 'sensorsoffical@gmail.com', action: () => window.open('mailto:sensorsoffical@gmail.com') },
    { label: t('settings.notifications'), icon: <Icon path="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9M13.7 21a2 2 0 0 1-3.4 0" />, action: () => setShowNotifications(true) },
    { label: t('settings.language'), icon: <Icon path="M3 5h12M9 3v2M5 9c0 4.5 2.5 8.5 7 9.5M13 9a12 12 0 0 1-8 12M2 20l6-11 6 11M4.5 15h7" />, action: () => setShowLanguage(true), note: currentLocale ? `${currentLocale.flag} ${currentLocale.label}` : undefined },
  ]

  // REMOVED (your call: "прибери пункт з підписками"): the whole PAYMENTS
  // section was just this one row — "Cancel Subscription" / "No active
  // subscription" — with no `action` at all (tapping it did nothing) and no
  // way it could ever say anything else, since subscriptions were replaced
  // by one-time minute packages earlier this session (lib/minute-packages.ts)
  // and nothing in the app creates a recurring subscription anymore. A
  // permanently-dead row under a section header for a feature that doesn't
  // exist was exactly the "не робочих кнопок" you flagged — gone, along
  // with the now-empty PAYMENTS heading below.

  // REAL BUG FOUND (code audit, prompted by "що ще треба виправити щоб не
  // було відхилень і фейкових даних"): three of these four rows used to
  // have no `action` at all — tapping them did nothing, despite showing the
  // same ">" chevron as every working row. That's a real App Store
  // completeness risk (Guideline 2.1) on top of just being dishonest UI.
  // "Terms of Use" now opens the real, already-live public page
  // (app/terms/page.tsx, sensora.space/terms) in a new tab — same pattern
  // already used for "Open web dashboard" in profile-screen.tsx.
  // "Full Disclaimer" is gone as its own row: the disclaimer text it would
  // have pointed to doesn't exist as separate content — it's already the
  // "Live consultations" section inside Terms of Use (see
  // lib/legal-content.ts), so a second row pointing nowhere else would just
  // be a duplicate dead end.
  // "Legal Center" is replaced with "Refund Policy" — real content and a
  // real live page already existed (app/refund/page.tsx,
  // sensora.space/refund, written for LiqPay's site requirements) but was
  // never linked from anywhere inside the app itself. Now that real money
  // moves through the app (Wise top-ups), a reachable refund policy matters
  // more than a vague, contentless "Legal Center" row ever did.
  const legal: Row[] = [
    { label: t('settings.termsOfUse'), icon: <Icon path="M6 2h9l5 5v15H6ZM15 2v5h5" />, action: () => window.open('/terms', '_blank', 'noopener,noreferrer') },
    { label: t('settings.privacyPolicy'), icon: <Icon path="M12 2 4 5v6c0 5 3.5 8.5 8 11 4.5-2.5 8-6 8-11V5Z" />, action: () => onNavigate('privacy-policy') },
    { label: t('settings.refundPolicy'), icon: <Icon path="M12 8v4m0 4h.01M12 2 2 20h20Z" />, action: () => window.open('/refund', '_blank', 'noopener,noreferrer') },
    // Added 2026-09-10 alongside the new /cookies page — same "real live
    // page, just needs to be reachable from inside the app" pattern as the
    // Refund Policy row above.
    { label: t('settings.cookiePolicy'), icon: <Icon path="M12 2a10 10 0 1 0 10 10c0-.5-.03-1-.09-1.48-.5.6-1.26.98-2.11.98a2.75 2.75 0 0 1-2.75-2.75c0-.4.08-.79.22-1.14A2.75 2.75 0 0 1 15 5.36 10 10 0 0 0 12 2Z" />, action: () => window.open('/cookies', '_blank', 'noopener,noreferrer') },
  ]

  // HARDENED (same audit as above): the ">" chevron used to render
  // unconditionally for every row, whether or not it actually had an
  // `action` — that's exactly what made the dead "Help and support" row
  // look tappable when it wasn't. Now a row with no action renders as
  // plain non-interactive text with no chevron and no hover/press
  // feedback, so "looks tappable" and "is tappable" can't drift apart
  // again for any future row added here without one.
  const renderRow = (r: Row) => {
    if (!r.action) {
      return (
        <div key={r.label} className="flex items-center gap-3 px-1 py-3.5 w-full"
          style={{ borderBottom: '1px solid var(--surface-1)' }}>
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">{r.icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--text-primary)] text-sm">{r.label}</p>
            {r.note && <p className="text-[var(--text-dim)] text-[11px]">{r.note}</p>}
          </div>
        </div>
      )
    }
    return (
      <button key={r.label}
        onClick={r.action}
        className="flex items-center gap-3 px-1 py-3.5 text-left w-full active:opacity-70 transition-opacity"
        style={{ borderBottom: '1px solid var(--surface-1)' }}
      >
        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">{r.icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-[var(--text-primary)] text-sm">{r.label}</p>
          {r.note && <p className="text-[var(--text-dim)] text-[11px]">{r.note}</p>}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    )
  }

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex items-center justify-center relative px-4 py-4 flex-shrink-0">
        <button onClick={onBack} className="absolute left-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <h2 className="text-[var(--text-primary)] text-base font-medium">{t('settings.title')}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-8">
        <p className="text-[var(--text-dim)] text-[11px] tracking-wider mb-1 mt-2">{t('settings.inviteEarn')}</p>
        <div className="mb-6"><ReferralCard userId={userId} userName={userName} onSessionExpired={onSignOut} /></div>

        <p className="text-[var(--text-dim)] text-[11px] tracking-wider mb-1 mt-2">{t('settings.appearance')}</p>
        <div className="flex items-center justify-between py-2.5 mb-4">
          <p className="text-[var(--text-primary)] text-sm">{t('settings.theme')}</p>
          <ThemeToggle labels={{ light: t('settings.themeLight'), dark: t('settings.themeDark'), system: t('settings.themeSystem') }} />
        </div>

        <p className="text-[var(--text-dim)] text-[11px] tracking-wider mb-1 mt-2">{t('settings.general')}</p>
        <div className="flex flex-col">{general.map(renderRow)}</div>

        <p className="text-[var(--text-dim)] text-[11px] tracking-wider mb-1 mt-6">{t('settings.legal')}</p>
        <div className="flex flex-col mb-8">{legal.map(renderRow)}</div>

        {confirmSignOut ? (
          <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <p className="text-[var(--text-primary)] text-sm mb-3">{t('settings.signOutConfirm')}</p>
            <div className="flex gap-2">
              <button onClick={() => setConfirmSignOut(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-[var(--text-muted)]" style={{ background: 'var(--surface-1)' }}>
                {t('common.cancel')}
              </button>
              <button onClick={onSignOut}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white" style={{ background: '#EF4444' }}>
                {t('settings.signOut')}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmSignOut(true)}
            className="w-full py-3.5 rounded-full text-sm font-medium text-[var(--text-muted)]"
            style={{ background: 'var(--surface-1)' }}>
            {t('settings.signOut')}
          </button>
        )}

        {/* Real account deletion — Apple Guideline 5.1.1(v). Kept visually
            separate (own section, muted "danger zone" styling) from Sign
            Out above, since the two look similar at a glance but one is
            reversible and one genuinely isn't. */}
        <p className="text-[var(--text-dim)] text-[11px] tracking-wider mb-1 mt-6">{t('settings.deleteAccount')}</p>
        {confirmDelete ? (
          <div className="rounded-2xl p-4 mb-3" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}>
            <p className="text-[var(--text-primary)] text-sm mb-3">{t('settings.deleteAccountWarning')}</p>
            <label className="block mb-3">
              <span className="text-[var(--text-muted)] text-xs mb-1.5 block">{t('settings.deleteAccountConfirmPrompt')}</span>
              <input
                value={deleteText}
                onChange={e => setDeleteText(e.target.value)}
                placeholder={t('settings.deleteAccountConfirmPlaceholder')}
                className="w-full px-3.5 py-2.5 rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none"
                style={{ background: 'var(--surface-1)', border: '1px solid rgba(239,68,68,0.35)' }}
              />
            </label>
            {deleteError && <p className="text-[#EF4444] text-xs mb-3 leading-relaxed">{deleteError}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setConfirmDelete(false); setDeleteText(''); setDeleteError(null) }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm text-[var(--text-muted)] disabled:opacity-60" style={{ background: 'var(--surface-1)' }}>
                {t('common.cancel')}
              </button>
              <button onClick={handleDeleteAccount}
                disabled={deleteText !== 'DELETE' || deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-40" style={{ background: '#EF4444' }}>
                {deleting ? t('settings.deletingAccount') : t('settings.deleteAccountButton')}
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setConfirmDelete(true)}
            className="w-full py-3.5 rounded-full text-sm font-medium mb-4"
            style={{ background: 'var(--surface-1)', color: '#EF4444' }}>
            {t('settings.deleteAccount')}
          </button>
        )}
      </div>
      {showPremium && <PremiumModal onClose={() => setShowPremium(false)} userId={userId} userName={userName} contact={contact} />}

      {showNotifications && (
        <ModalPortal>
          <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center" style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 screen-enter" style={{ background: 'linear-gradient(180deg,var(--bg-mid),var(--bg-void))', border: '1px solid rgba(217,70,239,0.25)' }}>
              <div className="flex justify-between items-center mb-4">
                <p className="text-[var(--text-primary)] text-sm font-medium">{t('settings.notifications')}</p>
                <button onClick={() => setShowNotifications(false)} className="text-[var(--text-muted)] text-xs">✕</button>
              </div>
              <PushNotificationsToggle userId={userId} />
            </div>
          </div>
        </ModalPortal>
      )}

      {showLanguage && (
        <ModalPortal>
          <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center" style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 screen-enter" style={{ background: 'linear-gradient(180deg,var(--bg-mid),var(--bg-void))', border: '1px solid rgba(217,70,239,0.25)' }}>
              <div className="flex justify-between items-center mb-4">
                <p className="text-[var(--text-primary)] text-sm font-medium">{t('settings.language')}</p>
                <button onClick={() => setShowLanguage(false)} className="text-[var(--text-muted)] text-xs">✕</button>
              </div>
              <div className="flex flex-col gap-2">
                {LOCALES.map(l => (
                  <button key={l.id}
                    onClick={() => { setLocale(l.id); setShowLanguage(false) }}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl text-left"
                    style={{ background: l.id === locale ? 'rgba(217,70,239,0.18)' : 'var(--surface-1)' }}>
                    <span className="text-lg">{l.flag}</span>
                    <span className="text-[var(--text-primary)] text-sm flex-1">{l.label}</span>
                    {l.id === locale && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D946EF" strokeWidth="2.5" strokeLinecap="round"><path d="M20 6 9 17l-5-5" /></svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}