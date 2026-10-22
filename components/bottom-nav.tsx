'use client'

// FILE PATH: components/bottom-nav.tsx
import type { Screen } from '@/app/page'

// 'history' (Readings) used to be a 5th tab here, always on screen. Its
// content — zodiac blurb, quizzes, practices, and literally the same
// DISCOVER_ARTICLES array — overlaps almost entirely with the Discover tab
// right next to it, so it was a second, near-duplicate content feed sitting
// in the permanent bottom bar. Dropped it from the persistent nav; it's
// still a real screen and still reachable from the Tarot card on the Today
// screen ("Discover" button), just not competing for space on every screen.
const tabs: { id: Screen; label: string }[] = [
  { id: 'home',     label: 'Today'     },
  { id: 'search',   label: 'Psychics'  },
  { id: 'discover', label: 'Discover'  },
  { id: 'chats',    label: 'Chatroom'  },
  { id: 'support',  label: 'Support'   },
]

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill={active ? 'rgba(217,70,239,0.2)' : 'none'} />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  )
}
function SearchIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="8" fill={active ? 'rgba(217,70,239,0.15)' : 'none'} />
      <path d="m21 21-4.35-4.35" />
    </svg>
  )
}
function DiscoverIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill={active ? 'rgba(217,70,239,0.15)' : 'none'} />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  )
}
function ChatIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'rgba(217,70,239,0.2)' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  )
}
function SupportIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" fill={active ? 'rgba(217,70,239,0.15)' : 'none'} />
      <path d="M9.09 9a3 3 0 015.83 1c0 2-3 2-3 4" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
const icons = { home: HomeIcon, search: SearchIcon, discover: DiscoverIcon, chats: ChatIcon, support: SupportIcon }

interface Props {
  active: string
  onNavigate: (s: Screen) => void
}

export default function BottomNav({ active, onNavigate }: Props) {
  return (
    <nav
      className="flex md:hidden items-center justify-around px-1 pt-2 pb-4 flex-shrink-0 relative z-20"
      style={{
        borderTop: '1px solid var(--surface-1)',
        background: 'rgba(22,9,46,0.98)',
        backdropFilter: 'blur(12px)',
        paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
      }}
    >
      {tabs.map(tab => {
        const isActive = active === tab.id
        const Icon = icons[tab.id as keyof typeof icons]
        return (
          <button
            key={tab.id}
            onClick={() => onNavigate(tab.id)}
            className="flex flex-col items-center gap-0.5 px-2.5 py-1"
            style={{ color: isActive ? '#D946EF' : 'var(--text-dim)' }}
            aria-label={tab.label}
          >
            <Icon active={isActive} />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}