'use client'

// FILE PATH: components/crm/chat-pane.tsx
//
// One live conversation, fully self-contained (its own message poll, live
// earnings poll, balance poll, translate/photo/report state) — extracted out
// of app/crm/chatter/page.tsx so the Live Chat tab can render TWO of these
// side by side at once (your explicit request: "відразу 2 чата у вікні").
// Before this, the page had exactly one `selectedConvId` and everything
// below was inlined directly in the page, so only one conversation could
// ever be open. Nothing about a single conversation's behavior changed in
// this extraction — it's the same polling, the same handlers, just scoped
// to whichever conversationId this particular instance is given.
//
// Also adds two things that genuinely didn't exist anywhere in the chatter
// CRM before: a low-balance warning (polls the client's real wallet balance
// via /api/crm/client-balance, which didn't exist until now) and a gray
// in-thread notice the moment that balance goes UP (a top-up), not just the
// small header number changing. The notice is intentionally NOT a real
// persisted chat message — a top-up is an account-level event, not something
// tied to one conversation's messages table rows, so turning it into a real
// ChatMessage would misrepresent who "sent" it. It's a live, honest signal
// computed from two real balance readings, shown only while this pane is
// open — not invented, just not saved as chat history.
import { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/components/language-provider'
import type { ChatMessage, LiveSessionEarnings } from '@/lib/server/db'

// Same lead time the server-side proactive push warning uses
// (LOW_BALANCE_WARNING_LEAD_SECONDS in app/api/session/charge/route.ts) —
// kept in sync deliberately so the chatter's in-CRM warning and the client's
// own push notification fire around the same real moment, not two different
// arbitrary thresholds.
const LOW_BALANCE_WARNING_LEAD_SECONDS = 60

interface FeedItem {
  id: string
  kind: 'message' | 'notice'
  message?: ChatMessage
  noticeText?: string
  atMs: number
}

interface Props {
  conversationId: string
  clientName: string
  clientUserId: string
  // Which of the chatter's profiles this client wrote to (only passed when
  // the account has more than one).
  profileName?: string
  favorited: boolean
  operatorId: string
  onToggleFavorite: () => void
  // Only slot B (the second pane) gets a close button — slot A behaves
  // exactly like the single-pane view always did.
  onClose?: () => void
}

export default function ChatPane({ conversationId, clientName, clientUserId, profileName, favorited, operatorId, onToggleFavorite, onClose }: Props) {
  const { t } = useLanguage()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [msgInput, setMsgInput] = useState('')
  const [sendingMsg, setSendingMsg] = useState(false)
  const [sendMsgError, setSendMsgError] = useState<string | null>(null)
  const seenMsgIdsRef = useRef<Set<string>>(new Set())

  const [uploadingMsgPhoto, setUploadingMsgPhoto] = useState(false)
  const [msgPhotoError, setMsgPhotoError] = useState<string | null>(null)
  const msgFileInputRef = useRef<HTMLInputElement>(null)

  const [msgTranslations, setMsgTranslations] = useState<Record<string, string>>({})
  const [msgTranslating, setMsgTranslating] = useState<Record<string, boolean>>({})
  const [autoTranslateOut, setAutoTranslateOut] = useState(false)
  const [outPreview, setOutPreview] = useState<string | null>(null)
  const [translatingOut, setTranslatingOut] = useState(false)

  const [liveEarnings, setLiveEarnings] = useState<LiveSessionEarnings | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const [reportOpen, setReportOpen] = useState(false)
  const [reportText, setReportText] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)

  // Real client balance + low-balance warning + top-up notice — none of
  // this existed before (see the file header comment).
  // Messages being sent right now — shown instantly (greyed) so a reply never
  // looks like it vanished while the request is in flight.
  const [pending, setPending] = useState<{ id: string; text: string; atMs: number }[]>([])
  const scrollRef = useRef<HTMLDivElement>(null)
  const sendLockRef = useRef(false)
  const lastFeedCountRef = useRef(0)
  // Per-client private notes, right inside the chat.
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesCardId, setNotesCardId] = useState<string | null>(null)
  const [notesText, setNotesText] = useState('')
  const [notesLoading, setNotesLoading] = useState(false)
  const [notesSaving, setNotesSaving] = useState(false)
  const [notesSaved, setNotesSaved] = useState(false)
  const [notesError, setNotesError] = useState<string | null>(null)
  // Expanded = this chat fills the whole screen (Esc or the button closes it).
  const [expanded, setExpanded] = useState(false)
  const [endingChat, setEndingChat] = useState(false)
  const [endChatError, setEndChatError] = useState<string | null>(null)
  const [clientBalance, setClientBalance] = useState<number | null>(null)
  const [notices, setNotices] = useState<{ id: string; text: string; atMs: number }[]>([])
  const prevBalanceRef = useRef<number | null>(null)

  // Poll messages for this conversation.
  useEffect(() => {
    seenMsgIdsRef.current = new Set()
    setMessages([])
    let stopped = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/messages?conversationId=${encodeURIComponent(conversationId)}`)
        const data = await res.json()
        if (stopped || !res.ok) return
        setMessages(data.messages ?? [])
        ;(data.messages ?? []).forEach((m: ChatMessage) => seenMsgIdsRef.current.add(m.id))
      } catch { /* next tick retries */ }
    }
    poll()
    const t = setInterval(poll, 2500)
    return () => { stopped = true; clearInterval(t) }
  }, [conversationId])

  // Live per-conversation timer + earnings — unchanged from before, just
  // scoped to this pane's own conversationId instead of a shared one.
  useEffect(() => {
    let stopped = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/crm/session-earnings?operatorId=${encodeURIComponent(operatorId)}&conversationId=${encodeURIComponent(conversationId)}`)
        const data = await res.json()
        if (!stopped && res.ok) setLiveEarnings(data)
      } catch { /* next tick retries */ }
    }
    poll()
    const p = setInterval(poll, 5000)
    return () => { stopped = true; clearInterval(p) }
  }, [conversationId, operatorId])

  // Real balance poll — powers both the low-balance warning and the
  // top-up notice. A rise since the last reading means the client just
  // added money; that's the one honest signal a real top-up happened,
  // computed live, not fabricated or guessed from anything else.
  useEffect(() => {
    prevBalanceRef.current = null
    setClientBalance(null)
    setNotices([])
    let stopped = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/crm/client-balance?operatorId=${encodeURIComponent(operatorId)}&conversationId=${encodeURIComponent(conversationId)}`)
        const data = await res.json()
        if (stopped || !res.ok || typeof data.balance !== 'number') return
        const prev = prevBalanceRef.current
        if (prev !== null && data.balance > prev + 0.001) {
          const added = +(data.balance - prev).toFixed(2)
          setNotices(list => [...list, {
            id: `notice_${Date.now()}`,
            text: t('crmChatter.clientToppedUp', { amount: added.toFixed(2), balance: data.balance.toFixed(2) }),
            atMs: Date.now(),
          }])
        }
        prevBalanceRef.current = data.balance
        setClientBalance(data.balance)
      } catch { /* next tick retries */ }
    }
    poll()
    const p = setInterval(poll, 4000)
    return () => { stopped = true; clearInterval(p) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, operatorId])

  useEffect(() => {
    const tk = setInterval(() => setNowTick(Date.now()), 1000)
    return () => clearInterval(tk)
  }, [])

  // Reset the Report Issue form whenever this pane switches to a different
  // conversation (e.g. slot B gets pointed at a new client).
  useEffect(() => {
    setReportOpen(false)
    setReportText('')
    setReportSent(false)
    setReportError(null)
    setEndChatError(null)
    setNotesOpen(false)
    setNotesCardId(null)
    setNotesText('')
    setNotesSaved(false)
    setNotesError(null)
    setPending([])
    lastFeedCountRef.current = 0
  }, [conversationId])

  useEffect(() => {
    if (!expanded) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [expanded])

  // "End chat" — closes this conversation for real: the timer freezes, the
  // client stops being billed and their screen shows the session-ended state.
  const endChat = async () => {
    if (endingChat || liveEarnings?.ended) return
    if (typeof window !== 'undefined' && !window.confirm(t('crmChatter.endChatConfirm'))) return
    setEndingChat(true)
    setEndChatError(null)
    try {
      const res = await fetch('/api/crm/conversation-end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId, conversationId }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        // Refresh the timer/earnings right away so it freezes immediately.
        const r2 = await fetch(`/api/crm/session-earnings?operatorId=${encodeURIComponent(operatorId)}&conversationId=${encodeURIComponent(conversationId)}`)
        if (r2.ok) setLiveEarnings(await r2.json())
      } else {
        setEndChatError(data?.error ?? t('crmChatter.endChatError'))
      }
    } catch {
      setEndChatError(t('crmChatter.endChatError'))
    } finally {
      setEndingChat(false)
    }
  }

  const submitReport = async () => {
    if (!reportText.trim() || reportSending) return
    setReportSending(true)
    setReportError(null)
    try {
      const res = await fetch('/api/crm/report-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operatorId, conversationId, reason: reportText.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setReportSent(true)
        setReportText('')
      } else {
        setReportError(data?.error ?? t('crmChatter.reportIssueError'))
      }
    } catch {
      setReportError(t('crmChatter.reportIssueError'))
    } finally {
      setReportSending(false)
    }
  }

  const openNotes = async () => {
    const next = !notesOpen
    setNotesOpen(next)
    if (!next || notesCardId || notesLoading) return
    setNotesLoading(true)
    setNotesError(null)
    try {
      const res = await fetch(`/api/crm/clients?operatorId=${encodeURIComponent(operatorId)}`)
      const data = await res.json()
      const card = (data.clients ?? []).find((c: { id: string; notes: string }) => c.id === `cc_${operatorId}_${clientUserId}`)
      if (card) {
        setNotesCardId(card.id)
        setNotesText(card.notes ?? '')
      } else {
        setNotesError(t('crmChatter.notesNoCard'))
      }
    } catch {
      setNotesError(t('crmChatter.notesNoCard'))
    } finally {
      setNotesLoading(false)
    }
  }

  const saveNotes = async () => {
    if (!notesCardId || notesSaving) return
    setNotesSaving(true)
    setNotesError(null)
    try {
      const res = await fetch('/api/crm/clients', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: notesCardId, notes: notesText }),
      })
      if (res.ok) setNotesSaved(true)
      else setNotesError((await res.json().catch(() => ({})))?.error ?? t('crmChatter.notesNoCard'))
    } catch {
      setNotesError(t('crmChatter.notesNoCard'))
    } finally {
      setNotesSaving(false)
    }
  }

  // Optimistic send: the text box clears and the message appears (greyed) the
  // instant you press Send; if the server rejects it, the text comes back.
  const sendOperatorMessage = async () => {
    // sendLockRef (not state) so a fast double Enter/click can't slip through
    // before React re-renders.
    if (!msgInput.trim() || sendingMsg || sendLockRef.current || liveEarnings?.ended) return
    sendLockRef.current = true
    const original = msgInput
    const tmpId = `pending_${Date.now()}`
    setSendMsgError(null)
    setSendingMsg(true)
    setMsgInput('')
    setPending(list => [...list, { id: tmpId, text: original, atMs: Date.now() }])
    let text = original
    try {
      if (autoTranslateOut) {
        setTranslatingOut(true)
        try {
          const tRes = await fetch('/api/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, source: 'uk', target: 'en' }),
          })
          const tData = await tRes.json()
          if (tRes.ok && tData.translated) {
            text = tData.translated
            setOutPreview(text)
          }
        } finally {
          setTranslatingOut(false)
        }
      }
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, senderRole: 'operator', senderId: operatorId, text }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.message) {
        if (!seenMsgIdsRef.current.has(data.message.id)) {
          seenMsgIdsRef.current.add(data.message.id)
          setMessages(prev => [...prev, data.message])
        }
        setOutPreview(null)
      } else {
        setMsgInput(original)
        setSendMsgError(data?.error ?? t('crmChatter.messageSendError'))
      }
    } catch {
      setMsgInput(original)
      setSendMsgError(t('crmChatter.messageSendError'))
    } finally {
      setPending(list => list.filter(p => p.id !== tmpId))
      setSendingMsg(false)
      sendLockRef.current = false
    }
  }

  const MAX_MSG_PHOTO_BYTES = 5 * 1024 * 1024
  const ALLOWED_MSG_PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp']

  const sendOperatorPhoto = async (file: File) => {
    setMsgPhotoError(null)
    if (!ALLOWED_MSG_PHOTO_TYPES.includes(file.type)) {
      setMsgPhotoError('Photo must be a PNG, JPEG, or WEBP image')
      return
    }
    if (file.size > MAX_MSG_PHOTO_BYTES) {
      setMsgPhotoError('Photo must be under 5 MB')
      return
    }
    setUploadingMsgPhoto(true)
    try {
      const form = new FormData()
      form.append('photo', file)
      form.append('conversationId', conversationId)
      const uploadRes = await fetch('/api/messages/photo', { method: 'POST', body: form })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.url) {
        setMsgPhotoError(uploadData?.error ?? 'Could not upload photo — try again')
        return
      }
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, senderRole: 'operator', senderId: operatorId, text: '', imageUrl: uploadData.url }),
      })
      const data = await res.json()
      if (res.ok && data.message && !seenMsgIdsRef.current.has(data.message.id)) {
        seenMsgIdsRef.current.add(data.message.id)
        setMessages(prev => [...prev, data.message])
      } else if (!res.ok) {
        setMsgPhotoError(data?.error ?? 'Photo could not be sent — try again')
      }
    } catch {
      setMsgPhotoError('Network error — try again')
    } finally {
      setUploadingMsgPhoto(false)
    }
  }

  const translateIncoming = async (m: ChatMessage) => {
    if (msgTranslations[m.id] || msgTranslating[m.id]) return
    setMsgTranslating(prev => ({ ...prev, [m.id]: true }))
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: m.text, source: 'en', target: 'uk' }),
      })
      const data = await res.json()
      if (res.ok && data.translated) {
        setMsgTranslations(prev => ({ ...prev, [m.id]: data.translated }))
      }
    } catch {
      // Best-effort reading aid.
    } finally {
      setMsgTranslating(prev => ({ ...prev, [m.id]: false }))
    }
  }

  // Merge real messages + ephemeral top-up notices into one chronological
  // feed. Notices are appended live as they're detected, real messages come
  // from the poll above — both carry a real timestamp, so a plain sort keeps
  // them in true order even if a notice lands between two poll ticks.
  const feed: FeedItem[] = [
    ...messages.map(m => ({ id: m.id, kind: 'message' as const, message: m, atMs: new Date(m.createdAtIso || m.createdAt).getTime() || 0 })),
    ...notices.map(n => ({ id: n.id, kind: 'notice' as const, noticeText: n.text, atMs: n.atMs })),
    ...pending.map(p => ({
      id: p.id,
      kind: 'message' as const,
      message: { id: p.id, conversationId, senderRole: 'operator' as const, senderId: operatorId, text: p.text, imageUrl: null, createdAt: '…', createdAtIso: new Date(p.atMs).toISOString() } as ChatMessage,
      atMs: p.atMs,
    })),
  ].sort((a, b) => a.atMs - b.atMs)

  // Always land on the newest message — on open, when something arrives, and
  // the moment you send (the greyed pending message counts).
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTo({ top: el.scrollHeight, behavior: lastFeedCountRef.current === 0 ? 'auto' : 'smooth' })
    lastFeedCountRef.current = feed.length
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed.length, expanded])

  // Low-balance warning — rate-aware (seconds of runway left at this
  // conversation's real per-minute rate), same lead time as the server-side
  // push warning. Falls back to a flat "balance is $0" out-of-money state
  // when the rate isn't known yet.
  const ratePerSecond = liveEarnings ? liveEarnings.ratePerMinute / 60 : null
  const secondsRemaining = clientBalance !== null && ratePerSecond ? clientBalance / ratePerSecond : null
  const isOutOfBalance = clientBalance !== null && clientBalance <= 0
  const isLowBalance = !isOutOfBalance && secondsRemaining !== null && secondsRemaining <= LOW_BALANCE_WARNING_LEAD_SECONDS

  return (
    <div className={`flex flex-col rounded-2xl overflow-hidden min-w-0 ${expanded ? 'fixed z-[60]' : 'flex-1'}`}
      style={expanded
        ? { border: '1px solid var(--surface-2)', inset: 12, background: 'var(--bg-void)', boxShadow: '0 0 0 100vmax rgba(0,0,0,0.6)' }
        : { border: '1px solid var(--surface-1)', height: '75vh', minHeight: 480 }}>
      <div className="flex items-center justify-between px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--surface-1)', background: 'var(--surface-0)' }}>
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onToggleFavorite} className="text-base flex-shrink-0" style={{ color: favorited ? '#F5C542' : 'var(--text-dim)' }}>
            ★
          </button>
          <p className="text-[var(--text-primary)] text-sm font-medium truncate">{clientName}</p>
          {profileName && (
            <span className="text-[10px] px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(217,70,239,0.15)', color: '#D946EF' }}>{profileName}</span>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {liveEarnings?.activatedAtIso && (
            <span className="text-[11px] text-[var(--text-dim)] font-mono" title={t('crmChatter.liveSessionHint')}>
              {formatElapsed((liveEarnings.endedAtIso ? new Date(liveEarnings.endedAtIso).getTime() : nowTick) - new Date(liveEarnings.activatedAtIso).getTime())} · ${liveEarnings.earnedSoFar.toFixed(2)}
            </span>
          )}
          {liveEarnings?.ended ? (
            <span className="text-[11px] px-2.5 py-1 rounded-full font-medium"
              style={{ background: 'var(--surface-1)', color: 'var(--text-dim)' }}>
              {t('crmChatter.chatEnded')}
            </span>
          ) : (
            <button onClick={endChat} disabled={endingChat}
              className="text-[11px] px-2.5 py-1 rounded-full font-medium disabled:opacity-50"
              style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--text-accent-soft)', border: '1px solid rgba(124,58,237,0.35)' }}>
              {endingChat ? t('crmChatter.sending') : t('crmChatter.endChat')}
            </button>
          )}
          <button onClick={openNotes}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium"
            style={{ background: notesOpen ? 'rgba(124,58,237,0.2)' : 'var(--surface-1)', color: notesOpen ? 'var(--text-primary)' : 'var(--text-dim)', border: '1px solid var(--surface-2)' }}>
            {t('crmChatter.notes')}
          </button>
          <button onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? t('crmChatter.collapseChat') : t('crmChatter.expandChat')}
            title={expanded ? t('crmChatter.collapseChat') : t('crmChatter.expandChat')}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium"
            style={{ background: 'var(--surface-1)', color: 'var(--text-dim)', border: '1px solid var(--surface-2)' }}>
            {expanded ? '⤡' : '⤢'}
          </button>
          <button onClick={() => setReportOpen(v => !v)}
            className="text-[11px] px-2.5 py-1 rounded-full font-medium"
            style={{ background: 'rgba(239,68,68,0.1)', color: '#EF4444', border: '1px solid rgba(239,68,68,0.25)' }}>
            {t('crmChatter.reportIssue')}
          </button>
          {onClose && (
            <button onClick={onClose} aria-label={t('crmChatter.closeSecondPane')}
              className="text-[var(--text-dim)] text-sm px-1">×</button>
          )}
        </div>
      </div>

      {notesOpen && (
        <div className="px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--surface-1)', background: 'var(--surface-0)' }}>
          {notesLoading ? (
            <p className="text-[var(--text-dim)] text-[11px]">{t('crmChatter.loading')}</p>
          ) : notesCardId ? (
            <>
              <textarea value={notesText} onChange={e => { setNotesText(e.target.value); setNotesSaved(false) }} rows={3}
                placeholder={t('crmChatter.notesPlaceholder')}
                className="w-full px-3 py-2 rounded-lg text-xs text-[var(--text-primary)] outline-none resize-none"
                style={{ background: 'var(--surface-1)', border: '1px solid rgba(124,58,237,0.3)' }} />
              <div className="flex items-center gap-3 mt-2">
                <button onClick={saveNotes} disabled={notesSaving}
                  className="text-[11px] px-3 py-1.5 rounded-lg font-medium text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
                  {notesSaving ? t('crmChatter.saving') : t('crmChatter.saveNotes')}
                </button>
                {notesSaved && <span className="text-[#22C55E] text-[11px]">{t('crmChatter.saved')}</span>}
                <span className="text-[var(--text-dim)] text-[10px]">{t('crmChatter.notesVisibility')}</span>
              </div>
            </>
          ) : null}
          {notesError && <p className="text-[#EF4444] text-[11px]">{notesError}</p>}
        </div>
      )}

      {reportOpen && (
        <div className="px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--surface-1)', background: 'var(--surface-0)' }}>
          {reportSent ? (
            <p className="text-[#22C55E] text-[11px]">{t('crmChatter.reportIssueSent')}</p>
          ) : (
            <div className="flex items-center gap-2">
              <input value={reportText} onChange={e => setReportText(e.target.value)}
                placeholder={t('crmChatter.reportIssuePlaceholder')}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] outline-none"
                style={{ background: 'var(--surface-1)' }} />
              <button onClick={submitReport} disabled={reportSending || !reportText.trim()}
                className="text-[11px] px-3 py-1.5 rounded-lg font-medium text-white disabled:opacity-50"
                style={{ background: '#EF4444' }}>
                {reportSending ? t('crmChatter.sending') : t('crmChatter.reportIssueSend')}
              </button>
            </div>
          )}
          {reportError && <p className="text-[#EF4444] text-[10px] mt-1">{reportError}</p>}
        </div>
      )}

      {/* Real client balance — low/out warning. Neither existed before: the
          chatter had no visibility into the client's balance at all. */}
      {(isLowBalance || isOutOfBalance) && (
        <div className="mx-3 mt-2 px-3 py-2 rounded-xl flex-shrink-0 flex items-center gap-2"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)' }}>
          <span className="text-sm">⚠️</span>
          <p className="text-[#EF4444] text-[11px] leading-relaxed">
            {isOutOfBalance ? t('crmChatter.clientOutOfBalance') : t('crmChatter.clientLowBalance', { balance: (clientBalance ?? 0).toFixed(2) })}
          </p>
        </div>
      )}

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5" style={{ background: 'var(--surface-0)' }}>
        {feed.map(item => item.kind === 'notice' ? (
          // Gray, centered, no bubble tail — visually distinct from an
          // actual chat message on either side, same idea as a "call ended"
          // system line in a normal messenger.
          <div key={item.id} className="flex justify-center">
            <span className="text-[10px] px-3 py-1 rounded-full" style={{ background: 'var(--surface-1)', color: 'var(--text-dim)' }}>
              {item.noticeText}
            </span>
          </div>
        ) : (
          <div key={item.id} className={`flex ${item.message!.senderRole === 'operator' ? 'justify-end' : 'justify-start'}`}>
            <div className={`${expanded ? 'max-w-[60%] text-sm' : 'max-w-[70%] text-xs'} px-3.5 py-2.5 rounded-2xl leading-relaxed text-[var(--text-primary)]`}
              style={{ background: item.message!.senderRole === 'operator' ? 'linear-gradient(135deg,#7C3AED,#D946EF)' : 'var(--surface-1)', opacity: item.id.startsWith('pending_') ? 0.55 : 1 }}>
              {item.message!.imageUrl && (
                <a href={item.message!.imageUrl} target="_blank" rel="noopener noreferrer">
                  <img src={item.message!.imageUrl} alt="Attached photo"
                    className="rounded-lg max-w-full mb-1.5"
                    style={{ maxHeight: 220, display: 'block' }} />
                </a>
              )}
              {item.message!.text}
              {msgTranslations[item.message!.id] && (
                <div className="mt-1.5 pt-1.5 opacity-75" style={{ borderTop: '1px solid rgba(255,255,255,0.15)' }}>
                  {msgTranslations[item.message!.id]}
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[9px] opacity-60">{item.message!.createdAt}</p>
                {item.message!.senderRole !== 'operator' && !msgTranslations[item.message!.id] && (
                  <button onClick={() => translateIncoming(item.message!)} disabled={msgTranslating[item.message!.id]}
                    className="text-[9px] underline opacity-75">
                    {msgTranslating[item.message!.id] ? t('crmChatter.translating') : t('crmChatter.translate')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {endChatError && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg text-[11px] leading-relaxed"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}>
          {endChatError}
        </div>
      )}
      {sendMsgError && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg text-[11px] leading-relaxed"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}>
          {sendMsgError}
        </div>
      )}
      {msgPhotoError && (
        <div className="mx-3 mb-2 px-3 py-2 rounded-lg text-[11px] leading-relaxed"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}>
          {msgPhotoError}
        </div>
      )}
      <div className="flex items-center gap-2 px-3 pt-2" style={{ borderTop: '1px solid var(--surface-1)' }}>
        <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-dim)] cursor-pointer select-none">
          <input type="checkbox" checked={autoTranslateOut} onChange={e => setAutoTranslateOut(e.target.checked)} />
          {t('crmChatter.autoTranslateLabel')}
        </label>
      </div>
      {outPreview && autoTranslateOut && (
        <p className="px-3 pt-1 text-[10px] text-[var(--text-dim)] italic">{t('crmChatter.sentPreview', { text: outPreview })}</p>
      )}
      <div className="flex items-center gap-2 p-3">
        <input ref={msgFileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) sendOperatorPhoto(f); e.target.value = '' }} />
        <button onClick={() => msgFileInputRef.current?.click()} disabled={uploadingMsgPhoto}
          aria-label="Attach photo"
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-50"
          style={{ background: 'var(--surface-1)' }}>
          {uploadingMsgPhoto ? (
            <div className="w-3.5 h-3.5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--text-dim)', borderTopColor: 'transparent' }} />
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              <path d="M17 8V2m0 0-3 3m3-3 3 3" />
              <circle cx="8.5" cy="10.5" r="1.5" />
              <path d="m3 16 5-5 3 3 5-5 5 5" />
            </svg>
          )}
        </button>
        <input value={msgInput} disabled={!!liveEarnings?.ended} onChange={e => { setMsgInput(e.target.value); setSendMsgError(null) }}
          onKeyDown={e => { if (e.key === 'Enter') sendOperatorMessage() }}
          placeholder={autoTranslateOut ? t('crmChatter.replyPlaceholderUk') : t('crmChatter.replyPlaceholder')}
          className="flex-1 px-3.5 py-2.5 rounded-xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none"
          style={{ background: 'var(--surface-1)' }} />
        <button onClick={sendOperatorMessage} disabled={sendingMsg || !msgInput.trim() || !!liveEarnings?.ended}
          className="px-4 py-2.5 rounded-xl text-white text-sm font-medium disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {translatingOut ? t('crmChatter.sendTranslating') : t('crmChatter.send')}
        </button>
      </div>
    </div>
  )
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}