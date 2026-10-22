'use client'

// FILE PATH: components/screens/live-chat-screen.tsx
import { useState, useRef, useEffect } from 'react'
import AvatarBubble from '@/components/avatar-bubble'
import type { Expert } from '@/lib/data'
import type { Screen } from '@/app/page'
import { getDeviceId } from '@/lib/device-id'
// Real native camera/photo-library picker for the attach button below,
// instead of always falling back to the browser's plain <input type="file">
// — on the native Android/iOS build this now opens the actual OS picker
// (Capacitor.isNativePlatform() check + try/catch mirrors the same
// defensive pattern already used in components/native-shell-init.tsx, since
// these packages exist in package.json but nothing guarantees the native
// runtime is actually present in every environment this code runs in).
import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'
import { useLanguage } from '@/components/language-provider'

interface Props {
  expert: Expert
  userId?: string | null
  userName?: string
  balance: number
  onBalanceChange: (b: number) => void
  onEnd: (e: Expert) => void
  onTopup: () => void
  onNavigate: (s: Screen) => void
}

interface Message { id: string; from: 'user'|'expert'; text: string; time: string; imageUrl?: string | null; pending?: boolean }

const POLL_MS = 2500

// PROPOSED DEFAULT — the TZ doc asks for "auto-close on timeout without
// over-charging" but doesn't give a number. 60 seconds of continuous
// unreachability felt like a reasonable line between "brief network blip,
// worth waiting out" and "actually gone, stop pretending this is still a
// live session." Change this one constant if the real number should differ.
const DISCONNECT_TIMEOUT_MS = 60_000

