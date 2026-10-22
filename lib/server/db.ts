// FILE PATH: lib/server/db.ts
// Real persistence layer, backed by the Supabase Postgres project the app
// owner created for Sensora (see lib/server/supabase.ts for the low-level
// REST client and .env.local for the project credentials).
//
// This file used to read/write data/db.json directly. That was always a
// deliberately temporary stand-in — see the git history / earlier comment
// here — and this is the swap it was written to expect: every function
// below keeps the exact same name and shape it had before, so none of the
// API routes that call these functions needed to change their imports, only
// add `await` (these are now real network calls to Postgres, not synchronous
// file reads).
//
// Table names and columns match the SQL schema handed to the app owner in
// the "Sensora — Етап 1" plan document (Supabase SQL Editor). If a table is
// missing, every function below will throw a clear "Supabase request
// failed (404/42P01...)" error rather than silently falling back to fake
// data — that failure is the signal the schema still needs to be run.
import { sbSelect, sbInsert, sbUpdate, sbUpsert, sbDelete, sbRpc } from './supabase'
import { MINUTE_PACKAGES } from '@/lib/minute-packages'

// Thrown by chargeForSession when wallet_adjust_balance rejects a charge that
// would take the balance negative — a real, server-enforced spending limit
// that didn't exist before (previously the wallet could go negative with no
// check at all). Callers (the /api/session/charge route) catch this
// specifically to return a clean 402 instead of a generic 500.
export class InsufficientBalanceError extends Error {
  constructor() {
    super('Insufficient balance')
    this.name = 'InsufficientBalanceError'
  }
}

// REAL BUG FOUND (app↔CRM integration audit, 2026-09-03): chargeForSession
// never checked whether the expert profile being charged for actually had
// an active chatter assigned to it. reassignProfile (below) unassigns the
// outgoing chatter, THEN inserts the new assignment as a second, separate
// call — if that insert ever fails (network blip, validation error) after
// the unassign already committed, the profile is left with NO active
// assignment row, but nothing stopped a client from continuing to be
// charged for it: getExpertProfileById doesn't check assignment, and
// neither did this function. Money would keep leaving the client's wallet
// (real revenue, so not silently lost to the business), but
// computeChatterLifetimeEarned time-boxes every transaction against
// profile_assignments — so during that gap, NO chatter's payout balance
// would ever include those sessions. A chatter could work a shift on a
// profile that's actually in this broken state and simply never get paid
// for it, with nothing in the UI surfacing why.
//
// Fixed by failing closed at the one place all real billing goes through
// (chargeForSession, below) instead of trying to make reassignProfile's
// two-step unassign-then-insert atomic (which Supabase's REST layer can't
// do without a dedicated RPC/migration this repo doesn't have — see the
// comment on reassignProfile for why simply reordering those two calls
// would trade this bug for a worse one, real double-crediting on every
// single handover instead of only failed ones).
export class ProfileUnassignedError extends Error {
  constructor() {
    super('This expert is not currently available — no chatter is assigned to this profile right now.')
    this.name = 'ProfileUnassignedError'
  }
}

async function isProfileAssigned(profileId: string): Promise<boolean> {
  const rows = await sbSelect('profile_assignments', `select=id&profile_id=eq.${enc(profileId)}&unassigned_at=is.null&limit=1`)
  return rows.length > 0
}

// Thrown by createPayoutRequest when the atomic create_payout_request_atomic
// RPC rejects a request that exceeds what the chatter actually has available
// (earned minus already approved/pending). See the BUG FIX comment on
// createPayoutRequest for why this moved from a racy two-step JS check into
// a single locked Postgres transaction.
export class InsufficientPayoutBalanceError extends Error {
  constructor() {
    super('Insufficient payout balance')
    this.name = 'InsufficientPayoutBalanceError'
  }
}
import { geocodePlace } from './geocode'

export interface User {
  id: string
  name: string
  contact: string
  role: 'client' | 'expert' | 'admin'
  joined: string
  status: 'active' | 'suspended'
  birthDate?: string
  birthTime?: string
  birthPlace?: string
  latitude?: number
  longitude?: number
  utcOffsetHours?: number
  authProvider?: 'otp' | 'google' | 'apple'
  isPremium?: boolean
  premiumPlan?: 'trial' | '3mo' | 'year'
  premiumSince?: string
  relationshipStatus?: string
  loginStreak?: number
  lastLoginDate?: string
  inviteCode?: string
  privacyAcceptedAt?: string
  privacyPolicyVersion?: string
  bio?: string
}

export interface MoodEntry {
  id: string
  userId: string
  entryDate: string
  rating: number | null
  focusCareer: number | null
  focusLove: number | null
  focusHealth: number | null
  focusFamily: number | null
}

export interface PushSubscriptionRow {
  id: string
  userId: string
  endpoint: string
  p256dh: string
  auth: string
}

export interface Friend {
  id: string
  userId: string
  name: string
  zodiacSignId?: string
  birthDate?: string
  birthTime?: string
  birthPlace?: string
  createdAt: string
}

export interface Transaction {
  id: string
  userId: string
  userName: string
  type: 'topup' | 'session' | 'payout'
  amount: number
  status: 'completed' | 'pending' | 'failed'
  date: string
  // Raw ISO timestamp alongside the display-formatted `date` above. `date` is
  // run through fmtDate() (locale-formatted "Jul 20, 2026" style) and is not
  // safe to re-parse for grouping (same reasoning as ClientCard.lastSessionIso).
  // The Top Clients tab groups spend by real calendar month, so it needs this.
  createdAtIso: string
}

export interface PayoutRequest {
  id: string
  userId: string
  expertName: string
  amount: number
  method: string
  date: string
  status: 'pending' | 'approved' | 'rejected'
}

// Real top-up request (see createStripeTopupRequest / resolveTopupRequest
// below). This row is the honest record of "a client is paying this amount
// for this package" while it's unconfirmed, and becomes the real credited
// transaction once it's confirmed — normally automatically, the instant
// Stripe's checkout.session.completed webhook reports this exact session
// (matched by `externalRef`, not by guessing an amount — see
// app/api/webhooks/stripe/route.ts + lib/server/stripe.ts), with a manual
// admin confirm/reject in the CRM as the fallback for anything that needs a
// human look.
//
// `provider`/`externalRef` exist because this table used to be Wise-only
// (pay-by-link, no webhook, amount-based matching) before being replaced
// with Stripe (your call, 2026-08-28: "повністю замінити Wise"). Existing
// rows from that era keep provider='wise' and their old Wise pay-by-link in
// paymentLink for historical record — nothing about past transactions was
// rewritten, only new ones go through Stripe.
export interface TopupRequest {
  id: string
  userId: string
  userName: string
  packageId: string
  // Sticker price actually charged, in `currency`. Renamed from amountUsd
  // (2026-08-28, EUR switch) — existing Wise-era rows are real USD charges
  // (currency='usd' by column default, backfilled correctly), new Stripe
  // rows are EUR (currency='eur', set explicitly in createStripeTopupRequest
  // below). Never assume this is USD — always read alongside `currency`.
  amount: number
  currency: 'usd' | 'eur'
  minutes: number
  paymentLink: string
  provider: 'stripe' | 'wise'
  externalRef: string | null
  status: 'pending' | 'confirmed' | 'rejected'
  createdAt: string
  resolvedAt: string | null
  resolvedBy: string | null
}

export interface ClientCard {
  id: string
  operatorId: string
  // The real client account this card is about. crm_client_cards has no
  // separate user_id column of its own — the id is deterministically built
  // as `cc_{operatorId}_{clientUserId}` (see syncClientCard below), so this
  // is parsed back out of it rather than duplicated in a new column. Needed
  // by the Pings tab to actually message this specific client, not just
  // display their name.
  userId: string
  name: string
  avatar: string
  tag: 'new' | 'active' | 'vip' | 'at_risk' | 'churned'
  sessionsCount: number
  totalSpent: number
  lastSession: string
  // Raw ISO timestamp alongside the already-formatted `lastSession` display
  // string above — the Pings tab needs to compute "within the last 90 days"
  // for real, which isn't reliably reversible from the human-formatted
  // string once it's been through fmtDate().
  lastSessionIso: string | null
  notes: string
}

export interface KpiStat {
  key: string
  label: string
  value: string
  sub: string
  progress: number
}

export interface BonusEntry {
  id: string
  operatorId: string
  // 'streak_return' removed per the client's direct answer — bonuses should
  // be minutes-in-chat, night shifts, and KPI achievement, not "client came
  // back". Kept as a type option so any old rows already in bonus_accruals
  // (from before this change) still render instead of crashing on an unknown
  // type — but computeBonusAccruals below no longer creates new ones.
  type: 'streak_return' | 'night_shift' | 'chat_minutes' | 'kpi_quality'
  label: string
  amount: number
  date: string
  detail: string
}

export interface ProfileAssignment {
  id: string
  profileId: string
  profileName: string
  operatorId: string
  operatorName: string
  assignedAt: string
  unassignedAt: string | null
  reason: 'initial' | 'handover' | 'temporary_cover'
}

export interface Conversation {
  id: string
  userId: string
  expertId: string
  expertName: string
  avatar: string
  specialty: string
  lastMessage: string
  updatedAt: string
  updatedAtIso: string
  status: 'active' | 'completed'
  // Nebula-style chatter CRM features (real ТЗ request: "зроби і нам таке як
  // у небули") — all four below are genuinely persisted and enforced, not
  // decorative UI:
  // activatedAtIso: when the CURRENT live window started (set fresh every
  // time a conversation transitions to 'active', including reactivation) —
  // powers the live per-conversation timer + real-time earnings.
  activatedAtIso: string | null
  // lastSenderRole: who sent the most recent message — 'client' means this
  // conversation is genuinely waiting on the chatter to reply, which is what
  // the Live Chat tab's "Queue" count is built from (a real, defensible
  // metric — NOT a full multi-chatter matching/routing queue, which Sensora
  // doesn't have; see CHANGES.md for the explicit scoping note).
  lastSenderRole: 'client' | 'operator' | null
  hidden: boolean
  favorited: boolean
}

export interface Review {
  id: string
  expertId: string
  userId: string
  userName: string
  rating: number
  comment: string | null
  tags: string[]
  createdAt: string
}

export interface ChatMessage {
  id: string
  conversationId: string
  senderRole: 'client' | 'operator'
  senderId: string
  text: string
  imageUrl: string | null
  createdAt: string
  createdAtIso: string
}

// ─── helpers ────────────────────────────────────────────────────────────────

function enc(v: string) {
  return encodeURIComponent(v)
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtTime(iso: string | null | undefined): string {
  if (!iso) return ''
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function rowToUser(r: any): User {
  return {
    id: r.id,
    name: r.name,
    contact: r.contact,
    role: r.role,
    joined: fmtDate(r.joined),
    status: r.status,
    ...(r.birth_date ? { birthDate: r.birth_date } : {}),
    ...(r.birth_time ? { birthTime: r.birth_time } : {}),
    ...(r.birth_place ? { birthPlace: r.birth_place } : {}),
    ...(r.latitude !== null && r.latitude !== undefined ? { latitude: Number(r.latitude) } : {}),
    ...(r.longitude !== null && r.longitude !== undefined ? { longitude: Number(r.longitude) } : {}),
    ...(r.utc_offset_hours !== null && r.utc_offset_hours !== undefined ? { utcOffsetHours: Number(r.utc_offset_hours) } : {}),
    ...(r.auth_provider ? { authProvider: r.auth_provider } : {}),
    isPremium: Boolean(r.is_premium),
    ...(r.premium_plan ? { premiumPlan: r.premium_plan } : {}),
    ...(r.premium_since ? { premiumSince: fmtDate(r.premium_since) } : {}),
    ...(r.relationship_status ? { relationshipStatus: r.relationship_status } : {}),
    loginStreak: Number(r.login_streak ?? 0),
    ...(r.last_login_date ? { lastLoginDate: r.last_login_date } : {}),
    ...(r.invite_code ? { inviteCode: r.invite_code } : {}),
    ...(r.privacy_accepted_at ? { privacyAcceptedAt: r.privacy_accepted_at } : {}),
    ...(r.privacy_policy_version ? { privacyPolicyVersion: r.privacy_policy_version } : {}),
    ...(r.bio ? { bio: r.bio } : {}),
  }
}

function rowToMoodEntry(r: any): MoodEntry {
  return {
    id: r.id,
    userId: r.user_id,
    entryDate: r.entry_date,
    rating: r.rating === null || r.rating === undefined ? null : Number(r.rating),
    focusCareer: r.focus_career === null || r.focus_career === undefined ? null : Number(r.focus_career),
    focusLove: r.focus_love === null || r.focus_love === undefined ? null : Number(r.focus_love),
    focusHealth: r.focus_health === null || r.focus_health === undefined ? null : Number(r.focus_health),
    focusFamily: r.focus_family === null || r.focus_family === undefined ? null : Number(r.focus_family),
  }
}

function rowToPushSubscription(r: any): PushSubscriptionRow {
  return { id: r.id, userId: r.user_id, endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth }
}

function rowToFriend(r: any): Friend {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    ...(r.zodiac_sign_id ? { zodiacSignId: r.zodiac_sign_id } : {}),
    ...(r.birth_date ? { birthDate: r.birth_date } : {}),
    ...(r.birth_time ? { birthTime: r.birth_time } : {}),
    ...(r.birth_place ? { birthPlace: r.birth_place } : {}),
    createdAt: r.created_at,
  }
}

function rowToTransaction(r: any): Transaction {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    type: r.type,
    amount: Number(r.amount),
    status: r.status,
    date: fmtDate(r.created_at),
    createdAtIso: r.created_at,
  }
}

function rowToPayout(r: any): PayoutRequest {
  return {
    id: r.id,
    userId: r.user_id,
    expertName: r.expert_name,
    amount: Number(r.amount),
    method: r.method,
    date: fmtDate(r.created_at),
    status: r.status,
  }
}

function rowToTopupRequest(r: any): TopupRequest {
  return {
    id: r.id,
    userId: r.user_id,
    userName: r.user_name,
    packageId: r.package_id,
    amount: Number(r.amount),
    currency: r.currency ?? 'usd',
    minutes: Number(r.minutes),
    paymentLink: r.payment_link,
    provider: r.provider ?? 'stripe',
    externalRef: r.external_ref ?? null,
    status: r.status,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at ?? null,
    resolvedBy: r.resolved_by ?? null,
  }
}

function rowToClientCard(r: any): ClientCard {
  const idPrefix = `cc_${r.operator_id}_`
  return {
    id: r.id,
    operatorId: r.operator_id,
    userId: typeof r.id === 'string' && r.id.startsWith(idPrefix) ? r.id.slice(idPrefix.length) : r.id,
    name: r.name,
    avatar: r.avatar,
    tag: r.tag,
    sessionsCount: r.sessions_count,
    totalSpent: Number(r.total_spent),
    lastSession: fmtDate(r.last_session),
    lastSessionIso: r.last_session ?? null,
    notes: r.notes ?? '',
  }
}

function rowToBonus(r: any): BonusEntry {
  return {
    id: r.id,
    operatorId: r.operator_id,
    type: r.type,
    label: r.label,
    amount: Number(r.amount),
    date: fmtDate(r.created_at),
    detail: r.detail ?? '',
  }
}

function rowToAssignment(r: any): ProfileAssignment {
  return {
    id: r.id,
    profileId: r.profile_id,
    profileName: r.profile_name,
    operatorId: r.operator_id,
    operatorName: r.operator_name,
    assignedAt: fmtDate(r.assigned_at),
    unassignedAt: r.unassigned_at ? fmtDate(r.unassigned_at) : null,
    reason: r.reason,
  }
}

function rowToConversation(r: any): Conversation {
  return {
    id: r.id,
    userId: r.user_id,
    expertId: r.expert_id,
    expertName: r.expert_name,
    avatar: r.avatar,
    specialty: r.specialty,
    lastMessage: r.last_message,
    updatedAt: fmtTime(r.updated_at),
    updatedAtIso: r.updated_at,
    status: r.status,
    activatedAtIso: r.activated_at ?? null,
    lastSenderRole: r.last_sender_role ?? null,
    hidden: Boolean(r.hidden_by_operator),
    favorited: Boolean(r.favorited_by_operator),
  }
}

function rowToReview(r: any): Review {
  return {
    id: r.id,
    expertId: r.expert_id,
    userId: r.user_id,
    userName: r.user_name,
    rating: Number(r.rating),
    comment: r.comment ?? null,
    tags: r.tags ?? [],
    createdAt: fmtDate(r.created_at),
  }
}

function rowToChatMessage(r: any): ChatMessage {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    senderRole: r.sender_role,
    senderId: r.sender_id,
    text: r.text,
    imageUrl: r.image_url ?? null,
    createdAt: fmtTime(r.created_at),
    createdAtIso: r.created_at,
  }
}

// Small deterministic id helper for real time-series ids (avoids Date.now()
// collisions when several rows can legitimately be created in the same
// millisecond, e.g. per-second billing ticks or rapid-fire chat messages).
let idCounter = 0
function uid(prefix: string): string {
  idCounter = (idCounter + 1) % 1_000_000
  return `${prefix}${Date.now()}${idCounter}`
}

// ─── Users / Auth ──────────────────────────────────────────────────────────

// Scoped to role=client: `contact` is now unique per (contact, role), not
// globally, so the same email/phone can belong to both a client account and
// a separate expert (chatter) account (see the users_contact_role_key
// migration — this is exactly what unblocked Lina's own chatter activation,
// which was failing because her email was already a client account). Every
// caller of this function is part of the client-facing auth flow
// (register/verify/login/oauth), so scoping here — rather than making every
// call site pass a role — matches how it's actually used.
export async function findUserByContact(contact: string): Promise<User | undefined> {
  const rows = await sbSelect('users', `select=*&contact=ilike.${enc(contact)}&role=eq.client`)
  return rows[0] ? rowToUser(rows[0]) : undefined
}

// Real-Apple-Sign-In quirk (see lib/server/oauth-verify.ts's comment on
// `verifyAppleIdentityToken`): Apple only includes the person's email in
// the identity token on their FIRST sign-in with Sensora — every login
// after that can come back with no email at all. findUserByContact can't
// find an existing account in that case, so the OAuth route falls back to
// this lookup instead, keyed on the stable per-app identifier Apple (and
// Google) issue for the account (`sub`), which createUser persists
// alongside contact when an OAuth sign-in provides one.
export async function findUserByOAuthSub(provider: 'google' | 'apple', sub: string): Promise<User | undefined> {
  const rows = await sbSelect(
    'users',
    `select=*&auth_provider=eq.${enc(provider)}&oauth_sub=eq.${enc(sub)}&role=eq.client`,
  )
  return rows[0] ? rowToUser(rows[0]) : undefined
}

// Staff login lookup only (username/password_hash) — deliberately separate
// from findUserByContact/rowToUser so password_hash never accidentally ends
// up in a User object that gets JSON-returned from some other route.
export interface StaffCredential {
  id: string
  name: string
  role: User['role']
  passwordHash: string | null
}

export async function findUserByUsername(username: string): Promise<StaffCredential | undefined> {
  const rows = await sbSelect('users', `select=id,name,role,password_hash&username=eq.${enc(username)}`)
  const r = rows[0]
  return r ? { id: r.id, name: r.name, role: r.role, passwordHash: r.password_hash ?? null } : undefined
}

// Staff "forgot password" lookup — same StaffCredential shape as
// findUserByUsername above, plus `contact` (the account's real email/phone,
// set at chatter activation time — see completeChatterRegistrationFromCode)
// so app/api/staff/forgot-password/route.ts knows where to send the reset
// code without a separate query. Kept as its own function rather than
// adding `contact` to findUserByUsername's select everywhere, since most
// callers (the actual login route) have no reason to ever see it.
export interface StaffCredentialWithContact extends StaffCredential {
  contact: string | null
}

