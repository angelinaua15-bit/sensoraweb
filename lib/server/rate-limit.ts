// FILE PATH: lib/server/rate-limit.ts
// Brute-force guard for the password login routes. In-memory per serverless
// instance (no extra service needed) — it slows password guessing down a lot,
// but it is best-effort: separate Vercel instances keep separate counters.
import type { NextRequest } from 'next/server'

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 8

const failures = new Map<string, { count: number; resetAt: number }>()

export function loginKey(req: NextRequest, identifier: string): string {
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown'
  return `${ip}|${identifier.trim().toLowerCase()}`
}

/** Returns seconds to wait if this key is currently blocked, else 0. */
export function blockedFor(key: string): number {
  const entry = failures.get(key)
  if (!entry) return 0
  if (entry.resetAt <= Date.now()) {
    failures.delete(key)
    return 0
  }
  return entry.count >= MAX_FAILURES ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 0
}

export function recordFailure(key: string): void {
  const now = Date.now()
  if (failures.size > 5000) {
    for (const [k, v] of failures) if (v.resetAt <= now) failures.delete(k)
  }
  const entry = failures.get(key)
  if (!entry || entry.resetAt <= now) failures.set(key, { count: 1, resetAt: now + WINDOW_MS })
  else entry.count += 1
}

export function clearFailures(key: string): void {
  failures.delete(key)
}
