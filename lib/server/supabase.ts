// FILE PATH: lib/server/supabase.ts
// Minimal Supabase REST (PostgREST) client, built on plain `fetch`.
//
// Why not the official @supabase/supabase-js package: this sandbox has no
// npm registry access (installs fail with a 403), so there's no way to
// `npm install` anything here. Supabase exposes every table over a plain
// REST API (PostgREST) that only needs an API key and fetch — no SDK
// required — so that's what this file talks to. If you later run
// `npm install @supabase/supabase-js` in a real environment with registry
// access, you can swap this file for the official client without touching
// lib/server/db.ts, since db.ts only calls the functions exported below.
//
// All calls use the service_role key and therefore run with full access,
// bypassing Row Level Security — the same trust boundary the old
// data/db.json file had (only server-side API routes touch this module,
// never the browser).

const SUPABASE_URL = process.env.SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// BUG FIX (code audit): every function below made its fetch() with no
// timeout at all — the same bug class already found and fixed once in
// nbu-rate.ts. This file is worse to leave unbounded than that one, because
// literally every DB read/write in the app (including payment-intent
// finalization and wallet credits) goes through these functions. If
// Supabase's REST endpoint ever stalls, a request here would hang until the
// hosting platform's own function timeout kills it — capping it at 10s here
// means a stalled Supabase call fails fast with a clean error instead of
// hanging the whole request.
const DB_TIMEOUT_MS = 10_000

function assertConfigured() {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error(
      'Supabase is not configured: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local ' +
      '(see the "Стадія 1" plan doc for where to find these in the Supabase dashboard).'
    )
  }
}

function headers(extra?: Record<string, string>) {
  return {
    apikey: SERVICE_ROLE_KEY as string,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
    ...extra,
  }
}

async function handle(res: Response) {
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Supabase request failed (${res.status}): ${body || res.statusText}`)
  }
  if (res.status === 204) return null
  const text = await res.text()
  return text ? JSON.parse(text) : null
}

/** SELECT — `query` is a raw PostgREST query string, e.g. "select=*&user_id=eq.u1&order=updated_at.desc" */
export async function sbSelect<T = any>(table: string, query = 'select=*'): Promise<T[]> {
  assertConfigured()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: headers(),
    cache: 'no-store',
    signal: AbortSignal.timeout(DB_TIMEOUT_MS),
  })
  return handle(res)
}

export async function sbInsert<T = any>(table: string, row: Record<string, any>): Promise<T> {
  assertConfigured()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(row),
    signal: AbortSignal.timeout(DB_TIMEOUT_MS),
  })
  const data = await handle(res)
  return Array.isArray(data) ? data[0] : data
}

/**
 * UPSERT — insert or, on conflict, update in place. Conflicts on the primary
 * key by default; pass `onConflict` (a comma-separated column list matching
 * a real unique constraint, e.g. "user_id,entry_date") to target a different
 * unique constraint instead — needed for tables like mood_history whose
 * natural key isn't the primary key column.
 */
export async function sbUpsert<T = any>(table: string, row: Record<string, any>, onConflict?: string): Promise<T> {
  assertConfigured()
  const qs = onConflict ? `?on_conflict=${encodeURIComponent(onConflict)}` : ''
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}${qs}`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=representation,resolution=merge-duplicates' }),
    body: JSON.stringify(row),
    signal: AbortSignal.timeout(DB_TIMEOUT_MS),
  })
  const data = await handle(res)
  return Array.isArray(data) ? data[0] : data
}

/** UPDATE — `match` is a raw PostgREST filter string, e.g. "id=eq.t123" */
export async function sbUpdate<T = any>(table: string, match: string, patch: Record<string, any>): Promise<T[]> {
  assertConfigured()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
    method: 'PATCH',
    headers: headers({ Prefer: 'return=representation' }),
    body: JSON.stringify(patch),
    signal: AbortSignal.timeout(DB_TIMEOUT_MS),
  })
  return handle(res)
}

export async function sbDelete(table: string, match: string): Promise<void> {
  assertConfigured()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
    method: 'DELETE',
    headers: headers(),
    signal: AbortSignal.timeout(DB_TIMEOUT_MS),
  })
  await handle(res)
}

/**
 * RPC — calls a Postgres function via PostgREST (`POST /rest/v1/rpc/<fn>`).
 * Added specifically so wallet-balance updates can be a single atomic SQL
 * statement (see the `wallet_adjust_balance` function, applied directly to
 * the Supabase project) instead of the read-then-write pattern every other
 * helper here implies — a real race condition when two requests touch the
 * same wallet close together (e.g. two tabs, or a retried per-second session
 * charge). `sbSelect`/`sbUpdate`/`sbUpsert` are left exactly as they were for
 * everything else; only wallet balance math goes through this.
 */
export async function sbRpc<T = any>(fn: string, args: Record<string, any>): Promise<T> {
  assertConfigured()
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(DB_TIMEOUT_MS),
  })
  return handle(res)
}