export async function findStaffCredentialWithContactByUsername(username: string): Promise<StaffCredentialWithContact | undefined> {
  const rows = await sbSelect('users', `select=id,name,role,password_hash,contact&username=eq.${enc(username)}`)
  const r = rows[0]
  return r ? { id: r.id, name: r.name, role: r.role, passwordHash: r.password_hash ?? null, contact: r.contact ?? null } : undefined
}

// Client login lookup (email/phone + password) — same "don't leak
// password_hash through the normal User object" pattern as
// findUserByUsername above, just keyed by contact instead of username since
// client accounts never set a username.
// Same role=client scoping as findUserByContact above, for the same reason —
// this is the client password-login lookup specifically, not a general
// "any account with this contact" lookup.
export async function findUserCredentialByContact(contact: string): Promise<StaffCredential | undefined> {
  const rows = await sbSelect('users', `select=id,name,role,password_hash&contact=ilike.${enc(contact)}&role=eq.client`)
  const r = rows[0]
  return r ? { id: r.id, name: r.name, role: r.role, passwordHash: r.password_hash ?? null } : undefined
}

// BUG FIX: registering again with a contact that already has a user row (a
// repeat sign-up attempt, an old OTP-only account, or one created via OAuth)
// used to silently ignore whatever password was typed on that attempt — the
// account kept whatever password_hash (or none) it already had, with no
// error and no indication anything was skipped. From the outside this
// looked exactly like "registration succeeded" while actually leaving the
// password unchanged, so a later login with the password just typed failed
// with "incorrect email or password" — see app/api/auth/register/route.ts,
// which now calls this whenever an existing account provides a password.
export async function setUserPassword(userId: string, passwordHash: string): Promise<void> {
  await sbUpdate('users', `id=eq.${enc(userId)}`, { password_hash: passwordHash })
}

export async function createUser(
  name: string,
  contact: string,
  role: User['role'] = 'client',
  birthDate?: string,
  authProvider: User['authProvider'] = 'otp',
  extra?: { passwordHash?: string; bio?: string; oauthSub?: string },
): Promise<User> {
  const existing = await findUserByContact(contact)
  if (existing) return existing
  const row = await sbInsert('users', {
    id: `u${Date.now()}`,
    name,
    contact,
    role,
    status: 'active',
    ...(birthDate ? { birth_date: birthDate } : {}),
    auth_provider: authProvider,
    ...(extra?.passwordHash ? { password_hash: extra.passwordHash } : {}),
    ...(extra?.bio ? { bio: extra.bio } : {}),
    ...(extra?.oauthSub ? { oauth_sub: extra.oauthSub } : {}),
  })
  await sbInsert('wallets', { user_id: row.id, balance: 0 })
  return rowToUser(row)
}

// Real, server-side record of privacy-policy consent — not just a UI
// checkbox. Called from both the OTP and OAuth registration routes every
// time someone completes sign-up with the checkbox checked, including
// returning accounts created before this consent step existed, so no one
// ends up "logged in" without ever having a consent record on file.
export async function recordPrivacyConsent(userId: string, version: string): Promise<void> {
  await sbUpdate('users', `id=eq.${enc(userId)}`, {
    privacy_accepted_at: new Date().toISOString(),
    privacy_policy_version: version,
  })
}

export async function setOtp(contact: string, code: string, ttlMs = 5 * 60 * 1000) {
  await sbUpsert('otps', {
    contact: contact.toLowerCase(),
    code,
    expires_at: new Date(Date.now() + ttlMs).toISOString(),
    // Every fresh code (register, resend, login) resets the attempt counter
    // — attempts are scoped to a single code, not the contact forever.
    attempts: 0,
  })
}

// BUG FIX (code audit): verifyOtp used to be a plain string comparison with
// no cap on how many times a code could be tried. A 6-digit numeric code has
// only a million possibilities, so with no rate limit an attacker who can
// hit this endpoint repeatedly can brute-force it well within the 5-minute
// TTL. MAX_OTP_ATTEMPTS caps it — once a code has been guessed wrong this
// many times, it's burned; the user has to request a new one via setOtp.
const MAX_OTP_ATTEMPTS = 5

export async function verifyOtp(contact: string, code: string): Promise<boolean> {
  const rows = await sbSelect('otps', `select=*&contact=eq.${enc(contact.toLowerCase())}`)
  const record = rows[0]
  if (!record) return false
  if (Date.now() >= new Date(record.expires_at).getTime()) return false
  if ((record.attempts ?? 0) >= MAX_OTP_ATTEMPTS) return false

  const ok = record.code === code
  if (ok) {
    // Best-effort cleanup; verification already succeeded either way.
    try {
      await sbDelete('otps', `contact=eq.${enc(contact.toLowerCase())}`)
    } catch { /* non-fatal */ }
  } else {
    // Best-effort attempt increment; if this fails, worst case is one extra
    // guess allowed, not a security-critical gap.
    try {
      await sbUpdate('otps', `contact=eq.${enc(contact.toLowerCase())}`, { attempts: (record.attempts ?? 0) + 1 })
    } catch { /* non-fatal */ }
  }
  return ok
}

export async function listUsers(): Promise<User[]> {
  const rows = await sbSelect('users', 'select=*&order=joined.desc')
  return rows.map(rowToUser)
}

export async function setUserStatus(userId: string, status: User['status']) {
  const rows = await sbUpdate('users', `id=eq.${enc(userId)}`, { status })
  return rows[0] ? rowToUser(rows[0]) : undefined
}

export async function getUserById(userId: string): Promise<User | undefined> {
  const rows = await sbSelect('users', `select=*&id=eq.${enc(userId)}`)
  return rows[0] ? rowToUser(rows[0]) : undefined
}

// Used by the Lunar calendar card's "add birth details" flow — a real
// Postgres update, not local-only state that resets on reload. When
// birthPlace changes, this also geocodes it into real coordinates (see
// lib/server/geocode.ts) — that's what makes a real Ascendant/houses
// possible in computeNatalChart() instead of the permanent "needs
// coordinates" state. Geocoding is best-effort: if it fails (network
// hiccup, place not found), birthPlace still saves as plain text and
// latitude/longitude are simply left unset — never guessed.
export async function setBirthInfo(
  userId: string,
  info: { birthDate?: string; birthTime?: string; birthPlace?: string; utcOffsetHours?: number | null },
) {
  const patch: Record<string, any> = {}
  if (info.birthDate !== undefined) patch.birth_date = info.birthDate
  if (info.birthTime !== undefined) patch.birth_time = info.birthTime
  if (info.utcOffsetHours !== undefined) patch.utc_offset_hours = info.utcOffsetHours
  if (info.birthPlace !== undefined) {
    patch.birth_place = info.birthPlace
    const existing = await sbSelect('users', `select=geocoded_place&id=eq.${enc(userId)}`)
    if (existing[0]?.geocoded_place !== info.birthPlace) {
      const point = await geocodePlace(info.birthPlace)
      if (point) {
        patch.latitude = point.latitude
        patch.longitude = point.longitude
        patch.geocoded_place = info.birthPlace
      } else {
        // Couldn't resolve this place — clear any stale coordinates from a
        // previous place rather than leaving them silently mismatched.
        patch.latitude = null
        patch.longitude = null
        patch.geocoded_place = null
      }
    }
  }
  const rows = await sbUpdate('users', `id=eq.${enc(userId)}`, patch)
  return rows[0] ? rowToUser(rows[0]) : undefined
}

// ORPHANED since Stripe was removed (see CHANGES.md) — the old Premium
// subscription that called this after a verified Checkout Session no longer
// exists, and no code currently calls this function. Left in place in case
// a Premium-style perk gets reintroduced later; never set optimistically
// from the client if it is.
export async function setUserPremium(userId: string, plan: NonNullable<User['premiumPlan']>) {
  const rows = await sbUpdate('users', `id=eq.${enc(userId)}`, {
    is_premium: true,
    premium_plan: plan,
    premium_since: new Date().toISOString(),
  })
  return rows[0] ? rowToUser(rows[0]) : undefined
}

// Persists the "My relationships" status picker on the Today screen — a real
// column on the user's row, not local-only state that resets on reload.
export async function setRelationshipStatus(userId: string, status: string) {
  const rows = await sbUpdate('users', `id=eq.${enc(userId)}`, { relationship_status: status })
  return rows[0] ? rowToUser(rows[0]) : undefined
}

// ─── Friends (Add Friend / "know your friends better" feature) ─────────────
// Real per-user rows, created only when the signed-in user actually adds a
// friend's name + birth details — nothing pre-seeded.

export async function listFriends(userId: string): Promise<Friend[]> {
  const rows = await sbSelect('friends', `select=*&user_id=eq.${enc(userId)}&order=created_at.desc`)
  return rows.map(rowToFriend)
}

export async function createFriend(
  userId: string,
  friend: { name: string; zodiacSignId?: string; birthDate?: string; birthTime?: string; birthPlace?: string },
): Promise<Friend> {
  const row = await sbInsert('friends', {
    id: `f${Date.now()}`,
    user_id: userId,
    name: friend.name,
    ...(friend.zodiacSignId ? { zodiac_sign_id: friend.zodiacSignId } : {}),
    ...(friend.birthDate ? { birth_date: friend.birthDate } : {}),
    ...(friend.birthTime ? { birth_time: friend.birthTime } : {}),
    ...(friend.birthPlace ? { birth_place: friend.birthPlace } : {}),
  })
  return rowToFriend(row)
}

export async function deleteFriend(userId: string, friendId: string): Promise<void> {
  await sbDelete('friends', `id=eq.${enc(friendId)}&user_id=eq.${enc(userId)}`)
}

// ─── Wallet ────────────────────────────────────────────────────────────────

export async function getBalance(userId: string): Promise<number> {
  const rows = await sbSelect('wallets', `select=balance&user_id=eq.${enc(userId)}`)
  return rows[0] ? Number(rows[0].balance) : 0
}

export async function topUp(userId: string, userName: string, amount: number) {
  // Atomic — see wallet_adjust_balance (applied directly to the Supabase
  // project) and sbRpc in lib/server/supabase.ts. Replaces the old
  // read-then-write (getBalance + sbUpsert), which could lose an update if
  // two top-ups landed on the same wallet close together.
  const balance = Number(await sbRpc('wallet_adjust_balance', { p_user_id: userId, p_delta: amount, p_allow_negative: true }))
  const tx = await sbInsert('transactions', {
    id: `t${Date.now()}`,
    user_id: userId,
    user_name: userName,
    type: 'topup',
    amount,
    status: 'completed',
  })
  return { balance, transaction: rowToTransaction(tx) }
}

// ─── AI palm reading — free-use limit + paid overflow ──────────────────────
// Added 2026-09-10, explicit instruction ("зробити платним, після 3 раз
// брати помірну оплату"): this feature had zero cost control — no balance
// check, no usage cap — while every single call spends real Anthropic API
// money. First PALM_READING_FREE_USES calls per account stay free (matches
// the "безкоштовні функції" list already described to the lawyer); every
// call after that is charged from the same wallet used for live chat, so no
// new payment flow is needed. PALM_READING_PRICE is a PROPOSED DEFAULT — a
// real business number, not something to invent with confidence; change
// this one constant once the actual price is decided.
export const PALM_READING_FREE_USES = 3
export const PALM_READING_PRICE = 0.99

export async function countPalmReadingUses(userId: string): Promise<number> {
  // select=id with a Prefer: count header would be more efficient, but
  // sbSelect (lib/server/supabase.ts) doesn't expose response headers here —
  // counting rows client-side is fine at this volume (one row per reading,
  // per account) and keeps this consistent with how the rest of this file
  // already does simple counts (e.g. listReferralLinks).
  const rows = await sbSelect('palm_reading_usage', `select=id&user_id=eq.${enc(userId)}`)
  return rows.length
}

export async function recordPalmReadingUse(userId: string): Promise<void> {
  await sbInsert('palm_reading_usage', {
    id: uid('pr'),
    user_id: userId,
    created_at: new Date().toISOString(),
  })
}

// Atomic charge for a palm reading past the free limit — same
// wallet_adjust_balance RPC and the same "floor at zero, throw instead of
// silently overdrawing" behavior chargeForSession already relies on, so a
// modified client can't get a reading it can't pay for.
export async function chargePalmReading(userId: string): Promise<number> {
  const balance = Number(await sbRpc('wallet_adjust_balance', { p_user_id: userId, p_delta: -PALM_READING_PRICE, p_allow_negative: false }))
  return balance
}

// Refund path for the one real failure case that matters here: the person
// was already charged (usesSoFar >= free limit) but the Anthropic call
// itself failed afterward — network error, model error, non-palm photo
// rejected, etc. Sensora shouldn't keep money for a reading it didn't
// actually deliver, same principle already applied to the 90-second no-reply
// chat close elsewhere in this file.
export async function refundPalmReading(userId: string): Promise<void> {
  await sbRpc('wallet_adjust_balance', { p_user_id: userId, p_delta: PALM_READING_PRICE, p_allow_negative: true })
}

// ─── Real Wise top-ups (manual confirmation) ────────────────────────────────
// History: Stripe (removed — Ukraine isn't a supported Stripe payout
// country) → a free-credit dev stub → Monobank → LiqPay (all removed) → an
// honest instant-credit demo → real money via Wise "pay by link" → NOW: real
// money via Stripe Checkout, for the Poland-registered company account (your
// call, 2026-08-28 — Wise is fully retired, not kept as a fallback).
//
// Two-step creation, deliberately: (1) insert the pending row first to get a
// real id, (2) create the Stripe Checkout Session with that id in its
// metadata, then (3) attachStripeSession writes the session's url/id back
// onto the row. The Checkout Session needs the row's id to exist first (so
// the webhook can match on it later); the row needs the session's url to
// show the client where to pay. See app/api/wallet/minute-package/checkout/
// route.ts for the caller that does all three steps in order.
export async function createStripeTopupRequest(
  userId: string,
  userName: string,
  packageId: string,
): Promise<TopupRequest> {
  const pkg = MINUTE_PACKAGES.find(p => p.id === packageId)
  if (!pkg) throw new Error(`Unknown package id: ${packageId}`)
  const minutes = pkg.baseMinutes + pkg.bonusMinutes
  const row = await sbInsert('topup_requests', {
    id: uid('tr'),
    user_id: userId,
    user_name: userName,
    package_id: pkg.id,
    amount: pkg.priceUsd,
    currency: 'usd',
    minutes,
    payment_link: '', // filled in by attachStripeSession right after this
    provider: 'stripe',
    status: 'pending',
  })
  return rowToTopupRequest(row)
}

// Step 3 of creation (see above) — records the real Stripe Checkout URL and
// session id onto the pending row the moment the Stripe API confirms the
// session was created. externalRef is what the webhook uses to find this
// exact row again — an exact id match, never a guess.
export async function attachStripeSession(
  id: string,
  checkoutUrl: string,
  sessionId: string,
): Promise<TopupRequest | null> {
  const rows = await sbUpdate(
    'topup_requests',
    `id=eq.${enc(id)}`,
    { payment_link: checkoutUrl, external_ref: sessionId },
  )
  return rows && rows.length > 0 ? rowToTopupRequest(rows[0]) : null
}

// Used by the Stripe webhook to look up a topup_request by Stripe Checkout
// Session id (an exact match — no amount-based guessing, unlike the old Wise
// integration). Currently unused in the webhook route itself (the session's
// own metadata.topupRequestId is used instead, which needs no lookup at
// all), kept here as a real, working fallback in case a future event type
// only carries the session id and not the original metadata.
export async function findTopupByExternalRef(externalRef: string): Promise<TopupRequest | null> {
  const rows = await sbSelect('topup_requests', `select=*&external_ref=eq.${enc(externalRef)}`)
  return rows[0] ? rowToTopupRequest(rows[0]) : null
}

export async function listTopupRequests(): Promise<TopupRequest[]> {
  const rows = await sbSelect('topup_requests', 'select=*&order=created_at.desc')
  return rows.map(rowToTopupRequest)
}

// Admin-only confirm/reject — same compare-and-swap pattern as
// setPayoutStatus above, for the same reason: a double-click, a retried
// request, or two admin tabs acting on the same topup request must not each
// pass the status check and each credit the wallet a second time. The
// UPDATE only "wins" (and only the winner credits the wallet / inserts the
// ledger row) if it actually matched a still-pending row; a racing/retried
// call sees zero matched rows and just returns the already-resolved record.
export async function resolveTopupRequest(
  id: string,
  status: 'confirmed' | 'rejected',
  resolvedBy: string,
): Promise<TopupRequest | null> {
  const rows = await sbSelect('topup_requests', `select=*&id=eq.${enc(id)}`)
  const request = rows[0]
  if (!request) return null

  const updated = await sbUpdate(
    'topup_requests',
    `id=eq.${enc(id)}&status=eq.pending`,
    { status, resolved_at: new Date().toISOString(), resolved_by: resolvedBy },
  )
  const won = updated && updated.length > 0
  if (won && status === 'confirmed') {
    // The wallet is credited minutes × the fixed per-minute rate (not the
    // sticker price actually paid) so a package purchase behaves exactly
    // like paying for consultations minute-by-minute — a package only
    // changes how many prepaid minutes you get, never the per-minute price.
    //
    // CURRENCY NOTE (2026-08-28 EUR switch, reverted back to USD 2026-09-07):
    // the `transactions` table has no currency column and is read everywhere
    // (admin CRM, client history, chatter earnings) as one implicit unit —
    // the same unit FIXED_PRICE_PER_MIN and every consultation-spend row
    // already use. Package sticker prices (request.amount, request.currency)
    // can still legitimately differ from this internal unit (old Wise-era
    // rows, or any future currency change), so logging the raw sticker price
    // into this ledger would silently mix currencies in every total that
    // sums transactions.amount — a real "fake numbers" risk, not a cosmetic
    // one. So this intentionally logs creditedAmount (the same internal unit
    // as the rest of the ledger), not request.amount. The real sticker price
    // + currency stays correctly recorded on the topup_requests row itself
    // for anyone who needs the actual charge.
    const creditedAmount = +(Number(request.minutes) * FIXED_PRICE_PER_MIN).toFixed(2)
    // FIX (payment audit): the row is flipped to 'confirmed' BEFORE the wallet
    // is credited (that flip is what makes double-credit impossible). But if
    // the credit itself then failed (transient Supabase error), the row stayed
    // 'confirmed' with no minutes added — and Stripe's retry of the webhook
    // sees "already confirmed" and does nothing, so the customer paid and
    // never got their minutes. Now a failed credit puts the row back to
    // 'pending' and rethrows, so the webhook returns 5xx and Stripe retries
    // the whole thing.
    let credited = false
    try {
      await sbRpc('wallet_adjust_balance', { p_user_id: request.user_id, p_delta: creditedAmount, p_allow_negative: true })
      credited = true
      await sbInsert('transactions', {
        id: uid('t'),
        user_id: request.user_id,
        user_name: request.user_name,
        type: 'topup',
        amount: creditedAmount,
        status: 'completed',
      })
    } catch (err) {
      // Only roll back to pending if the wallet was NOT credited yet — if the
      // credit went through and only the ledger row failed, reverting would
      // make the retry credit the wallet a second time.
      if (!credited) {
        await sbUpdate('topup_requests', `id=eq.${enc(id)}`, { status: 'pending', resolved_at: null, resolved_by: null }).catch(() => {})
      } else {
        console.error('[topup] wallet credited but ledger insert failed for', id, err)
        return rowToTopupRequest(updated[0])
      }
      throw err
    }
  }
  return rowToTopupRequest(won ? updated[0] : request)
}

