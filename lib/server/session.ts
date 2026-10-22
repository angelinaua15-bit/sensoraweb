// FILE PATH: lib/server/session.ts
// Signed, tamper-evident tokens for two things that were previously wide
// open:
//   1. Staff login sessions for /crm/admin and /crm/chatter — those pages
//      (and every /api/admin/* and /api/crm/* route behind them) used to be
//      reachable by anyone who knew the URL, with a `?operatorId=` query
//      param anyone could edit to view a *different* chatter's clients/KPI.
//   2. Short-lived "open my dashboard" links for regular clients
//      (/crm/client) — that used to be a plain `?userId=` in the URL, which
//      is guessable/shareable indefinitely.
//
// Built on Node's built-in `crypto` only — this sandbox has no npm registry
// access to install `jsonwebtoken` or similar, so this is a minimal,
// hand-rolled equivalent: HMAC-SHA256 over a base64url JSON payload, same
// shape as a JWT, verified with a constant-time comparison.

import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'crypto'
import type { NextRequest } from 'next/server'

const SECRET = process.env.SENSORA_SESSION_SECRET

function requireSecret(): string {
  if (!SECRET) {
    throw new Error(
      'SENSORA_SESSION_SECRET is not set in .env.local — staff login and client-dashboard links cannot work without it. ' +
      'Generate one with `openssl rand -hex 32` (or ask for a fresh one) and add it before using /crm/*.'
    )
  }
  return SECRET
}

function sign(payload: string): string {
  return createHmac('sha256', requireSecret()).update(payload).digest('base64url')
}

