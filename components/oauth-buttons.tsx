'use client'

// FILE PATH: components/oauth-buttons.tsx
// Shared real "Continue with Google" / "Continue with Apple" buttons — used
// by BOTH registration-screen.tsx (new accounts) and login-screen.tsx
// (returning accounts, added per user request: OAuth used to only be
// reachable from the sign-up screen, so anyone who created their account
// with Google/Apple had no way to sign back in except email+password,
// which they never set).
//
// This works for both cases through the SAME server route
// (app/api/auth/oauth/route.ts): it looks up an existing account by the
// verified email/sub first, and only creates a new one if none is found.
// So the exact same click either logs an existing person in or creates
// their account — there's no separate "login with Google" endpoint needed.
//
// `agreedToPrivacy` defaults to true (login use — an existing account
// already agreed once at signup, so logging back in doesn't force them to
// re-tick the box). Registration passes its own live checkbox state here,
// which gates the buttons exactly like before.
import { useState, useEffect, useRef, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
const APPLE_SERVICES_ID = process.env.NEXT_PUBLIC_APPLE_SERVICES_ID

// Google has blocked its own OAuth sign-in flow from running inside
// "embedded" WebViews since July 2023 — the exact environment a Capacitor
// native app's WebView is. Attempting the JS-SDK flow (the `google.accounts.id`
// branch below, used on web) there doesn't fail gracefully; it returns a
// real Google error page ("Error 403: disallowed_useragent") instead of the
// sign-in flow.
//
// FIX (2026-09-18): native builds used to just show an honest "not
// available yet" message instead of that error page — a safe stopgap, but
// not a real fix. Now the native branch below (isNativeApp() true) opens
// Google's consent screen in the SYSTEM browser instead, via
// @capacitor/browser's Browser.open() — Google allows that context, so the
// exact same account picker/consent screen the web version uses works
// there too. See app/api/auth/google/callback/route.ts for the full
// server-side half of this flow (why it can't just reuse the JS-SDK
// callback, how the result gets back into this WebView's own session).
// `Capacitor.isNativePlatform()` still gates all of this — false on the
// website/any browser, true only inside the real native shell.
function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  try { return Capacitor.isNativePlatform() } catch { return false }
}

