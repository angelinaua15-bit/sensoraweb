'use client'

// FILE PATH: components/push-notifications-toggle.tsx
import { useEffect, useState, useCallback } from 'react'
import { useLanguage } from '@/components/language-provider'

interface Props {
  userId?: string | null
}

function urlBase64ToUint8Array(base64Url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4)
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

type Status = 'checking' | 'unsupported' | 'denied' | 'off' | 'on' | 'working'

// Real Web Push subscribe/unsubscribe UI — no fake "notifications enabled"
// toggle that doesn't do anything. Subscribing calls the browser's actual
// PushManager and saves the resulting subscription to Supabase via
// /api/push/subscribe; lib/server/push.ts can then send to it for real
// (daily horoscope, retrograde alerts, etc.) with no third-party push
// provider involved.
export default function PushNotificationsToggle({ userId }: Props) {
  const { t } = useLanguage()
  const [status, setStatus] = useState<Status>('checking')
  const [error, setError] = useState('')

  const refreshStatus = useCallback(async () => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }
    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }
    try {
      const reg = await navigator.serviceWorker.register('/sw.js')
      const existing = await reg.pushManager.getSubscription()
      setStatus(existing ? 'on' : 'off')
    } catch {
      setStatus('off')
    }
  }, [])

  useEffect(() => { refreshStatus() }, [refreshStatus])

  const subscribe = useCallback(async () => {
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      setError(t('push.notConfigured'))
      return
    }
    setStatus('working')
    setError('')
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setStatus(permission === 'denied' ? 'denied' : 'off')
        return
      }
      const reg = await navigator.serviceWorker.register('/sw.js')
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId ?? 'u1', subscription: subscription.toJSON() }),
      })
      setStatus('on')
    } catch (e: any) {
      setError(e?.message || 'Could not enable notifications')
      setStatus('off')
    }
  }, [userId])

  const unsubscribe = useCallback(async () => {
    setStatus('working')
    try {
      const reg = await navigator.serviceWorker.ready
      const subscription = await reg.pushManager.getSubscription()
      if (subscription) {
        const endpoint = subscription.endpoint
        await subscription.unsubscribe()
        await fetch(`/api/push/subscribe?endpoint=${encodeURIComponent(endpoint)}`, { method: 'DELETE' })
      }
      setStatus('off')
    } catch (e: any) {
      setError(e?.message || 'Could not disable notifications')
      setStatus('on')
    }
  }, [])

  if (status === 'unsupported') {
    return <p className="text-[var(--text-dim)] text-xs">{t('push.unsupported')}</p>
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[var(--text-primary)] text-sm">{t('push.title')}</p>
          <p className="text-[var(--text-dim)] text-[11px]">
            {status === 'on' && t('push.enabled')}
            {status === 'off' && t('push.off')}
            {status === 'denied' && t('push.blocked')}
            {status === 'checking' && t('push.checking')}
            {status === 'working' && t('push.working')}
          </p>
        </div>
        {status === 'denied' ? (
          <span className="text-[10px] text-[var(--text-dim)]">{t('push.changeInBrowser')}</span>
        ) : (
          <button
            onClick={status === 'on' ? unsubscribe : subscribe}
            disabled={status === 'working' || status === 'checking'}
            className="px-4 py-1.5 rounded-full text-xs font-semibold disabled:opacity-60"
            style={{
              background: status === 'on' ? 'var(--surface-2)' : 'linear-gradient(135deg,#7C3AED,#D946EF)',
              color: status === 'on' ? 'var(--text-muted)' : '#fff',
            }}
          >
            {status === 'on' ? t('push.turnOff') : t('push.turnOn')}
          </button>
        )}
      </div>
      {error && <p className="text-[#EF4444] text-[11px]">{error}</p>}
    </div>
  )
}