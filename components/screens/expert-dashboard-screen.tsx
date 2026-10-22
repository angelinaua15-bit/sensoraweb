'use client'

// FILE PATH: components/screens/expert-dashboard-screen.tsx
import { useState } from 'react'
import { useLanguage } from '@/components/language-provider'

const recentClients = [
  { name: 'Elena V.', spec: 'Relationships', time: '2h ago', amount: '+$36', avatar: '👩' },
  { name: 'Marina K.', spec: 'Career', time: 'Yesterday', amount: '+$18', avatar: '👩‍💼' },
  { name: 'Tatiana R.', spec: 'Finance', time: '2 days ago', amount: '+$24', avatar: '👩‍🦰' },
]

interface ExpertDashboardProps {
  onNavigate: (screen: string) => void
}

export function ExpertDashboardScreen({ onNavigate }: ExpertDashboardProps) {
  const { t } = useLanguage()
  const [online, setOnline] = useState(true)
  const [showIncoming, setShowIncoming] = useState(true)

  return (
    <div className="flex flex-col h-full overflow-y-auto phone-screen px-4 pt-2 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[var(--text-muted)] text-xs">{t('expertCabinet.dashboard')}</p>
          <h2 className="text-[var(--text-primary)] font-serif text-lg font-light">Luna V.</h2>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="text-xs px-2.5 py-1 rounded-full font-medium"
            style={{
              background: online ? 'rgba(34,197,94,0.2)' : 'var(--surface-1)',
              color: online ? '#22C55E' : 'var(--text-muted)',
              border: `1px solid ${online ? 'rgba(34,197,94,0.4)' : 'var(--surface-2)'}`,
            }}
          >
            {online ? t('expertCabinet.online') : t('expertCabinet.offline')}
          </span>
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
            style={{ background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-mid))' }}
          >
            🌙
          </div>
        </div>
      </div>

      {/* Incoming call alert */}
      {showIncoming && (
        <div
          className="p-4 rounded-3xl mb-4 relative"
          style={{
            background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.08))',
            border: '1px solid rgba(34,197,94,0.3)',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-xl"
                style={{ background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-mid))' }}
              >
                👩
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#22C55E] border-2 border-[var(--bg-mid)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-primary)] text-sm font-medium">Alina Petrov</p>
              <p className="text-[var(--text-muted)] text-xs">Partner compatibility</p>
              <p className="text-[#22C55E] text-xs">{t('expertCabinet.waiting', { time: '0:42' })}</p>
            </div>
            <div className="flex gap-2">
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: '#22C55E' }}
                onClick={() => setShowIncoming(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </button>
              <button
                className="w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239,68,68,0.2)' }}
                onClick={() => setShowIncoming(false)}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Earnings stats */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        {[
          { label: t('expertCabinet.today'), value: '$84', sub: t('expertCabinet.sessionsCount', { n: 6 }) },
          { label: t('expertCabinet.thisWeek'), value: '$412', sub: t('expertCabinet.sessionsCount', { n: 28 }) },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-2xl"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}
          >
            <p className="text-[var(--text-dim)] text-xs mb-1">{stat.label}</p>
            <p className="text-[#D946EF] text-2xl font-serif font-light">{stat.value}</p>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 mb-5">
        {[
          { label: t('expertCabinet.rating'), value: '4.9', sub: t('expertCabinet.reviewsCount', { n: '1,284' }) },
          { label: t('expertCabinet.queue'), value: '2', sub: t('expertCabinet.clientsWaiting') },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-4 rounded-2xl"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}
          >
            <p className="text-[var(--text-dim)] text-xs mb-1">{stat.label}</p>
            <p className="text-[var(--text-primary)] text-2xl font-semibold">{stat.value}</p>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent clients */}
      <h3 className="text-[var(--text-primary)] text-sm font-medium mb-3">{t('expertCabinet.recentClients')}</h3>
      <div className="flex flex-col gap-2 mb-5">
        {recentClients.map((client) => (
          <div
            key={client.name}
            className="flex items-center gap-3 p-3 rounded-2xl"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, var(--bg-elevated), var(--bg-mid))' }}
            >
              {client.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-primary)] text-sm font-medium">{client.name}</p>
              <p className="text-[var(--text-dim)] text-xs">{client.spec} · {client.time}</p>
            </div>
            <span className="text-[#22C55E] text-sm font-semibold">{client.amount}</span>
          </div>
        ))}
      </div>

      {/* Toggle online/offline */}
      <button
        onClick={() => setOnline(!online)}
        className="w-full py-4 rounded-2xl text-sm font-medium"
        style={{
          background: online ? 'rgba(239,68,68,0.1)' : 'rgba(34,197,94,0.1)',
          border: `1px solid ${online ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`,
          color: online ? '#EF4444' : '#22C55E',
        }}
      >
        {online ? t('expertCabinet.goOffline') : t('expertCabinet.goOnline')}
      </button>
    </div>
  )
}