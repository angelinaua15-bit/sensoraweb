// FILE PATH: lib/server/oauth-verify.ts
// Real server-side verification for "Continue with Google" / "Continue with
// Apple" — replaces the previous placeholder (see git history /
// app/api/auth/oauth/route.ts's old comment), which just accepted whatever
// email the client typed into a plain text box labelled "this would show
// the real consent screen once..." — that was never real OAuth, and both
// Apple and Google review a real device/app during store submission, so it
// would have been rejected (and was dishonest to ship either way).
//
// Both functions here verify a real identity token issued by Google/Apple
// and return the account's VERIFIED email — the route that calls these must
// never trust a client-supplied email for the OAuth path, only what comes
// back from here.

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
const APPLE_SERVICES_ID = process.env.NEXT_PUBLIC_APPLE_SERVICES_ID

export interface VerifiedIdentity {
  sub: string
  email: string
  emailVerified: boolean
  name?: string
}

// ─── Google ──────────────────────────────────────────────────────────────
// Uses Google's own tokeninfo endpoint, which verifies the token's
// signature and expiry for you and returns the decoded claims as JSON — no
// JWT/crypto library needed, consistent with the rest of this codebase's
// preference for plain fetch over SDKs (see lib/server/supabase.ts).
// Google's own docs note this endpoint is rate-limited and recommend
// swapping to the `google-auth-library` npm package for high-volume
// production use — fine to leave as-is at Sensora's current scale, but if
// sign-ins start failing with 429s under real traffic, that's the fix.
export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedIdentity> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('Google sign-in is not configured: set NEXT_PUBLIC_GOOGLE_CLIENT_ID')
  }
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
    { signal: AbortSignal.timeout(8000) },
  )
  if (!res.ok) throw new Error('Could not verify Google sign-in — the token was rejected by Google')
  const claims = await res.json()

  // Google's own guidance: verify `aud` matches OUR client id (otherwise a
  // token issued for a completely different app would be accepted here),
  // and don't trust the token at all if Google itself hasn't verified the
  // email address behind it.
  if (claims.aud !== GOOGLE_CLIENT_ID) {
    throw new Error('Google sign-in token was not issued for this app')
  }
  if (claims.email_verified !== 'true' && claims.email_verified !== true) {
    throw new Error('Google account email is not verified')
  }
  if (!claims.email || !claims.sub) {
    throw new Error('Google sign-in response is missing required fields')
  }

  return { sub: claims.sub, email: claims.email, emailVerified: true, name: claims.name }
}

// ─── Apple ───────────────────────────────────────────────────────────────
// Apple's identity token is a real signed JWT (RS256) with no simple
// "verify for me" endpoint like Google's — this decodes it and checks the
// signature by hand against Apple's public keys (https://appleid.apple.com/auth/keys),
// using Node's built-in `crypto` (JWK import is supported natively since
// Node 16, no extra dependency needed).
let appleKeysCache: { keys: any[]; fetchedAtMs: number } | null = null
const APPLE_KEYS_TTL_MS = 60 * 60 * 1000 // Apple's keys rotate rarely; 1h cache is generous, not stale

async function getApplePublicKeys(): Promise<any[]> {
  if (appleKeysCache && Date.now() - appleKeysCache.fetchedAtMs < APPLE_KEYS_TTL_MS) {
    return appleKeysCache.keys
  }
  const res = await fetch('https://appleid.apple.com/auth/keys', { signal: AbortSignal.timeout(8000) })
  if (!res.ok) throw new Error('Could not fetch Apple sign-in public keys')
  const data = await res.json()
  appleKeysCache = { keys: data.keys ?? [], fetchedAtMs: Date.now() }
  return appleKeysCache.keys
}

function base64UrlDecode(input: string): Buffer {
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

export async function verifyAppleIdentityToken(identityToken: string): Promise<VerifiedIdentity> {
  if (!APPLE_SERVICES_ID) {
    throw new Error('Apple sign-in is not configured: set NEXT_PUBLIC_APPLE_SERVICES_ID')
  }
  const parts = identityToken.split('.')
  if (parts.length !== 3) throw new Error('Malformed Apple identity token')
  const [headerB64, payloadB64, signatureB64] = parts

  const header = JSON.parse(base64UrlDecode(headerB64).toString('utf8'))
  const payload = JSON.parse(base64UrlDecode(payloadB64).toString('utf8'))

  const keys = await getApplePublicKeys()
  const jwk = keys.find((k: any) => k.kid === header.kid && k.alg === header.alg)
  if (!jwk) throw new Error('Apple identity token was signed with an unrecognized key')

  const { createPublicKey, verify } = await import('crypto')
  const publicKey = createPublicKey({ key: jwk, format: 'jwk' })
  const signingInput = `${headerB64}.${payloadB64}`
  const signatureValid = verify('RSA-SHA256', Buffer.from(signingInput), publicKey, base64UrlDecode(signatureB64))
  if (!signatureValid) throw new Error('Apple identity token signature is invalid')

  // Standard JWT claim checks — issuer, audience, and expiry. `aud` must be
  // the Services ID registered in the Apple Developer portal for Sensora's
  // web sign-in, not the app's bundle ID (Apple uses a different client_id
  // for the web flow vs. the native iOS app).
  if (payload.iss !== 'https://appleid.apple.com') throw new Error('Apple identity token has an unexpected issuer')
  if (payload.aud !== APPLE_SERVICES_ID) throw new Error('Apple identity token was not issued for this app')
  if (typeof payload.exp !== 'number' || Date.now() >= payload.exp * 1000) throw new Error('Apple identity token has expired')
  if (!payload.sub) throw new Error('Apple sign-in response is missing required fields')

  // Real-world quirk worth knowing: Apple only includes `email` in the
  // token on the FIRST sign-in with a given app (or if the person chose to
  // share their real email rather than a private relay address) — it's not
  // guaranteed on every subsequent login. Callers must handle `email`
  // coming back empty by falling back to the account already on file for
  // this `sub`, rather than treating a missing email as an error outright.
  return {
    sub: payload.sub,
    email: payload.email ?? '',
    emailVerified: payload.email_verified === 'true' || payload.email_verified === true,
    name: undefined, // Apple sends name only in the client-side `user` object on first sign-in, never in the token
  }
}