// Real, permanent account deletion — Apple Guideline 5.1.1(v) requires any
// app that lets someone create an account to also let them fully delete it
// from inside the app, not just deactivate it. Before this, there was no
// way for a client to remove their account at all.
//
// The actual deletion logic lives in a Postgres function
// (delete_client_account, migration: add_delete_client_account_function) so
// it runs as a single atomic transaction — this just calls it. That
// function: deletes personal data outright (wallet, conversations +
// messages, friends, mood history, reviews, compatibility reports, push
// subscriptions — all cascade automatically via their FK ON DELETE rules,
// see the migration comment for exactly which), while transactions,
// payout_requests, topup_requests, and client_reports keep their rows with
// their user-id column set to NULL — those are kept for legal/accounting
// record-keeping or moderation history (already denormalized with
// user_name/amount/expert_name/reason, so nothing personally identifying is
// lost by keeping them) rather than being erased, which is standard
// practice and allowed under GDPR Art.17(3)'s legal-obligation exception.
//
// BUG FIX (reported: deleting an account that had ever submitted a wallet
// top-up request failed with a 409 "topup_requests_user_id_fkey" foreign-key
// violation): that FK used to be NO ACTION with a NOT NULL user_id, unlike
// transactions/payout_requests which already SET NULL. Migration
// fix_delete_client_account_topup_requests_fk (applied directly to the
// Supabase project) made user_id nullable and changed the FK to ON DELETE
// SET NULL, so it now behaves the same as the other two financial tables
// instead of blocking deletion.
//
// Same fix applied to client_reports (migration
// fix_delete_client_account_client_reports_fk) — a client who had ever
// filed a report against an expert/conversation hit the identical 409 on
// client_reports_client_user_id_fkey. Your call: keep the report (it's
// moderation evidence about the expert, not the client) but detach it from
// the deleted account, same SET NULL treatment as the financial tables.
//
// Restricted to role='client' inside the SQL function itself — staff
// accounts (admin/expert) don't get self-service deletion through this
// path, since removing an active chatter/admin account has operational
// consequences (assigned client profiles, pending payouts, etc.) that need
// a person to actually look at, not a one-click button.
export async function deleteClientAccount(userId: string): Promise<void> {
  await sbRpc('delete_client_account', { p_user_id: userId })
}

// `expertId`, when passed, is what makes chatter earnings computable at all —
// previously a session charge only debited the client's wallet with no
// record of which expert profile the money was earned on, so per-operator
// earnings could never be reconstructed from this table. See getKpi() and
// computeBonusAccruals() below, which both read transactions.expert_id.
export async function chargeForSession(userId: string, userName: string, amount: number, expertId?: string) {
  // REAL BUG FIX (app↔CRM integration audit, 2026-09-03) — see
  // ProfileUnassignedError above for the full story. Checked BEFORE the
  // wallet is touched (not after), so a client is never actually charged
  // for a profile that has no chatter assigned to answer them — fails
  // closed the same way the "no price set" check already does one level up
  // in the route, rather than charging first and trying to reconcile later.
  if (expertId && !(await isProfileAssigned(expertId))) {
    throw new ProfileUnassignedError()
  }

  // Atomic AND now actually enforces a floor at zero (p_allow_negative:
  // false) — previously this read the balance, subtracted, and wrote the
  // result with no check at all, so a modified/repeated client call could in
  // theory push a wallet negative. wallet_adjust_balance raises and rolls
  // back the whole call when the result would go negative; the route this
  // is called from (app/api/session/charge/route.ts) catches
  // InsufficientBalanceError and returns 402 instead of letting the charge
  // through.
  let balance: number
  try {
    balance = Number(await sbRpc('wallet_adjust_balance', { p_user_id: userId, p_delta: -amount, p_allow_negative: false }))
  } catch (err: any) {
    if (String(err?.message ?? '').includes('INSUFFICIENT_BALANCE')) throw new InsufficientBalanceError()
    throw err
  }
  const tx = await sbInsert('transactions', {
    id: uid('t'),
    user_id: userId,
    user_name: userName,
    type: 'session',
    amount: -amount,
    status: 'completed',
    ...(expertId ? { expert_id: expertId } : {}),
  })
  return { balance, transaction: rowToTransaction(tx) }
}

// ─── Free-trial anti-fraud ──────────────────────────────────────────────────
// Real requirement from the ТЕХНІЧНЕ ЗАВДАННЯ doc: the free 180 seconds a
// client gets on their first live chat must be checked against device_id +
// phone before being granted, not just handed out every time the chat
// screen mounts (which is exactly what it was before this — see
// live-chat-screen.tsx's old `useState(180)`, pure client-side React state
// with zero server memory of whether this person/device had already used
// it). "Phone" in the TZ doc maps to `users.contact` here — the app's single
// email-or-phone identifier field (see findUserByContact's comment above);
// most Sensora accounts use it as a phone or email interchangeably, so this
// checks the real contact value rather than assuming phone specifically.
//
// This is a ONE-TIME, account-wide allowance — checked regardless of which
// expert the client opens a chat with, matching the actual intent (stop the
// free offer being farmed by reopening chats / switching experts / making a
// new account on the same device), not a per-conversation perk.
export interface FreeTrialCheck {
  granted: boolean
  freeSeconds: number
}

export const FREE_TRIAL_SECONDS = 180

export async function checkAndGrantFreeTrial(userId: string, deviceId: string): Promise<FreeTrialCheck> {
  const user = await getUserById(userId)
  const contact = user?.contact ?? null

  const byDevice = await sbSelect('free_trial_usage', `select=id&device_id=eq.${enc(deviceId)}&limit=1`)
  if (byDevice.length > 0) return { granted: false, freeSeconds: 0 }

  if (contact) {
    const byContact = await sbSelect('free_trial_usage', `select=id&contact=eq.${enc(contact)}&limit=1`)
    if (byContact.length > 0) return { granted: false, freeSeconds: 0 }
  }

  // Record usage BEFORE returning granted:true — this is the one-time offer
  // being spent, not just "checked," the moment a chat screen with a fresh
  // trial actually opens (matches how a real one-time promo works: opening
  // it burns it, regardless of whether the full 180 seconds get used).
  await sbInsert('free_trial_usage', {
    id: uid('ft'),
    user_id: userId,
    device_id: deviceId,
    contact: contact ?? '',
  })
  return { granted: true, freeSeconds: FREE_TRIAL_SECONDS }
}

// REAL FEATURE ADDED ("3 хв безкоштовні показувались... і щоб зникало після
// використання"): checkAndGrantFreeTrial above is a "spend it" call — it's
// only meant to run once, the moment a chat actually opens, because opening
// it burns it. But other screens (Today/home, the wallet/packages screen,
// an expert's profile) need to just ASK "does this person still have their
// free trial?" without accidentally spending it just by rendering a banner.
// Same two lookups as above (device_id OR contact already used it), just
// without the insert.
export async function hasFreeTrialAvailable(userId: string, deviceId: string): Promise<boolean> {
  const user = await getUserById(userId)
  const contact = user?.contact ?? null

  const byDevice = await sbSelect('free_trial_usage', `select=id&device_id=eq.${enc(deviceId)}&limit=1`)
  if (byDevice.length > 0) return false

  if (contact) {
    const byContact = await sbSelect('free_trial_usage', `select=id&contact=eq.${enc(contact)}&limit=1`)
    if (byContact.length > 0) return false
  }
  return true
}

// ─── Admin: transactions & payouts ─────────────────────────────────────────

export async function listTransactions(): Promise<Transaction[]> {
  const rows = await sbSelect('transactions', 'select=*&order=created_at.desc')
  return rows.map(rowToTransaction)
}

export async function listTransactionsForUser(userId: string): Promise<Transaction[]> {
  const rows = await sbSelect('transactions', `select=*&user_id=eq.${enc(userId)}&order=created_at.desc`)
  return rows.map(rowToTransaction)
}

export async function listPayouts(): Promise<PayoutRequest[]> {
  const rows = await sbSelect('payout_requests', 'select=*&order=created_at.desc')
  return rows.map(rowToPayout)
}

export async function setPayoutStatus(id: string, status: PayoutRequest['status']) {
  const rows = await sbSelect('payout_requests', `select=*&id=eq.${enc(id)}`)
  const payout = rows[0]
  if (!payout) return null

  // BUG FIX (code audit): this used to be a plain unconditional UPDATE
  // followed by an unconditional ledger INSERT whenever the new status was
  // 'approved' — so a double-click, a retried request, or two admin tabs
  // acting on the same payout would each pass the `status === 'approved'`
  // check and each insert their own `type: 'payout'` transaction row,
  // silently duplicating a real ledger entry for one real payout. Same
  // compare-and-swap pattern used throughout this file for money-moving
  // updates: the UPDATE only "wins" (and only the winner records the ledger
  // entry) if it actually matched a row
  // that wasn't already in this status; a racing/retried call sees zero
  // matched rows and just returns the already-updated record.
  const updated = await sbUpdate(
    'payout_requests',
    `id=eq.${enc(id)}&status=neq.${enc(status)}`,
    { status },
  )
  const won = updated && updated.length > 0
  if (won && status === 'approved') {
    await sbInsert('transactions', {
      id: `t${Date.now()}`,
      user_id: payout.user_id,
      user_name: payout.expert_name,
      type: 'payout',
      amount: -Number(payout.amount),
      status: 'completed',
    })
  }
  return rowToPayout(won ? updated[0] : payout)
}

// BUG FIX (code audit): this used to just insert straight away, with the
// $-available check done separately, earlier, by the caller
// (getChatterPayoutBalance in the /api/crm/payout-request route) as its own
// standalone read. That was a real TOCTOU race — a double-tap or two open
// tabs could both read the same "already spoken for" total before either
// insert landed, both pass the check, and both get created, together
// requesting more than was actually earned. Now the check-and-insert happens
// as one call into create_payout_request_atomic (see migration
// create_payout_request_atomic), a Postgres function that takes an
// advisory lock per operator_id so concurrent calls for the SAME operator
// serialize instead of racing. `earned` is still computed here in
// TypeScript (via computeChatterLifetimeEarned) rather than duplicated into
// SQL, since that's real tier-rate business logic that should stay in one
// place.
//
// Admin-filed requests (skipAvailabilityCheck) intentionally bypass the
// balance check — same as before, preserving the route's existing "admin's
// supplied userId/amount is trusted" behavior — but they still go through
// the same locked insert path for consistency. This is passed to Postgres
// as an explicit p_skip_check boolean (not an Infinity/null trick — see the
// migration's comment for why that was the wrong way to do this).
export async function createPayoutRequest(
  userId: string,
  expertName: string,
  amount: number,
  method: string,
  skipAvailabilityCheck = false,
) {
  const earned = skipAvailabilityCheck ? 0 : (await computeChatterLifetimeEarned(userId)).earned
  try {
    const row = await sbRpc('create_payout_request_atomic', {
      p_id: uid('p'),
      p_operator_id: userId,
      p_expert_name: expertName,
      p_amount: amount,
      p_method: method,
      p_earned: earned,
      p_skip_check: skipAvailabilityCheck,
    })
    return rowToPayout(row)
  } catch (err: any) {
    if (String(err?.message ?? '').includes('INSUFFICIENT_PAYOUT_BALANCE')) throw new InsufficientPayoutBalanceError()
    throw err
  }
}

// ─── Chatter CRM ────────────────────────────────────────────────────────────

// Client cards used to be created only when a client SENT a message — clients
// who chatted before cards existed never appeared in Clients/Pings. This
// creates a card for every client who wrote to one of the operator's profiles
// but has no card yet.
export async function backfillClientCards(operatorId: string): Promise<void> {
  const [writers, cardRows] = await Promise.all([
    getWritingClientIds(operatorId),
    sbSelect('crm_client_cards', `select=id&operator_id=eq.${enc(operatorId)}`),
  ])
  const haveCard = new Set<string>(cardRows.map((r: any) => r.id))
  const missing = Array.from(writers)
    .filter(uidv => !haveCard.has(`cc_${operatorId}_${uidv}`))
    .slice(0, 50)
  for (const clientUserId of missing) {
    await syncClientCard(operatorId, clientUserId).catch(() => {})
  }
}

// User ids of clients who actually WROTE to this chatter's profile(s) — a
// client who only opened a chat and left without a message isn't someone this
// chatter "spoke with", so they don't belong in Clients/Pings.
async function getWritingClientIds(operatorId: string): Promise<Set<string>> {
  const ids = await sbRpc<string[]>('operator_client_writers', { p_operator: operatorId })
  return new Set<string>(Array.isArray(ids) ? ids : [])
}

export async function listClientCards(operatorId: string): Promise<ClientCard[]> {
  const [rows, writers] = await Promise.all([
    sbSelect('crm_client_cards', `select=*&operator_id=eq.${enc(operatorId)}`),
    getWritingClientIds(operatorId),
  ])
  return rows.map(rowToClientCard).filter(c => writers.has(c.userId))
}

// `ownerOperatorId`, when passed, scopes the update to that operator's own
// card — a non-admin chatter can never edit someone else's client card, even
// by guessing/enumerating card ids, because the match includes operator_id
// and PostgREST simply returns zero rows (treated as 404) if it doesn't
// match. Admin callers pass `undefined` to bypass the scope.
export async function updateClientCard(id: string, patch: Partial<Pick<ClientCard, 'notes' | 'tag'>>, ownerOperatorId?: string) {
  const dbPatch: Record<string, any> = {}
  if (patch.notes !== undefined) dbPatch.notes = patch.notes
  if (patch.tag !== undefined) dbPatch.tag = patch.tag
  const match = ownerOperatorId
    ? `id=eq.${enc(id)}&operator_id=eq.${enc(ownerOperatorId)}`
    : `id=eq.${enc(id)}`
  const rows = await sbUpdate('crm_client_cards', match, dbPatch)
  return rows[0] ? rowToClientCard(rows[0]) : null
}

// The public expert profile and the human operator behind it are separate
// records (section 13 of the spec) — an operator's real numbers are always
// the sum of activity on whichever profile(s) are *currently* assigned to
// them, via profile_assignments. An operator with no active assignment has
// no way to have earned anything yet, so every metric below is honestly 0.
export async function getAssignedProfileIds(operatorId: string): Promise<string[]> {
  const rows = await sbSelect('profile_assignments', `select=profile_id&operator_id=eq.${enc(operatorId)}&unassigned_at=is.null`)
  return rows.map((r: any) => r.profile_id)
}

// Replaces the old version, which just read back an empty kpi_snapshots
// table (nothing ever wrote to it). This computes all 5 numbers live, on
// every call, straight from real conversations/reviews/transactions/messages
// — always fresh, no separate "snapshot job" to keep in sync.
export async function getKpi(operatorId: string): Promise<KpiStat[]> {
  const profileIds = await getAssignedProfileIds(operatorId)
  if (profileIds.length === 0) {
    return [
      { key: 'active_chats', label: 'Active chats', value: '0', sub: 'No profile assigned yet', progress: 0 },
      { key: 'avg_rating', label: 'Avg. rating', value: '—', sub: 'No profile assigned yet', progress: 0 },
      { key: 'earnings_30d', label: 'Earnings (30d)', value: '$0.00', sub: 'No profile assigned yet', progress: 0 },
      { key: 'clients_30d', label: 'Clients (30d)', value: '0', sub: 'No profile assigned yet', progress: 0 },
      { key: 'messages_30d', label: 'Messages (30d)', value: '0', sub: 'No profile assigned yet', progress: 0 },
    ]
  }

  const inList = profileIds.map(enc).join(',')
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString()

  const [convRows, reviewRows, txRows, msgRows, tierRows] = await Promise.all([
    sbSelect('conversations', `select=id,user_id,status,updated_at&expert_id=in.(${inList})`),
    sbSelect('reviews', `select=rating&expert_id=in.(${inList})`),
    sbSelect('transactions', `select=amount&type=eq.session&expert_id=in.(${inList})&created_at=gte.${enc(since30)}`),
    sbSelect('messages', `select=id&sender_role=eq.operator&sender_id=eq.${enc(operatorId)}&created_at=gte.${enc(since30)}`),
    sbSelect('experts', `select=tier&id=in.(${inList})`),
  ])

  const activeChats = convRows.filter((c: any) => c.status === 'active').length
  const avgRating = reviewRows.length
    ? +(reviewRows.reduce((s: number, r: any) => s + Number(r.rating), 0) / reviewRows.length).toFixed(2)
    : 0
  // "Earnings" here means what the CHATTER actually gets paid, not what the
  // client was charged. /api/session/charge fires once per second while a
  // paid session runs, so a row-count of real session transactions is a real
  // second-by-second measure of billed time (same reasoning already used in
  // computeBonusAccruals' minutes milestone below) — divided by 60 for
  // minutes, multiplied by the chatter's own tier rate (see
  // CHATTER_TIER_RATES above), not the $2/min the client paid. If an
  // operator somehow has profiles on different tiers, the first one wins —
  // same simplification already used elsewhere (e.g. sendPing's profiles[0]).
  const tier: ChatterTier = (tierRows[0]?.tier as ChatterTier) ?? DEFAULT_CHATTER_TIER
  const billedMinutes30d = txRows.length / 60
  const earnings30d = +(billedMinutes30d * CHATTER_TIER_RATES[tier]).toFixed(2)
  const since30Ms = Date.now() - 30 * 86400000
  const clients30d = new Set(
    convRows.filter((c: any) => new Date(c.updated_at).getTime() >= since30Ms).map((c: any) => c.user_id),
  ).size
  const messages30d = msgRows.length

  return [
    { key: 'active_chats', label: 'Active chats', value: String(activeChats), sub: 'Live right now', progress: Math.min(100, activeChats * 20) },
    { key: 'avg_rating', label: 'Avg. rating', value: reviewRows.length ? avgRating.toFixed(2) : '—', sub: `${reviewRows.length} review${reviewRows.length === 1 ? '' : 's'}`, progress: reviewRows.length ? (avgRating / 5) * 100 : 0 },
    { key: 'earnings_30d', label: 'Earnings (30d)', value: `$${earnings30d.toFixed(2)}`, sub: `Your cut · ${CHATTER_TIER_LABELS[tier]}`, progress: Math.min(100, (earnings30d / 200) * 100) },
    { key: 'clients_30d', label: 'Clients (30d)', value: String(clients30d), sub: 'Distinct clients', progress: Math.min(100, clients30d * 10) },
    { key: 'messages_30d', label: 'Messages (30d)', value: String(messages30d), sub: 'Sent by you', progress: Math.min(100, (messages30d / 100) * 100) },
  ]
}

