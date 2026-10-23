'use client'

// FILE PATH: components/desktop-sidebar.tsx
// Left navigation for the web version on a tablet or computer (viewport >= 768px).
// On a phone-width window it is hidden and the normal bottom bar is used.
import type { Screen } from '@/app/page'
import { PRICE_PER_MIN_USD } from '@/lib/minute-packages'

const ITEMS: { id: Screen; label: string; icon: string }[] = [
  { id: 'home',     label: 'Today',     icon: '✦' },
  { id: 'search',   label: 'Psychics',  icon: '☾' },
  { id: 'discover', label: 'Discover',  icon: '✧' },
  { id: 'chats',    label: 'Chatroom',  icon: '💬' },
  { id: 'support',  label: 'Support',   icon: '?' },
  { id: 'profile',  label: 'Profile',   icon: '👤' },
]

interface Props {
  active: Screen
  userName: string
  balance: number
  onNavigate: (s: Screen) => void
}

export default function DesktopSidebar({ active, userName, balance, onNavigate }: Props) {
  const minutes = Math.max(0, Math.floor(balance / PRICE_PER_MIN_USD))
  return (
    <aside
      className="hidden md:flex flex-col flex-shrink-0 h-dvh sticky top-0 w-56 lg:w-64 py-6 px-4"
      style={{ borderRight: '1px solid var(--surface-2)', background: 'var(--bg-deep)' }}
    >
      <div className="flex items-center gap-2.5 px-2 mb-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sensora-mark.png" alt="Sensora" style={{ height: 34, width: 'auto' }} />
        <span className="font-serif text-lg tracking-[0.2em] text-[var(--text-primary)]">SENSORA</span>
      </div>

      <nav className="flex flex-col gap-1">
        {ITEMS.map(item => {
          const isActive = active === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium text-left transition-colors"
              style={{
                background: isActive ? 'rgba(217,70,239,0.14)' : 'transparent',
                color: isActive ? '#C026D3' : 'var(--text-primary)',
                border: `1px solid ${isActive ? 'rgba(217,70,239,0.3)' : 'transparent'}`,
              }}
            >
              <span className="w-5 text-center">{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto p-3.5 rounded-2xl" style={{ background: 'var(--bg-mid)', border: '1px solid var(--surface-2)' }}>
        <p className="text-[var(--text-primary)] text-sm font-medium truncate">{userName || 'Guest'}</p>
        <p className="text-[var(--text-muted)] text-xs mt-0.5">≈ {minutes} min</p>
        <button
          onClick={() => onNavigate('wallet')}
          className="mt-3 w-full py-2 rounded-xl text-white text-xs font-semibold"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}
        >
          Top up minutes
        </button>
      </div>
    </aside>
  )
}
