'use client'

// FILE PATH: components/screens/expert-cabinet-screen.tsx
import { useState } from 'react'
import AvatarBubble from '@/components/avatar-bubble'
import type { Screen } from '@/app/page'
import { useLanguage } from '@/components/language-provider'

interface Props {
  onNavigate: (s: Screen) => void
}

const recentClients = [
  { name: 'Elena V.', topic: 'Relationships', time: '2h ago', earned: 36 },
  { name: 'Marina K.', topic: 'Career', time: 'Yesterday', earned: 18 },
  { name: 'Tatiana R.', topic: 'Finance', time: '2 days ago', earned: 24 },
]

export default function ExpertCabinetScreen({ onNavigate }: Props) {
  const { t } = useLanguage()
  const [online, setOnline] = useState(true)
  const [incomingCall, setIncomingCall] = useState(true)

  return (
    <div className="h-full overflow-y-auto sensora-bg px-4 pt-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[var(--text-dim)] text-xs mb-0.5">{t('expertCabinet.dashboard')}</p>
          <h2 className="text-[var(--text-primary)] text-lg font-medium">Luna V.</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOnline(o => !o)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
            style={{
              background: online ? 'rgba(34,197,94,0.15)' : 'var(--surface-2)',
              border: `1px solid ${online ? 'rgba(34,197,94,0.4)' : 'var(--surface-3)'}`,
              color: online ? '#22C55E' : 'var(--text-dim)',
            }}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-[#22C55E]' : 'bg-[var(--text-dim)]'}`} />
            {online ? t('expertCabinet.online') : t('expertCabinet.offline')}
          </button>
          <AvatarBubble initials="LV" size={36} />
        </div>
      </div>

      {/* Web CRM link */}
      <a
        href="/crm/chatter?operatorId=u3"
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-between p-3.5 rounded-2xl mb-4"
        style={{ background: 'rgba(124,58,237,0.1)', border: '1px dashed rgba(124,58,237,0.35)' }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9D5FF5" strokeWidth="1.8">
              <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
            </svg>
          </div>
          <div className="text-left">
            <p className="text-[var(--text-primary)] text-xs font-medium">{t('expertCabinet.openCrm')}</p>
            <p className="text-[var(--text-dim)] text-[10px]">{t('expertCabinet.crmHint')}</p>
          </div>
        </div>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </a>

      {/* Incoming call */}
      {incomingCall && (
        <div
          className="flex items-center gap-3 p-3 rounded-2xl mb-4"
          style={{ background: 'var(--surface-1)', border: '1px solid rgba(34,197,94,0.3)' }}
        >
          <div className="relative flex-shrink-0">
            <AvatarBubble initials="AP" size={44} />
            <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#22C55E] flex items-center justify-center">
              <svg width="8" height="8" viewBox="0 0 24 24" fill="white">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[var(--text-primary)] text-sm font-medium">Alina Petrov</p>
            <p className="text-[var(--text-dim)] text-xs">Partner compatibility</p>
            <p className="text-[#22C55E] text-xs">{t('expertCabinet.waiting', { time: '0:42' })}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setIncomingCall(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center bg-[#22C55E]"
              aria-label={t('expertCabinet.accept')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 015.13 12.5 19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
            </button>
            <button
              onClick={() => setIncomingCall(false)}
              className="w-9 h-9 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgba(239,68,68,0.4)' }}
              aria-label={t('expertCabinet.decline')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Earnings stats */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {[
          { label: t('expertCabinet.today'), value: '$84', sub: t('expertCabinet.sessionsCount', { n: 6 }) },
          { label: t('expertCabinet.thisWeek'), value: '$412', sub: t('expertCabinet.sessionsCount', { n: 28 }) },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
            <p className="text-[var(--text-dim)] text-xs mb-1">{s.label}</p>
            <p className="text-[#D946EF] text-2xl font-semibold">{s.value}</p>
            <p className="text-[var(--text-dim)] text-xs mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: t('expertCabinet.rating'), value: '4.9', sub: t('expertCabinet.reviewsCount', { n: '1,284' }) },
          { label: t('expertCabinet.queue'), value: '2', sub: t('expertCabinet.clientsWaiting') },
        ].map(s => (
          <div key={s.label} className="p-4 rounded-2xl"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
            <p className="text-[var(--text-dim)] text-xs mb-1">{s.label}</p>
            <p className="text-[var(--text-primary)] text-2xl font-semibold">{s.value}</p>
            <p className="text-[var(--text-dim)] text-xs mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent clients */}
      <h3 className="text-[var(--text-primary)] text-base font-medium mb-3">{t('expertCabinet.recentClients')}</h3>
      <div className="flex flex-col gap-2.5 mb-6">
        {recentClients.map(c => (
          <div key={c.name}
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
            <AvatarBubble initials={c.name.slice(0, 2)} size={40} />
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-primary)] text-sm font-medium">{c.name}</p>
              <p className="text-[var(--text-dim)] text-xs">{c.topic} · {c.time}</p>
            </div>
            <span className="text-[#22C55E] text-sm font-semibold">+${c.earned}</span>
          </div>
        ))}
      </div>

      {/* Go offline button */}
      <button
        onClick={() => setOnline(o => !o)}
        className="w-full py-3.5 rounded-2xl text-sm font-medium transition-all"
        style={{
          background: online ? 'var(--surface-1)' : 'rgba(34,197,94,0.15)',
          border: `1px solid ${online ? 'var(--surface-2)' : 'rgba(34,197,94,0.4)'}`,
          color: online ? 'var(--text-muted)' : '#22C55E',
        }}
      >
        {online ? t('expertCabinet.goOffline') : t('expertCabinet.goOnline')}
      </button>
    </div>
  )
}