// ─── Chatter payout balance ────────────────────────────────────────────────
// What a chatter can actually request as a payout — replaces the earlier
// placeholder in PayoutRequestPanel (app/crm/chatter/page.tsx), which read
// the customer-facing /api/wallet balance (top-up money) instead of what the
// chatter had actually earned. See CHANGES.md for the full explanation.
//
// Computed as: lifetime tier-based earnings on every profile this operator
// has EVER operated (not just the one currently assigned — getAssignedProfileIds
// only returns active assignments, which would silently drop everything
// earned before a handover), each transaction counted only if it happened
// while THIS operator was actually assigned that profile (time-boxed by
// assigned_at/unassigned_at) — so a handover can't double-count or
// misattribute revenue to the wrong chatter — minus whatever's already
// approved or sitting in a pending request (rejected requests release the
// amount back).
//
// One disclosed simplification: this applies the profile's CURRENT tier rate
// to ALL historical earnings on it, rather than tracking a rate-at-the-time
// history. Tiers only exist as of this change, so there's no real history to
// get wrong yet — but if tiers start changing often, this is the one place
// to revisit.
// Extracted from getChatterPayoutBalance so createPayoutRequest can also get
// at the raw lifetime-earned figure (see BUG FIX comment there) without
// duplicating this tier-rate computation a second time.
// BUG FIX (code audit, 2026-08-28): this used to only sum session-billing
// transactions — bonus_accruals (night shift, minutes milestones, KPI
// bonus) were never read here at all, even though the chatter's own
// Bonuses tab explicitly tells operators "Bonuses below ARE real" and shows
// them as a real dollar total. A chatter could watch real bonus money add
// up on their own dashboard and then have it silently excluded the moment
// they actually tried to withdraw — getChatterPayoutBalance and
// createPayoutRequest both call this function, so fixing it here fixes the
// real payout-balance calculation and the availability check a new payout
// request is validated against, in one place. bonus_accruals rows have no
// "already paid out" flag of their own (they're deterministic, idempotent,
// inserted once per real milestone — see computeBonusAccruals above), so
// summing every row for this operator, same as session earnings, is the
// correct full lifetime-earned figure; alreadySpokenFor in
// getChatterPayoutBalance still correctly subtracts whatever's already been
// requested/approved.
async function computeChatterLifetimeEarned(operatorId: string): Promise<{ earned: number; assignments: any[] }> {
  const assignments = await sbSelect(
    'profile_assignments',
    `select=profile_id,assigned_at,unassigned_at&operator_id=eq.${enc(operatorId)}`,
  )
  const bonusRows = await sbSelect('bonus_accruals', `select=amount&operator_id=eq.${enc(operatorId)}`)
  const bonusTotal = bonusRows.reduce((s: number, b: any) => s + Number(b.amount), 0)

  if (assignments.length === 0) return { earned: bonusTotal, assignments: [] }

  const profileIds = [...new Set(assignments.map((a: any) => a.profile_id as string))]
  const inList = profileIds.map(enc).join(',')

  const [txRows, tierRows] = await Promise.all([
    sbSelect('transactions', `select=expert_id,created_at&type=eq.session&expert_id=in.(${inList})`),
    sbSelect('experts', `select=id,tier&id=in.(${inList})`),
  ])

  const tierByProfile = new Map<string, ChatterTier>(tierRows.map((r: any) => [r.id, (r.tier as ChatterTier) ?? DEFAULT_CHATTER_TIER]))

  let earned = bonusTotal
  for (const tx of txRows) {
    const txTime = new Date(tx.created_at).getTime()
    const wasAssignedAtTxTime = assignments.some((a: any) =>
      a.profile_id === tx.expert_id &&
      txTime >= new Date(a.assigned_at).getTime() &&
      (a.unassigned_at === null || txTime < new Date(a.unassigned_at).getTime()),
    )
    if (!wasAssignedAtTxTime) continue
    const tier = tierByProfile.get(tx.expert_id) ?? DEFAULT_CHATTER_TIER
    earned += (1 / 60) * CHATTER_TIER_RATES[tier] // each row = 1 billed second
  }
  return { earned, assignments }
}

export async function getChatterPayoutBalance(operatorId: string): Promise<number> {
  const [{ earned }, payouts] = await Promise.all([
    computeChatterLifetimeEarned(operatorId),
    sbSelect('payout_requests', `select=amount,status&user_id=eq.${enc(operatorId)}`),
  ])

  const alreadySpokenFor = payouts
    .filter((p: any) => p.status === 'approved' || p.status === 'pending')
    .reduce((s: number, p: any) => s + Number(p.amount), 0)

  return Math.max(0, +(earned - alreadySpokenFor).toFixed(2))
}

// Derives real bonus_accruals rows from actual transaction history — nothing
// here is invented. Every insert uses a deterministic id (operator + client
// + week, or operator + date, or operator + milestone index) so calling this
// repeatedly is idempotent: a duplicate id hits the primary key and the
// insert is simply skipped, never double-paid. Call sites: listBonuses()
// (compute-on-view, so the Bonuses tab is always current) and the daily
// Vercel Cron job at /api/cron/bonuses (so bonuses accrue even if no chatter
// happens to open their dashboard that day).
export async function computeBonusAccruals(operatorId: string): Promise<void> {
  const profileIds = await getAssignedProfileIds(operatorId)
  if (profileIds.length === 0) return

  const inList = profileIds.map(enc).join(',')
  const since30 = new Date(Date.now() - 30 * 86400000).toISOString()
  const txRows = await sbSelect(
    'transactions',
    `select=user_id,created_at&type=eq.session&expert_id=in.(${inList})&created_at=gte.${enc(since30)}`,
  )
  if (txRows.length === 0) return

  const inserts: Array<{ id: string; type: BonusEntry['type']; label: string; amount: number; detail: string }> = []

  // "Returning client" bonus removed per the client's direct answer — no
  // longer computed here at all (see BonusEntry.type comment above). What's
  // left: minutes-in-chat, night shifts, and a new KPI/quality bonus below.

  // 1) Night shift — any calendar day with at least one billed second
  // between 22:00–06:00 UTC. One bonus per day. Only accrues for chatters
  // who actually worked a night hour — nothing awarded on days they didn't.
  const nightDays = new Set<string>()
  for (const t of txRows) {
    const hour = new Date(t.created_at).getUTCHours()
    if (hour >= 22 || hour < 6) nightDays.add(String(t.created_at).slice(0, 10))
  }
  for (const day of nightDays) {
    inserts.push({
      id: `bnight_${operatorId}_${day}`,
      type: 'night_shift',
      label: 'Night shift',
      amount: 0.5,
      detail: `Session handled during night hours on ${day}`,
    })
  }

  // 2) Client minutes milestones — real tier table from "СИСТЕМА БОНУСІВ"
  // (client's own numbers, confirmed via her direct answers on 2026-09-03,
  // since her own worked example and the "stops at 1500" line conflicted):
  // per SPECIFIC client (end user), per CALENDAR month, every 100 minutes
  // of billed chat time reached is its own tier, tiers 100→1500 min pay
  // $5,$6,$7...$19 respectively (15 tiers), and the counter caps at the
  // 1500 min tier — no bonus for additional minutes with that same client
  // once 1500/month is reached. All reached tiers for the month are summed
  // (e.g. 300 min this month = $5+$6+$7 = $18 across 3 rows), matching her
  // description that "всі цифри за кожні 100 хвилин сумуються". This
  // REPLACES the old flat "$2 every 30 min, summed across ALL clients"
  // milestone (her explicit call — the old one didn't match this doc at
  // all: wrong amounts, wrong period, and aggregated across clients instead
  // of tracking any one client relationship).
  //
  // /api/session/charge fires once per second while a paid session is
  // active, so counting session-type transaction rows per user_id is a
  // real second-by-second measure of billed time with that specific
  // client — same technique the existing code already uses for night-shift
  // and lifetime-earned above, just grouped per client instead of summed
  // across all of them.
  const CLIENT_MINUTE_TIERS = [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19] // index 0 = 100 min tier ... index 14 = 1500 min tier (cap, per her confirmed answer)
  const now = new Date()
  const monthStartIso = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString()
  const monthKey = monthStartIso.slice(0, 7) // e.g. '2026-09' — calendar month, resets automatically each month since it's part of the row id
  const monthlyTxRows = await sbSelect(
    'transactions',
    `select=user_id,created_at&type=eq.session&expert_id=in.(${inList})&created_at=gte.${enc(monthStartIso)}`,
  )
  const secondsByClient = new Map<string, number>()
  for (const t of monthlyTxRows) {
    if (!t.user_id) continue
    secondsByClient.set(t.user_id, (secondsByClient.get(t.user_id) ?? 0) + 1) // each row = 1 billed second
  }
  for (const [clientId, seconds] of secondsByClient) {
    const clientMinutes = Math.floor(seconds / 60)
    const tiersReached = Math.min(Math.floor(clientMinutes / 100), CLIENT_MINUTE_TIERS.length)
    for (let tier = 1; tier <= tiersReached; tier++) {
      const amount = CLIENT_MINUTE_TIERS[tier - 1]
      inserts.push({
        id: `bclientmin_${operatorId}_${clientId}_${monthKey}_${tier}`,
        type: 'chat_minutes',
        label: 'Minutes milestone',
        amount,
        detail: `Reached ${tier * 100} min with one client this month — +$${amount}`,
      })
    }
  }

  // 3) KPI / quality bonus — PROPOSED DEFAULT, same "confirmed mechanism,
  // unconfirmed numbers" situation as the chatter tiers above. The client
  // asked for a bonus tied to "виконання КПІ" (hitting KPI targets) but
  // hasn't said which KPI, what the target is, or the payout — so this uses
  // the one quality KPI the app already tracks for real (average review
  // rating) rather than inventing a new metric from nothing. Awarded once
  // per calendar month if the chatter has at least 3 reviews and a real
  // average rating of 4.5+ across their assigned profile(s). Change the
  // threshold/amount/metric here once real numbers come back.
  const reviewRows = await sbSelect('reviews', `select=rating&expert_id=in.(${inList})`)
  if (reviewRows.length >= 3) {
    const avgRating = reviewRows.reduce((s: number, r: any) => s + Number(r.rating), 0) / reviewRows.length
    if (avgRating >= 4.5) {
      const kpiMonthKey = new Date().toISOString().slice(0, 7)
      inserts.push({
        id: `bkpi_${operatorId}_${kpiMonthKey}`,
        type: 'kpi_quality',
        label: 'KPI bonus',
        amount: 5,
        detail: `Average rating ${avgRating.toFixed(2)} across ${reviewRows.length} reviews this month`,
      })
    }
  }

  for (const b of inserts) {
    try {
      await sbInsert('bonus_accruals', {
        id: b.id,
        operator_id: operatorId,
        type: b.type,
        label: b.label,
        amount: b.amount,
        detail: b.detail,
      })
    } catch {
      // Primary key conflict = this exact bonus was already accrued on a
      // previous run (page view or cron tick) — that's the idempotency
      // guarantee working as intended, not an error.
    }
  }
}

export async function listBonuses(operatorId: string): Promise<BonusEntry[]> {
  await computeBonusAccruals(operatorId)
  const rows = await sbSelect('bonus_accruals', `select=*&operator_id=eq.${enc(operatorId)}&order=created_at.desc`)
  return rows.map(rowToBonus)
}

// Keeps a chatter's "Clients" CRM tab populated with real, derived numbers
// instead of the empty table it always showed before (nothing ever wrote to
// crm_client_cards). Called whenever a real message is exchanged in a
// conversation on one of this operator's assigned profiles, so the card is
// always in sync with real activity rather than needing its own cron.
export async function syncClientCard(operatorId: string, clientUserId: string): Promise<ClientCard | null> {
  const profileIds = await getAssignedProfileIds(operatorId)
  if (profileIds.length === 0) return null
  const inList = profileIds.map(enc).join(',')

  const [convRows, txRows, user, existingRows] = await Promise.all([
    sbSelect('conversations', `select=id,updated_at&user_id=eq.${enc(clientUserId)}&expert_id=in.(${inList})`),
    sbSelect('transactions', `select=amount&type=eq.session&user_id=eq.${enc(clientUserId)}&expert_id=in.(${inList})`),
    getUserById(clientUserId),
    sbSelect('crm_client_cards', `select=notes&id=eq.${enc(`cc_${operatorId}_${clientUserId}`)}`),
  ])

  const sessionsCount = convRows.length
  const totalSpent = +txRows.reduce((s: number, t: any) => s + Math.abs(Number(t.amount)), 0).toFixed(2)
  const lastSessionIso: string | null = convRows.reduce(
    (max: string | null, c: any) => (!max || c.updated_at > max ? c.updated_at : max), null as string | null,
  )
  const daysSinceLast = lastSessionIso ? (Date.now() - new Date(lastSessionIso).getTime()) / 86400000 : Infinity
  const tag: ClientCard['tag'] = totalSpent >= 50 ? 'vip' : sessionsCount <= 1 ? 'new' : daysSinceLast > 14 ? 'at_risk' : 'active'
  const name = user?.name ?? clientUserId
  const avatar = name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'CL'

  const row = await sbUpsert('crm_client_cards', {
    id: `cc_${operatorId}_${clientUserId}`,
    operator_id: operatorId,
    name,
    avatar,
    tag,
    sessions_count: sessionsCount,
    total_spent: totalSpent,
    last_session: lastSessionIso,
    notes: existingRows[0]?.notes ?? '',
  })
  return rowToClientCard(row)
}

// ─── Profile assignments (handover) ─────────────────────────────────────────

export async function listProfileAssignments(): Promise<ProfileAssignment[]> {
  const rows = await sbSelect('profile_assignments', 'select=*&order=assigned_at.desc')
  return rows.map(rowToAssignment)
}

// BUG FIX (code audit, 2026-08-28): "unassign the current row, then insert
// a new one" used to be a plain read-then-write with no protection — unlike
// every money-touching function elsewhere in this file, which uses exactly
// this compare-and-swap pattern specifically to prevent two concurrent
// calls both succeeding. Two handover requests for the same profileId
// landing close together (an admin double-submit, or two admin sessions
// acting on the same profile) could both read the same "current" assignment
// before either unassigned it, producing two simultaneously-active
// (unassigned_at = null) assignments for one profile — and
// computeChatterLifetimeEarned attributes any transaction in that overlap
// window to BOTH operators, double-crediting the same client sessions
// toward both chatters' real payout balances. The conditional UPDATE below
// only succeeds if this call is the one that actually flips the still-active
// row — a losing concurrent call gets zero matched rows and is rejected
// outright (caller shows a real error) instead of silently going on to
// create the overlap.
export async function reassignProfile(
  profileId: string,
  newOperatorId: string,
  newOperatorName: string,
  reason: ProfileAssignment['reason'] = 'handover',
) {
  const current = await sbSelect('profile_assignments', `select=*&profile_id=eq.${enc(profileId)}&unassigned_at=is.null`)
  const existing = current[0]
  const nowIso = new Date().toISOString()
  if (existing) {
    const unassigned = await sbUpdate('profile_assignments', `id=eq.${enc(existing.id)}&unassigned_at=is.null`, { unassigned_at: nowIso })
    if (!unassigned || unassigned.length === 0) {
      throw new Error('This profile was just reassigned by someone else — reload and try again.')
    }
  }
  const row = await sbInsert('profile_assignments', {
    id: `pa${Date.now()}`,
    profile_id: profileId,
    profile_name: existing?.profile_name ?? profileId,
    operator_id: newOperatorId,
    operator_name: newOperatorName,
    assigned_at: nowIso,
    unassigned_at: null,
    reason,
  })
  return rowToAssignment(row)
}

// ─── Expert public profiles ─────────────────────────────────────────────────
// Real replacement for the old lib/data.ts EXPERTS array (six fabricated
// psychics with invented ratings/review counts). Every row here is a real
// public profile, always linked to a real operator via profile_assignments
// (see reassignProfile above — profile and operator are deliberately
// separate records). A brand-new profile starts with rating=null (not 0 —
// null means "no reviews yet", 0 would look like a bad rating).
// price_per_min starts at FIXED_PRICE_PER_MIN (see createExpertProfileForOperator
// below) and from then on is an admin-only, per-chatter number — see
// updateExpertPricePerMin. It is never null and never chatter-editable.
// Chatter payout tier — replaces the earlier "commission %" idea, and this
// block itself replaces the original 3-tier (junior/middle/senior) system
// entirely, per the real ТЕХНІЧНЕ ЗАВДАННЯ doc + Дмитро's direct Telegram
// confirmation ("там де рівні та ставки чатерів це друга пропозиція для
// новачків" — the Beginner/Medium/Senior/Master tiers are a track for
// newcomers specifically, and there's a separate track for chatters with
// experience). It's not a percentage of what the client pays — it's an
// individual cents-per-minute rate, set by tier. What the client pays is a
// separate, also admin-set number (price_per_min) that must be at least the
// chatter's own tier rate — see PriceBelowPayoutRateError.
//
// Two tracks (newcomer / experienced) × four levels each (beginner / medium
// / senior / master) = 8 combined tiers. Per your explicit confirmation: a
// chatter's track+level is set ONLY by an admin, by hand — there is no
// automatic promotion by tenure, session count, or rating, and a chatter can
// move between tracks (not just levels) the same manual way.
export type ChatterTrack = 'newcomer' | 'experienced'
export type ChatterLevel = 'beginner' | 'medium' | 'senior' | 'master'
export type ChatterTier = `${ChatterTrack}_${ChatterLevel}`

// Rates for the "newcomer" track ($0.14/$0.19/$0.24/$0.29) are CONFIRMED —
// straight from the real ТЕХНІЧНЕ ЗАВДАННЯ doc's "8. РІВНІ ТА СТАВКИ
// ЧАТЕРІВ" section. Rates for the "experienced" track ($0.32/$0.38/$0.44/
// $0.50) are CONFIRMED — from Дима's Telegram message giving the 4 rates
// "для тих хто з досвідом". The level *names* for the experienced track
// (beginner/medium/senior/master, mirroring the newcomer track's names) are
// my own naming choice, NOT something the TZ doc or Telegram messages spell
// out — only the 4 rate numbers were given for that track. If you/the team
// want different level names for the experienced track, this is the one
// place to change them (and the matching i18n labels below).
export const CHATTER_TIER_RATES: Record<ChatterTier, number> = {
  newcomer_beginner: 0.14,
  newcomer_medium: 0.19,
  newcomer_senior: 0.24,
  newcomer_master: 0.29,
  experienced_beginner: 0.32,
  experienced_medium: 0.38,
  experienced_senior: 0.44,
  experienced_master: 0.50,
}

// Human-readable labels — used anywhere a tier needs to show up as text
// (KPI "sub" strings, etc.) instead of the raw `newcomer_beginner`-style key.
export const CHATTER_TIER_LABELS: Record<ChatterTier, string> = {
  newcomer_beginner: 'Newcomer — Beginner',
  newcomer_medium: 'Newcomer — Medium',
  newcomer_senior: 'Newcomer — Senior',
  newcomer_master: 'Newcomer — Master',
  experienced_beginner: 'Experienced — Beginner',
  experienced_medium: 'Experienced — Medium',
  experienced_senior: 'Experienced — Senior',
  experienced_master: 'Experienced — Master',
}

// Default tier for a brand-new chatter and the fallback used anywhere a
// profile's tier row is somehow missing. "Newcomer — Beginner" (the lowest
// rate) is the safe choice: it never over-pays a chatter the admin hasn't
// actually reviewed yet, and the admin can promote them by hand right away
// if that's wrong.
export const DEFAULT_CHATTER_TIER: ChatterTier = 'newcomer_beginner'

// Confirmed by the client directly (not a placeholder): a chatter can't file
// a payout request below this amount. Enforced in
// app/api/crm/payout-request/route.ts, the one place a payout request is
// actually created.
export const MIN_PAYOUT_AMOUNT = 50

// CONFIRMED (2026-09-10, explicit client instruction): chatters can request
// a payout at most once every 14 days — a real cadence, not the "whenever,
// admin decides by hand" gap that existed before. Enforced in
// app/api/crm/payout-request/route.ts via canRequestPayout below, the same
// place MIN_PAYOUT_AMOUNT is enforced.
export const PAYOUT_COOLDOWN_DAYS = 14

export class PayoutCooldownError extends Error {
  constructor(public nextEligibleAt: string) {
    super(`You can request a payout every ${PAYOUT_COOLDOWN_DAYS} days — your next request opens on ${new Date(nextEligibleAt).toLocaleDateString()}.`)
    this.name = 'PayoutCooldownError'
  }
}

