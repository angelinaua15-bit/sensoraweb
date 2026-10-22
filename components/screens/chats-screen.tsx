'use client'

// FILE PATH: components/screens/chats-screen.tsx
import { useState, useEffect, useCallback } from 'react'
import BottomNav from '@/components/bottom-nav'
import AvatarBubble from '@/components/avatar-bubble'
import { type Expert } from '@/lib/data'
import type { Screen } from '@/app/page'
import { useLanguage } from '@/components/language-provider'

interface Props {
  userId?: string | null
  onNavigate: (s: Screen) => void
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

export default function ChatsScreen({ userId, onNavigate, onSelectExpert }: Props) {
  const { t } = useLanguage()
  const [tab, setTab] = useState<'active' | 'done'>('active')
  const [conversations, setConversations] = useState<Conversation[] | null>(null)

  // Real expert catalog — replaces the old hardcoded EXPERTS array.
  const [experts, setExperts] = useState<Expert[]>([])
  useEffect(() => {
    let cancelled = false
    fetch('/api/experts')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data?.experts) setExperts(data.experts) })
      .catch(() => { /* "start a new conversation" row just stays empty */ })
    return () => { cancelled = true }
  }, [])
  const expertMap = Object.fromEntries(experts.map(e => [e.id, e]))

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/conversations?userId=${encodeURIComponent(userId ?? 'u1')}`)
      const data = await res.json()
      if (res.ok) setConversations(data.conversations)
    } catch {
      setConversations([])
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const activeList = (conversations ?? []).filter(c => c.status === 'active')
  const doneList = (conversations ?? []).filter(c => c.status === 'completed')

  const usedIds = new Set((conversations ?? []).map(c => c.expertId))
  const unusedExperts = experts.filter(e => !usedIds.has(e.id))
  const moreExperts = unusedExperts.length ? unusedExperts : experts

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5 mb-4">
          <button onClick={() => onNavigate('home')} aria-label={t('chats.back')}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <h2 className="text-[var(--text-primary)] text-xl font-medium">{t('chats.title')}</h2>
        </div>

        {/* Tabs — real per-user data: a brand-new account starts with zero
            conversations here, nothing pre-populated. */}
        <div className="flex rounded-2xl p-1 mb-5" style={{ background: 'var(--bg-elevated)' }}>
          {(['active', 'done'] as const).map(tabId => (
            <button key={tabId} onClick={() => setTab(tabId)}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
              style={{
                background: tab === tabId ? 'linear-gradient(135deg,#7C3AED,#D946EF)' : 'transparent',
                color: tab === tabId ? '#fff' : 'var(--text-muted)',
              }}>
              {tabId === 'active' ? t('chats.active', { n: activeList.length }) : t('chats.completed', { n: doneList.length })}
            </button>
          ))}
        </div>

        {conversations === null ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-[var(--text-dim)] text-sm">{t('chats.loading')}</p>
          </div>
        ) : (
          <div key={tab} className="screen-enter">
            {tab === 'active' && (
              <div className="flex flex-col gap-0.5">
                {activeList.map((chat, i) => {
                  const expert = expertMap[chat.expertId]
                  return (
                    <button key={chat.id}
                      onClick={() => expert ? onSelectExpert(expert) : onNavigate('home')}
                      className="flex items-center gap-3 py-4 px-1 border-b text-left w-full active:bg-white/5 rounded-xl transition-colors screen-enter"
                      style={{ borderColor: 'var(--surface-1)', animationDelay: `${i * 60}ms` }}>
                      <div className="relative flex-shrink-0">
                        <AvatarBubble initials={chat.avatar} size={50} online={expert?.online} photoUrl={expert?.avatarUrl} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-sm font-medium">{chat.expertName}</p>
                        <p className="text-[var(--text-dim)] text-xs">{chat.specialty}</p>
                        <p className="text-[var(--text-muted)] text-xs mt-0.5 truncate">{chat.lastMessage}</p>
                      </div>
                      <span className="text-[var(--text-dim)] text-[11px] flex-shrink-0">{chat.updatedAt}</span>
                    </button>
                  )
                })}

                {activeList.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <span className="text-5xl">💬</span>
                    <p className="text-[var(--text-muted)] text-sm">{t('chats.noActiveYet')}</p>
                    <p className="text-[var(--text-dim)] text-xs">{t('chats.startConsultation')}</p>
                    <button onClick={() => onNavigate('search')}
                      className="mt-2 px-5 py-2.5 rounded-2xl text-sm font-medium text-white active:scale-95 transition-transform"
                      style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
                      {t('chats.findExpert')}
                    </button>
                  </div>
                )}

                {moreExperts.length > 0 && (
                  <div className="mt-6">
                    <p className="text-[var(--text-dim)] text-xs mb-3 tracking-wider">{t('chats.startNewConversation')}</p>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                      {moreExperts.slice(0, 4).map(exp => (
                        <button key={exp.id} onClick={() => onSelectExpert(exp)}
                          className="flex-shrink-0 w-24 flex flex-col items-center gap-1.5 active:scale-95 transition-transform">
                          <AvatarBubble initials={exp.avatar} size={54} online={exp.online} photoUrl={exp.avatarUrl} />
                          {/* Per-minute price label removed from the UI at your
                              request — the actual per-minute charge during a
                              session is unchanged, this just no longer surfaces
                              it here as a browsing-time price tag. */}
                          <p className="text-[var(--text-primary)] text-[11px] font-medium leading-tight text-center">{exp.name.split(' ')[0]}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {tab === 'done' && (
              <div className="flex flex-col gap-2.5">
                {doneList.map((chat, i) => {
                  const expert = expertMap[chat.expertId]
                  return (
                    <button key={chat.id}
                      onClick={() => expert && onSelectExpert(expert)}
                      className="flex items-center gap-3 p-3 rounded-2xl text-left w-full active:scale-[0.98] transition-transform screen-enter"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)', animationDelay: `${i * 60}ms` }}>
                      <AvatarBubble initials={chat.avatar} size={46} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-sm font-medium">{chat.expertName}</p>
                        <p className="text-[var(--text-dim)] text-xs">{chat.specialty}</p>
                        <p className="text-[var(--text-muted)] text-xs mt-0.5 truncate">{chat.lastMessage}</p>
                      </div>
                      <span className="text-[var(--text-dim)] text-[11px] flex-shrink-0">{chat.updatedAt}</span>
                    </button>
                  )
                })}
                {doneList.length === 0 && (
                  <div className="flex flex-col items-center gap-3 py-16 text-center">
                    <span className="text-5xl">✅</span>
                    <p className="text-[var(--text-muted)] text-sm">{t('chats.noCompletedYet')}</p>
                    <p className="text-[var(--text-dim)] text-xs">{t('chats.tapEndHint')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav active="chats" onNavigate={onNavigate} />
    </div>
  )
}