function loadScriptOnce(src: string, isReady: () => boolean): Promise<void> {
  if (isReady()) return Promise.resolve()
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`)
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)))
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

const GoogleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
)
const AppleIcon = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="#FFFFFF">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11"/>
  </svg>
)

interface Props {
  // Only meaningful for brand-new accounts (registration) — ignored by the
  // server if an existing account is found instead.
  name?: string
  birthDate?: string
  // Registration passes its live checkbox state; login omits this prop
  // entirely (defaults to true), since an existing account already agreed
  // once and the server only enforces this when actually creating a user.
  agreedToPrivacy?: boolean
  onComplete: (params: { userId: string; name: string; balance: number; contact: string }) => void
}

export default function OAuthButtons({ name, birthDate, agreedToPrivacy = true, onComplete }: Props) {
  const [oauthLoading, setOauthLoading] = useState<'google' | 'apple' | null>(null)
  const [oauthError, setOauthError] = useState<string | null>(null)
  const googleBtnRef = useRef<HTMLDivElement>(null)
  const [googleReady, setGoogleReady] = useState(false)
  const [appleReady, setAppleReady] = useState(false)

  // Real native Google sign-in (2026-09-18) — see
  // app/api/auth/google/callback/route.ts for the full explanation of why
  // this can't just reuse the web JS-SDK flow inside the native WebView
  // (Google blocks that) and how this system-browser flow works instead.
  // Registered once per mount (native only) rather than inside the click
  // handler, so a second tap can't stack duplicate listeners. Deliberately
  // does NOT reuse submitOAuth() below (that one POSTs a raw idToken to
  // /api/auth/oauth) — this path already has a server-issued session token
  // by the time it gets here, so it POSTs straight to
  // /api/auth/oauth/claim instead (see that route for why).
  useEffect(() => {
    if (!isNativeApp()) return
    let cancelled = false
    let removeListener: (() => void) | undefined
    import('@capacitor/app').then(({ App }) => {
      if (cancelled) return
      App.addListener('appUrlOpen', async ({ url }: { url: string }) => {
        let target: URL
        try {
          target = new URL(url)
        } catch {
          return
        }
        // Scoped strictly to this app's own oauth-callback host so
        // native-shell-init.tsx's separate referral-link listener (which
        // also listens to appUrlOpen) never fights over the same URL — see
        // the matching guard added there.
        if (target.protocol !== 'sensora:' || target.hostname !== 'oauth-callback') return

        const { Browser } = await import('@capacitor/browser')
        Browser.close().catch(() => {})

        const status = target.searchParams.get('status')
        const token = target.searchParams.get('token')
        const message = target.searchParams.get('message')

        if (status === 'cancelled') {
          setOauthLoading(null)
          return
        }
        if (status !== 'ok' || !token) {
          setOauthError(message || 'Google sign-in failed. Please try again.')
          setOauthLoading(null)
          return
        }
        try {
          const res = await fetch('/api/auth/oauth/claim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token }),
          })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error || 'Sign-in failed')
          onComplete({ userId: data.user.id, name: data.user.name, balance: data.balance, contact: data.user.contact })
        } catch (e: any) {
          setOauthError(e.message || 'Something went wrong. Please try again.')
        } finally {
          setOauthLoading(null)
        }
      }).then(handle => { removeListener = () => handle.remove() })
    }).catch(() => { /* plugin not present in this build — non-fatal */ })
    return () => {
      cancelled = true
      removeListener?.()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onComplete])

  const handleGoogleNativeSignIn = useCallback(async () => {
    if (!agreedToPrivacy) {
      setOauthError('Check "I agree to the Privacy Policy" above first')
      return
    }
    if (!GOOGLE_CLIENT_ID) {
      setOauthError('Google sign-in is not set up yet')
      return
    }
    setOauthError(null)
    setOauthLoading('google')
    try {
      const { Browser } = await import('@capacitor/browser')
      const redirectUri = `${window.location.origin}/api/auth/google/callback`
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID)
      authUrl.searchParams.set('redirect_uri', redirectUri)
      authUrl.searchParams.set('response_type', 'code')
      authUrl.searchParams.set('scope', 'openid email profile')
      authUrl.searchParams.set('prompt', 'select_account')
      await Browser.open({ url: authUrl.toString() })
      // Loading state stays on ('google') until the appUrlOpen listener
      // above resolves it — either by completing sign-in or by the person
      // cancelling in the system browser.
    } catch (e: any) {
      setOauthError(e.message || 'Could not open Google sign-in')
      setOauthLoading(null)
    }
  }, [agreedToPrivacy])

  // Sends the real identity token to app/api/auth/oauth/route.ts, which
  // verifies it server-side (lib/server/oauth-verify.ts) before trusting
  // anything in it — nothing here is trusted client-side.
  const submitOAuth = useCallback(async (
    provider: 'google' | 'apple',
    tokenField: 'idToken' | 'identityToken',
    token: string,
    appleName?: string,
  ) => {
    setOauthError(null)
    setOauthLoading(provider)
    try {
      const res = await fetch('/api/auth/oauth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          [tokenField]: token,
          name: name || appleName,
          birthDate,
          privacyAccepted: agreedToPrivacy,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Sign-in failed')
      onComplete({ userId: data.user.id, name: data.user.name, balance: data.balance, contact: data.user.contact })
    } catch (e: any) {
      setOauthError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setOauthLoading(null)
    }
  }, [name, birthDate, agreedToPrivacy, onComplete])

  const handleGoogleCredential = useCallback((response: { credential: string }) => {
    submitOAuth('google', 'idToken', response.credential)
  }, [submitOAuth])

  // Google Identity Services script — loads once, initializes with the real
  // client ID. Silently no-ops if the client ID isn't configured yet, OR if
  // running inside the native Capacitor shell (see isNativeApp() above) —
  // no point loading a script whose sign-in flow Google itself blocks in
  // that context.
  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || isNativeApp()) return
    let cancelled = false
    loadScriptOnce('https://accounts.google.com/gsi/client', () => !!(window as any).google?.accounts?.id)
      .then(() => {
        if (cancelled) return
        ;(window as any).google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
        })
        setGoogleReady(true)
      })
      .catch(() => { /* Google button just won't render — not fatal */ })
    return () => { cancelled = true }
  }, [handleGoogleCredential])

  // Renders Google's own button (their branding terms don't allow a fully
  // custom look) once it's ready AND the caller says it's okay to show
  // (registration gates this on the Privacy Policy checkbox; login doesn't
  // gate it at all, since agreedToPrivacy defaults to true there).
  useEffect(() => {
    if (!googleReady || !agreedToPrivacy || !googleBtnRef.current) return
    googleBtnRef.current.innerHTML = ''
    ;(window as any).google.accounts.id.renderButton(googleBtnRef.current, {
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      shape: 'pill',
      text: 'continue_with',
      // No fixed `width` here on purpose (used to be 320) — Google's iframe
      // paints its OWN white background across whatever width you request,
      // and the pill only fills part of it, so a wide fixed width left a
      // visible white rectangle around the (correctly dark) pill. Omitting
      // width lets the iframe size itself tightly to the button content
      // instead, and the overflow-hidden pill wrapper in the JSX below
      // crops away the last sliver of that white edge.
    })
  }, [googleReady, agreedToPrivacy])

  // Sign in with Apple JS — loaded lazily on first click (unlike Google,
  // there's no visible widget to prepare in advance). Styled to match the
  // rest of the app instead of Apple's auto-rendered <div>.
  const handleAppleSignIn = useCallback(async () => {
    if (!agreedToPrivacy) {
      setOauthError('Check "I agree to the Privacy Policy" above first')
      return
    }
    if (!APPLE_SERVICES_ID) {
      setOauthError('Apple sign-in is not set up yet')
      return
    }
    setOauthError(null)
    setOauthLoading('apple')
    try {
      if (!appleReady) {
        await loadScriptOnce(
          'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
          () => !!(window as any).AppleID,
        )
        ;(window as any).AppleID.auth.init({
          clientId: APPLE_SERVICES_ID,
          scope: 'name email',
          redirectURI: window.location.origin,
          usePopup: true,
        })
        setAppleReady(true)
      }
      const result = await (window as any).AppleID.auth.signIn()
      const identityToken: string | undefined = result?.authorization?.id_token
      if (!identityToken) throw new Error('Apple sign-in did not return a token')
      // Apple only sends the person's name in this client-side `user`
      // object on their very first sign-in ever — never again after that,
      // and never inside the token itself.
      const appleName = result?.user?.name
        ? [result.user.name.firstName, result.user.name.lastName].filter(Boolean).join(' ')
        : undefined
      await submitOAuth('apple', 'identityToken', identityToken, appleName)
    } catch (e: any) {
      // Apple's SDK rejects with `{ error: 'popup_closed_by_user' }` (not an
      // Error instance) when someone just cancels — not a real failure.
      if (e?.error === 'popup_closed_by_user') { setOauthLoading(null); return }
      setOauthError(e.message || 'Something went wrong. Please try again.')
      setOauthLoading(null)
    }
  }, [agreedToPrivacy, appleReady, submitOAuth])

  return (
    <div>
      <div className="flex flex-col gap-2">
        {isNativeApp() ? (
          // Real native flow (2026-09-18) — opens Google's own consent
          // screen in the SYSTEM browser (Browser.open from
          // @capacitor/browser, not this WebView), which Google allows,
          // then picks the result back up via the sensora://oauth-callback
          // deep link handled in the useEffect above. See
          // app/api/auth/google/callback/route.ts for the full flow.
          <div className="w-full flex justify-center">
            <button
              type="button"
              onClick={handleGoogleNativeSignIn}
              disabled={oauthLoading === 'google'}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium text-[var(--text-primary)] active:scale-95 transition-transform disabled:opacity-60"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }}
            >
              {GoogleIcon} {oauthLoading === 'google' ? 'Signing in…' : 'Continue with Google'}
            </button>
          </div>
        ) : agreedToPrivacy && GOOGLE_CLIENT_ID ? (
          // Google's iframe always paints its own white backdrop, even with
          // theme:'filled_black' — that's what showed as a white box around
          // the (correctly styled) dark pill. This wrapper hugs the button's
          // real content size (no width set = no excess iframe area) and
          // clips it to a matching pill shape + app-dark background, so any
          // last 1-2px white edge blends in instead of standing out.
          <div className="w-full flex justify-center">
            <div className="rounded-full overflow-hidden" style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }}>
              <div ref={googleBtnRef} />
            </div>
          </div>
        ) : (
          // Same pill shape as the real button — only shown before Google is
          // configured or before the Privacy Policy is agreed to, so it
          // should still look like "the same control, temporarily inactive"
          // rather than a visually different full-width bar.
          <div className="w-full flex justify-center">
            <button
              type="button"
              onClick={() => setOauthError(agreedToPrivacy ? 'Google sign-in is not set up yet' : 'Check "I agree to the Privacy Policy" above first')}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm text-[var(--text-dim)] opacity-60"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }}
            >
              {GoogleIcon} Continue with Google
            </button>
          </div>
        )}

        {/* Same compact pill shape/size as the Google button above (which
            Google itself renders, so it sets the visual baseline) — this
            used to be a full-width bar, which looked like a different kind
            of control sitting right next to Google's narrow pill. */}
        <div className="w-full flex justify-center">
          <button
            type="button"
            onClick={handleAppleSignIn}
            disabled={oauthLoading === 'apple'}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-full text-sm font-medium active:scale-95 transition-transform disabled:opacity-60"
            style={{ background: '#000', color: '#FFFFFF', border: '1px solid rgba(255,255,255,0.18)' }}
          >
            {AppleIcon} {oauthLoading === 'apple' ? 'Signing in…' : 'Continue with Apple'}
          </button>
        </div>
      </div>

      {oauthError && <p className="text-[#EF4444] text-xs mt-3 text-center">{oauthError}</p>}
    </div>
  )
}