export default function LiveChatScreen({ expert, userId, userName, balance, onBalanceChange, onEnd, onTopup, onNavigate }: Props) {
  const { t } = useLanguage()
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  // null = still checking eligibility with the server (see the free-trial
  // effect below) — deliberately NOT defaulting to 180 anymore. The old code
  // just did `useState(180)`, a fresh free countdown handed out unconditionally
  // every time this screen mounted, with zero server memory of whether this
  // account/device had already used it. Fail-closed while checking: no free
  // countdown runs and no billing starts until the server has answered.
  const [freeSecsLeft, setFreeSecsLeft] = useState<number | null>(null)
  // REAL BUG FIX (found live by you, screenshot showed it): this used to be
  // a `lowBalance` boolean that only drove a dismissible warning banner —
  // the input box, send button, and sendMessage()/sendPhoto() had ZERO
  // awareness of it, so once billing froze at a low/zero balance, the chat
  // stayed fully open and messages kept sending forever with nothing behind
  // them (no billing, no real consultation happening). Now this is a real
  // session-ended state: the moment billing can no longer continue (balance
  // drops below the warning floor, or the server hard-rejects a charge with
  // 402), the conversation is closed server-side (same "complete" call the
  // disconnect-timeout path below already used) and the whole chat UI is
  // replaced with a dedicated "can't continue" screen that has no message
  // input at all — so there is no code path left where a message can be
  // sent after the session has actually ended.
  const [sessionEndedByLowBalance, setSessionEndedByLowBalance] = useState(false)
  // REAL BUG FIX (app↔CRM integration audit, 2026-09-03): the server now
  // rejects a charge with 409 if this expert profile currently has no
  // chatter assigned to it (see ProfileUnassignedError in lib/server/db.ts)
  // — added specifically so a client is never billed for a profile no one
  // will ever get credited/paid for answering. Before this, that 409 simply
  // wasn't handled below (only res.ok and 402 were), so the billing tick
  // would have silently kept retrying and failing once a second forever,
  // with no visible explanation and a chat that just stopped progressing.
  const [sessionEndedByProfileUnavailable, setSessionEndedByProfileUnavailable] = useState(false)
  // The chatter pressed "End chat" in the CRM (server marks the conversation
  // completed). Detected from the message poll (works during the free trial
  // too) and from the billing route's 409 SESSION_ENDED.
  const [sessionEndedByExpert, setSessionEndedByExpert] = useState(false)
  const [sendError, setSendError] = useState<string | null>(null)
  // Pause/resume/timeout on disconnect (real TZ doc requirement). There's no
  // WebSocket in this app — messaging is HTTP polling and billing is a
  // client-side 1-second timer calling the server — so "disconnected" here
  // means "the last attempt to reach the server failed," detected two ways:
  // the browser's own online/offline events (fast, OS-level signal) and a
  // failed billing-tick fetch (catches the case where the OS still thinks
  // it's online but the server genuinely isn't reachable).
  const [connectionLost, setConnectionLost] = useState(false)
  const [sessionEndedByDisconnect, setSessionEndedByDisconnect] = useState(false)
  const disconnectedSinceRef = useRef<number | null>(null)
  // Chatter-silence close (your explicit ask, 2026-09-08 voice note): the
  // client's own device, not the chatter's — a paid session was continuing
  // to bill while the chatter simply never replied to the client's last
  // message. Tracked independently of the disconnect timeout above, which
  // only covers THIS device losing its own connection to the server — this
  // covers the other side going quiet, which the server can't detect any
  // other way since there's no delivery/read receipt system. Deliberately
  // does NOT guess why the chatter went quiet (bad connection, actually
  // offline, mid-typing — no way to know from here), so the message shown
  // stays honest about what's known (no reply) rather than a fabricated
  // specific cause.
  const [sessionEndedByNoReply, setSessionEndedByNoReply] = useState(false)
  const noReplyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const NO_REPLY_TIMEOUT_MS = 90_000
  // REAL FIX (App Store/Google Play review risk, 2026-09-10): billing used to
  // start the instant freeSecsLeft hit 0 with zero user action in between —
  // no "you're about to be charged" moment at all, just a silent switch from
  // free to paid. That's exactly the kind of "hidden charge" pattern App
  // Review (Guideline 3.1.1) and Google Play's billing policy both flag.
  // paidConfirmed gates the billing effect below: once the free countdown
  // reaches 0, the chat pauses on a real confirmation screen (see the
  // `needsPaidConfirm` render branch) showing this expert's actual per-minute
  // rate, and billing does not start until the person explicitly taps
  // "Continue". Declining ends the session the same way the "Back" button
  // elsewhere in this file already does — no charge either way.
  const [paidConfirmed, setPaidConfirmed] = useState(false)
  // Per-message translations, keyed by message id — the expert (often a
  // Ukrainian-speaking chatter) may write in Ukrainian; a US client can tap
  // "Translate" on any of their messages to see it in English without
  // leaving the thread. Kept client-local (not persisted) since it's a
  // reading aid, not a change to the actual message record.
  const [translations, setTranslations] = useState<Record<string, string>>({})
  const [translating, setTranslating] = useState<Record<string, boolean>>({})
  // Client-side "Report" — counterpart to the chatter-side Report Issue
  // button in the CRM (see app/api/crm/report-issue/route.ts). Store
  // policies for apps with live person-to-person chat expect a reporting
  // path from both sides, not just the chatter's. Real, persisted (see
  // client_reports / createClientReport in lib/server/db.ts), lands in the
  // admin Overview tab — not a client-side-only toast that goes nowhere.
  const [reportOpen, setReportOpen] = useState(false)
  const [reportText, setReportText] = useState('')
  const [reportSending, setReportSending] = useState(false)
  const [reportSent, setReportSent] = useState(false)
  const [reportError, setReportError] = useState<string | null>(null)
  // Photo attachments — client can send a real photo to the expert. Two-step
  // send (upload to Storage, then POST the message with the resulting URL)
  // via /api/messages/photo, same pattern the chatter-application photo
  // upload already used elsewhere in this app.
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [photoError, setPhotoError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const endRef = useRef<HTMLDivElement>(null)
  const billingInFlightRef = useRef(false)
  const seenIdsRef = useRef<Set<string>>(new Set())

  const effectiveUserId = userId ?? 'u1'

  // Real anti-fraud check + grant for the free trial (checkAndGrantFreeTrial
  // in lib/server/db.ts) — runs once on mount, before any countdown starts.
  // Replaces the old unconditional `useState(180)`: now the server decides,
  // based on this account's contact info AND this browser's device id,
  // whether a fresh 180 seconds is actually owed, or whether it's already
  // been used (by this account, or by this device under a different
  // account) and billing should start immediately instead.
  useEffect(() => {
    let cancelled = false
    fetch('/api/session/free-trial', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: getDeviceId() }),
    })
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        const granted = typeof d.freeSeconds === 'number' ? d.freeSeconds : 0
        if (granted > 0) { setFreeSecsLeft(granted); return }
        // The server burns the trial the moment a chat first opens, even if
        // the person left after 20 seconds. Resume whatever free time this
        // device still has left (saved below as the countdown runs), so
        // "3 free minutes" are really 3 minutes of use, not "3 minutes
        // unless you ever closed the chat early".
        let left = 0
        try { left = Number(localStorage.getItem(`sensora_free_left_${effectiveUserId}`)) || 0 } catch { /* storage blocked */ }
        setFreeSecsLeft(left > 0 && left <= 180 ? Math.floor(left) : 0)
      })
      .catch(() => { if (!cancelled) setFreeSecsLeft(0) }) // fail-closed: a network error here means billing starts right away, not a free 180s handed out blind
    return () => { cancelled = true }
  }, [])

  // countdown free minutes
  useEffect(() => {
    if (freeSecsLeft === null || freeSecsLeft <= 0) return
    const t = setInterval(() => {
      setFreeSecsLeft(s => Math.max(0, (s ?? 0) - 1))
    }, 1000)
    return () => clearInterval(t)
  }, [freeSecsLeft === null])

  // REAL FIX ("вікно купівлі хвилин має зʼявлятись після використання 3
  // безкоштовних хв"): the server burns the trial the moment this chat opens,
  // so "trial unavailable" alone doesn't mean the 3 minutes were actually
  // used. Mark this person as having really used them up only once the free
  // countdown has hit 0 here (or the server said none are owed). The
  // auto-popup in app/page.tsx requires this flag before it pitches packages.
  useEffect(() => {
    if (freeSecsLeft === null) return
    try {
      if (freeSecsLeft > 0) {
        // Remember how much free time is left, so leaving and coming back
        // continues the same countdown instead of losing it.
        localStorage.setItem(`sensora_free_left_${effectiveUserId}`, String(freeSecsLeft))
      } else {
        localStorage.removeItem(`sensora_free_left_${effectiveUserId}`)
        localStorage.setItem(`sensora_free_used_${effectiveUserId}`, '1')
      }
    } catch { /* storage blocked */ }
  }, [freeSecsLeft, effectiveUserId])

  // Browser-level connectivity signal — fires immediately on OS-detected
  // network loss/recovery, faster than waiting for a billing tick to fail.
  useEffect(() => {
    const handleOffline = () => {
      setConnectionLost(true)
      if (disconnectedSinceRef.current === null) disconnectedSinceRef.current = Date.now()
    }
    const handleOnline = () => {
      setConnectionLost(false)
      disconnectedSinceRef.current = null
    }
    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  // Real close-out when balance can no longer sustain the session (see the
  // comment on sessionEndedByLowBalance above). Mirrors handleEnd /
  // the disconnect-timeout close below: marks the conversation complete
  // server-side so the chatter's CRM also sees it as ended, not stuck
  // "active" forever, then flips this screen to the dedicated end state —
  // which has no message input, so nothing can be sent after this point.
  const endSessionForLowBalance = () => {
    setSessionEndedByLowBalance(true)
    fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', userId: effectiveUserId, expertId: expert.id }),
    }).catch(() => {})
  }

  // Server-authoritative billing: once free minutes run out, every second we
  // call /api/session/charge, which looks up this expert's real per-minute
  // rate itself (from the same catalog the UI reads, never from what this
  // client sends) and debits the persisted wallet balance — the client only
  // displays whatever balance the server returns. Sending expertId instead
  // of a pre-computed amount closes a real gap where a modified client
  // could previously send any number it wanted. The server also now records
  // which expert profile the charge was earned on, which is what makes real
  // chatter earnings/KPI/bonuses computable at all.
  useEffect(() => {
    // BUG FIX (2026-09-08, your explicit ask): stop billing the instant the
    // 90-second no-reply close above fires, instead of letting this interval
    // keep running in the background — sessionEndedByNoReply is in the
    // dependency array below, so React tears down the old interval and this
    // effect body re-runs and hits this early return the moment that flag
    // flips true, rather than only stopping once freeSecsLeft itself changes
    // (which it never would on its own here).
    // Added `!paidConfirmed`: see the paidConfirmed comment above — billing
    // must never advance until the person has explicitly tapped "Continue"
    // on the paid-session confirmation screen below.
    if (freeSecsLeft === null || freeSecsLeft > 0 || sessionEndedByNoReply || sessionEndedByExpert || !paidConfirmed) return
    const t = setInterval(async () => {
      if (billingInFlightRef.current) return
      billingInFlightRef.current = true
      try {
        const res = await fetch('/api/session/charge', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: effectiveUserId, userName, expertId: expert.id }),
        })
        const data = await res.json()
        if (res.ok) {
          onBalanceChange(data.balance)
          // A successful round-trip means the server was reachable —
          // resume/clear any disconnect state this tick may have inherited.
          setConnectionLost(false)
          disconnectedSinceRef.current = null
          // BUG FIX (code audit, 2026-08-28): this used to force-end the
          // session the instant `data.balance < 1` — a flat "$1" threshold
          // that assumed the old fixed $2/min rate ($0.033/sec, so "$1 left"
          // really did mean "about to run out"). Chatter prices are now
          // admin-set per profile and can legitimately go as low as their
          // tier floor (~$0.14/min, updateExpertPricePerMin) — for a chatter
          // that cheap, "$1 left" is still ~7 real paid-for minutes, and this
          // was cutting sessions off early, before the client's money was
          // actually spent. The real "can this session still afford another
          // second" check already exists correctly below (the 402 branch —
          // wallet_adjust_balance enforces the true zero floor server-side,
          // scaled to this expert's real rate) — no separate client-guessed
          // threshold is needed at all.
        } else if (res.status === 402) {
          // Server now actually enforces a zero floor (see
          // wallet_adjust_balance / chargeForSession) instead of silently
          // allowing an overdraft — this used to fall through here with no
          // handling at all, meaning the tick would just keep retrying and
          // failing once a second forever. Same real end as above.
          if (typeof data.balance === 'number') onBalanceChange(data.balance)
          clearInterval(t)
          endSessionForLowBalance()
        } else if (res.status === 409 && data?.code === 'SESSION_ENDED') {
          clearInterval(t)
          setSessionEndedByExpert(true)
        } else if (res.status === 409) {
          // See sessionEndedByProfileUnavailable above — same shape as the
          // 402 branch, just a different real cause and end screen. Nothing
          // was charged for this tick (the server checks assignment before
          // touching the wallet).
          clearInterval(t)
          setSessionEndedByProfileUnavailable(true)
        }
      } catch {
        // Real network failure (offline, DNS, server unreachable) — the
        // fetch never completed, so nothing was charged this tick. This IS
        // the "pause" half of pause/resume/timeout: billing simply doesn't
        // advance while disconnected, instead of the old behavior (no catch
        // existed at all here — a network error was an unhandled promise
        // rejection every single second, logged as noise, with no visible
        // state change and no plan for what happens if it never comes back).
        setConnectionLost(true)
        if (disconnectedSinceRef.current === null) disconnectedSinceRef.current = Date.now()
        if (Date.now() - disconnectedSinceRef.current > DISCONNECT_TIMEOUT_MS) {
          // Timeout half: stop trying and actually close the conversation
          // server-side, rather than leaving it "active" forever on the
          // chatter's side while the client is long gone. No extra charge
          // happens here or ever did during the disconnected window, since
          // every tick that failed to reach the server also failed to bill.
          clearInterval(t)
          setSessionEndedByDisconnect(true)
          fetch('/api/conversations', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'complete', userId: effectiveUserId, expertId: expert.id }),
          }).catch(() => {})
        }
      } finally {
        billingInFlightRef.current = false
      }
    }, 1000)
    return () => clearInterval(t)
  }, [freeSecsLeft, effectiveUserId, userName, expert.id, sessionEndedByNoReply, sessionEndedByExpert, paidConfirmed])

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  // Real conversation start: creates (or reactivates) the row in Postgres and
  // gives us back its real id, which every message below is threaded onto.
  // This is the ONLY place a conversation row is created — the Chatroom tab
  // reads it back for real, and it's also what the assigned chatter's CRM
  // Live Chat tab reads from the other side.
  useEffect(() => {
    let cancelled = false
    fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start',
        userId: effectiveUserId,
        expert: { id: expert.id, name: expert.name, avatar: expert.avatar, specialty: expert.specialty[0] },
        text: `Hi! I'm ${expert.name.split(' ')[0]}. Tell me what's on your mind?`,
      }),
    })
      .then(r => r.json())
      .then(d => { if (!cancelled && d.conversation?.id) setConversationId(d.conversation.id) })
      .catch(() => {})
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expert.id])

  // Real message thread — no scripted auto-replies. This polls the same
  // /api/messages endpoint the chatter CRM's Live Chat tab uses, so a reply
  // typed there by a real human operator shows up here within one tick.
  // There is no fake "typing..." simulation anymore: if nobody has replied
  // yet, nothing new appears, honestly, instead of a canned response firing
  // on a timer regardless of whether a real person is even online.
  useEffect(() => {
    if (!conversationId) return
    let stopped = false
    const poll = async () => {
      try {
        const res = await fetch(`/api/messages?conversationId=${encodeURIComponent(conversationId)}`)
        const data = await res.json()
        if (stopped || !res.ok) return
        if (data.ended) { setSessionEndedByExpert(true); return }
        const fresh = (data.messages ?? []).filter((m: any) => !seenIdsRef.current.has(m.id))
        if (fresh.length === 0) return
        fresh.forEach((m: any) => seenIdsRef.current.add(m.id))
        setMessages(prev => [
          ...prev,
          ...fresh.map((m: any): Message => ({
            id: m.id,
            from: m.senderRole === 'client' ? 'user' : 'expert',
            text: m.text,
            time: m.createdAt,
            imageUrl: m.imageUrl ?? null,
          })),
        ])
      } catch {
        // Transient network error — the next poll tick just tries again.
      }
    }
    poll()
    const t = setInterval(poll, POLL_MS)
    return () => { stopped = true; clearInterval(t) }
  }, [conversationId])

  // Starts (or restarts) the 90-second silence timer whenever the LAST
  // message in the thread is the client's own — i.e. the client is waiting
  // on a reply. Clears itself the instant any expert message shows up (the
  // poll effect above appends it to `messages`, which re-runs this effect).
  // Already-ended sessions don't need a guard here: once
  // sessionEndedByNoReply/Disconnect/LowBalance/ProfileUnavailable is true,
  // the component renders one of the dedicated end screens below instead of
  // the chat UI, so there's no more way to send a message that would ever
  // restart this timer again.
  useEffect(() => {
    if (noReplyTimeoutRef.current) {
      clearTimeout(noReplyTimeoutRef.current)
      noReplyTimeoutRef.current = null
    }
    const last = messages[messages.length - 1]
    if (!last || last.from !== 'user') return
    noReplyTimeoutRef.current = setTimeout(() => {
      setSessionEndedByNoReply(true)
      fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'complete', userId: effectiveUserId, expertId: expert.id }),
      }).catch(() => {})
    }, NO_REPLY_TIMEOUT_MS)
    return () => {
      if (noReplyTimeoutRef.current) clearTimeout(noReplyTimeoutRef.current)
    }
  }, [messages, effectiveUserId, expert.id])

  // BUG FIX (reported: "повідомлення дуже швидко відправляється і нема
  // ніякої анімації і туго відправляється" — feels stiff/sluggish to send,
  // no animation): this used to have no optimistic update at all — the
  // bubble only appeared, and the input only cleared, after the full
  // fetch/await round-trip resolved. On any real network latency that's a
  // dead pause with zero feedback between tapping send and anything
  // happening on screen, which reads as "stiff." Now a local placeholder
  // bubble is appended immediately (temp id, pending:true) so it plays the
  // sensora-message-in pop-in animation right away and the input clears
  // instantly, same as every chat app people are used to. It's reconciled
  // with the real server message (real id/timestamp) on success, or rolled
  // back — bubble removed, typed text restored — on failure, same as the
  // old error path.
  const sendMessage = async () => {
    if (!input.trim() || !conversationId) return
    const text = input
    setInput('')
    setSendError(null)

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).slice(2)}`
    setMessages(prev => [...prev, { id: tempId, from: 'user', text, time: '', pending: true }])

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, senderRole: 'client', senderId: effectiveUserId, text }),
      })
      const data = await res.json()
      if (res.ok && data.message) {
        seenIdsRef.current.add(data.message.id)
        setMessages(prev => prev.map(m =>
          m.id === tempId
            ? { id: data.message.id, from: 'user', text: data.message.text, time: data.message.createdAt }
            : m
        ))
      } else {
        // Blocked (e.g. contact info) or another server-side rejection —
        // drop the optimistic bubble and restore what was typed so nothing
        // is lost.
        setMessages(prev => prev.filter(m => m.id !== tempId))
        setInput(text)
        setSendError(data?.error ?? t('liveChat.messageCouldNotBeSent'))
      }
    } catch {
      setMessages(prev => prev.filter(m => m.id !== tempId))
      setInput(text)
      setSendError(t('common.networkError'))
    }
  }

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024
  const ALLOWED_PHOTO_TYPES = ['image/png', 'image/jpeg', 'image/webp']

  const sendPhoto = async (file: File) => {
    if (!conversationId) return
    setPhotoError(null)
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setPhotoError(t('liveChat.photoMustBeImage'))
      return
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(t('liveChat.photoMustBeUnder5mb'))
      return
    }
    setUploadingPhoto(true)
    try {
      const form = new FormData()
      form.append('photo', file)
      form.append('conversationId', conversationId)
      const uploadRes = await fetch('/api/messages/photo', { method: 'POST', body: form })
      const uploadData = await uploadRes.json()
      if (!uploadRes.ok || !uploadData.url) {
        setPhotoError(uploadData?.error ?? t('liveChat.couldNotUploadPhoto'))
        return
      }
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, senderRole: 'client', senderId: effectiveUserId, text: '', imageUrl: uploadData.url }),
      })
      const data = await res.json()
      if (res.ok && data.message && !seenIdsRef.current.has(data.message.id)) {
        seenIdsRef.current.add(data.message.id)
        setMessages(prev => [...prev, { id: data.message.id, from: 'user', text: data.message.text, time: data.message.createdAt, imageUrl: data.message.imageUrl }])
      } else if (!res.ok) {
        setPhotoError(data?.error ?? t('liveChat.photoCouldNotBeSent'))
      }
    } catch {
      setPhotoError(t('common.networkError'))
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Real native picker (not a cosmetic touch — this is a genuinely better
  // experience on the actual native app than the plain web file input:
  // CameraSource.Prompt shows the real OS "Camera / Photo Library" action
  // sheet, same as any native photo-upload flow). Falls back to the hidden
  // <input type="file"> both when running as a plain website (where
  // Capacitor.isNativePlatform() is false) and, defensively, if the native
  // Camera plugin throws for any reason other than the user just cancelling
  // — better a working fallback than a dead attach button.
  const pickPhoto = async () => {
    const isNative = (() => {
      try { return Capacitor.isNativePlatform() } catch { return false }
    })()

    if (!isNative) {
      fileInputRef.current?.click()
      return
    }

    try {
      const photo = await Camera.getPhoto({
        resultType: CameraResultType.Uri,
        source: CameraSource.Prompt,
        quality: 85,
        allowEditing: false,
      })
      if (!photo.webPath) return
      const blob = await (await fetch(photo.webPath)).blob()
      const ext = photo.format || 'jpg'
      const file = new File([blob], `photo.${ext}`, { type: blob.type || `image/${ext}` })
      await sendPhoto(file)
    } catch (err: any) {
      // User cancelling the native picker throws too (e.g. "User cancelled
      // photos app") — that's not a real error, don't show an error banner
      // for it. Anything else falls back to the web file input so the
      // button still works.
      const message = String(err?.message || err || '')
      if (/cancel/i.test(message)) return
      fileInputRef.current?.click()
    }
  }

  const translateMessage = async (msg: Message) => {
    if (translations[msg.id] || translating[msg.id]) return
    setTranslating(prev => ({ ...prev, [msg.id]: true }))
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: msg.text, target: 'en' }),
      })
      const data = await res.json()
      if (res.ok && data.translated) {
        setTranslations(prev => ({ ...prev, [msg.id]: data.translated }))
      }
    } catch {
      // Best-effort reading aid — if it fails, the original text is still there.
    } finally {
      setTranslating(prev => ({ ...prev, [msg.id]: false }))
    }
  }

  const handleEnd = () => {
    fetch('/api/conversations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'complete', userId: effectiveUserId, expertId: expert.id }),
    }).catch(() => {})
    onEnd(expert)
  }

  const submitReport = async () => {
    if (!conversationId || !reportText.trim() || reportSending) return
    setReportSending(true)
    setReportError(null)
    try {
      const res = await fetch('/api/live-chat/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, reason: reportText.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setReportSent(true)
        setReportText('')
      } else {
        setReportError(data?.error ?? t('liveChat.couldNotSendReport'))
      }
    } catch {
      setReportError(t('common.networkError'))
    } finally {
      setReportSending(false)
    }
  }

  // REAL FEATURE CHANGED ("в чаті замість відліку грошей щоб були і
  // показувались тільки хвилини всюди"): this used to show a raw dollar
  // balance ("Balance: $4.20") once the free trial ran out — now it shows
  // the same MM:SS countdown style as the free-trial timer above it, just
  // converted from the real dollar balance using this expert's real
  // per-minute rate. The underlying billing (the setInterval charge tick
  // below) is untouched — it still charges real dollars server-side; only
  // what's DISPLAYED changed to minutes.
  const rate = expert.pricePerMin ?? 2.00
  const balanceSecsLeft = Math.max(0, Math.floor((balance / rate) * 60))
  const freeLabel = freeSecsLeft === null
    ? t('liveChat.checkingFreeTrial')
    : freeSecsLeft > 0
      ? t('liveChat.freeTime', { time: `${Math.floor(freeSecsLeft/60)}:${(freeSecsLeft%60).toString().padStart(2,'0')}` })
      : t('liveChat.timeLeft', { time: `${Math.floor(balanceSecsLeft/60)}:${(balanceSecsLeft%60).toString().padStart(2,'0')}` })

  // Real low-balance close (see endSessionForLowBalance and the comment on
  // sessionEndedByLowBalance above) — this used to be a dismissible banner
  // that left the chat fully open with no billing behind it; now it's a
  // real end screen, same pattern as the disconnect close just below, with
  // no message input rendered anywhere in this branch, so there is no way
  // to send another message once the session has actually ended this way.
  if (sessionEndedByLowBalance) {
    return (
      <div className="flex flex-col h-full sensora-bg items-center justify-center px-8 text-center gap-3">
        <span className="text-3xl">⚠️</span>
        <p className="text-[var(--text-primary)] text-sm font-medium">{t('liveChat.lowBalanceTitle')}</p>
        <p className="text-[var(--text-dim)] text-xs">
          {t('liveChat.lowBalanceBody')}
        </p>
        <button onClick={onTopup}
          className="mt-2 text-xs px-4 py-2.5 rounded-xl font-medium text-white"
          style={{ background:'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {t('liveChat.topUp')}
        </button>
        <button onClick={() => onEnd(expert)}
          className="text-xs px-4 py-2 rounded-xl font-medium"
          style={{ color: 'var(--text-dim)' }}>
          {t('liveChat.back')}
        </button>
      </div>
    )
  }

  // Real "no chatter assigned" close (see sessionEndedByProfileUnavailable
  // above) — the client was never charged for this, so there's no "top up"
  // action here, just a clear explanation and a way back to pick someone
  // else who's actually available right now.
  if (sessionEndedByProfileUnavailable) {
    return (
      <div className="flex flex-col h-full sensora-bg items-center justify-center px-8 text-center gap-3">
        <span className="text-3xl">💤</span>
        <p className="text-[var(--text-primary)] text-sm font-medium">{t('liveChat.profileUnavailableTitle')}</p>
        <p className="text-[var(--text-dim)] text-xs">
          {t('liveChat.profileUnavailableBody')}
        </p>
        <button onClick={() => onEnd(expert)}
          className="mt-2 text-xs px-4 py-2.5 rounded-xl font-medium text-white"
          style={{ background:'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {t('liveChat.back')}
        </button>
      </div>
    )
  }

  // Real disconnect close (see the billing effect above) — not the same
  // screen as a normal "End" tap, so the client understands what happened
  // instead of the chat just silently freezing.
  if (sessionEndedByDisconnect) {
    return (
      <div className="flex flex-col h-full sensora-bg items-center justify-center px-8 text-center gap-3">
        <span className="text-3xl">📡</span>
        <p className="text-[var(--text-primary)] text-sm font-medium">{t('liveChat.disconnectTitle')}</p>
        <p className="text-[var(--text-dim)] text-xs">
          {t('liveChat.disconnectBody', { seconds: Math.round(DISCONNECT_TIMEOUT_MS / 1000) })}
        </p>
        <button onClick={() => onEnd(expert)}
          className="mt-2 text-xs px-4 py-2.5 rounded-xl font-medium text-white"
          style={{ background:'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {t('liveChat.back')}
        </button>
      </div>
    )
  }

  // Real "no reply from the chatter" close (see sessionEndedByNoReply
  // above, and the 90-second timer effect near the messages poll) — your
  // explicit ask (2026-09-08 voice note): a client shouldn't keep getting
  // billed while waiting on a reply that never comes. Copy is deliberately
  // vague about the cause (connection issue is offered as an example, not
  // asserted as fact) since there's no real way to know from here whether
  // the chatter is offline, has a bad connection, or is just mid-typing.
  if (sessionEndedByNoReply) {
    return (
      <div className="flex flex-col h-full sensora-bg items-center justify-center px-8 text-center gap-3">
        <span className="text-3xl">💬</span>
        <p className="text-[var(--text-primary)] text-sm font-medium">{t('liveChat.noReplyTitle')}</p>
        <p className="text-[var(--text-dim)] text-xs">
          {t('liveChat.noReplyBody', { name: expert.name.split(' ')[0] })}
        </p>
        <button onClick={() => onEnd(expert)}
          className="mt-2 text-xs px-4 py-2.5 rounded-xl font-medium text-white"
          style={{ background:'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {t('liveChat.back')}
        </button>
      </div>
    )
  }

  // The chatter ended the session from their CRM — no input, no more billing.
  if (sessionEndedByExpert) {
    return (
      <div className="flex flex-col h-full sensora-bg items-center justify-center px-8 text-center gap-3">
        <span className="text-3xl">✨</span>
        <p className="text-[var(--text-primary)] text-sm font-medium">{t('liveChat.endedByExpertTitle')}</p>
        <p className="text-[var(--text-dim)] text-xs">
          {t('liveChat.endedByExpertBody', { name: expert.name.split(' ')[0] })}
        </p>
        <button onClick={() => onEnd(expert)}
          className="mt-2 text-xs px-4 py-2.5 rounded-xl font-medium text-white"
          style={{ background:'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {t('liveChat.back')}
        </button>
      </div>
    )
  }

  // Real paid-session confirmation gate — see the paidConfirmed comment near
  // its declaration above. Shown exactly once, the moment the free countdown
  // reaches 0, and blocks the billing effect until the person taps
  // "Continue". Declining costs nothing: no billing tick has run yet at this
  // point, so handleEnd() here closes the same way the "Back" buttons on the
  // other end-state screens do, with no charge.
  const needsPaidConfirm = freeSecsLeft === 0 && !paidConfirmed
    && !sessionEndedByLowBalance && !sessionEndedByProfileUnavailable
    && !sessionEndedByDisconnect && !sessionEndedByNoReply
  if (needsPaidConfirm) {
    const minutesAvailable = Math.max(0, Math.floor(balance / rate))
    return (
      <div className="flex flex-col h-full sensora-bg items-center justify-center px-8 text-center gap-3">
        <span className="text-3xl">⏱️</span>
        <p className="text-[var(--text-primary)] text-sm font-medium">{t('liveChat.freeTimeUpTitle')}</p>
        <p className="text-[var(--text-dim)] text-xs">
          {t('liveChat.freeTimeUpBody', { name: expert.name.split(' ')[0], minutes: String(minutesAvailable) })}
        </p>
        <button onClick={() => setPaidConfirmed(true)}
          className="mt-2 text-xs px-4 py-2.5 rounded-xl font-medium text-white"
          style={{ background:'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {t('liveChat.continueMinutes', { minutes: String(minutesAvailable) })}
        </button>
        <button onClick={handleEnd}
          className="text-xs px-4 py-2 rounded-xl font-medium"
          style={{ color: 'var(--text-dim)' }}>
          {t('liveChat.endChat')}
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full sensora-bg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ background:'var(--bg-deep)', borderBottom:'1px solid var(--surface-1)' }}>
        <div className="flex items-center gap-2.5">
          <button onClick={() => onNavigate('expert')} className="mr-1" aria-label={t('liveChat.back')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <AvatarBubble initials={expert.avatar} size={36} online photoUrl={expert.avatarUrl} />
          <div>
            <p className="text-[var(--text-primary)] text-sm font-medium">{expert.name}</p>
            <p className="text-[var(--text-dim)] text-xs">{expert.specialty[0]}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setReportOpen(v => !v)} aria-label={t('liveChat.reportThisExpert')}
            className="text-xs px-2.5 py-1.5 rounded-full font-medium"
            style={{ background: reportOpen ? 'rgba(239,68,68,0.15)' : 'var(--surface-1)', color: reportOpen ? '#EF4444' : 'var(--text-dim)', border: '1px solid rgba(239,68,68,0.25)' }}>
            ⚑
          </button>
          <button onClick={handleEnd}
            className="text-xs px-3 py-1.5 rounded-full font-medium"
            style={{ background:'rgba(239,68,68,0.15)', color:'#EF4444', border:'1px solid rgba(239,68,68,0.3)' }}>
            {t('liveChat.end')}
          </button>
        </div>
      </div>

      {/* Report this expert — client-side counterpart to the chatter CRM's
          Report Issue panel, same inline toggle pattern (see
          app/crm/chatter/page.tsx). Disabled until the conversation has
          actually started (conversationId set), since a report needs a
          real conversation row to attach to. */}
      {reportOpen && (
        <div className="px-4 py-2.5 flex-shrink-0" style={{ borderBottom: '1px solid var(--surface-1)', background: 'var(--surface-0)' }}>
          {reportSent ? (
            <p className="text-[#22C55E] text-[11px]">{t('liveChat.reportSent')}</p>
          ) : (
            <div className="flex items-center gap-2">
              <input value={reportText} onChange={e => { setReportText(e.target.value); setReportError(null) }}
                placeholder={t('liveChat.reportPlaceholder')}
                disabled={!conversationId}
                className="flex-1 px-3 py-1.5 rounded-lg text-xs text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none disabled:opacity-50"
                style={{ background: 'var(--surface-1)' }} />
              <button onClick={submitReport} disabled={reportSending || !reportText.trim() || !conversationId}
                className="text-[11px] px-3 py-1.5 rounded-lg font-medium text-white disabled:opacity-50 flex-shrink-0"
                style={{ background: '#EF4444' }}>
                {reportSending ? t('liveChat.sending') : t('liveChat.send')}
              </button>
            </div>
          )}
          {reportError && <p className="text-[#EF4444] text-[10px] mt-1">{reportError}</p>}
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between px-4 py-2 flex-shrink-0"
        style={{ background: (freeSecsLeft ?? 0) > 0 ? 'rgba(34,197,94,0.1)' : 'rgba(245,197,66,0.08)', borderBottom: `1px solid ${(freeSecsLeft ?? 0) > 0 ? 'rgba(34,197,94,0.2)' : 'rgba(245,197,66,0.15)'}` }}>
        <span className="text-xs font-medium" style={{ color: (freeSecsLeft ?? 0) > 0 ? '#22C55E' : '#F5C542' }}>
          {freeLabel}
        </span>
      </div>

      {/* Connection lost — pause/resume/timeout on disconnect (real TZ doc
          requirement). Shown while a billing tick can't reach the server;
          clears itself automatically the moment a tick succeeds again. */}
      {connectionLost && (
        <div className="mx-4 mt-2 p-3 rounded-2xl flex items-center gap-3"
          style={{ background:'rgba(245,197,66,0.1)', border:'1px solid rgba(245,197,66,0.25)' }}>
          <span className="text-lg">📡</span>
          <div className="flex-1">
            <p className="text-[#F5C542] text-xs font-medium">{t('liveChat.reconnecting')}</p>
            <p className="text-[var(--text-muted)] text-[11px]">{t('liveChat.billingPaused')}</p>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {/* BUG FIX: messages had no send/receive animation — popped in
            instantly. sensora-message-in (globals.css) plays once per real
            message via React's key-based reconciliation (see its comment
            there), not on every re-render. */}
        {messages.map(msg => (
          <div key={msg.id} className={`flex ${msg.from === 'user' ? 'justify-end' : 'justify-start'} gap-2 sensora-message-in`}>
            {msg.from === 'expert' && (
              <AvatarBubble initials={expert.avatar} size={28} photoUrl={expert.avatarUrl} />
            )}
            <div className="max-w-[76%]" style={{ opacity: msg.pending ? 0.6 : 1, transition: 'opacity 0.2s' }}>
              <div className="px-3.5 py-2.5 text-xs leading-relaxed text-[var(--text-primary)]"
                style={{
                  background: msg.from === 'user' ? 'linear-gradient(135deg,#D946EF,#9D5FF5)' : 'var(--surface-1)',
                  borderRadius: msg.from === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                }}>
                {msg.imageUrl && (
                  <a href={msg.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img src={msg.imageUrl} alt={t('liveChat.attachedPhotoAlt')}
                      className="rounded-lg max-w-full mb-1.5"
                      style={{ maxHeight: 220, display: 'block' }} />
                  </a>
                )}
                {msg.text}
                {translations[msg.id] && (
                  <div className="mt-1.5 pt-1.5 text-[var(--text-dim)]" style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
                    {translations[msg.id]}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5 px-1">
                {/* Pending optimistic bubble shows "Sending…" in place of a
                    real server timestamp it doesn't have yet. */}
                <p className="text-[var(--text-dim)] text-[9px]">{msg.pending ? t('liveChat.sendingBubble') : msg.time}</p>
                {msg.from === 'expert' && !translations[msg.id] && (
                  <button onClick={() => translateMessage(msg)} disabled={translating[msg.id]}
                    className="text-[9px] underline" style={{ color: 'var(--text-dim)' }}>
                    {translating[msg.id] ? t('liveChat.translating') : t('liveChat.translate')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Blocked / send error */}
      {sendError && (
        <div className="mx-4 mb-2 px-3.5 py-2.5 rounded-xl text-[11px] leading-relaxed flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}>
          {sendError}
        </div>
      )}
      {photoError && (
        <div className="mx-4 mb-2 px-3.5 py-2.5 rounded-xl text-[11px] leading-relaxed flex-shrink-0"
          style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', color: '#EF4444' }}>
          {photoError}
        </div>
      )}

      {/* Input */}
      {/* FIX (2026-09-10, native-readiness audit): this is the bottom-most
          bar on screen, same as bottom-nav.tsx which already handles the
          iPhone home-indicator safe area — this one didn't, so on a notched
          device the message input sat flush against (or under) the home
          indicator. */}
      <div className="flex items-center gap-2 px-3 py-3 flex-shrink-0"
        style={{ background:'var(--bg-deep)', borderTop:'1px solid var(--surface-1)', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) sendPhoto(f); e.target.value = '' }} />
        <button onClick={pickPhoto} disabled={uploadingPhoto || !conversationId}
          aria-label={t('liveChat.attachPhoto')}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform disabled:opacity-50"
          style={{ background: 'var(--surface-1)' }}>
          {uploadingPhoto ? (
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
        <input value={input} onChange={e => { setInput(e.target.value); setSendError(null) }}
          onKeyDown={e => { if (e.key==='Enter' && !e.nativeEvent.isComposing) sendMessage() }}
          placeholder={t('liveChat.messagePlaceholder')}
          className="flex-1 px-3.5 py-2.5 rounded-2xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none"
          style={{ background:'var(--surface-1)' }} />
        <button onClick={sendMessage} aria-label={t('liveChat.sendMessage')}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 active:scale-90 transition-transform"
          style={{ background: input.trim() ? 'linear-gradient(135deg,#7C3AED,#D946EF)' : 'rgba(124,58,237,0.25)' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}