// FILE PATH: lib/server/push.ts
// Real Web Push sender — implements RFC 8291 (message encryption, aes128gcm),
// RFC 8188 (the underlying content-encoding), and RFC 8292 (VAPID) by hand
// using Node's built-in WebCrypto (crypto.webcrypto.subtle). No 'web-push'
// npm package is used because this sandbox has no npm registry access (see
// lib/server/supabase.ts for the same constraint) — everything here is
// implemented against the actual specs, not simulated.
import { webcrypto } from 'crypto'

const subtle = webcrypto.subtle

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:sensorsoffical@gmail.com'

export interface PushSubscriptionInput {
  endpoint: string
  p256dh: string
  auth: string
}

function assertConfigured() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    throw new Error('Web Push is not configured: set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env.local')
  }
}

function b64urlToBuf(s: string): Uint8Array {
  const padded = s.replace(/-/g, '+').replace(/_/g, '/').padEnd(s.length + ((4 - (s.length % 4)) % 4), '=')
  return new Uint8Array(Buffer.from(padded, 'base64'))
}

function bufToB64url(buf: ArrayBuffer | Uint8Array): string {
  return Buffer.from(buf as ArrayBuffer).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function concat(...parts: (Uint8Array | ArrayBuffer)[]): Uint8Array {
  const bufs = parts.map(p => (p instanceof Uint8Array ? p : new Uint8Array(p)))
  const total = bufs.reduce((n, b) => n + b.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const b of bufs) { out.set(b, offset); offset += b.length }
  return out
}

async function importVapidPrivateKey(): Promise<CryptoKey> {
  const pubRaw = b64urlToBuf(VAPID_PUBLIC_KEY!)
  if (pubRaw.length !== 65 || pubRaw[0] !== 0x04) {
    throw new Error('VAPID_PUBLIC_KEY must be an uncompressed P-256 point (65 bytes, starting 0x04)')
  }
  const x = pubRaw.slice(1, 33)
  const y = pubRaw.slice(33, 65)
  const jwk = { kty: 'EC', crv: 'P-256', x: bufToB64url(x), y: bufToB64url(y), d: VAPID_PRIVATE_KEY, ext: true }
  return subtle.importKey('jwk', jwk as JsonWebKey, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])
}

// RFC 8292 — a short-lived JWT (ES256) signed with the VAPID private key,
// scoped to the push service's own origin, proving these requests come from
// this app without any third-party push provider or paid API in the middle.
async function buildVapidAuthHeader(endpoint: string): Promise<string> {
  assertConfigured()
  const aud = new URL(endpoint).origin
  const header = { typ: 'JWT', alg: 'ES256' }
  const payload = { aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: VAPID_SUBJECT }
  const signingInput = `${bufToB64url(Buffer.from(JSON.stringify(header)))}.${bufToB64url(Buffer.from(JSON.stringify(payload)))}`
  const key = await importVapidPrivateKey()
  // WebCrypto's ECDSA sign() returns the raw (r||s) signature format, which
  // is exactly the format JWS ES256 requires — no DER conversion needed.
  const signature = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, Buffer.from(signingInput))
  const jwt = `${signingInput}.${bufToB64url(signature)}`
  return `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`
}

// RFC 8291 §3.4 + RFC 8188 — encrypts `payload` for the given subscription
// and returns the full aes128gcm request body (header + ciphertext).
// Exported (not just used internally) so it can be exercised directly in a
// self-test that simulates the browser side of the ECDH exchange, since a
// real end-to-end test needs an actual deployed HTTPS site + live browser
// subscription that this sandbox can't produce.
export async function encryptPayload(sub: PushSubscriptionInput, payload: object): Promise<Uint8Array> {
  const uaPublicRaw = b64urlToBuf(sub.p256dh)
  const authSecret = b64urlToBuf(sub.auth)

  const asKeyPair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const asPublicRaw = new Uint8Array(await subtle.exportKey('raw', asKeyPair.publicKey))

  const uaPublicKey = await subtle.importKey('raw', uaPublicRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, [])
  const sharedSecret = await subtle.deriveBits({ name: 'ECDH', public: uaPublicKey } as EcdhKeyDeriveParams, asKeyPair.privateKey, 256)

  const keyInfo = concat(Buffer.from('WebPush: info\0', 'utf8'), uaPublicRaw, asPublicRaw)
  const ikmKey = await subtle.importKey('raw', sharedSecret, 'HKDF', false, ['deriveBits'])
  const ikm = await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: keyInfo } as HkdfParams, ikmKey, 256)

  const salt = webcrypto.getRandomValues(new Uint8Array(16))
  const prkKey = await subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits'])
  const cek = await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: Buffer.from('Content-Encoding: aes128gcm\0', 'utf8') } as HkdfParams, prkKey, 128)
  const nonce = await subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: Buffer.from('Content-Encoding: nonce\0', 'utf8') } as HkdfParams, prkKey, 96)

  const plaintext = concat(Buffer.from(JSON.stringify(payload), 'utf8'), new Uint8Array([0x02])) // 0x02 = last-record delimiter, no extra padding
  const aesKey = await subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt'])
  const ciphertext = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, plaintext))

  const recordSize = new Uint8Array(4)
  new DataView(recordSize.buffer).setUint32(0, ciphertext.length, false) // big-endian, per RFC 8188

  const contentCodingHeader = concat(salt, recordSize, new Uint8Array([asPublicRaw.length]), asPublicRaw)
  return concat(contentCodingHeader, ciphertext)
}