// A rejected request doesn't count against the cooldown — if a chatter's
// request was rejected (e.g. wrong payout method on file), they shouldn't
// have to wait another 14 days just to correct it and try again. Only
// 'pending' or 'approved' requests start the clock, same as
// getChatterPayoutBalance already treats those two statuses as "already
// spoken for" elsewhere in this file.
export async function canRequestPayout(operatorId: string): Promise<{ allowed: true } | { allowed: false; nextEligibleAt: string }> {
  const rows = await sbSelect(
    'payout_requests',
    `select=created_at&user_id=eq.${enc(operatorId)}&status=neq.rejected&order=created_at.desc&limit=1`,
  )
  if (rows.length === 0) return { allowed: true }
  const lastRequestedAt = new Date(rows[0].created_at).getTime()
  const nextEligibleAt = new Date(lastRequestedAt + PAYOUT_COOLDOWN_DAYS * 86400000)
  if (Date.now() >= nextEligibleAt.getTime()) return { allowed: true }
  return { allowed: false, nextEligibleAt: nextEligibleAt.toISOString() }
}

export interface ExpertProfile {
  id: string
  name: string
  specialty: string[]
  category: string | null
  rating: number | null
  reviews: number
  sessions: number
  pricePerMin: number | null
  online: boolean
  // Nebula-style "Busy" status — independent of online/offline. SCOPING
  // NOTE (see CHANGES.md): this is shown honestly wherever online already
  // is, but — like online — it does NOT hard-block a client from starting a
  // new chat server-side. Sensora has no client→chatter matching/routing
  // system today (clients pick a specific expert directly), so there's
  // nothing for "busy" to block that "online" doesn't already leave
  // unblocked; building real queue-routing enforcement would be new, much
  // bigger scope than "add a status toggle," and wasn't part of this ask.
  busy: boolean
  bio: string
  badge: 'Master' | 'Senior' | null
  avatar: string
  avatarUrl: string | null
  tags: string[]
  // Admin-only field (see updateExpertTier below) — chatters can't set their
  // own tier, same policy as pricePerMin.
  tier: ChatterTier
  // Admin-only "soft delete" (see setExpertActive below). There is no real
  // hard-delete for a chatter profile anywhere in this app, on purpose —
  // past transactions, reviews, and session history reference a chatter's
  // profile id, and actually deleting the row would either orphan or
  // silently corrupt that historical/accounting data. Deactivating instead:
  // the profile stops appearing anywhere a client can find or start a chat
  // with it (listExpertProfiles filters these out by default — see below),
  // but every past record tied to it stays exactly as it was. Defaults to
  // true so existing rows (before the `active` column existed) and any row
  // where it's somehow null both read as active, not silently hidden.
  active: boolean
}

// No heartbeat for this long (heartbeats come every 30s) = chatter is gone.
const PRESENCE_STALE_MS = 90 * 1000

function rowToExpertProfile(r: any): ExpertProfile {
  return {
    id: r.id,
    name: r.name,
    specialty: r.specialty ?? [],
    category: r.category ?? null,
    rating: r.rating === null || r.rating === undefined ? null : Number(r.rating),
    reviews: Number(r.reviews ?? 0),
    sessions: Number(r.sessions ?? 0),
    pricePerMin: r.price_per_min === null || r.price_per_min === undefined ? null : Number(r.price_per_min),
    // Presence: a profile whose chatter has had the CRM open recently counts
    // as online; if the CRM stopped sending heartbeats (tab closed, phone
    // locked, lost connection) it reads as offline automatically. Profiles
    // that never sent a heartbeat (last_seen_at null) keep whatever flag they
    // have, exactly as before.
    online: Boolean(r.online) && (!r.last_seen_at || Date.now() - new Date(r.last_seen_at).getTime() < PRESENCE_STALE_MS),
    busy: Boolean(r.busy),
    bio: r.bio ?? '',
    badge: r.badge ?? null,
    avatar: r.avatar ?? r.name.slice(0, 2).toUpperCase(),
    avatarUrl: r.avatar_url ?? null,
    tags: r.tags ?? [],
    tier: (r.tier as ChatterTier) ?? DEFAULT_CHATTER_TIER,
    // r.active is only ever `false` once someone has actually deactivated
    // the profile — missing/null (rows from before this column existed)
    // reads as active, per the comment on ExpertProfile.active above.
    active: r.active !== false,
  }
}

// `includeInactive` defaults to false — the public listing (app/api/experts,
// which both the client-facing search/home screens AND, previously, the
// admin CRM page all called) should never show a deactivated chatter. The
// admin CRM needs to see deactivated ones too (to reactivate them), so it
// calls this with includeInactive:true via its own admin-only route
// (app/api/admin/experts) instead of the public one.
export async function listExpertProfiles(opts?: { includeInactive?: boolean }): Promise<ExpertProfile[]> {
  const query = opts?.includeInactive
    ? 'select=*&order=name.asc'
    : 'select=*&active=eq.true&order=name.asc'
  const rows = await sbSelect('experts', query)
  return rows.map(rowToExpertProfile)
}

export async function getExpertProfileById(id: string): Promise<ExpertProfile | undefined> {
  const rows = await sbSelect('experts', `select=*&id=eq.${enc(id)}`)
  return rows[0] ? rowToExpertProfile(rows[0]) : undefined
}

// Company-wide flat rate, applied to every chatter's profile the moment it's
// created — was `null` before, which rendered as the literal string
// "$null/min" on the public expert-profile screen until a chatter manually
// set their own price. Now every new profile starts fully priced, and (see
// updateExpertProfile below / app/api/crm/my-profile/route.ts) chatters can
// no longer change it themselves — this is a deliberate policy, not a
// placeholder, so it's a named constant rather than a per-profile default
// that happens to match.
// UPDATED POLICY: this used to be a hard rule — "the client always pays
// $2/min, every chatter, no exceptions" (the original ТЕХНІЧНЕ ЗАВДАННЯ doc).
// Per your explicit instruction, that's no longer true: price-per-minute is
// now set individually per chatter, by an admin only (see
// updateExpertPricePerMin below and app/api/admin/chatter-price/route.ts) —
// never by the chatter themselves. This constant is kept only as the
// starting price a brand-new profile gets at creation (see
// createExpertProfileForOperator below); an admin can change it for any
// chatter afterward, subject to the floor check in updateExpertPricePerMin.
export const FIXED_PRICE_PER_MIN = 2.00

// Thrown by updateExpertPricePerMin when an admin tries to set a chatter's
// per-minute client price below that chatter's own per-minute payout rate
// (CHATTER_TIER_RATES[tier]) — per your explicit instruction: a session
// priced below the payout rate would lose the company money on every second
// billed, and nothing enforced that before this. Carries the actual minimum
// so the caller can show a precise, real number instead of a vague error.
export class PriceBelowPayoutRateError extends Error {
  constructor(public minimum: number) {
    super(`Price per minute must be at least $${minimum.toFixed(2)} (this chatter's own payout rate) — a lower price would lose money on every session.`)
    this.name = 'PriceBelowPayoutRateError'
  }
}

// Real onboarding step: a brand-new chatter (from completeChatterRegistrationFromCode
// below) gets their own real public profile the moment their account exists —
// honestly empty (no bio, no reviews) rather than either leaving them
// profile-less (the bug the existing staff_chatter_1 account had — "No
// profile assigned yet" everywhere) or fabricating plausible-looking stats.
// Price is the one field that's deliberately NOT left empty — see
// FIXED_PRICE_PER_MIN above.
export async function createExpertProfileForOperator(
  operatorId: string,
  operatorName: string,
  extra?: { bio?: string; avatarUrl?: string },
): Promise<ExpertProfile> {
  const id = `exp_${operatorId}`
  const row = await sbInsert('experts', {
    id,
    name: operatorName,
    specialty: [],
    category: null,
    rating: null,
    reviews: 0,
    sessions: 0,
    price_per_min: FIXED_PRICE_PER_MIN,
    online: false,
    bio: extra?.bio ?? '',
    badge: null,
    avatar: operatorName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'CH',
    avatar_url: extra?.avatarUrl ?? null,
    tags: [],
    tier: DEFAULT_CHATTER_TIER,
    active: true,
  })
  await reassignProfile(id, operatorId, operatorName, 'initial')
  return rowToExpertProfile(row)
}

// Nebula-style "one login, several profiles": one chatter account can own up to
// MAX_PROFILES_PER_CHATTER public profiles. They all share the same login,
// payout balance, KPI and Live Chat tab (everything is already keyed on
// getAssignedProfileIds) — each profile just has its own name, bio, photo,
// online/busy state and conversations. Extra profiles start at the default
// tier/price like a brand-new chatter's first one; only an admin can change
// tier/price (unchanged).
export const MAX_PROFILES_PER_CHATTER = 4

export class ProfileLimitError extends Error {
  constructor(public max: number) {
    super(`You can have at most ${max} profiles on one account.`)
    this.name = 'ProfileLimitError'
  }
}

export async function createAdditionalProfileForOperator(
  operatorId: string,
  operatorName: string,
  input: { name: string; bio?: string; avatarUrl?: string },
): Promise<ExpertProfile> {
  const existing = await getAssignedProfileIds(operatorId)
  if (existing.length >= MAX_PROFILES_PER_CHATTER) throw new ProfileLimitError(MAX_PROFILES_PER_CHATTER)
  const name = input.name.trim()
  const id = `exp_${operatorId}_${Date.now().toString(36)}`
  const row = await sbInsert('experts', {
    id,
    name,
    specialty: [],
    category: null,
    rating: null,
    reviews: 0,
    sessions: 0,
    price_per_min: FIXED_PRICE_PER_MIN,
    online: false,
    bio: input.bio ?? '',
    badge: null,
    avatar: name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase() || 'CH',
    avatar_url: input.avatarUrl ?? null,
    tags: [],
    tier: DEFAULT_CHATTER_TIER,
    active: true,
  })
  await reassignProfile(id, operatorId, operatorName, 'initial')
  return rowToExpertProfile(row)
}

// Admin-only — separate from updateExpertProfile on purpose: a chatter
// should not be able to promote their own tier (and therefore their own
// payout rate) by calling the profile-edit endpoint. pricePerMin is handled
// the same way, in updateExpertPricePerMin just below — it used to be
// listed in updateExpertProfile's patch type even though the one real
// caller (app/api/crm/my-profile/route.ts) never actually passed it, which
// was a real gap, not just a stale comment: anything calling
// updateExpertProfile directly with a pricePerMin field would have gone
// straight through with no floor check at all. pricePerMin is no longer in
// updateExpertProfile's type at all — the only way to change it now is the
// validated admin-only function below.
// BUG FIX (code audit, 2026-08-28): this used to update the tier alone, with
// no re-check against the chatter's existing client-facing price_per_min.
// updateExpertPricePerMin below correctly refuses to set a price below the
// chatter's OWN tier payout rate — but that check only ever ran when the
// PRICE changed. Raising a chatter's TIER (e.g. newcomer_beginner →
// experienced_master, $0.14/min payout → $0.50/min payout) went through
// this function untouched, silently leaving price_per_min wherever it was —
// which could now be below the new payout rate, making every session with
// that chatter a real loss on the company's own books, from the other
// direction the price-floor check was built to prevent. Now re-checks (and,
// if needed, raises) price_per_min in the same update so the invariant
// "client price ≥ this chatter's own payout rate" holds after EITHER kind
// of change, not just a direct price edit.
export async function updateExpertTier(profileId: string, tier: ChatterTier): Promise<ExpertProfile> {
  const rows = await sbSelect('experts', `select=price_per_min&id=eq.${enc(profileId)}`)
  const currentPrice = rows[0]?.price_per_min === null || rows[0]?.price_per_min === undefined
    ? null
    : Number(rows[0].price_per_min)
  const minimum = CHATTER_TIER_RATES[tier]
  const patch: Record<string, any> = { tier }
  // Only ever raises the price, never lowers it — a tier promotion should
  // never happen to also cut what the chatter's clients pay by coincidence.
  if (currentPrice !== null && currentPrice < minimum) {
    patch.price_per_min = minimum
  }
  const row = await sbUpdate('experts', `id=eq.${enc(profileId)}`, patch)
  return rowToExpertProfile(row[0])
}

// Admin-only — sets what clients actually pay per minute for THIS specific
// chatter's profile. Same reasoning as updateExpertTier just above (a
// chatter must never set this for themselves), plus a real floor check that
// didn't exist before: the new price can never be set below this chatter's
// own per-minute payout rate (their tier's CHATTER_TIER_RATES value), since
// anything lower would make every session with them a real loss for the
// company, not a hypothetical one. Reads the profile's current tier fresh
// from the database rather than trusting a caller-supplied tier, so this
// can't be bypassed by racing a tier change.
export async function updateExpertPricePerMin(profileId: string, price: number): Promise<ExpertProfile> {
  const rows = await sbSelect('experts', `select=tier&id=eq.${enc(profileId)}`)
  const tier: ChatterTier = (rows[0]?.tier as ChatterTier) ?? DEFAULT_CHATTER_TIER
  const minimum = CHATTER_TIER_RATES[tier]
  if (price < minimum) throw new PriceBelowPayoutRateError(minimum)
  const row = await sbUpdate('experts', `id=eq.${enc(profileId)}`, { price_per_min: price })
  return rowToExpertProfile(row[0])
}

// A chatter can only ever edit the profile(s) currently assigned to them
// (getAssignedProfileIds) — enforced by the caller (see
// app/api/crm/my-profile/route.ts), not just by this function, but this
// function only ever touches the one row it's given so there's no way to
// reach another operator's profile through it.
export async function updateExpertProfile(
  profileId: string,
  patch: Partial<Pick<ExpertProfile, 'bio' | 'specialty' | 'category' | 'avatar' | 'avatarUrl' | 'tags'>>,
): Promise<ExpertProfile> {
  const dbPatch: Record<string, any> = {}
  if (patch.bio !== undefined) dbPatch.bio = patch.bio
  if (patch.specialty !== undefined) dbPatch.specialty = patch.specialty
  if (patch.category !== undefined) dbPatch.category = patch.category
  if (patch.avatar !== undefined) dbPatch.avatar = patch.avatar
  if (patch.avatarUrl !== undefined) dbPatch.avatar_url = patch.avatarUrl
  if (patch.tags !== undefined) dbPatch.tags = patch.tags
  const rows = await sbUpdate('experts', `id=eq.${enc(profileId)}`, dbPatch)
  return rowToExpertProfile(rows[0])
}

// Admin-only "delete" for a chatter profile — see the comment on
// ExpertProfile.active for why this is a soft hide rather than a real
// DELETE FROM experts. Deliberately its own function, same pattern as
// updateExpertTier/updateExpertPricePerMin above, rather than something a
// chatter could reach through updateExpertProfile (which only ever accepts
// bio/specialty/category/avatar/avatarUrl/tags — active is not in that
// list, on purpose).
export async function setExpertActive(profileId: string, active: boolean): Promise<ExpertProfile> {
  const rows = await sbUpdate('experts', `id=eq.${enc(profileId)}`, { active })
  return rowToExpertProfile(rows[0])
}

export async function setExpertOnline(profileId: string, online: boolean): Promise<ExpertProfile> {
  const rows = await sbUpdate('experts', `id=eq.${enc(profileId)}`, { online })
  return rowToExpertProfile(rows[0])
}

// Automatic online/offline for a chatter account (all its profiles at once):
//   'online'    — CRM opened: every profile goes online, last_seen refreshed
//   'heartbeat' — CRM still open: only last_seen refreshed
//   'offline'   — CRM closed / signed out: every profile goes offline
export async function setOperatorPresence(operatorId: string, state: 'online' | 'heartbeat' | 'offline'): Promise<void> {
  const ids = await getAssignedProfileIds(operatorId)
  if (ids.length === 0) return
  const patch: Record<string, any> = { last_seen_at: new Date().toISOString() }
  if (state === 'online') patch.online = true
  if (state === 'offline') { patch.online = false; patch.busy = false }
  await sbUpdate('experts', `id=in.(${ids.map(enc).join(',')})`, patch)
}

export async function setExpertBusy(profileId: string, busy: boolean): Promise<ExpertProfile> {
  const rows = await sbUpdate('experts', `id=eq.${enc(profileId)}`, { busy })
  return rowToExpertProfile(rows[0])
}

// Exported so /api/crm/my-profile can find which real profile(s) belong to
// the signed-in chatter — reuses the exact same "profile vs operator" lookup
// KPI/bonuses/client-cards already rely on, so "your profile" always means
// the same thing everywhere in the CRM.
export async function getOperatorProfiles(operatorId: string): Promise<ExpertProfile[]> {
  const profileIds = await getAssignedProfileIds(operatorId)
  if (profileIds.length === 0) return []
  const inList = profileIds.map(enc).join(',')
  const rows = await sbSelect('experts', `select=*&id=in.(${inList})`)
  return rows.map(rowToExpertProfile)
}

// Backs the chatter CRM's Pings tab — a chatter re-opening a real
// conversation with a past client to try to win them back, not a
// notification/marketing blast. Reuses startConversation() below exactly as
// the client-facing "start a chat" flow does: if a conversation with this
// client already exists on the operator's assigned profile it's reactivated
// (status back to 'active', so it also reappears in the operator's own
// Live Chat tab if the client replies), otherwise a new one is created. The
// message is a real row in `messages` with sender_role 'operator', same as
// any other reply — nothing about this is a special/fake message type.
export async function sendPing(operatorId: string, clientUserId: string, text: string, profileId?: string): Promise<Conversation | null> {
  const profiles = await getOperatorProfiles(operatorId)
  const profile = (profileId && profiles.find(p => p.id === profileId)) || profiles[0]
  if (!profile) return null
  return startConversation(clientUserId, {
    id: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    specialty: profile.specialty.join(', ') || profile.category || '',
  }, text)
}

export interface ChatterPerformance {
  operatorId: string
  operatorName: string
  status: User['status']
  profile: ExpertProfile | null
  kpi: KpiStat[]
}

// Admin-facing "how is every chatter actually doing" view — reuses the exact
// same getKpi() a chatter sees for themselves in their own /crm/chatter
// dashboard, just computed for every expert-role account instead of one, so
// there's a single definition of "active chats" / "avg rating" / etc. shared
// by both surfaces instead of two numbers that could quietly drift apart.
export async function listChatterPerformance(): Promise<ChatterPerformance[]> {
  const rows = await sbSelect('users', `select=*&role=eq.expert&order=name.asc`)
  const operators = rows.map(rowToUser)
  return Promise.all(operators.map(async (op): Promise<ChatterPerformance> => {
    const [profiles, kpi] = await Promise.all([
      getOperatorProfiles(op.id),
      getKpi(op.id),
    ])
    return {
      operatorId: op.id,
      operatorName: op.name,
      status: op.status,
      profile: profiles[0] ?? null,
      kpi,
    }
  }))
}

// ─── Conversations (Chatroom) ───────────────────────────────────────────────
// Real, per-user chat threads — created only when the signed-in user actually
// starts a live-chat session, and updated only from real messages sent in
// that session. There is no seed data here on purpose: a brand-new real
// account has zero conversations until it has zero real ones, same as it has
// $0 balance until it really tops up.

export async function listConversations(userId: string): Promise<Conversation[]> {
  const rows = await sbSelect('conversations', `select=*&user_id=eq.${enc(userId)}&order=updated_at.desc`)
  return rows.map(rowToConversation)
}

export async function getConversationById(id: string): Promise<Conversation | undefined> {
  const rows = await sbSelect('conversations', `select=*&id=eq.${enc(id)}`)
  return rows[0] ? rowToConversation(rows[0]) : undefined
}

