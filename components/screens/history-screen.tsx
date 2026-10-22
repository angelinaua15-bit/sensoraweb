'use client'

// FILE PATH: components/screens/history-screen.tsx
import BottomNav from '@/components/bottom-nav'
import AvatarBubble from '@/components/avatar-bubble'
import { HISTORY, EXPERTS, type Expert } from '@/lib/data'
import type { Screen } from '@/app/page'
import { useLanguage } from '@/components/language-provider'

interface Props {
  onNavigate: (s: Screen) => void
  onSelectExpert: (e: Expert) => void
}

export default function HistoryScreen({ onNavigate, onSelectExpert }: Props) {
  const { t } = useLanguage()
  const expertMap = Object.fromEntries(EXPERTS.map(e => [e.id, e]))

  const totalSpent = HISTORY.reduce((s, h) => s + h.amount, 0)
  const avgRating = (HISTORY.reduce((s, h) => s + h.rating, 0) / HISTORY.length).toFixed(1)

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2">
        <div className="mb-1">
          <h2 className="text-[var(--text-primary)] text-xl font-medium">{t('history.title')}</h2>
          <p className="text-[var(--text-dim)] text-xs">{t('history.subtitle')}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 my-4">
          {[
            { label: t('history.sessions'), value: `${HISTORY.length}` },
            { label: t('history.spent'), value: `$${totalSpent}` },
            { label: t('history.avgRating'), value: avgRating },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-3 rounded-2xl"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
              <span className="text-[var(--text-primary)] font-semibold text-lg">{s.value}</span>
              <span className="text-[var(--text-dim)] text-[10px] mt-0.5">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          {HISTORY.map(session => {
            const expert = expertMap[session.expertId]
            return (
              <button key={session.id}
                onClick={() => expert && onSelectExpert(expert)}
                className="flex items-center gap-3 p-3 rounded-2xl text-left w-full active:scale-[0.98] transition-transform"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
                <AvatarBubble initials={session.avatar} size={46} />
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-sm font-medium">{session.expertName}</p>
                  <p className="text-[var(--text-dim)] text-xs">{session.specialty}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    {[1,2,3,4,5].map(i => (
                      <svg key={i} width="10" height="10" viewBox="0 0 24 24"
                        fill={i <= session.rating ? '#F5C542' : 'none'}
                        stroke={i <= session.rating ? '#F5C542' : 'var(--bg-elevated)'}
                        strokeWidth="1.5">
                        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                      </svg>
                    ))}
                    <span className="text-[var(--text-dim)] text-[10px] ml-1">{session.date}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[#EF4444] text-sm font-semibold">-${session.amount}</span>
                  <span className="text-[var(--text-dim)] text-xs">{session.minutes} {t('history.minSuffix')}</span>
                  <button
                    className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(217,70,239,0.15)', color: '#D946EF' }}
                    onClick={e => { e.stopPropagation(); expert && onSelectExpert(expert) }}>
                    {t('history.again')}
                  </button>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      <BottomNav active="history" onNavigate={onNavigate} />
    </div>
  )
}