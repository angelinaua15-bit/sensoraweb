'use client'

// FILE PATH: components/screens/consultation-history-screen.tsx
import { useEffect, useState, useCallback } from 'react'
import AvatarBubble from '@/components/avatar-bubble'
import LoaderRing from '@/components/ui/loader-ring'
import { type Expert } from '@/lib/data'
import { useLanguage } from '@/components/language-provider'

interface Props {
  userId?: string | null
  onBack: () => void
  onSelectExpert: (e: Expert) => void
}

interface Conversation {
  id: string
  expertId: string
  expertName: string
  avatar: string
  specialty: string
  lastMessage: string
  updatedAt: string
  status: 'active' | 'completed'
}

interface Transaction {
  id: string
  type: 'topup' | 'session' | 'payout'
  amount: number
  date: string
}

// Real consultation history: every row here comes from a conversation the
// signed-in user actually completed (see /api/conversations), and the total
// spent comes from real "session" charge transactions (/api/wallet) — not a
// hardcoded sample list. A brand-new account honestly shows "no consultations
// yet" instead of a pre-filled fake track record.
export default function ConsultationHistoryScreen({ userId, onBack, onSelectExpert }: Props) {
  const { t } = useLanguage()
  // Real expert catalog — replaces the old hardcoded EXPERTS array.
  const [experts, setExperts] = useState<Expert[]>([])
  useEffect(() => {
    let cancelled = false
    fetch('/api/experts')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data?.experts) setExperts(data.experts) })
      .catch(() => { /* "Again" button just won't resolve an expert */ })
    return () => { cancelled = true }
  }, [])
  const expertMap = Object.fromEntries(experts.map(e => [e.id, e]))
  const [conversations, setConversations] = useState<Conversation[] | null>(null)
  const [sessionSpent, setSessionSpent] = useState(0)

  const load = useCallback(async () => {
    try {
      const [convRes, walletRes] = await Promise.all([
        fetch(`/api/conversations?userId=${encodeURIComponent(userId ?? 'u1')}`),
        fetch(`/api/wallet?userId=${encodeURIComponent(userId ?? 'u1')}`),
      ])
      const convData = await convRes.json()
      const walletData = await walletRes.json()
      if (convRes.ok) setConversations(convData.conversations.filter((c: Conversation) => c.status === 'completed'))
      if (walletRes.ok) {
        const total = (walletData.transactions as Transaction[])
          .filter(t => t.type === 'session')
          .reduce((s, t) => s + Math.abs(t.amount), 0)
        setSessionSpent(+total.toFixed(2))
      }
    } catch {
      setConversations([])
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const completed = conversations ?? []

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0">
        <button onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div>
          <h2 className="text-[var(--text-primary)] text-base font-medium">{t('consultHistory.title')}</h2>
          <p className="text-[var(--text-dim)] text-xs">{t('consultHistory.subtitle')}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="flex flex-col items-center py-3 rounded-2xl"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
            <span className="text-[var(--text-primary)] font-semibold text-lg">{completed.length}</span>
            <span className="text-[var(--text-dim)] text-[10px] mt-0.5">{t('consultHistory.completedSessions')}</span>
          </div>
          <div className="flex flex-col items-center py-3 rounded-2xl"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
            <span className="text-[var(--text-primary)] font-semibold text-lg">${sessionSpent}</span>
            <span className="text-[var(--text-dim)] text-[10px] mt-0.5">{t('consultHistory.spentOnSessions')}</span>
          </div>
        </div>

        {conversations === null ? (
          <div className="py-10"><LoaderRing size={36} /></div>
        ) : completed.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            {/* REAL PHOTO (your call: "більше реальних фото... по всій апці
                щоб оживити") — flat ✨ emoji replaced with the same crystal
                ball Unsplash photo already used for the intuition-block
                Discover quiz, reused for thematic consistency. */}
            <div className="w-16 h-16 rounded-full overflow-hidden" style={{ border: '1.5px solid rgba(217,70,239,0.4)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1621508654686-809f23efdabc?auto=format&fit=crop&w=150&q=80" alt=""
                className="w-full h-full object-cover" />
            </div>
            <p className="text-[var(--text-muted)] text-sm">{t('consultHistory.noneYet')}</p>
            <p className="text-[var(--text-dim)] text-xs">{t('consultHistory.noneYetHint')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {completed.map(session => {
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
                    <p className="text-[var(--text-muted)] text-xs mt-0.5 truncate">{session.lastMessage}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[var(--text-dim)] text-[11px]">{session.updatedAt}</span>
                    <button
                      className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: 'rgba(217,70,239,0.15)', color: '#D946EF' }}
                      onClick={e => { e.stopPropagation(); expert && onSelectExpert(expert) }}>
                      {t('consultHistory.again')}
                    </button>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}