export async function startConversation(
  userId: string,
  expert: { id: string; name: string; avatar: string; specialty: string },
  greeting: string,
) {
  const existingRows = await sbSelect(
    'conversations',
    `select=*&user_id=eq.${enc(userId)}&expert_id=eq.${enc(expert.id)}`,
  )
  const nowIso = new Date().toISOString()
  if (existingRows[0]) {
    // BUG FIX (reported: "система нагадує хаотично про себе... ніби чатер
    // сам пише, коли в цей день немає переписки" — reopening ANY existing
    // chat, even one with zero new real activity that day, used to
    // overwrite this conversation's `last_message` — the line shown in the
    // Chatroom list — with the same hardcoded "Hi! I'm X, tell me what's on
    // your mind?" template. live-chat-screen.tsx calls this on every mount
    // (whenever the client opens that expert's chat, not just the first
    // time), so every re-open made the list preview look like the chatter
    // had just proactively messaged them, when nothing real had happened.
    // Reactivation now only resets `status`/`activated_at` (a fresh "live
    // window" for timer/earnings purposes, unchanged) — `last_message`
    // stays whatever the real last message actually was, exactly like the
    // brand-new-conversation branch below already does correctly (it only
    // ever sets `last_message` once, to the one real greeting a chatter
    // gets when a client contacts them for the first time).
    const updated = await sbUpdate('conversations', `id=eq.${enc(existingRows[0].id)}`, {
      status: 'active',
      updated_at: nowIso,
      activated_at: nowIso,
      ended_at: null,
    })
    return rowToConversation(updated[0] ?? existingRows[0])
  }
  const row = await sbInsert('conversations', {
    id: uid('conv'),
    user_id: userId,
    expert_id: expert.id,
    expert_name: expert.name,
    avatar: expert.avatar,
    specialty: expert.specialty,
    last_message: greeting,
    status: 'active',
    updated_at: nowIso,
    activated_at: nowIso,
    // The auto-greeting below is sent as the operator, so the client isn't
    // shown as "waiting" (Queue count) until they actually say something.
    last_sender_role: 'operator',
  })
  // The greeting is also a real message row (sender_role 'operator'), so it
  // shows up in the same thread the assigned chatter and the client both
  // poll — not just a summary string on the conversation row.
  await sbInsert('messages', {
    id: uid('msg'),
    conversation_id: row.id,
    sender_role: 'operator',
    sender_id: expert.id,
    text: greeting,
  }).catch(() => {})
  return rowToConversation(row)
}

export async function appendConversationMessage(userId: string, expertId: string, text: string) {
  const rows = await sbSelect('conversations', `select=*&user_id=eq.${enc(userId)}&expert_id=eq.${enc(expertId)}`)
  if (!rows[0]) return null
  const nowIso = new Date().toISOString()
  const updated = await sbUpdate('conversations', `id=eq.${enc(rows[0].id)}`, {
    last_message: text,
    updated_at: nowIso,
  })
  return rowToConversation(updated[0] ?? rows[0])
}

export async function completeConversation(userId: string, expertId: string) {
  const rows = await sbSelect('conversations', `select=*&user_id=eq.${enc(userId)}&expert_id=eq.${enc(expertId)}`)
  if (!rows[0]) return null
  // ended_at freezes the chatter CRM's live timer at the real end moment
  // (before this, the timer was "now − activated_at" and kept counting forever
  // after the client ended the session). Only stamped the first time.
  const patch: Record<string, any> = { status: 'completed' }
  if (rows[0].status !== 'completed' || !rows[0].ended_at) patch.ended_at = new Date().toISOString()
  const updated = await sbUpdate('conversations', `id=eq.${enc(rows[0].id)}`, patch)
  return rowToConversation(updated[0] ?? rows[0])
}

// "End chat" button in the chatter CRM — a chatter (or admin) closes one of
// their own live conversations. Same end state as the client tapping End:
// status 'completed' + ended_at. The billing route then refuses further
// charges for it (see app/api/session/charge/route.ts), and the client's
// screen switches to the "chatter ended the session" screen.
export async function endConversationAsOperator(operatorId: string, conversationId: string): Promise<Conversation | null> {
  const rows = await sbSelect('conversations', `select=*&id=eq.${enc(conversationId)}`)
  const conv = rows[0]
  if (!conv) return null
  const assignedIds = await getAssignedProfileIds(operatorId)
  if (!assignedIds.includes(conv.expert_id)) return null
  if (conv.status === 'completed') return rowToConversation(conv)
  const updated = await sbUpdate('conversations', `id=eq.${enc(conversationId)}&status=eq.active`, {
    status: 'completed',
    ended_at: new Date().toISOString(),
  })
  return rowToConversation(updated?.[0] ?? conv)
}

// Used by the billing route: true if this client↔expert conversation was
// already closed (by either side), so no further seconds may be charged.
export async function isConversationEnded(userId: string, expertId: string): Promise<boolean> {
  const rows = await sbSelect('conversations', `select=status&user_id=eq.${enc(userId)}&expert_id=eq.${enc(expertId)}`)
  return rows[0]?.status === 'completed'
}

// ─── Chat messages (real, polled thread — no scripted auto-replies) ────────
// Every message either the client or the assigned operator actually sends is
// a real row here. The client screen and the chatter CRM both poll GET
// /api/messages for the same conversation id, so a reply typed by a real
// human in /crm/chatter shows up on the client's phone within one poll tick.

export async function sendMessage(
  conversationId: string,
  senderRole: 'client' | 'operator',
  senderId: string,
  text: string,
  imageUrl?: string | null,
): Promise<ChatMessage> {
  // FIX (reported: messages "duplicate when I write to the client"): the CRM
  // used to keep the typed text in the box until the server answered, so a
  // second Enter/click re-sent the same message. The identical message from
  // the same sender in the same chat within 4 seconds is now treated as a
  // double-send and returns the already-saved one instead of inserting again.
  const lastRows = await sbSelect(
    'messages',
    `select=*&conversation_id=eq.${enc(conversationId)}&order=created_at.desc&limit=1`,
  )
  const last = lastRows[0]
  if (
    last &&
    last.sender_role === senderRole &&
    (last.text ?? '') === text &&
    (last.image_url ?? null) === (imageUrl ?? null) &&
    Date.now() - new Date(last.created_at).getTime() < 4000
  ) {
    return rowToChatMessage(last)
  }
  const row = await sbInsert('messages', {
    id: uid('msg'),
    conversation_id: conversationId,
    sender_role: senderRole,
    sender_id: senderId,
    text,
    ...(imageUrl ? { image_url: imageUrl } : {}),
  })
  const nowIso = new Date().toISOString()
  // last_sender_role is what the Live Chat tab's "Queue" count is built from
  // — a conversation only counts as "waiting on you" while the client's
  // message is the most recent one. last_message shows "📷 Photo" for an
  // image-only message (empty text) so the conversation list/queue preview
  // never shows a blank line.
  const preview = text || (imageUrl ? '📷 Photo' : text)
  await sbUpdate('conversations', `id=eq.${enc(conversationId)}`, { last_message: preview, updated_at: nowIso, last_sender_role: senderRole }).catch(() => {})
  return rowToChatMessage(row)
}

// ─── Personal Tarot Spread Video — a bespoke paid product ──────────────────
// A client requests a personal tarot spread; a staff member (e.g. a
// chatter) records a real video reading for that specific request and
// uploads it; the client sees the delivered video in-app.
// REAL PAYMENT (2026-09-08): pays via real Stripe Checkout, same "insert a
// pending row, create a Checkout Session with that row's id in its
// metadata, let the webhook resolve it" pattern as topup_requests (see
// createStripeTopupRequest/resolveTopupRequest above) — replacing the old
// "payment coordinated outside the app" state, which had no real charge
// behind it at all. Same "honest about what's real" rule as everywhere else
// in this codebase: a row stays 'unpaid' and off staff's open queue until
// Stripe's webhook actually confirms the money is in.

export interface PersonalReading {
  id: string
  clientId: string
  clientName: string
  requestNote: string
  price: number
  status: 'requested' | 'in_progress' | 'delivered'
  // Real Stripe payment tracking, added alongside createPersonalReadingCheckout
  // below (2026-09-08) — this product used to have no payment flow at all
  // ("Payment for this is coordinated outside the app for now"); now it goes
  // through the same real Stripe Checkout as minute-package top-ups, just
  // resolved differently (see resolvePersonalReadingPayment). A row starts
  // 'unpaid' the instant it's created and only staff-visible (via
  // listOpenPersonalReadingRequests) once it flips to 'paid'.
  paymentStatus: 'unpaid' | 'paid' | 'failed'
  stripeSessionId: string | null
  paymentLink: string | null
  paidAt: string | null
  assignedTo: string | null
  videoUrl: string | null
  createdAt: string
  createdAtIso: string
  deliveredAt: string | null
}

function rowToPersonalReading(r: any): PersonalReading {
  return {
    id: r.id,
    clientId: r.client_id,
    clientName: r.client_name,
    requestNote: r.request_note ?? '',
    price: Number(r.price),
    status: r.status,
    paymentStatus: r.payment_status ?? 'unpaid',
    stripeSessionId: r.stripe_session_id ?? null,
    paymentLink: r.payment_link ?? null,
    paidAt: r.paid_at ? fmtDate(r.paid_at) : null,
    assignedTo: r.assigned_to ?? null,
    videoUrl: r.video_url ?? null,
    createdAt: fmtDate(r.created_at),
    createdAtIso: r.created_at,
    deliveredAt: r.delivered_at ? fmtDate(r.delivered_at) : null,
  }
}

// Step 1 of 2 (mirrors createStripeTopupRequest's two-step pattern) — insert
// the pending, unpaid row first to get a real id, then
// app/api/personal-reading/route.ts creates the Stripe Checkout Session
// with that id and calls attachPersonalReadingCheckout to record the
// session/url on it.
export async function createPersonalReadingRequest(
  clientId: string,
  clientName: string,
  requestNote: string,
  price: number,
): Promise<PersonalReading> {
  const row = await sbInsert('personal_readings', {
    id: uid('preading'),
    client_id: clientId,
    client_name: clientName,
    request_note: requestNote,
    price,
    status: 'requested',
    payment_status: 'unpaid',
  })
  return rowToPersonalReading(row)
}

// Step 2 of 2 — records the real Stripe Checkout URL/session id, same as
// attachStripeSession does for topup_requests.
export async function attachPersonalReadingCheckout(
  id: string,
  checkoutUrl: string,
  sessionId: string,
): Promise<PersonalReading | null> {
  const rows = await sbUpdate(
    'personal_readings',
    `id=eq.${enc(id)}`,
    { payment_link: checkoutUrl, stripe_session_id: sessionId },
  )
  return rows && rows.length > 0 ? rowToPersonalReading(rows[0]) : null
}

export async function listPersonalReadingsForClient(clientId: string): Promise<PersonalReading[]> {
  const rows = await sbSelect('personal_readings', `select=*&client_id=eq.${enc(clientId)}&order=created_at.desc`)
  return rows.map(rowToPersonalReading)
}

// Any staff member (admin or expert/chatter) can see the open queue and
// pick up a request — there's no per-expert assignment model for this
// product the way live-chat conversations have one; whoever records the
// video (Dmytro or any other chatter) claims it by delivering it.
// Only shows PAID requests (2026-09-08) — before payment was wired in, this
// showed every request regardless, which meant staff could spend time
// recording a video nobody had actually paid for yet. Once payment flow
// exists, "open queue" should mean "open AND paid".
export async function listOpenPersonalReadingRequests(): Promise<PersonalReading[]> {
  const rows = await sbSelect(
    'personal_readings',
    `select=*&status=neq.delivered&payment_status=eq.paid&order=created_at.asc`,
  )
  return rows.map(rowToPersonalReading)
}

// Webhook-driven resolution (see app/api/webhooks/stripe/route.ts), same
// compare-and-swap shape as resolveTopupRequest — the UPDATE only matches
// (and only "wins") if the row is still 'unpaid', so a retried/duplicate
// webhook delivery can't double-process the same payment.
export async function resolvePersonalReadingPayment(
  id: string,
  outcome: 'paid' | 'failed',
): Promise<PersonalReading | null> {
  const rows = await sbSelect('personal_readings', `select=*&id=eq.${enc(id)}`)
  const reading = rows[0]
  if (!reading) return null

  const updated = await sbUpdate(
    'personal_readings',
    `id=eq.${enc(id)}&payment_status=eq.unpaid`,
    outcome === 'paid'
      ? { payment_status: 'paid', paid_at: new Date().toISOString() }
      : { payment_status: 'failed' },
  )
  const won = updated && updated.length > 0
  return rowToPersonalReading(won ? updated[0] : reading)
}

export async function markPersonalReadingInProgress(id: string, staffId: string): Promise<PersonalReading | null> {
  const rows = await sbUpdate('personal_readings', `id=eq.${enc(id)}`, { status: 'in_progress', assigned_to: staffId })
  return rows[0] ? rowToPersonalReading(rows[0]) : null
}

export async function deliverPersonalReading(id: string, videoUrl: string, staffId: string): Promise<PersonalReading | null> {
  const rows = await sbUpdate('personal_readings', `id=eq.${enc(id)}`, {
    status: 'delivered',
    video_url: videoUrl,
    assigned_to: staffId,
    delivered_at: new Date().toISOString(),
  })
  return rows[0] ? rowToPersonalReading(rows[0]) : null
}

export async function getPersonalReadingById(id: string): Promise<PersonalReading | null> {
  const rows = await sbSelect('personal_readings', `select=*&id=eq.${enc(id)}`)
  return rows[0] ? rowToPersonalReading(rows[0]) : null
}

export async function listMessages(conversationId: string, afterIso?: string): Promise<ChatMessage[]> {
  const query = afterIso
    ? `select=*&conversation_id=eq.${enc(conversationId)}&created_at=gt.${enc(afterIso)}&order=created_at.asc`
    : `select=*&conversation_id=eq.${enc(conversationId)}&order=created_at.asc`
  const rows = await sbSelect('messages', query)
  return rows.map(rowToChatMessage)
}

export interface OperatorConversation extends Conversation {
  clientName: string
}

// Every currently-active conversation on a profile assigned to this
// operator, newest activity first — this is what powers the chatter CRM's
// Live Chat tab. Returns [] (honestly) if the operator has no assigned
// profile right now, rather than showing anything invented.
export async function listOperatorConversations(operatorId: string): Promise<OperatorConversation[]> {
  const profileIds = await getAssignedProfileIds(operatorId)
  if (profileIds.length === 0) return []
  const inList = profileIds.map(enc).join(',')
  const allActive = await sbSelect('conversations', `select=*&expert_id=in.(${inList})&status=eq.active&order=updated_at.desc`)
  // Close abandoned chats (no message and no billed second for 3h).
  const rows: any[] = []
  for (const r of allActive) {
    const lastMs = new Date(r.updated_at ?? r.activated_at ?? 0).getTime()
    if (Date.now() - lastMs > IDLE_AUTOCLOSE_MS) {
      const lastTx = await sbSelect(
        'transactions',
        `select=created_at&type=eq.session&user_id=eq.${enc(r.user_id)}&expert_id=eq.${enc(r.expert_id)}&order=created_at.desc&limit=1`,
      )
      const txMs = lastTx[0]?.created_at ? new Date(lastTx[0].created_at).getTime() : 0
      if (Date.now() - Math.max(lastMs, txMs) > IDLE_AUTOCLOSE_MS) {
        await sbUpdate('conversations', `id=eq.${enc(r.id)}&status=eq.active`, {
          status: 'completed',
          ended_at: new Date(Math.max(lastMs, txMs)).toISOString(),
        }).catch(() => {})
        continue
      }
    }
    rows.push(r)
  }
  if (rows.length === 0) return []
  const userIds = Array.from(new Set(rows.map((r: any) => r.user_id)))
  const userRows = await sbSelect('users', `select=id,name&id=in.(${userIds.map(enc).join(',')})`)
  const nameById = new Map<string, string>(userRows.map((u: any) => [u.id, u.name]))
  return rows.map((r: any) => ({ ...rowToConversation(r), clientName: nameById.get(r.user_id) ?? r.user_id }))
}

// Finished chats (client ended, chatter ended, or auto-closed as abandoned) —
// kept readable in the chatter CRM's "History" list instead of vanishing.
export async function listOperatorConversationHistory(operatorId: string): Promise<OperatorConversation[]> {
  const profileIds = await getAssignedProfileIds(operatorId)
  if (profileIds.length === 0) return []
  const inList = profileIds.map(enc).join(',')
  const rows = await sbSelect('conversations', `select=*&expert_id=in.(${inList})&status=eq.completed&order=updated_at.desc&limit=100`)
  if (rows.length === 0) return []
  const userIds = Array.from(new Set(rows.map((r: any) => r.user_id)))
  const userRows = await sbSelect('users', `select=id,name&id=in.(${userIds.map(enc).join(',')})`)
  const nameById = new Map<string, string>(userRows.map((u: any) => [u.id, u.name]))
  return rows.map((r: any) => ({ ...rowToConversation(r), clientName: nameById.get(r.user_id) ?? r.user_id }))
}

// BUG FIX (code audit): maybeSendLowBalanceWarning in
// app/api/session/charge/route.ts only fired the proactive low-balance push
// when a tick made the balance CROSS the warning threshold — a client who
// opens a chat with a balance already below that threshold (e.g. $1.50 left
// on a $2/min expert, already under the 60-second line on the very first
// tick) never crossed anything, so no push ever fired for them; they'd only
// find out via the in-chat banner once balance actually ran out under $1.
// This tells the route whether the charge that was JUST recorded (inserted
// before this is called) was the first billed second since the current live
// window began (conversations.activated_at) — if so, the route fires the
// warning even without a "crossing," covering the already-low-at-start case
// too, without needing any new persisted "already warned" flag.
export async function isFirstBilledSecondOfWindow(userId: string, expertId: string): Promise<boolean> {
  const convRows = await sbSelect(
    'conversations',
    `select=activated_at&user_id=eq.${enc(userId)}&expert_id=eq.${enc(expertId)}&status=eq.active`,
  )
  const activatedAt = convRows[0]?.activated_at
  if (!activatedAt) return false
  const txRows = await sbSelect(
    'transactions',
    `select=id&type=eq.session&user_id=eq.${enc(userId)}&expert_id=eq.${enc(expertId)}&created_at=gte.${enc(activatedAt)}&limit=2`,
  )
  return txRows.length === 1 // exactly the one charge just made — nothing billed before it in this window
}

// Real-time per-conversation timer + earnings — the chatter-CRM equivalent
// of Nebula's live session clock. Deliberately scoped to ONE conversation's
// current live window (since activated_at), not a whole-shift clock across
// every client — that would be a different, separately-scoped feature (a
// pausable work-shift timer), not built here; see CHANGES.md.
export interface LiveSessionEarnings {
  activatedAtIso: string | null
  billedSeconds: number
  earnedSoFar: number
  ratePerMinute: number
  // Set once the chat is closed (client ended it, or chatter pressed "End
  // chat") — the CRM timer freezes at this moment instead of running on.
  ended: boolean
  endedAtIso: string | null
}

