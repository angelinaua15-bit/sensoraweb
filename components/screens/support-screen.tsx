'use client'

// FILE PATH: components/screens/support-screen.tsx
// New bottom-nav tab: lets a signed-in user submit a support question and see
// the history of their own tickets + staff replies once answered. Backed by
// POST /api/support/submit and GET /api/support/my-tickets, which relay into
// the staff Telegram chat (see lib/server/telegram.ts). Polling matches the
// same "no websockets available" pattern already used for chat conversations
// elsewhere in the app (see chats-screen.tsx / app/crm/chatter/page.tsx).
import { useState, useEffect, useCallback } from 'react'
import BottomNav from '@/components/bottom-nav'
import type { Screen } from '@/app/page'
import { useLanguage } from '@/components/language-provider'

interface Props {
  onNavigate: (s: Screen) => void
}

interface SupportTicket {
  id: string
  message: string
  status: 'open' | 'answered'
  reply: string | null
  createdAt: string
}

const MAX_MESSAGE_LENGTH = 2000
const POLL_MS = 6000

export default function SupportScreen({ onNavigate }: Props) {
  const { t } = useLanguage()
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [justSentNotice, setJustSentNotice] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/support/my-tickets')
      const data = await res.json()
      if (res.ok) setTickets(data.tickets)
    } catch {
      setTickets(prev => prev ?? [])
    }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, POLL_MS)
    return () => clearInterval(id)
  }, [load])

  async function handleSubmit() {
    const trimmed = message.trim()
    if (!trimmed) return
    if (trimmed.length > MAX_MESSAGE_LENGTH) {
      setError(t('support.messageTooLong', { max: MAX_MESSAGE_LENGTH }))
      return
    }
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/support/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.error ?? t('support.sendFailed'))
        return
      }
      setMessage('')
      setJustSentNotice(
        data.telegramDelivered
          ? t('support.sentTelegram')
          : t('support.sentNoTelegram')
      )
      // Temporary while wiring up the Telegram bridge: surface the raw
      // Telegram error (if any) right in the UI instead of only in Vercel
      // logs, so it's visible without needing server access. Safe to show —
      // this string only ever contains Telegram's own error description, no
      // secrets (see lib/server/telegram.ts). Remove once delivery is
      // confirmed working end-to-end.
      if (!data.telegramDelivered && data.telegramError) {
        setError(`Telegram: ${data.telegramError}`)
      }
      setTimeout(() => setJustSentNotice(null), 5000)
      load()
    } catch {
      setError(t('support.networkError'))
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5 mb-4">
          <button onClick={() => onNavigate('home')} aria-label={t('support.back')}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <h2 className="text-[var(--text-primary)] text-xl font-medium">{t('support.title')}</h2>
        </div>

        {/* New question form */}
        <div className="rounded-2xl p-4 mb-5" style={{ background: 'var(--surface-1)' }}>
          <p className="text-[var(--text-dim)] text-xs mb-2">{t('support.askUs')}</p>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder={t('support.placeholder')}
            rows={3}
            className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
            style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}
          />
          {error && <p className="text-[#F87171] text-xs mt-2">{error}</p>}
          {justSentNotice && <p className="text-[#34D399] text-xs mt-2">{justSentNotice}</p>}
          <button
            onClick={handleSubmit}
            disabled={sending || !message.trim()}
            className="mt-3 w-full py-2.5 rounded-xl text-sm font-medium text-white active:scale-[0.98] transition-transform disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}
          >
            {sending ? t('support.sending') : t('support.send')}
          </button>
        </div>

        <p className="text-[var(--text-dim)] text-xs mb-3 tracking-wider">{t('support.yourRequests')}</p>

        {tickets === null ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-[var(--text-dim)] text-sm">{t('support.loading')}</p>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            {/* REAL PHOTO (your call: "більше реальних фото... по всій
                апці щоб оживити") — flat 💬 emoji replaced with a real
                warm candle/journal photo, same one used for the "writing a
                manifestation list" Discover article, fitting a "we're here
                for you" support empty state better than a chat bubble. */}
            <div className="w-16 h-16 rounded-full overflow-hidden" style={{ border: '1.5px solid rgba(217,70,239,0.4)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1588338949261-659fc6fed20b?auto=format&fit=crop&w=150&q=80" alt=""
                className="w-full h-full object-cover" />
            </div>
            <p className="text-[var(--text-muted)] text-sm">{t('support.noRequestsYet')}</p>
            <p className="text-[var(--text-dim)] text-xs">{t('support.sendQuestionAbove')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {tickets.map((ticket, i) => (
              <div key={ticket.id}
                className="rounded-2xl p-3.5 screen-enter"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)', animationDelay: `${i * 60}ms` }}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: ticket.status === 'answered' ? 'rgba(52,211,153,0.15)' : 'rgba(217,70,239,0.15)',
                      color: ticket.status === 'answered' ? '#34D399' : '#D946EF',
                    }}>
                    {ticket.status === 'answered' ? t('support.answered') : t('support.awaitingReply')}
                  </span>
                  <span className="text-[var(--text-dim)] text-[11px]">{ticket.createdAt}</span>
                </div>
                <p className="text-[var(--text-primary)] text-sm">{ticket.message}</p>
                {ticket.reply && (
                  <div className="mt-2.5 pt-2.5" style={{ borderTop: '1px solid var(--bg-elevated)' }}>
                    <p className="text-[var(--text-dim)] text-[11px] mb-1">{t('support.supportTeam')}</p>
                    <p className="text-[var(--text-primary)] text-sm">{ticket.reply}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <BottomNav active="support" onNavigate={onNavigate} />
    </div>
  )
}
