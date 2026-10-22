// FILE PATH: lib/server/oauth-session.ts
// Extracted from app/api/auth/oauth/route.ts's inline logic (2026-09-18,
// native Google sign-in fix) — the exact same "find or create the account
// for this verified identity" logic is now needed in TWO places: the
// original route (web, Google Identity Services JS SDK / Apple Sign-in JS,
// both hand the client a ready-made identity token directly) and the new
// app/api/auth/google/callback/route.ts (native, authorization-code
// exchange — see the comment there for why native needs a different flow).
// Keeping this in one place means both paths create/match accounts exactly
// the same way instead of two copies quietly drifting apart over time.
import { findUserByContact, findUserByOAuthSub, createUser, recordPrivacyConsent, type User } from '@/lib/server/db'
import { PRIVACY_POLICY_VERSION } from '@/lib/legal-content'
import type { VerifiedIdentity } from '@/lib/server/oauth-verify'
import { isAtLeastMinAge, MIN_SIGNUP_AGE } from '@/lib/validation'

export class OAuthSessionError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.status = status
  }
}

export async function resolveOAuthUser(
  provider: 'google' | 'apple',
  identity: VerifiedIdentity,
  opts: { name?: string; birthDate?: string; privacyAccepted?: boolean },
): Promise<User> {
  // findUserByContact / findUserByOAuthSub both filter to role='client' at
  // the database query level (see lib/server/db.ts), so this can never
  // resolve to a staff (admin/expert) account — no extra role check needed
  // here.
  let user = identity.email ? await findUserByContact(identity.email) : undefined
  if (!user) user = await findUserByOAuthSub(provider, identity.sub)

  if (!user) {
    // Only reachable when actually creating a brand-new account — this is
    // where Privacy Policy consent is mandatory, same as email/phone
    // registration. Logging an EXISTING account back in never hits this
    // branch, so it's never blocked by a missing checkbox.
    if (opts.privacyAccepted !== true) {
      throw new OAuthSessionError('You must agree to the Privacy Policy to continue', 400)
    }
    if (!identity.email) {
      // Genuinely can't happen for Google, and only happens for Apple if
      // someone's very first-ever sign-in response is lost before it
      // reaches us — ask them to retry rather than creating an account
      // with no way to contact it.
      throw new OAuthSessionError('Sign-in did not include an email address. Please try again.', 400)
    }
    // REAL FEATURE ADDED ("модерація віку при реєстрації, щоб люди молодші
    // 18 років не могли зареєструватись"): the OAuth signup path collects
    // birthDate on the mini-test screen exactly like email/phone signup
    // does, then hands it straight through here — so it needs the same
    // server-side age gate as app/api/auth/register/route.ts, otherwise
    // Google/Apple sign-in would have been a silent bypass of the 18+ rule.
    if (!opts.birthDate || !isAtLeastMinAge(opts.birthDate)) {
      throw new OAuthSessionError(`You must be at least ${MIN_SIGNUP_AGE} years old to register`, 400)
    }
    user = await createUser(
      opts.name || identity.name || identity.email.split('@')[0],
      identity.email,
      'client',
      opts.birthDate,
      provider,
      { oauthSub: identity.sub },
    )
    await recordPrivacyConsent(user.id, PRIVACY_POLICY_VERSION)
  }
  return user
}