export async function getLiveSessionEarnings(operatorId: string, conversationId: string): Promise<LiveSessionEarnings | null> {
  const rows = await sbSelect('conversations', `select=*&id=eq.${enc(conversationId)}`)
  const conv = rows[0]
  if (!conv) return null
  const assignedIds = await getAssignedProfileIds(operatorId)
  if (!assignedIds.includes(conv.expert_id)) return null // not this operator's conversation

  const tierRows = await sbSelect('experts', `select=tier&id=eq.${enc(conv.expert_id)}`)
  const tier = (tierRows[0]?.tier as ChatterTier) ?? DEFAULT_CHATTER_TIER
  const ratePerMinute = CHATTER_TIER_RATES[tier]

  const activatedAtIso: string | null = conv.activated_at ?? conv.updated_at ?? null
  const ended = conv.status === 'completed'
  // Older rows closed before ended_at existed fall back to updated_at.
  const endedAtIso: string | null = ended ? (conv.ended_at ?? conv.updated_at ?? null) : null
  if (!activatedAtIso) return { activatedAtIso: null, billedSeconds: 0, earnedSoFar: 0, ratePerMinute, ended, endedAtIso }

  // Each real 'session' transaction row = 1 billed second (same convention
  // already used by getKpi/getChatterPayoutBalance) — counting rows since
  // this live window started gives the real, actually-billed time, not a
  // clock-based estimate that could drift from what was really charged.
  const txRows = await sbSelect(
    'transactions',
    `select=id&type=eq.session&user_id=eq.${enc(conv.user_id)}&expert_id=eq.${enc(conv.expert_id)}&created_at=gte.${enc(activatedAtIso)}`,
  )
  const billedSeconds = txRows.length
  const earnedSoFar = +((billedSeconds / 60) * ratePerMinute).toFixed(2)

  // FIX (reported: a CRM timer showing 17+ hours): a chat the client simply
  // walked away from (app closed, no "End") stays status 'active' forever, and
  // the timer was "now − activated_at", so it kept counting. If an active chat
  // has had no message and no billed second for IDLE_FREEZE_MS, the timer now
  // freezes at the last real activity instead of running on.
  let frozenAtIso = endedAtIso
  if (!ended) {
    const lastTx = await sbSelect(
      'transactions',
      `select=created_at&type=eq.session&user_id=eq.${enc(conv.user_id)}&expert_id=eq.${enc(conv.expert_id)}&order=created_at.desc&limit=1`,
    )
    const candidates = [conv.updated_at, activatedAtIso, lastTx[0]?.created_at].filter(Boolean).map((x: string) => new Date(x).getTime())
    const lastActivityMs = Math.max(...candidates)
    if (Date.now() - lastActivityMs > IDLE_FREEZE_MS) frozenAtIso = new Date(lastActivityMs).toISOString()
  }
  return { activatedAtIso, billedSeconds, earnedSoFar, ratePerMinute, ended, endedAtIso: frozenAtIso }
}

// Active chat with no activity this long: the CRM timer stops counting.
const IDLE_FREEZE_MS = 15 * 60 * 1000
// Active chat with no activity this long is closed automatically (lazily,
// whenever the chatter's chat list loads) so abandoned chats don't pile up.
const IDLE_AUTOCLOSE_MS = 3 * 60 * 60 * 1000

// Real client-balance visibility for the chatter side — before this, a
// chatter had no way to see whether their client's balance was running low
// or had just been topped up; only the client's own screen showed it. Scoped
// the same way getLiveSessionEarnings is (conversation must belong to a
// profile assigned to this operator), so this can't be used to peek at an
// arbitrary client's balance by guessing a conversationId.
export async function getClientBalanceForConversation(operatorId: string, conversationId: string): Promise<number | null> {
  const rows = await sbSelect('conversations', `select=user_id,expert_id&id=eq.${enc(conversationId)}`)
  const conv = rows[0]
  if (!conv) return null
  const assignedIds = await getAssignedProfileIds(operatorId)
  if (!assignedIds.includes(conv.expert_id)) return null
  return getBalance(conv.user_id)
}

// ─── Hidden chats / favorite client (Nebula-style chatter CRM) ────────────
// Both are per-operator preferences stored directly on the conversation row
// — safe because a conversation's expert_id maps to exactly one operator at
// a time (profile_assignments), the same scoping already used everywhere
// else in the chatter CRM.
export async function setConversationFlags(
  operatorId: string,
  conversationId: string,
  patch: { hidden?: boolean; favorited?: boolean },
): Promise<Conversation | null> {
  const assignedIds = await getAssignedProfileIds(operatorId)
  const rows = await sbSelect('conversations', `select=id,expert_id&id=eq.${enc(conversationId)}`)
  const conv = rows[0]
  if (!conv || !assignedIds.includes(conv.expert_id)) return null
  const dbPatch: Record<string, boolean> = {}
  if (typeof patch.hidden === 'boolean') dbPatch.hidden_by_operator = patch.hidden
  if (typeof patch.favorited === 'boolean') dbPatch.favorited_by_operator = patch.favorited
  if (Object.keys(dbPatch).length === 0) return null
  const updated = await sbUpdate('conversations', `id=eq.${enc(conversationId)}`, dbPatch)
  return rowToConversation(updated[0])
}

// ─── Report Issue (Nebula-style chatter CRM) ───────────────────────────────
// A real, persisted report — not a UI dead-end. Visible to admin (see
// listChatReports, surfaced in the admin Overview tab) so a chatter tapping
// this button actually reaches a human, not just a client-side toast.
export interface ChatReport {
  id: string
  conversationId: string
  operatorId: string
  expertId: string
  clientUserId: string
  clientName: string
  reason: string
  status: 'open' | 'resolved'
  createdAt: string
  createdAtIso: string
}

function rowToChatReport(r: any): ChatReport {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    operatorId: r.operator_id,
    expertId: r.expert_id,
    clientUserId: r.client_user_id,
    clientName: r.client_name,
    reason: r.reason,
    status: r.status,
    createdAt: fmtTime(r.created_at),
    createdAtIso: r.created_at,
  }
}

export async function createChatReport(operatorId: string, conversationId: string, reason: string): Promise<ChatReport | null> {
  const assignedIds = await getAssignedProfileIds(operatorId)
  const rows = await sbSelect('conversations', `select=*&id=eq.${enc(conversationId)}`)
  const conv = rows[0]
  if (!conv || !assignedIds.includes(conv.expert_id)) return null
  const userRows = await sbSelect('users', `select=name&id=eq.${enc(conv.user_id)}`)
  const row = await sbInsert('chat_reports', {
    id: uid('rpt'),
    conversation_id: conversationId,
    operator_id: operatorId,
    expert_id: conv.expert_id,
    client_user_id: conv.user_id,
    client_name: userRows[0]?.name ?? conv.user_id,
    reason,
    status: 'open',
  })
  return rowToChatReport(row)
}

export async function listOpenChatReports(): Promise<ChatReport[]> {
  const rows = await sbSelect('chat_reports', 'select=*&status=eq.open&order=created_at.desc&limit=50')
  return rows.map(rowToChatReport)
}

export async function setChatReportStatus(id: string, status: ChatReport['status']): Promise<ChatReport | null> {
  const rows = await sbUpdate('chat_reports', `id=eq.${enc(id)}`, { status })
  return rows[0] ? rowToChatReport(rows[0]) : null
}

// ─── Client Reports (client reports an expert) ─────────────────────────────
// Counterpart to ChatReport above — that one only lets a chatter report a
// client. Store review guidelines for apps with live person-to-person chat
// (Apple 1.2, Google Play's UGC moderation policy) expect the reporting
// path to work from BOTH sides, not just one. Same shape, same
// "real, persisted, visible to admin" principle — filed from
// live-chat-screen.tsx, surfaced next to the existing chatter reports in
// the admin Overview tab.
export interface ClientReport {
  id: string
  conversationId: string
  clientUserId: string
  expertId: string
  expertName: string
  reason: string
  status: 'open' | 'resolved'
  createdAt: string
  createdAtIso: string
}

function rowToClientReport(r: any): ClientReport {
  return {
    id: r.id,
    conversationId: r.conversation_id,
    clientUserId: r.client_user_id,
    expertId: r.expert_id,
    expertName: r.expert_name,
    reason: r.reason,
    status: r.status,
    createdAt: fmtTime(r.created_at),
    createdAtIso: r.created_at,
  }
}

export async function createClientReport(clientUserId: string, conversationId: string, reason: string): Promise<ClientReport | null> {
  const rows = await sbSelect('conversations', `select=*&id=eq.${enc(conversationId)}`)
  const conv = rows[0]
  // Same ownership check as the chatter-side createChatReport: only the
  // client who's actually part of this conversation can file a report on
  // it — prevents reporting a random expert with no real session as
  // "evidence" behind it.
  if (!conv || conv.user_id !== clientUserId || !conv.expert_id) return null
  const row = await sbInsert('client_reports', {
    id: uid('crpt'),
    conversation_id: conversationId,
    client_user_id: clientUserId,
    expert_id: conv.expert_id,
    expert_name: conv.expert_name ?? conv.expert_id,
    reason,
    status: 'open',
  })
  return rowToClientReport(row)
}

export async function listOpenClientReports(): Promise<ClientReport[]> {
  const rows = await sbSelect('client_reports', 'select=*&status=eq.open&order=created_at.desc&limit=50')
  return rows.map(rowToClientReport)
}

export async function setClientReportStatus(id: string, status: ClientReport['status']): Promise<ClientReport | null> {
  const rows = await sbUpdate('client_reports', `id=eq.${enc(id)}`, { status })
  return rows[0] ? rowToClientReport(rows[0]) : null
}

// ─── Reviews ─────────────────────────────────────────────────────────────
// Real, persisted per-session reviews — replaces the fabricated "Elena V. /
// Marina K. / Tatiana R." testimonials that used to be hardcoded directly
// into expert-profile-screen.tsx. One real review row per submission; a real
// average is computed from these on read, never invented.

export async function createReview(
  expertId: string,
  userId: string,
  userName: string,
  rating: number,
  comment: string | undefined,
  tags: string[],
): Promise<Review> {
  const row = await sbInsert('reviews', {
    id: uid('rev'),
    expert_id: expertId,
    user_id: userId,
    user_name: userName,
    rating,
    comment: comment || null,
    tags,
  })
  return rowToReview(row)
}

export async function getExpertReviews(expertId: string, limit = 20): Promise<Review[]> {
  const rows = await sbSelect('reviews', `select=*&expert_id=eq.${enc(expertId)}&order=created_at.desc&limit=${limit}`)
  return rows.map(rowToReview)
}

export async function getExpertRatingStats(expertId: string): Promise<{ average: number; count: number }> {
  const rows = await sbSelect('reviews', `select=rating&expert_id=eq.${enc(expertId)}`)
  if (rows.length === 0) return { average: 0, count: 0 }
  const sum = rows.reduce((s: number, r: any) => s + Number(r.rating), 0)
  return { average: +(sum / rows.length).toFixed(2), count: rows.length }
}

// ─── Compatibility reports (real two-birth-chart synastry) ─────────────────
// A saved history of real compatibility checks — each one used the signed-in
// user's own saved birth chart plus a real second chart computed from
// whatever partner info was entered (see lib/astro-calc.ts
// getChartCompatibility for the scoring itself).

export interface CompatibilityReport {
  id: string
  userId: string
  partnerName: string
  partnerBirthDate: string
  partnerBirthTime: string | null
  score: number
  summary: string
  createdAt: string
}

function rowToCompatibilityReport(r: any): CompatibilityReport {
  return {
    id: r.id,
    userId: r.user_id,
    partnerName: r.partner_name,
    partnerBirthDate: r.partner_birth_date,
    partnerBirthTime: r.partner_birth_time ?? null,
    score: Number(r.score),
    summary: r.summary,
    createdAt: fmtDate(r.created_at),
  }
}

export async function createCompatibilityReport(input: {
  userId: string
  partnerName: string
  partnerBirthDate: string
  partnerBirthTime?: string
  partnerLatitude?: number
  partnerLongitude?: number
  score: number
  summary: string
}): Promise<CompatibilityReport> {
  const row = await sbInsert('compatibility_reports', {
    id: uid('compat'),
    user_id: input.userId,
    partner_name: input.partnerName,
    partner_birth_date: input.partnerBirthDate,
    partner_birth_time: input.partnerBirthTime ?? null,
    partner_latitude: input.partnerLatitude ?? null,
    partner_longitude: input.partnerLongitude ?? null,
    score: input.score,
    summary: input.summary,
  })
  return rowToCompatibilityReport(row)
}

export async function listCompatibilityReports(userId: string): Promise<CompatibilityReport[]> {
  const rows = await sbSelect('compatibility_reports', `select=*&user_id=eq.${enc(userId)}&order=created_at.desc&limit=20`)
  return rows.map(rowToCompatibilityReport)
}

// ─── Chatter applications ───────────────────────────────────────────────────
// Real moderation pipeline for new chatters, replacing the old "just tell me
// a username/password and I'll add you to Supabase by hand" process:
//   1. A prospective chatter submits a public application (name/contact/
//      message) — createChatterApplication. Nothing is created in `users`
//      yet, so an unreviewed applicant has zero access to anything.
//   2. An admin reviews it in /crm/admin and either rejects it, or approves
//      it — approveChatterApplication mints a real one-time code (7-day
//      expiry) that only the admin can see and has to relay to the
//      applicant themselves (Telegram/email/whatever channel they applied
//      through — there's no automated messaging pipeline here, so this is
//      an honest manual handoff step, not a fake "email sent" message).
//   3. The applicant enters that code plus a username/password of their
//      choosing at /crm/activate — completeChatterRegistrationFromCode
//      checks the code is real, unexpired, and unused, then creates the
//      actual `users` row (role='expert') with a real password hash. The
//      application is marked 'completed' and permanently linked to the
//      account it created, so a code can never be reused.
export interface ChatterApplication {
  id: string
  name: string
  contact: string
  email: string
  bio: string
  photoUrl: string
  message: string | null
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  code: string | null
  codeExpiresAt: string | null
  createdUserId: string | null
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
}

function rowToChatterApplication(r: any): ChatterApplication {
  return {
    id: r.id,
    name: r.name,
    contact: r.contact,
    email: r.email ?? '',
    bio: r.bio ?? '',
    photoUrl: r.photo_url ?? '',
    message: r.message ?? null,
    status: r.status,
    code: r.code ?? null,
    codeExpiresAt: r.code_expires_at ?? null,
    createdUserId: r.created_user_id ?? null,
    reviewedBy: r.reviewed_by ?? null,
    reviewedAt: r.reviewed_at ?? null,
    createdAt: fmtDate(r.created_at),
  }
}

// Excludes visually-ambiguous characters (0/O, 1/I/L) since this code is
// meant to be read aloud or retyped by hand from a chat message.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
function generateApplicationCode(): string {
  let out = ''
  for (let i = 0; i < 8; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]
  return out
}

export async function createChatterApplication(input: {
  name: string
  contact: string
  email: string
  bio: string
  photoUrl: string
  message?: string
}): Promise<ChatterApplication> {
  const row = await sbInsert('chatter_applications', {
    id: uid('capp'),
    name: input.name,
    contact: input.contact,
    email: input.email,
    bio: input.bio,
    photo_url: input.photoUrl,
    message: input.message ?? null,
    status: 'pending',
  })
  return rowToChatterApplication(row)
}

export async function listChatterApplications(): Promise<ChatterApplication[]> {
  const rows = await sbSelect('chatter_applications', 'select=*&order=created_at.desc')
  return rows.map(rowToChatterApplication)
}

export async function approveChatterApplication(id: string, reviewedBy: string): Promise<ChatterApplication> {
  const rows = await sbUpdate('chatter_applications', `id=eq.${enc(id)}`, {
    status: 'approved',
    code: generateApplicationCode(),
    code_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
  })
  return rowToChatterApplication(rows[0])
}

export async function rejectChatterApplication(id: string, reviewedBy: string): Promise<ChatterApplication> {
  const rows = await sbUpdate('chatter_applications', `id=eq.${enc(id)}`, {
    status: 'rejected',
    reviewed_by: reviewedBy,
    reviewed_at: new Date().toISOString(),
  })
  return rowToChatterApplication(rows[0])
}

export async function findChatterApplicationByCode(code: string): Promise<ChatterApplication | undefined> {
  const rows = await sbSelect('chatter_applications', `select=*&code=eq.${enc(code)}`)
  return rows[0] ? rowToChatterApplication(rows[0]) : undefined
}

// The actual account-creation step — only reachable with a real, unexpired,
// unused code from step 2 above. Returns a typed error string instead of
// throwing so the API route can turn it into an honest, specific message
// rather than a generic 500.
export async function completeChatterRegistrationFromCode(input: {
  code: string
  username: string
  passwordHash: string
}): Promise<{ ok: true; user: User } | { ok: false; error: string }> {
  const application = await findChatterApplicationByCode(input.code.trim().toUpperCase())
  if (!application) return { ok: false, error: 'This code is not valid.' }
  if (application.status === 'completed' || application.createdUserId) return { ok: false, error: 'This code has already been used.' }
  if (application.status === 'rejected') return { ok: false, error: 'This application was not approved.' }
  if (application.status !== 'approved') return { ok: false, error: 'This application has not been approved yet.' }
  if (application.codeExpiresAt && Date.now() > new Date(application.codeExpiresAt).getTime()) {
    return { ok: false, error: 'This code has expired — ask an admin to approve the application again.' }
  }

  const existingUsername = await findUserByUsername(input.username.trim().toLowerCase())
  if (existingUsername) return { ok: false, error: 'That username is already taken.' }

  // BUG FIX (code audit, 2026-08-28): the checks above are a real
  // check-then-write race, unlike every other money/account-touching
  // function in this file — those all use a compare-and-swap `UPDATE ...
  // WHERE status = ...` specifically to close this exact gap (see the
  // comments on setPayoutStatus/resolveTopupRequest/createPayoutRequest).
  // Two concurrent submissions of the same valid code (a genuine retry, or
  // a double-click before the form's own loading guard can block a second
  // one) could both pass the "not yet completed" check above before either
  // wrote back — creating two separate user/wallet/expert-profile rows from
  // one approved application. This UPDATE only "wins" if the row is still
  // actually 'approved' at the moment it runs; a losing concurrent call
  // gets zero matched rows and returns the same honest "already used" error
  // a human retry would expect, instead of also creating a duplicate
  // account. If account creation itself then fails for some unrelated
  // reason (see the catch block below), the claim is reverted so a real DB
  // hiccup doesn't permanently burn an otherwise-legitimate approval.
  const claimed = await sbUpdate(
    'chatter_applications',
    `id=eq.${enc(application.id)}&status=eq.approved`,
    { status: 'completed' },
  )
  if (!claimed || claimed.length === 0) {
    return { ok: false, error: 'This code has already been used.' }
  }

  // The docstring above has claimed since it was written that this function
  // "returns a typed error instead of throwing" — but none of the inserts
  // below were actually wrapped in a try/catch, so any real database error
  // (a constraint violation, a transient network failure) still propagated
  // as an unhandled exception all the way up through the API route, which
  // also had no try/catch, producing an empty-body 500 with zero
  // information. This is exactly what happened to Lina's own chatter
  // activation (code S2KQVNHX): her email already belonged to a role=client
  // account, and `contact` used to be globally unique, so the insert below
  // hit a unique-constraint violation. That's now fixed at the schema level
  // (users_contact_role_key — contact is unique per role, not globally), but
  // this try/catch stays so any *other* unexpected failure degrades to an
  // honest message instead of a silent crash.
  try {
    const row = await sbInsert('users', {
      id: `u${Date.now()}`,
      name: application.name,
      contact: application.email || application.contact,
      role: 'expert',
      status: 'active',
      username: input.username.trim().toLowerCase(),
      password_hash: input.passwordHash,
      auth_provider: 'otp',
    })
    await sbInsert('wallets', { user_id: row.id, balance: 0 })
    // status is already 'completed' from the atomic claim above — this just
    // records which user the code turned into.
    await sbUpdate('chatter_applications', `id=eq.${enc(application.id)}`, {
      created_user_id: row.id,
    })
    // Every real chatter gets a real public profile from the moment their
    // account exists — closes the gap the very first chatter account
    // (staff_chatter_1) had, where the CRM showed "No profile assigned yet"
    // everywhere because nothing ever created one. The bio and photo they
    // submitted at application time carry straight into their public profile
    // instead of starting over as an empty/initials-only placeholder.
    await createExpertProfileForOperator(row.id, application.name, {
      bio: application.bio || undefined,
      avatarUrl: application.photoUrl || undefined,
    })
    return { ok: true, user: rowToUser(row) }
  } catch (err) {
    // Best-effort revert of the atomic claim above — a failed account
    // creation (e.g. the contact-conflict case this comment already
    // documents) shouldn't permanently burn an otherwise-legitimate
    // approval just because this one attempt hit an error. Only reverts if
    // still 'completed' with no created_user_id (i.e. genuinely this
    // attempt's own claim, not a second success that raced in after).
    try {
      await sbUpdate(
        'chatter_applications',
        `id=eq.${enc(application.id)}&status=eq.completed&created_user_id=is.null`,
        { status: 'approved' },
      )
    } catch { /* best-effort; the honest error below still returns either way */ }
    const msg = err instanceof Error ? err.message : String(err)
    if (/duplicate key|unique constraint/i.test(msg) && /contact/i.test(msg)) {
      return { ok: false, error: 'An account with this email/phone already exists for this role.' }
    }
    if (/duplicate key|unique constraint/i.test(msg) && /username/i.test(msg)) {
      return { ok: false, error: 'That username is already taken.' }
    }
    return { ok: false, error: `Account creation failed: ${msg}` }
  }
}