function pack(payload: Record<string, unknown>): string {
  const json = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${json}.${sign(json)}`
}

function unpack<T>(token: string): T | null {
  const [json, sig] = token.split('.')
  if (!json || !sig) return null
  let expected: string
  try {
    expected = sign(json)
  } catch {
    return null
  }
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(json, 'base64url').toString('utf8'))
    if (typeof payload.exp === 'number' && payload.exp < Date.now()) return null
    return payload as T
  } catch {
    return null
  }
}

// ─── Password hashing — staff (admin/expert) and client accounts ───────────
// Client accounts (role='client') can now also set a password_hash at
// registration (see app/api/auth/register/route.ts) and log back in with it
// via app/api/auth/login/route.ts — OTP (setOtp/verifyOtp in lib/server/db.ts)
// still exists too, as the one-time verification step right after
// registering, but returning users no longer need a fresh code every time.

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const hash = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string | null | undefined): boolean {
  if (!stored) return false
  const [salt, hashHex] = stored.split(':')
  if (!salt || !hashHex) return false
  const hash = scryptSync(password, salt, 64)
  const storedBuf = Buffer.from(hashHex, 'hex')
  if (storedBuf.length !== hash.length) return false
  return timingSafeEqual(storedBuf, hash)
}

// ─── Staff session — the /crm/admin and /crm/chatter login cookie ──────────

export interface StaffSession {
  kind: 'staff'
  userId: string
  name: string
  role: 'admin' | 'expert'
  exp: number
}

const STAFF_SESSION_TTL_MS = 12 * 60 * 60 * 1000 // 12h

export function createStaffSessionToken(session: { userId: string; name: string; role: 'admin' | 'expert' }): string {
  return pack({ ...session, kind: 'staff', exp: Date.now() + STAFF_SESSION_TTL_MS })
}

export function verifyStaffSessionToken(token: string | undefined | null): StaffSession | null {
  if (!token) return null
  const payload = unpack<StaffSession>(token)
  if (!payload || payload.kind !== 'staff') return null
  return payload
}

export const STAFF_SESSION_COOKIE = 'sensora_staff_session'
export const STAFF_SESSION_MAX_AGE_SEC = STAFF_SESSION_TTL_MS / 1000

/**
 * The actual security boundary for every /api/admin/* and /api/crm/* route —
 * call this first, before touching any data, and bail on `null`. Use in
 * combination with `resolveOperatorId` below for chatter-scoped routes so a
 * non-admin can never read/write another operator's data by editing the URL.
 */
export function getStaffSessionFromRequest(req: NextRequest): StaffSession | null {
  return verifyStaffSessionToken(req.cookies.get(STAFF_SESSION_COOKIE)?.value)
}

/**
 * Chatter-scoped routes (crm/clients, crm/kpi, crm/bonuses, crm/payout-request)
 * used to trust a `?operatorId=` query param straight from the URL — any
 * chatter could view or edit another chatter's clients/KPI/payouts just by
 * changing it. Now: a session with role='expert' is always pinned to their
 * own userId, full stop. Only role='admin' may pass a different operatorId
 * (for oversight), and only if they explicitly do.
 */
export function resolveOperatorId(session: StaffSession, requestedOperatorId: string | null): string {
  if (session.role === 'admin' && requestedOperatorId) return requestedOperatorId
  return session.userId
}

// ─── Client session — every regular (role='client') API route ─────────────
// BUG FIX (code audit): every client-facing route (/api/wallet, /api/profile,
// /api/session/charge, /api/mood, /api/conversations, /api/messages, etc.)
// used to just trust a plain `userId` field sent straight in the request
// body/query — exactly the same hole the staff routes had before
// StaffSession existed (see the comment at the top of this file), except
// this one was never closed. Anyone who knew or guessed a real userId could
// read or change that person's data, or — worse — top up/spend their wallet,
// since nothing verified the caller actually *was* that user.
//
// This mirrors StaffSession exactly: a signed, httpOnly cookie set at every
// real login point (OTP verify, password login, OAuth) and checked by
// getClientSessionFromRequest() in every client-data route below. The
// client can still send `userId` in its request (most of the existing
// front-end code already does, harmlessly) — routes now use the session's
// userId as the actual source of truth and ignore/reject a mismatched body
// value, rather than trusting it outright.
//
// One real consequence of shipping this: anyone already "signed in" purely
// via the old sessionStorage-only flow (no cookie yet) will start getting
// 401s from these routes until they sign in again once. That's the correct,
// intended behavior for a real fix, not a bug — flagged here so it isn't
// mistaken for a regression when it's noticed after deploy.

export interface ClientSession {
  kind: 'client'
  userId: string
  exp: number
}

// PROPOSED DEFAULT: 30 days — long enough that a consumer shouldn't get
// logged out just for closing the app for a few days (unlike the 12h staff
// session, which protects a work tool people log into fresh each shift).
// Easy to change in one place if a shorter/longer window is wanted.
const CLIENT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000

export function createClientSessionToken(userId: string): string {
  return pack({ userId, kind: 'client', exp: Date.now() + CLIENT_SESSION_TTL_MS })
}

export function verifyClientSessionToken(token: string | undefined | null): ClientSession | null {
  if (!token) return null
  const payload = unpack<ClientSession>(token)
  if (!payload || payload.kind !== 'client') return null
  return payload
}

// REAL FIX (reported: "не запамʼятовує пристрій і щоразу треба знову входити"
// on the Android app): the 30-day httpOnly cookie above is the real session,
// but Android's WebView can drop it when the app is force-closed before the
// WebView flushed its cookie store to disk. This is a separate, longer-lived
// "restore" token the app keeps in its own localStorage (which does survive)
// and trades for a fresh session cookie via POST /api/auth/restore when the
// cookie is gone. It is deliberately a different `kind` than the session
// token, so it can NOT be used to call any API route directly — it only
// works at that one endpoint, which also re-checks the account still exists.
export interface ClientRestoreToken {
  kind: 'client_restore'
  userId: string
  exp: number
}

const CLIENT_RESTORE_TTL_MS = 90 * 24 * 60 * 60 * 1000

export function createClientRestoreToken(userId: string): string {
  return pack({ userId, kind: 'client_restore', exp: Date.now() + CLIENT_RESTORE_TTL_MS })
}

export function verifyClientRestoreToken(token: string | undefined | null): ClientRestoreToken | null {
  if (!token) return null
  const payload = unpack<ClientRestoreToken>(token)
  if (!payload || payload.kind !== 'client_restore') return null
  return payload
}

export const CLIENT_SESSION_COOKIE = 'sensora_client_session'
export const CLIENT_SESSION_MAX_AGE_SEC = CLIENT_SESSION_TTL_MS / 1000

/**
 * The actual security boundary for every client-facing API route (wallet,
 * profile, session/charge, mood, conversations, messages, friends, reviews,
 * etc.) — call this first and bail on `null` exactly like
 * getStaffSessionFromRequest is already used for /api/admin and /api/crm.
 */
export function getClientSessionFromRequest(req: NextRequest): ClientSession | null {
  return verifyClientSessionToken(req.cookies.get(CLIENT_SESSION_COOKIE)?.value)
}

// ─── Client dashboard token — the "Open web dashboard" link from Profile ───
// Minted fresh every time the link is tapped from an already-authenticated
// mobile session; never stored long-term, never shown anywhere but that one
// outbound link. Replaces a plain, indefinitely-reusable `?userId=`.

export interface ClientDashboardToken {
  kind: 'client_dashboard'
  userId: string
  exp: number
}

export const CLIENT_TOKEN_TTL_MS = 30 * 60 * 1000 // 30 minutes

export function createClientDashboardToken(userId: string): string {
  return pack({ userId, kind: 'client_dashboard', exp: Date.now() + CLIENT_TOKEN_TTL_MS })
}

export function verifyClientDashboardToken(token: string | undefined | null): ClientDashboardToken | null {
  if (!token) return null
  const payload = unpack<ClientDashboardToken>(token)
  if (!payload || payload.kind !== 'client_dashboard') return null
  return payload
}