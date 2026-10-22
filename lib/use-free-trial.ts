'use client'

// FILE PATH: lib/use-free-trial.ts
// REAL FEATURE ADDED ("3 хв безкоштовні показувались у меню після
// реєстрації, та у меню де пакети з оплатами, та де старт... і щоб
// зникало після використання"): a small shared hook so the Today/home
// screen, the wallet/packages screen, and an expert's profile screen all
// ask the SAME read-only question the SAME way — "does this signed-in
// person still have their free 180-second trial?" — via the non-consuming
// GET /api/session/free-trial (see app/api/session/free-trial/route.ts).
// Returns null while loading (so callers can render nothing rather than a
// flash of "no trial"), then true/false. Once the person actually opens a
// chat and the trial gets spent (POST in live-chat-screen.tsx), the next
// time any of these screens mount this will correctly come back false —
// that's what makes the banners disappear after use, with no manual
// "mark as used" wiring needed on the client.
import { useEffect, useState } from 'react'
import { getDeviceId } from '@/lib/device-id'

export function useFreeTrialAvailable(userId: string | null): boolean | null {
  const [available, setAvailable] = useState<boolean | null>(null)

  useEffect(() => {
    if (!userId) { setAvailable(false); return }
    let cancelled = false
    fetch(`/api/session/free-trial?deviceId=${encodeURIComponent(getDeviceId())}`)
      .then(res => res.ok ? res.json() : { available: false })
      .then(data => { if (!cancelled) setAvailable(!!data.available) })
      .catch(() => { if (!cancelled) setAvailable(false) })
    return () => { cancelled = true }
  }, [userId])

  return available
}