// ─── Daily streak ───────────────────────────────────────────────────────────
// Real, server-computed streak based on the actual calendar date of the
// last recorded visit — not a client-side counter that could be reset by
// clearing storage. Call once per Today-screen mount; calling it again the
// same day is a no-op (idempotent).

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  const ms = Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))
    - Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10))
  return Math.round(ms / 86400000)
}

export async function recordDailyVisit(userId: string): Promise<{ streak: number; isNewDay: boolean }> {
  const user = await getUserById(userId)
  const today = todayUTC()
  const lastVisit = user?.lastLoginDate
  const currentStreak = user?.loginStreak ?? 0

  if (lastVisit === today) {
    return { streak: currentStreak, isNewDay: false }
  }

  const gap = lastVisit ? daysBetween(today, lastVisit) : null
  const nextStreak = gap === 1 ? currentStreak + 1 : 1 // consecutive day extends it, any gap (or first-ever visit) resets to 1

  await sbUpdate('users', `id=eq.${enc(userId)}`, { login_streak: nextStreak, last_login_date: today })
  return { streak: nextStreak, isNewDay: true }
}

// ─── Referrals ──────────────────────────────────────────────────────────────
// BUG FIX: this used to be two-sided (both the inviter and the new account
// got credited). Confirmed by the client directly ("За запрошення друга
// бонус тільки тобі" — the reward for inviting a friend goes only to you) —
// only the referrer gets rewarded, the new account gets nothing extra just
// for redeeming a code. A redemption can only ever be recorded once per new
// account (enforced by the unique constraint on
// referral_redemptions.referred_id, not just checked in application code).
// The $0.10 reward amount itself is still an unconfirmed placeholder — flag
// it to the client before relying on it.

const INVITE_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no 0/O/1/I — avoids ambiguous codes

function generateCode(len = 6): string {
  let out = ''
  for (let i = 0; i < len; i++) out += INVITE_CODE_ALPHABET[Math.floor(Math.random() * INVITE_CODE_ALPHABET.length)]
  return out
}

export async function getOrCreateInviteCode(userId: string): Promise<string> {
  const user = await getUserById(userId)
  if (user?.inviteCode) return user.inviteCode

  // Extremely unlikely to collide at this alphabet/length, but check for
  // real rather than assume — a silent collision would misattribute a
  // referral to the wrong person.
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateCode()
    const existing = await sbSelect('users', `select=id&invite_code=eq.${enc(code)}`)
    if (existing.length === 0) {
      const rows = await sbUpdate('users', `id=eq.${enc(userId)}`, { invite_code: code })
      return rows[0]?.invite_code ?? code
    }
  }
  throw new Error('Could not generate a unique invite code — try again')
}

export async function redeemReferral(
  code: string,
  newUserId: string,
  newUserName: string,
  referrerReward = 0.1,
): Promise<{ ok: true; referrerId: string } | { ok: false; reason: string }> {
  const referrerRows = await sbSelect('users', `select=id,name&invite_code=eq.${enc(code.trim().toUpperCase())}`)
  const referrer = referrerRows[0]
  if (!referrer) return { ok: false, reason: 'Invite code not found' }
  if (referrer.id === newUserId) return { ok: false, reason: "You can't redeem your own invite code" }

  try {
    await sbInsert('referral_redemptions', {
      id: `ref${Date.now()}`,
      code: code.trim().toUpperCase(),
      referrer_id: referrer.id,
      referred_id: newUserId,
      reward_amount: referrerReward,
    })
  } catch (e: any) {
    // Unique constraint on referred_id — this account already redeemed a code once.
    return { ok: false, reason: 'This account has already redeemed an invite code' }
  }

  await topUp(referrer.id, referrer.name, referrerReward)
  return { ok: true, referrerId: referrer.id }
}

export async function getReferralStats(userId: string): Promise<{ inviteCode: string; totalReferred: number; totalEarned: number }> {
  const inviteCode = await getOrCreateInviteCode(userId)
  const rows = await sbSelect('referral_redemptions', `select=reward_amount&referrer_id=eq.${enc(userId)}`)
  const totalEarned = rows.reduce((sum: number, r: any) => sum + Number(r.reward_amount), 0)
  return { inviteCode, totalReferred: rows.length, totalEarned: +totalEarned.toFixed(2) }
}

// ─── Company expenses (admin Overview) ──────────────────────────────────────
// Costs the app has zero visibility into on its own — ad spend, contractor
// fees, whatever else — since nothing in this system charges through them.
// This is a plain manual ledger the admin fills in themselves; it exists so
// the Overview tab's "net profit" figure can subtract *something* real
// instead of pretending those costs don't exist or silently guessing at
// them. Never computed automatically, never estimated — only what's
// actually typed in here.
export interface CompanyExpense {
  id: string
  label: string
  amount: number
  note?: string
  createdBy?: string
  date: string
}

function rowToCompanyExpense(r: any): CompanyExpense {
  return {
    id: r.id,
    label: r.label,
    amount: Number(r.amount),
    note: r.note ?? undefined,
    createdBy: r.created_by ?? undefined,
    date: fmtDate(r.created_at),
  }
}

export async function listCompanyExpenses(): Promise<CompanyExpense[]> {
  const rows = await sbSelect('company_expenses', 'select=*&order=created_at.desc')
  return rows.map(rowToCompanyExpense)
}

export async function addCompanyExpense(label: string, amount: number, note: string | undefined, createdBy: string): Promise<CompanyExpense> {
  const row = await sbInsert('company_expenses', {
    id: uid('ce'),
    label,
    amount,
    note: note || null,
    created_by: createdBy,
  })
  return rowToCompanyExpense(row)
}

export async function deleteCompanyExpense(id: string): Promise<void> {
  await sbDelete('company_expenses', `id=eq.${enc(id)}`)
}

// ─── Mood / rating history ──────────────────────────────────────────────────
// One real row per user per calendar day — the Today screen's "Did you like
// your horoscope?" rating and Focus & Mood scores, persisted instead of
// reset every time the tab reloads, so "your mood over time" is an actual
// trend line and not a re-randomized snapshot.

export async function saveMoodEntry(
  userId: string,
  entryDate: string,
  patch: { rating?: number; focusCareer?: number; focusLove?: number; focusHealth?: number; focusFamily?: number },
): Promise<MoodEntry> {
  const dbPatch: Record<string, any> = {}
  if (patch.rating !== undefined) dbPatch.rating = patch.rating
  if (patch.focusCareer !== undefined) dbPatch.focus_career = patch.focusCareer
  if (patch.focusLove !== undefined) dbPatch.focus_love = patch.focusLove
  if (patch.focusHealth !== undefined) dbPatch.focus_health = patch.focusHealth
  if (patch.focusFamily !== undefined) dbPatch.focus_family = patch.focusFamily

  const existing = await sbSelect('mood_history', `select=*&user_id=eq.${enc(userId)}&entry_date=eq.${enc(entryDate)}`)
  if (existing[0]) {
    const updated = await sbUpdate('mood_history', `id=eq.${enc(existing[0].id)}`, dbPatch)
    return rowToMoodEntry(updated[0] ?? existing[0])
  }
  const row = await sbInsert('mood_history', {
    id: `m${Date.now()}`,
    user_id: userId,
    entry_date: entryDate,
    ...dbPatch,
  })
  return rowToMoodEntry(row)
}

export async function listMoodHistory(userId: string, days = 30): Promise<MoodEntry[]> {
  const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10)
  const rows = await sbSelect(
    'mood_history',
    `select=*&user_id=eq.${enc(userId)}&entry_date=gte.${enc(since)}&order=entry_date.asc`,
  )
  return rows.map(rowToMoodEntry)
}

// ─── Push subscriptions ─────────────────────────────────────────────────────
// Real Web Push subscriptions (browser PushManager endpoint + keys) — no
// third-party push provider, sent directly via the VAPID protocol in
// lib/server/push.ts. Storing per-endpoint (not per-user) so the same
// account can have several subscribed devices/browsers.

export async function savePushSubscription(
  userId: string,
  sub: { endpoint: string; p256dh: string; auth: string },
): Promise<PushSubscriptionRow> {
  const row = await sbUpsert('push_subscriptions', {
    id: `push${Date.now()}`,
    user_id: userId,
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
  }, 'endpoint')
  return rowToPushSubscription(row)
}

export async function listPushSubscriptions(userId: string): Promise<PushSubscriptionRow[]> {
  const rows = await sbSelect('push_subscriptions', `select=*&user_id=eq.${enc(userId)}`)
  return rows.map(rowToPushSubscription)
}

export async function deletePushSubscription(endpoint: string): Promise<void> {
  await sbDelete('push_subscriptions', `endpoint=eq.${enc(endpoint)}`)
}

// ─── Native push tokens (iOS/Android) ──────────────────────────────────────
// Added 2026-09-11, as part of native-readiness work once `npx cap add
// ios/android` was run. A real browser PushSubscription (endpoint + p256dh/
// auth keys, above) is a completely different shape from an APNs device
// token or an FCM registration token — there's no shared row format, so this
// is a separate table rather than overloading push_subscriptions. Sending TO
// these tokens is implemented in lib/server/push.ts (sendApnsPush /
// sendFcmPush) but gated on real APNS_*/FCM_* credentials that don't exist
// in this environment yet — same honest-503-if-not-configured pattern
// already used for ANTHROPIC_API_KEY elsewhere in this codebase, not
// something to fake a success response for.
export interface NativePushTokenRow {
  id: string
  userId: string
  platform: 'ios' | 'android'
  token: string
}

function rowToNativePushToken(row: any): NativePushTokenRow {
  return { id: row.id, userId: row.user_id, platform: row.platform, token: row.token }
}

export async function saveNativePushToken(
  userId: string,
  platform: 'ios' | 'android',
  token: string,
): Promise<NativePushTokenRow> {
  const row = await sbUpsert('push_tokens_native', {
    id: `npt${Date.now()}`,
    user_id: userId,
    platform,
    token,
  }, 'token')
  return rowToNativePushToken(row)
}

export async function listNativePushTokens(userId: string): Promise<NativePushTokenRow[]> {
  const rows = await sbSelect('push_tokens_native', `select=*&user_id=eq.${enc(userId)}`)
  return rows.map(rowToNativePushToken)
}

export async function deleteNativePushToken(token: string): Promise<void> {
  await sbDelete('push_tokens_native', `token=eq.${enc(token)}`)
}

// ─── Referral / lead-tracking links ─────────────────────────────────────────
// Real click tracking for the marketing landing page and partner links —
// admin creates a named link (e.g. "Instagram bio", "Partner — Vlad"), gets
// back a short sensora.space/r/{code} URL to actually hand out, and this
// counts every real visit to that URL before redirecting the visitor on to
// wherever the link points (the landing page, /partners, the app itself,
// etc.) — the same shape as a Telegram/bit.ly-style tracked link. See
// app/r/[code]/route.ts for the public redirect handler that does the actual
// counting, and app/api/admin/referral-links/route.ts for the CRM's CRUD.
//
// Clicks are logged as individual rows (referral_link_clicks), not a single
// incrementing counter column — an honest, inspectable log of when clicks
// actually happened, and safe under concurrent hits (no read-increment-write
// race). Deliberately does NOT record IP address or any device fingerprint:
// this counts total opens, not unique visitors — adding real unique-visitor
// dedup later would mean actually collecting more personal data (IP/device),
// which is a separate decision, not something to slip in as a side effect of
// a click counter.
export interface ReferralLink {
  id: string
  code: string
  label: string
  destinationUrl: string
  createdBy: string | null
  createdAt: string
  createdAtIso: string
  clickCount: number
}

function rowToReferralLink(r: any, clickCount = 0): ReferralLink {
  return {
    id: r.id,
    code: r.code,
    label: r.label,
    destinationUrl: r.destination_url,
    createdBy: r.created_by ?? null,
    createdAt: fmtDate(r.created_at),
    createdAtIso: r.created_at,
    clickCount,
  }
}

// Short, readable, URL-safe codes (e.g. "k3f8pq") — random rather than
// sequential so a partner can't guess/enumerate another partner's link by
// incrementing a number. An admin-supplied custom code (e.g. "vlad",
// "insta-bio") is used as-is instead when provided — see createReferralLink.
function randomLinkCode(): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let out = ''
  for (let i = 0; i < 7; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)]
  return out
}

// Lists every link with its real click count, most recent first. Click
// counts come from a single grouped read of referral_link_clicks rather
// than N+1 queries (one per link) — PostgREST doesn't do SQL-style GROUP BY
// over REST, so this pulls all click rows' link_id once and tallies them in
// memory; fine at the volume a marketing-links table actually has (dozens to
// low hundreds of links, not millions of clicks).
export async function listReferralLinks(): Promise<ReferralLink[]> {
  const [linkRows, clickRows] = await Promise.all([
    sbSelect('referral_links', 'select=*&order=created_at.desc'),
    sbSelect<{ link_id: string }>('referral_link_clicks', 'select=link_id'),
  ])
  const counts = new Map<string, number>()
  for (const c of clickRows) counts.set(c.link_id, (counts.get(c.link_id) ?? 0) + 1)
  return linkRows.map(r => rowToReferralLink(r, counts.get(r.id) ?? 0))
}

export async function getReferralLinkByCode(code: string): Promise<ReferralLink | null> {
  const rows = await sbSelect('referral_links', `select=*&code=eq.${enc(code)}`)
  return rows[0] ? rowToReferralLink(rows[0]) : null
}

export class DuplicateLinkCodeError extends Error {
  constructor() { super('DUPLICATE_LINK_CODE') }
}

export async function createReferralLink(
  label: string,
  destinationUrl: string,
  createdBy: string,
  customCode?: string,
): Promise<ReferralLink> {
  if (customCode) {
    const existing = await sbSelect('referral_links', `select=id&code=eq.${enc(customCode)}`)
    if (existing.length > 0) throw new DuplicateLinkCodeError()
  }
  // Random codes collide astronomically rarely (36^7 ≈ 78 billion), but a
  // unique constraint on `code` backstops it regardless — this loop just
  // avoids surfacing that as an ugly 500 in the ordinary case.
  let code = customCode || randomLinkCode()
  for (let attempt = 0; attempt < 5 && !customCode; attempt++) {
    const existing = await sbSelect('referral_links', `select=id&code=eq.${enc(code)}`)
    if (existing.length === 0) break
    code = randomLinkCode()
  }
  const row = await sbInsert('referral_links', {
    id: uid('rl'),
    code,
    label,
    destination_url: destinationUrl,
    created_by: createdBy,
  })
  return rowToReferralLink(row, 0)
}

export async function deleteReferralLink(id: string): Promise<void> {
  await sbDelete('referral_links', `id=eq.${enc(id)}`)
}

// Called by the public redirect route on every real hit — best-effort only:
// if this insert fails (DB blip), the visitor should still be redirected on
// their way, not shown an error just because the click log couldn't be
// written. See app/r/[code]/route.ts.
export async function recordReferralClick(linkId: string, userAgent: string | null, referrer: string | null): Promise<void> {
  await sbInsert('referral_link_clicks', {
    id: uid('rlc'),
    link_id: linkId,
    user_agent: userAgent || null,
    referrer: referrer || null,
  })
}

// Per-day click counts for one link over the last N days — the same
// "group already-fetched rows by day" approach as the Top Clients
// leaderboard in app/crm/admin/page.tsx, just per-link instead of
// per-client. Used for a small sparkline/breakdown in the CRM rather than
// just a lifetime total.
export async function getReferralLinkClicksByDay(linkId: string, days = 14): Promise<{ date: string; count: number }[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()
  const rows = await sbSelect<{ created_at: string }>(
    'referral_link_clicks',
    `select=created_at&link_id=eq.${enc(linkId)}&created_at=gte.${enc(since)}&order=created_at.asc`,
  )
  const counts = new Map<string, number>()
  for (const r of rows) {
    const day = r.created_at.slice(0, 10)
    counts.set(day, (counts.get(day) ?? 0) + 1)
  }
  const out: { date: string; count: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    out.push({ date: d, count: counts.get(d) ?? 0 })
  }
  return out
}

// ─── Support tickets (in-app "Support" tab ↔ Telegram bot bridge) ──────────
// A client submits a question from the app; it's saved here AND posted into
// a staff Telegram group/channel (see lib/server/telegram.ts +
// app/api/support/submit/route.ts) with an inline "Відповісти" button.
// Staff tapping that button gets a force-reply prompt with the ticket id
// embedded in its own text (see app/api/telegram/webhook/route.ts) — when
// they reply to THAT prompt, the webhook parses the id back out, no
// additional bot-side session/state store needed. telegram_chat_id +
// telegram_message_id are kept so a future "edit the original post to show
// ✅ answered" feature has what it needs, though nothing writes back to
// Telegram today beyond the initial post.
export interface SupportTicket {
  id: string
  userId: string
  message: string
  status: 'open' | 'answered'
  reply: string | null
  createdAt: string
  createdAtIso: string
  repliedAtIso: string | null
}

function rowToSupportTicket(r: any): SupportTicket {
  return {
    id: r.id,
    userId: r.user_id,
    message: r.message,
    status: r.status,
    reply: r.reply ?? null,
    createdAt: fmtDate(r.created_at),
    createdAtIso: r.created_at,
    repliedAtIso: r.replied_at ?? null,
  }
}

export async function createSupportTicket(userId: string, message: string): Promise<SupportTicket> {
  const row = await sbInsert('support_tickets', {
    id: uid('sup'),
    user_id: userId,
    message,
    status: 'open',
  })
  return rowToSupportTicket(row)
}

// Newest first — the Support screen shows the client's own history, most
// recent question (and whether it's been answered yet) up top.
export async function listSupportTicketsForUser(userId: string): Promise<SupportTicket[]> {
  const rows = await sbSelect('support_tickets', `select=*&user_id=eq.${enc(userId)}&order=created_at.desc`)
  return rows.map(rowToSupportTicket)
}

export async function getSupportTicket(id: string): Promise<SupportTicket | undefined> {
  const rows = await sbSelect('support_tickets', `select=*&id=eq.${enc(id)}`)
  return rows[0] ? rowToSupportTicket(rows[0]) : undefined
}

export async function setSupportTicketTelegramRef(id: string, chatId: string, messageId: string): Promise<void> {
  await sbUpdate('support_tickets', `id=eq.${enc(id)}`, { telegram_chat_id: chatId, telegram_message_id: messageId })
}

// Idempotent on purpose: if a staff member's reply somehow gets processed
// twice (e.g. Telegram redelivers the webhook update after a slow 200), this
// just overwrites the same ticket with the same reply rather than erroring —
// simpler and safer than trying to detect+reject a duplicate here.
export async function answerSupportTicket(id: string, reply: string): Promise<SupportTicket | undefined> {
  const rows = await sbUpdate('support_tickets', `id=eq.${enc(id)}`, {
    reply,
    status: 'answered',
    replied_at: new Date().toISOString(),
  })
  return rows[0] ? rowToSupportTicket(rows[0]) : undefined
}