export interface SendPushResult {
  ok: boolean
  status: number
  expired: boolean // true on 404/410 — caller should delete the stored subscription
}

export async function sendWebPush(sub: PushSubscriptionInput, payload: object, ttlSeconds = 3600): Promise<SendPushResult> {
  assertConfigured()
  const [authHeader, body] = await Promise.all([
    buildVapidAuthHeader(sub.endpoint),
    encryptPayload(sub, payload),
  ])
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      TTL: String(ttlSeconds),
      Authorization: authHeader,
    },
    body: body as BodyInit,
    signal: AbortSignal.timeout(8000),
  })
  return { ok: res.ok, status: res.status, expired: res.status === 404 || res.status === 410 }
}

// ─── Native push — APNs (iOS) and FCM (Android) ────────────────────────────
// Added 2026-09-11, once `npx cap add ios/android` gave the app real native
// projects to register device tokens against (see push_tokens_native in
// lib/server/db.ts). Web Push/VAPID above only reaches browser tabs — it
// does NOT reach a native iOS/Android app in the background, which is why
// this was flagged as a real gap during the pre-publish audit. Both
// functions here implement the actual provider protocols by hand (same
// reasoning as the rest of this file: no npm registry access in this
// sandbox for 'web-push'-style helper libraries, and no APNs/FCM SDK
// either), and both throw a clear "not configured" error — never a fake
// success — if the real credentials below aren't present in the
// environment. Nobody has generated real APNs/FCM credentials yet, so these
// paths are untested against Apple's/Google's live servers; the protocol
// implementation itself follows their published specs.

const APNS_AUTH_KEY = process.env.APNS_AUTH_KEY // contents of the .p8 file from Apple Developer, PEM (ES256 private key)
const APNS_KEY_ID = process.env.APNS_KEY_ID
const APNS_TEAM_ID = process.env.APNS_TEAM_ID
const APNS_BUNDLE_ID = process.env.APNS_BUNDLE_ID || 'space.sensora.app' // matches capacitor.config.ts appId
// Apple's production endpoint. Point APNS_USE_SANDBOX=1 at
// api.sandbox.push.apple.com for TestFlight/debug builds signed with a
// development provisioning profile — production and sandbox APNs are
// separate environments with separate device tokens.
const APNS_HOST = process.env.APNS_USE_SANDBOX === '1' ? 'api.sandbox.push.apple.com' : 'api.push.apple.com'

const FCM_SERVICE_ACCOUNT_JSON = process.env.FCM_SERVICE_ACCOUNT_JSON // full Firebase service-account JSON, as a string

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, '')
  return Buffer.from(b64, 'base64')
}

let cachedApnsJwt: { token: string; issuedAt: number } | null = null

// RFC-style JWT (ES256) for APNs provider authentication — same shape and
// signing approach as the VAPID JWT above (WebCrypto ECDSA over P-256),
// just signed with Apple's own .p8 key instead of a VAPID key pair. Apple
// asks that this token be reused for up to ~55 minutes rather than
// generated per-request, hence the small cache.
async function buildApnsAuthHeader(): Promise<string> {
  if (!APNS_AUTH_KEY || !APNS_KEY_ID || !APNS_TEAM_ID) {
    throw new Error('Native iOS push is not configured: set APNS_AUTH_KEY, APNS_KEY_ID, and APNS_TEAM_ID in .env.local')
  }
  const now = Math.floor(Date.now() / 1000)
  if (cachedApnsJwt && now - cachedApnsJwt.issuedAt < 55 * 60) {
    return `bearer ${cachedApnsJwt.token}`
  }
  const key = await subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(APNS_AUTH_KEY),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )
  const header = { alg: 'ES256', kid: APNS_KEY_ID }
  const payload = { iss: APNS_TEAM_ID, iat: now }
  const signingInput = `${bufToB64url(Buffer.from(JSON.stringify(header)))}.${bufToB64url(Buffer.from(JSON.stringify(payload)))}`
  const signature = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, Buffer.from(signingInput))
  const token = `${signingInput}.${bufToB64url(signature)}`
  cachedApnsJwt = { token, issuedAt: now }
  return `bearer ${token}`
}

