'use client'

// FILE PATH: components/crm/staff-gate.tsx
// Client-side login gate for /crm/admin and /crm/chatter — checks
// /api/staff/me on mount and only renders the dashboard once a valid
// session comes back, otherwise sends the person to /crm/login. This is a
// UX convenience only; the real security boundary is every /api/admin/* and
// /api/crm/* route independently re-checking the session cookie
// server-side (see lib/server/session.ts getStaffSessionFromRequest), so
// this gate being client-side doesn't weaken anything.
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export interface StaffMe {
  userId: string
  name: string
  role: 'admin' | 'expert'
}

interface Props {
  requireRole: 'admin' | 'expert'
  children: (me: StaffMe, logout: () => void) => React.ReactNode
}

export default function StaffGate({ requireRole, children }: Props) {
  const router = useRouter()
  const [me, setMe] = useState<StaffMe | null>(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch('/api/staff/me')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (cancelled) return
        if (!data || data.role !== requireRole) {
          router.replace('/crm/login')
          return
        }
        setMe(data)
      })
      .catch(() => { if (!cancelled) router.replace('/crm/login') })
      .finally(() => { if (!cancelled) setChecked(true) })
    return () => { cancelled = true }
  }, [requireRole, router])

  const logout = useCallback(() => {
    fetch('/api/staff/logout', { method: 'POST' }).finally(() => router.replace('/crm/login'))
  }, [router])

  if (!checked || !me) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg-void)' }}>
        <p className="text-[var(--text-dim)] text-sm">Checking session…</p>
      </div>
    )
  }

  return <>{children(me, logout)}</>
}