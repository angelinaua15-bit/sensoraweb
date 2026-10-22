'use client'

// FILE PATH: components/native-shell-init.tsx
// Added 2026-09-10 alongside @capacitor/splash-screen and
// @capacitor/status-bar (package.json) — before this, neither package was
// installed at all, so the native iOS/Android build (once someone runs
// `npx cap add ios/android` on a real Mac/PC — see CAPACITOR_SETUP.md, this
// sandbox can't do that part) would have shipped with Capacitor's bare
// default splash (blank white flash) and a status bar that never matched
// the app's own dark/light theme.
// Deliberately does nothing on web/Telegram Mini App — Capacitor.isNativePlatform()
// is false there, and the try/catch mirrors the same defensive pattern
// already used in components/oauth-buttons.tsx for the same reason: these
// packages exist in package.json but nothing guarantees the native runtime
// is actually present in every environment this code runs in.
import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { useTheme } from '@/components/theme-provider'

function isNativeApp(): boolean {
  try { return Capacitor.isNativePlatform() } catch { return false }
}

export function NativeShellInit() {
  const { resolvedTheme } = useTheme()

  // Hide the native splash screen once React has actually painted content —
  // capacitor.config.ts should set launchAutoHide: false (see the comment
  // added there) so Capacitor doesn't auto-hide it early on a slow device
  // before the real UI is ready; this is the manual hide that replaces that.
  useEffect(() => {
    if (!isNativeApp()) return
    let cancelled = false
    import('@capacitor/splash-screen')
      .then(({ SplashScreen }) => { if (!cancelled) SplashScreen.hide() })
      .catch(() => { /* plugin not present in this build — non-fatal */ })
    return () => { cancelled = true }
  }, [])

  // Keep the native status bar in sync with the app's own resolved theme —
  // matches the same dark/light colors already set in app/layout.tsx's
  // <meta name="theme-color"> for the web/PWA case.
  useEffect(() => {
    if (!isNativeApp()) return
    let cancelled = false
    import('@capacitor/status-bar')
      .then(({ StatusBar, Style }) => {
        if (cancelled) return
        // FIX (2026-09-10, native-readiness audit): capacitor.config.ts
        // only sets contentInset:'automatic' for iOS, which relies on
        // WKWebView's own auto-inset behavior — Android has no equivalent
        // config key and was left to Capacitor's default, which on some
        // Android versions/plugin versions draws the WebView content under
        // the status bar unless told not to. Explicit false here means
        // "don't overlay" on every platform that supports the call; it's a
        // no-op where it doesn't apply (iOS ignores it — contentInset
        // already governs that side) rather than something that could make
        // either platform worse.
        StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {})
        StatusBar.setStyle({ style: resolvedTheme === 'light' ? Style.Light : Style.Dark }).catch(() => {})
        StatusBar.setBackgroundColor({ color: resolvedTheme === 'light' ? '#FAF7FF' : '#120B2C' }).catch(() => {})
      })
      .catch(() => { /* plugin not present in this build — non-fatal */ })
    return () => { cancelled = true }
  }, [resolvedTheme])

  // Register for real native push (APNs on iOS, FCM on Android) once the
  // native project exists. Added 2026-09-11 alongside lib/server/push.ts's
  // sendApnsPush/sendFcmPush and the /api/push/register-native endpoint —
  // Web Push (components/push-notifications-toggle.tsx, browser
  // PushManager) can't reach a native app in the background, so that path
  // does nothing here and this is the real equivalent for native builds.
  // POST uses the httpOnly session cookie (same-origin fetch), so this
  // silently no-ops if the visitor isn't logged in yet — matches how
  // /api/push/register-native itself is guarded server-side; there's
  // nothing more to do here in that case, so failures are swallowed
  // rather than surfaced (registration will simply retry next app open).
  useEffect(() => {
    if (!isNativeApp()) return
    let cancelled = false
    import('@capacitor/push-notifications')
      .then(async ({ PushNotifications }) => {
        if (cancelled) return
        const platform = Capacitor.getPlatform() // 'ios' | 'android'
        if (platform !== 'ios' && platform !== 'android') return

        let perm = await PushNotifications.checkPermissions()
        if (perm.receive === 'prompt') {
          perm = await PushNotifications.requestPermissions()
        }
        if (perm.receive !== 'granted') return
        if (cancelled) return

        // 'registration' fires with the real APNs/FCM device token once
        // Apple/Google hand it back; register() itself only kicks that off.
        PushNotifications.addListener('registration', (token: { value: string }) => {
          fetch('/api/push/register-native', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform, token: token.value }),
          }).catch(() => { /* offline or logged out — retried on next app open */ })
        })
        PushNotifications.addListener('registrationError', () => {
          /* Apple/Google-side failure (e.g. no valid provisioning/APNs
             entitlement yet) — non-fatal, nothing to recover here. */
        })

        await PushNotifications.register()
      })
      .catch(() => { /* plugin not present in this build — non-fatal */ })
    return () => { cancelled = true }
  }, [])

  // Referral deep links (sensora.space/r/CODE — app/r/[code]/route.ts).
  // Added 2026-09-11. This app runs in Capacitor's `server.url` mode (see
  // capacitor.config.ts) — the WebView is permanently pointed at the live
  // site, so a referral link tapped INSIDE the app's own WebView already
  // works with zero extra code, same as any other in-site navigation.
  // appUrlOpen exists for the other case: iOS/Android handing the link to
  // the native app directly (Universal Links / App Links, or a partner's ad
  // network using a custom scheme) WITHOUT going through the WebView at
  // all — the WebView is just sitting on whatever page it already had
  // loaded, and the OS is telling the app "the user meant to open this URL."
  // Without this listener that link would be silently swallowed: the app
  // would come to the foreground but never actually navigate anywhere, so
  // recordReferralClick in app/r/[code]/route.ts would never fire and the
  // visitor would land on whatever screen they'd left the app on instead of
  // being credited to the partner who sent them.
  // NOTE: registering the actual associated domain (apple-app-site-
  // association / assetlinks.json + Xcode "Associated Domains" capability
  // + AndroidManifest intent-filter) has to happen in the native ios/
  // android project files this sandbox has no access to (see the
  // ios/android-folder-access note) — this listener is the JS-side half;
  // it does nothing until that native-side wiring exists too.
  useEffect(() => {
    if (!isNativeApp()) return
    let cancelled = false
    import('@capacitor/app')
      .then(({ App }) => {
        if (cancelled) return
        App.addListener('appUrlOpen', ({ url }: { url: string }) => {
          try {
            const target = new URL(url)
            // FIX (2026-09-18): components/oauth-buttons.tsx registers its
            // OWN appUrlOpen listener for sensora://oauth-callback (real
            // native Google sign-in — see app/api/auth/google/callback/
            // route.ts). Capacitor fires every listener for every incoming
            // URL, so without this guard this referral-link listener would
            // ALSO try to handle that URL and wrongly full-page-navigate
            // the WebView to it. oauth-callback is reserved for that other
            // listener exclusively.
            if (target.protocol === 'sensora:' && target.hostname === 'oauth-callback') return
            // Accept both the real https:// universal link and a
            // sensora:// custom-scheme fallback for the same path shape.
            if (target.hostname !== 'sensora.space' && target.protocol !== 'sensora:') return
            const path = target.pathname + target.search
            if (!path || path === '/') return
            // Full navigation (not router.push) so this actually hits
            // app/r/[code]/route.ts on the server and runs
            // recordReferralClick + the real redirect, exactly like a
            // normal browser tab would — a client-side route transition
            // would not execute that server Route Handler the same way.
            window.location.href = path
          } catch { /* malformed URL from the OS — ignore rather than crash */ }
        })
      })
      .catch(() => { /* plugin not present in this build — non-fatal */ })
    return () => { cancelled = true }
  }, [])

  return null
}
