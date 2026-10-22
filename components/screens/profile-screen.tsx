'use client'

// FILE PATH: components/screens/profile-screen.tsx
import { useState, useCallback, useEffect } from 'react'
import BottomNav from '@/components/bottom-nav'
import type { Screen } from '@/app/page'
import { useLanguage } from '@/components/language-provider'
import { LOCALES } from '@/lib/i18n'
import { PRICE_PER_MIN_USD } from '@/lib/minute-packages'

interface Props {
  userName: string
  userId?: string | null
  contact?: string
  balance: number
  onNavigate: (s: Screen) => void
  onOpenWallet: () => void
  // REAL BUG FOUND ("кнопка сповіщення чомусь веде в налаштування"): the
  // "Notifications" row below used to just call onNavigate('settings'),
  // which dumps the person on the top of the whole Settings screen — same
  // as tapping the profile's own gear icon. The actual notifications
  // toggle lives inside Settings behind its own "Notifications" row
  // (opens a modal, see settings-screen.tsx `showNotifications`). This
  // callback tells the parent to open Settings AND that modal in one step,
  // instead of leaving the person to find "Notifications" a second time
  // once they're already on the Settings screen.
  onOpenNotifications: () => void
}

export default function ProfileScreen({ userName, userId, contact, balance, onNavigate, onOpenWallet, onOpenNotifications }: Props) {
  const [openingDashboard, setOpeningDashboard] = useState(false)

  // REAL BUG FOUND ("що за фігня тут емейл, має підтягуватись реальний"):
  // this card used to show a literal hardcoded "elena@example.com" — and,
  // worse, `{userName} Vance` right above it, which silently appended a fake
  // surname onto whatever the real signed-in name was ("Lina" → "Lina
  // Vance"). Both were leftover mock placeholders that were never wired to
  // the real account. Email now comes from the real `contact` field the app
  // already tracks post-login (same value used for login/OTP); the fake
  // " Vance" suffix is just gone.
  //
  // The three stat tiles below ("Consultations"/"Experts"/"Spent") and the
  // "Premium Client" badge were the same story — hardcoded '14' / '6' /
  // '$187' and an unconditional badge, regardless of the real account. Now
  // computed from the same real, cookie-authenticated endpoints the rest of
  // the app already uses: GET /api/conversations (completed sessions +
  // distinct experts) and GET /api/wallet (sum of real 'session' charge
  // transactions = real amount spent), plus GET /api/profile for the real
  // isPremium flag.
  const [stats, setStats] = useState({ consultations: 0, experts: 0, spent: 0 })
  const [isPremium, setIsPremium] = useState(false)

  // REAL BUG FOUND (pre-launch audit): "Language & region" below used to
  // show a hardcoded "English" regardless of what the person actually had
  // selected — switch to Ukrainian in Settings, and Profile would still
  // claim "English". Settings itself already reads the real locale
  // correctly (see settings-screen.tsx's own `currentLocale`); this just
  // wires the same real value here instead of a literal string.
  const { locale, t } = useLanguage()
  const currentLocale = LOCALES.find(l => l.id === locale)

  useEffect(() => {
    fetch('/api/conversations')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const conversations: { status: string; expertId: string }[] = data?.conversations ?? []
        const completed = conversations.filter(c => c.status === 'completed')
        setStats(s => ({ ...s, consultations: completed.length, experts: new Set(completed.map(c => c.expertId)).size }))
      })
      .catch(() => { /* stay at 0 rather than show a fake number */ })

    fetch('/api/wallet')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        const transactions: { type: string; status: string; amount: number }[] = data?.transactions ?? []
        const spent = transactions
          .filter(t => t.type === 'session' && t.status === 'completed')
          .reduce((sum, t) => sum + Math.abs(t.amount), 0)
        setStats(s => ({ ...s, spent }))
      })
      .catch(() => { /* stay at 0 rather than show a fake number */ })

    fetch('/api/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => setIsPremium(Boolean(data?.user?.isPremium)))
      .catch(() => { /* default false — no badge rather than a fake one */ })
  }, [])

  // Mints a fresh, short-lived (30 min) signed token right before opening
  // the dashboard, instead of putting the raw userId in the URL — a plain
  // `?userId=` was permanently valid and shareable/guessable by anyone who
  // saw it. See app/api/auth/client-token and app/crm/client/page.tsx.
  const openWebDashboard = useCallback(async () => {
    if (!userId) { window.open('/crm/client', '_blank', 'noopener,noreferrer'); return }
    setOpeningDashboard(true)
    try {
      const res = await fetch('/api/auth/client-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (res.ok && data.token) {
        window.open(`/crm/client?token=${encodeURIComponent(data.token)}`, '_blank', 'noopener,noreferrer')
      }
    } finally {
      setOpeningDashboard(false)
    }
  }, [userId])

  // REAL BUG FOUND ("потрібно зробити кращі і різні іконки"): every row here
  // used to render the exact same sparkle <svg>, regardless of item.label —
  // it just looked like a copy-paste placeholder. Each row now carries its
  // own distinct, thin-line icon (1.8px stroke, no fill, per the brand
  // iconography rules) so the list actually reads as six different settings
  // instead of one icon repeated six times.
  const menuItems: { label: string; sub: string | null; action: () => void; icon: JSX.Element }[] = [
    {
      label: 'Personal details', sub: 'Name, birth date, photo', action: () => onNavigate('settings'),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9D5FF5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="8.2" r="3.4"/>
          <path d="M5.5 19.8c.9-3.4 3.6-5.4 6.5-5.4s5.6 2 6.5 5.4"/>
        </svg>
      ),
    },
    {
      label: 'Payment methods', sub: 'Cards and top-ups', action: onOpenWallet,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9D5FF5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6" width="18" height="12" rx="2.2"/>
          <path d="M3 10h18"/>
          <path d="M7 14.5h4"/>
        </svg>
      ),
    },
    {
      label: 'Consultation history', sub: 'All your past sessions', action: () => onNavigate('consult-history'),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9D5FF5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8.3"/>
          <path d="M12 7.5V12l3 2"/>
        </svg>
      ),
    },
    {
      label: 'Notifications', sub: 'Messages and reminders', action: onOpenNotifications,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9D5FF5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3.2a5 5 0 0 0-5 5v3.1c0 .6-.2 1.2-.6 1.6L5 15.2h14l-1.4-2.3c-.4-.4-.6-1-.6-1.6V8.2a5 5 0 0 0-5-5z"/>
          <path d="M9.5 18.8a2.5 2.5 0 0 0 5 0"/>
        </svg>
      ),
    },
    {
      label: 'Language & region', sub: currentLocale ? `${currentLocale.flag} ${currentLocale.label}` : 'English', action: () => onNavigate('settings'),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9D5FF5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="8.3"/>
          <path d="M3.7 12h16.6M12 3.7c2.3 2.3 3.5 5.2 3.5 8.3s-1.2 6-3.5 8.3c-2.3-2.3-3.5-5.2-3.5-8.3S9.7 6 12 3.7z"/>
        </svg>
      ),
    },
    {
      label: 'My horoscope', sub: 'Today\'s outlook', action: () => onNavigate('home'),
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9D5FF5" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M12 3.3l1.9 5.8 6.1.1-4.9 3.7 1.9 5.8-5-3.6-5 3.6 1.9-5.8-4.9-3.7 6.1-.1z"/>
        </svg>
      ),
    },
  ]

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-[var(--text-primary)] text-xl font-medium">Profile</h2>
          <button aria-label="Account" onClick={() => onNavigate('settings')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.8" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </button>
        </div>

        {/* Profile card */}
        <div
          className="flex items-center gap-4 p-4 rounded-3xl mb-4"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}
        >
          <div className="relative">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center font-serif text-xl font-semibold"
              style={{ background: 'linear-gradient(135deg,var(--bg-elevated),var(--bg-mid))', color: '#D946EF' }}
            >
              {userName.slice(0, 2).toUpperCase()}
            </div>
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: '#D946EF' }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--text-primary)] font-semibold">{userName}</p>
            <p className="text-[var(--text-dim)] text-xs">{contact || '—'}</p>
            {isPremium && (
              <span
                className="inline-block mt-1.5 text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(245,197,66,0.2)', color: '#F5C542' }}
              >
                Premium Client
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: 'Consultations', value: String(stats.consultations) },
            { label: 'Experts', value: String(stats.experts) },
            // REAL FEATURE CHANGED (your call: "все має бути і всюди в
            // хвилинах" — no $ signs anywhere balance/spend is shown to the
            // client). Converted at the same real $2/min rate as the home
            // screen and wallet (PRICE_PER_MIN_USD, lib/minute-packages.ts).
            { label: 'Spent', value: t('wallet.minutesShort', { mins: Math.floor(stats.spent / PRICE_PER_MIN_USD) }) },
          ].map(stat => (
            <div
              key={stat.label}
              className="flex flex-col items-center py-3 rounded-2xl"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}
            >
              <span className="text-[var(--text-primary)] font-semibold">{stat.value}</span>
              <span className="text-[var(--text-dim)] text-[10px] mt-0.5 text-center leading-tight">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Balance card */}
        <button
          onClick={onOpenWallet}
          className="w-full flex items-center justify-between p-4 rounded-2xl mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(217,70,239,0.1))',
            border: '1px solid rgba(124,58,237,0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(245,197,66,0.15)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F5C542" strokeWidth="2">
                <rect x="2" y="5" width="20" height="14" rx="2"/>
                <path d="M16 13a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" fill="#F5C542"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="text-[var(--text-primary)] text-sm font-medium">My balance</p>
              <p className="text-[var(--text-muted)] text-xs">Top up or view details</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#F5C542] font-semibold">{t('wallet.minutesShort', { mins: Math.floor(balance / PRICE_PER_MIN_USD) })}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        </button>

        {/* Web dashboard link — mints a short-lived signed token first, see
            openWebDashboard above */}
        <button
          onClick={openWebDashboard}
          disabled={openingDashboard}
          className="w-full flex items-center justify-between p-4 rounded-2xl mb-4 disabled:opacity-60"
          style={{
            background: 'rgba(124,58,237,0.08)',
            border: '1px dashed rgba(124,58,237,0.35)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.18)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9D5FF5" strokeWidth="1.8">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div className="text-left">
              <p className="text-[var(--text-primary)] text-sm font-medium">{openingDashboard ? 'Opening…' : 'Open web dashboard'}</p>
              <p className="text-[var(--text-muted)] text-xs">Full history & saved experts on desktop</p>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>

        {/* Menu items */}
        <div className="flex flex-col gap-1">
          {menuItems.map(item => (
            <button
              key={item.label}
              onClick={item.action}
              className="flex items-center gap-3 p-4 rounded-2xl text-left w-full active:bg-white/5 transition-colors"
              style={{ background: 'var(--surface-0)', border: '1px solid var(--surface-1)' }}
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(124,58,237,0.15)' }}
              >
                {item.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-primary)] text-sm font-medium">{item.label}</p>
                {item.sub && <p className="text-[var(--text-dim)] text-xs">{item.sub}</p>}
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          ))}
        </div>
      </div>
      <BottomNav active="profile" onNavigate={onNavigate} />
    </div>
  )
}