// APNs is an HTTP/2-only API — Node's global fetch (undici) does not speak
// HTTP/2, so this uses Node's built-in http2 client directly rather than
// pulling in a third-party APNs package.
export async function sendApnsPush(deviceToken: string, payload: { title: string; body: string; data?: object }): Promise<SendPushResult> {
  const authHeader = await buildApnsAuthHeader()
  const http2 = await import('node:http2')
  const client = http2.connect(`https://${APNS_HOST}`)
  const body = JSON.stringify({
    aps: { alert: { title: payload.title, body: payload.body }, sound: 'default' },
    ...(payload.data || {}),
  })
  return new Promise((resolve, reject) => {
    const req = client.request({
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: authHeader,
      'apns-topic': APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'content-type': 'application/json',
    })
    let status = 0
    req.on('response', (headers: Record<string, string | number | undefined>) => { status = Number(headers[':status']) || 0 })
    let responseBody = ''
    req.on('data', (chunk: Buffer) => { responseBody += chunk })
    req.on('end', () => {
      client.close()
      resolve({
        ok: status >= 200 && status < 300,
        status,
        // 410 = device token no longer valid; 400 with BadDeviceToken also
        // means the same thing in practice — caller should delete the token.
        expired: status === 410 || (status === 400 && responseBody.includes('BadDeviceToken')),
      })
    })
    req.on('error', (err: Error) => { client.close(); reject(err) })
    req.setTimeout(8000, () => { client.close(); reject(new Error('APNs request timed out')) })
    req.end(body)
  })
}

let cachedFcmAccessToken: { token: string; expiresAt: number } | null = null

// Google OAuth2 service-account flow (RFC 7523 JWT bearer grant) to get an
// access token for the FCM HTTP v1 API — RS256-signed JWT asserting the
// service account, exchanged at Google's token endpoint. No firebase-admin
// SDK involved, same "implement the real spec by hand" approach as VAPID.
async function getFcmAccessToken(): Promise<string> {
  if (!FCM_SERVICE_ACCOUNT_JSON) {
    throw new Error('Native Android push is not configured: set FCM_SERVICE_ACCOUNT_JSON in .env.local (the full Firebase service-account JSON, as a string)')
  }
  const now = Math.floor(Date.now() / 1000)
  if (cachedFcmAccessToken && now < cachedFcmAccessToken.expiresAt - 60) {
    return cachedFcmAccessToken.token
  }
  const account = JSON.parse(FCM_SERVICE_ACCOUNT_JSON) as { client_email: string; private_key: string; project_id: string }
  const key = await subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(account.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const header = { alg: 'RS256', typ: 'JWT' }
  const claims = {
    iss: account.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }
  const signingInput = `${bufToB64url(Buffer.from(JSON.stringify(header)))}.${bufToB64url(Buffer.from(JSON.stringify(claims)))}`
  const signature = await subtle.sign('RSASSA-PKCS1-v1_5', key, Buffer.from(signingInput))
  const assertion = `${signingInput}.${bufToB64url(signature)}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`Google OAuth2 token exchange failed (${res.status}): ${await res.text().catch(() => '')}`)
  const data = await res.json() as { access_token: string; expires_in: number }
  cachedFcmAccessToken = { token: data.access_token, expiresAt: now + data.expires_in }
  return data.access_token
}

export async function sendFcmPush(deviceToken: string, payload: { title: string; body: string; data?: Record<string, string> }): Promise<SendPushResult> {
  if (!FCM_SERVICE_ACCOUNT_JSON) {
    throw new Error('Native Android push is not configured: set FCM_SERVICE_ACCOUNT_JSON in .env.local')
  }
  const projectId = (JSON.parse(FCM_SERVICE_ACCOUNT_JSON) as { project_id: string }).project_id
  const accessToken = await getFcmAccessToken()
  const res = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: {
        token: deviceToken,
        notification: { title: payload.title, body: payload.body },
        ...(payload.data ? { data: payload.data } : {}),
      },
    }),
    signal: AbortSignal.timeout(8000),
  })
  // FCM v1 reports an invalid/unregistered token as a 404 with an
  // UNREGISTERED error status in the JSON body, not a bare HTTP 404/410
  // like Web Push and APNs use — checked so the caller can clean up the
  // stored token the same way for all three providers.
  let expired = false
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    expired = res.status === 404 || text.includes('UNREGISTERED') || text.includes('NOT_FOUND')
  }
  return { ok: res.ok, status: res.status, expired }
}