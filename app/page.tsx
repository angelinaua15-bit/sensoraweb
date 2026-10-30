'use client'

// FILE PATH: app/page.tsx
import { useState, useCallback, useEffect, useRef } from 'react'
import type { Expert } from '@/lib/data'
import PrivacyReconsentModal from '@/components/privacy-reconsent-modal'
import PremiumModal from '@/components/premium-modal'
import SplashScreen from '@/components/screens/splash-screen'
import OnboardingScreen from '@/components/screens/onboarding-screen'
import RegisterScreen from '@/components/screens/registration-screen'
import LoginScreen from '@/components/screens/login-screen'
import MiniTestScreen from '@/components/screens/mini-test-screen'
import HomeScreen from '@/components/screens/home-screen'
import SearchScreen from '@/components/screens/search-screen'
import DiscoverScreen from '@/components/screens/discover-screen'
import ExpertProfileScreen from '@/components/screens/expert-profile-screen'
import LiveChatScreen from '@/components/screens/live-chat-screen'
import WalletScreen from '@/components/screens/wallet-screen'
import ReviewScreen from '@/components/screens/review-screen'
import ChatsScreen from '@/components/screens/chats-screen'
import ReadingsScreen from '@/components/screens/readings-screen'
import ConsultationHistoryScreen from '@/components/screens/consultation-history-screen'
import ProfileScreen from '@/components/screens/profile-screen'
import SettingsScreen from '@/components/screens/settings-screen'
import AddFriendScreen from '@/components/screens/add-friend-screen'
import NatalChartScreen from '@/components/screens/natal-chart-screen'
import CompatibilityScreen from '@/components/screens/compatibility-screen'
import NumerologyToolScreen from '@/components/screens/numerology-tool-screen'
import TarotPullScreen from '@/components/screens/tarot-pull-screen'
import PalmReadingScreen from '@/components/screens/palm-reading-screen'
import PersonalReadingScreen from '@/components/screens/personal-reading-screen'
import PrivacyPolicyScreen from '@/components/screens/privacy-policy-screen'
import SupportScreen from '@/components/screens/support-screen'
import DesktopSidebar from '@/components/desktop-sidebar'
import { getZodiacSignFromDate } from '@/lib/data'
import { getDeviceId } from '@/lib/device-id'

export type Screen =
  | 'splash' | 'onboarding' | 'register' | 'login' | 'minitest'
  | 'home' | 'search' | 'discover' | 'expert' | 'chat'
  | 'wallet' | 'review'
  | 'chats' | 'history' | 'profile' | 'settings' | 'consult-history' | 'add-friend'
  | 'natal-chart' | 'compatibility' | 'numerology-tool' | 'tarot-pull' | 'palm-reading'
  | 'privacy-policy' | 'personal-reading' | 'support'

// REAL BUG FOUND ("апл версія дальше так запускається" — after force-quitting
// the native app and reopening it, the person landed back on login/register
// instead of home): this used to restore the signed-in state purely from
// sessionStorage, which is wiped whenever the tab/WebView's top-level
// browsing context session ends — that includes force-quitting the native
// Capacitor app and reopening it, not just closing a browser tab. Meanwhile
// a REAL 30-day httpOnly session cookie (`sensora_client_session`, see
// lib/server/session.ts) was already being set at every login/register and
// already required by every client API route — the front end just never
// used it to restore state on a fresh launch, only sessionStorage.
// sessionStorage restore below is kept as a fast, no-network first paint for
// same-tab reloads; the real fix is the cookie-based fallback right after it
// (see the mount effect), which is what actually survives an app relaunch.
const SESSION_KEY = 'sensora_session'
// Holds a pending referral (?ref=CODE) across the register → OTP → verified
// flow, and across a real OAuth redirect round trip too (same reasoning as
// SESSION_KEY above — sessionStorage survives that reload, plain state
// wouldn't).
const REF_KEY = 'sensora_pending_ref'
// Long-lived token the app trades for a fresh session cookie when the cookie
// was lost (see /api/auth/restore).
const RESTORE_KEY = 'sensora_restore_token'

interface StoredSession {
  userId: string
  userName: string
  contact: string
  balance: number
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('splash')
  const [balance, setBalance] = useState(0)
  const [selectedExpert, setSelectedExpert] = useState<Expert | null>(null)
  // BUG FIX (reported: "кнопка назад викидає геть" — the expert-profile
  // screen's back button always sent the person to Home, even when they'd
  // opened that profile from Search or from their consultation history,
  // which felt like being thrown out of whatever they were doing instead of
  // a normal "back"). Remembers which screen was active right before
  // navigate('expert', ...) was called, so the back button can return there
  // instead of hardcoding 'home'. Defaults to 'home' since that's still the
  // right fallback for any future entry point that forgets to set it.
  const [expertOrigin, setExpertOrigin] = useState<Screen>('home')
  const [lastSessionExpert, setLastSessionExpert] = useState<Expert | null>(null)
  const [quizCategory, setQuizCategory] = useState<string | null>(null)
  const [birthDate, setBirthDate] = useState('')
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState<string | null>(null)
  const [contact, setContact] = useState('')
  // where wallet should return after topup
  const [walletReturnTo, setWalletReturnTo] = useState<Screen>('profile')
  // One-shot flag: Profile's "Notifications" row should open Settings AND
  // its notifications modal in one tap, not just dump the person on top of
  // Settings (see components/screens/profile-screen.tsx / settings-screen.tsx).
  const [openNotificationsOnSettings, setOpenNotificationsOnSettings] = useState(false)
  const [pendingReferralCode, setPendingReferralCode] = useState<string | null>(null)
  // REAL FIX (2026-09-10): see the needsPrivacyReconsent comment in
  // app/api/wallet/route.ts — bumping PRIVACY_POLICY_VERSION used to have
  // zero effect on anyone already signed in. Set from the /api/wallet
  // response on cold start (below); renders a blocking modal near the
  // bottom of this component's JSX until the person taps "I agree".
  const [needsPrivacyReconsent, setNeedsPrivacyReconsent] = useState(false)

  // REAL FEATURE ADDED (your call: "вікно із пакетами щоб купити повинно
  // зявлятись в програмі кожні 45 сек поки клієнт не купить"). This is the
  // same recurring auto-popup that used to live in home-screen.tsx and got
  // removed a few rounds back (it was firing during things like an actual
  // live chat, which was the real complaint) — now it lives here at the app
  // level instead, with three guards the old one didn't have:
  //   1. Never on splash/onboarding/register/login/minitest (nobody's
  //      signed in yet, nothing to sell), and never on 'chat' or 'wallet'
  //      themselves — interrupting a live consultation or the purchase
  //      screen the person is already on defeats the point.
  //   2. Stops firing entirely the moment `balance` goes above 0 — "поки
  //      клієнт не купить" (until the client buys) is the actual stop
  //      condition, checked fresh on every tick via the ref below rather
  //      than only at the moment the timer was set up.
  //   3. Won't stack a second popup on top of one already open, and a
  //      45-second countdown starts fresh only once the person closes it —
  //      it's not "every 45s no matter what," which would eventually show
  //      it while one copy is already on screen.
  const [showAutoPremium, setShowAutoPremium] = useState(false)
  const autoPremiumStateRef = useRef({ userId, balance, screen, showAutoPremium })
  autoPremiumStateRef.current = { userId, balance, screen, showAutoPremium }
  useEffect(() => {
    const SUPPRESSED: Screen[] = ['splash', 'onboarding', 'register', 'login', 'minitest', 'chat', 'wallet']
    // REAL FIX (your call: "щоб купити хвилини вікно не повинно зʼявлятись
    // поки людина не використає 3 хв"): a new person who hasn't spent their
    // free 3-minute trial yet must never be pitched the paid packages. The
    // trial is burned server-side the moment their first chat opens (POST
    // /api/session/free-trial in live-chat-screen.tsx), so the read-only GET
    // is the real "have they used it" signal — checked fresh on every tick,
    // and if the check fails we stay quiet rather than risk showing it early.
    let cancelled = false
    const timer = setInterval(async () => {
      const s = autoPremiumStateRef.current
      if (!s.userId) return // not signed in — nothing to sell yet
      if (s.balance > 0) return // already bought — "поки клієнт не купить" stop condition
      if (s.showAutoPremium) return // one already open, don't stack a second
      if (SUPPRESSED.includes(s.screen)) return
      // The 3 free minutes must have actually been used up (live chat marks
      // this once the free countdown reaches 0) — not merely "burned" by
      // opening a chat and leaving.
      try { if (localStorage.getItem(`sensora_free_used_${s.userId}`) !== '1') return } catch { return }
      try {
        const res = await fetch(`/api/session/free-trial?deviceId=${encodeURIComponent(getDeviceId())}`)
        if (!res.ok) return
        const { available } = await res.json()
        if (available) return // free trial still unspent — don't sell yet
      } catch { return }
      // State may have changed while the request was in flight.
      const now = autoPremiumStateRef.current
      if (cancelled || now.balance > 0 || now.showAutoPremium || SUPPRESSED.includes(now.screen)) return
      setShowAutoPremium(true)
    // Was 45s. Now every 20s (your call: "треба щоб частіше повідомлення щоб
    // купити хв"). Change this one number to tune how often it comes back.
    }, 20000)
    return () => { cancelled = true; clearInterval(timer) }
  }, [])

  const navigate = useCallback((to: Screen, expert?: Expert) => {
    if (expert !== undefined) setSelectedExpert(expert)
    setScreen(to)
    window.scrollTo(0, 0)
  }, [])

  // See the expertOrigin comment above — call this instead of
  // navigate('expert', e) from anywhere a person can open an expert's
  // profile, so its back button knows where to return them.
  const openExpert = useCallback((expert: Expert, from: Screen) => {
    setExpertOrigin(from)
    setSelectedExpert(expert)
    setScreen('expert')
    window.scrollTo(0, 0)
  }, [])

  // Fires once a brand-new account's real userId exists (right after
  // OAuth or OTP verification). Redeems a pending ?ref=CODE for real: both
  // sides get credited via wallet-balance updates (see lib/server/db.ts
  // redeemReferral). Never blocks navigation on the result
  // — a failed/duplicate/self redemption is a non-issue for the person
  // signing up, it just means no bonus this time.
  const redeemPendingReferral = useCallback((newUserId: string, newUserName: string) => {
    if (!pendingReferralCode) return
    fetch('/api/referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: pendingReferralCode, userId: newUserId, userName: newUserName }),
    }).catch(() => { /* ignore — see comment above */ })
    sessionStorage.removeItem(REF_KEY)
    setPendingReferralCode(null)
  }, [pendingReferralCode])

  // Restore a session that survived a reload. Runs once on mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)

    // A real invite link (from ReferralCard's share button) lands here as
    // /?ref=CODE. Stash it so it survives the register → OTP steps (and any
    // OAuth redirect reload), then auto-redeem it the moment a real userId
    // exists below — no manual "enter code" step required for the invited
    // friend.
    const refParam = params.get('ref')
    if (refParam) {
      setPendingReferralCode(refParam)
      sessionStorage.setItem(REF_KEY, refParam)
      window.history.replaceState({}, '', window.location.pathname)
    } else {
      const storedRef = sessionStorage.getItem(REF_KEY)
      if (storedRef) setPendingReferralCode(storedRef)
    }

    const raw = sessionStorage.getItem(SESSION_KEY)
    if (raw) {
      try {
        const saved: StoredSession = JSON.parse(raw)
        if (saved.userId) {
          setUserId(saved.userId)
          setUserName(saved.userName)
          setContact(saved.contact)
          setBalance(saved.balance)
          setScreen('home')
          // birthDate isn't part of the stored session (it's derived at
          // registration time) — refetch it from Supabase so the zodiac
          // sign / lunar calendar / biorhythm chart don't silently fall back
          // to "no birth date" after a reload.
          fetch('/api/profile')
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data?.user?.birthDate) setBirthDate(data.user.birthDate) })
            .catch(() => { /* home-screen still falls back to its own fetch */ })
          return
        }
      } catch { /* ignore corrupted session data */ }
    }

    // No sessionStorage entry — either a genuinely new visitor, or the app
    // was fully closed and reopened (force-quit, or the native Capacitor app
    // relaunching), which wipes sessionStorage but NOT the real 30-day
    // session cookie. Ask the server whether that cookie is still valid
    // before defaulting to the splash/login screen — this is what makes
    // "signed in once, stays signed in" actually true across app restarts,
    // not just same-tab reloads.
    // REAL FIX (reported: "не запамʼятовує пристрій і щоразу треба знову
    // входити" on Android): besides the cookie, the app keeps a longer-lived
    // restore token in localStorage (see /api/auth/restore). If the cookie
    // is gone (Android WebView didn't flush it before a force-close) the
    // token is traded for a fresh cookie, then the profile is fetched
    // again. The profile request also has a 15s timeout + one retry so a
    // slow cold start no longer looks like "signed out".
    ;(async () => {
      try {
        const getProfile = async () => {
          const ctrl = new AbortController()
          const timer = setTimeout(() => ctrl.abort(), 15000)
          try {
            const r = await fetch('/api/profile', { signal: ctrl.signal })
            return r.ok ? await r.json() : null
          } finally { clearTimeout(timer) }
        }
        let data = await getProfile().catch(() => getProfile().catch(() => null))
        if (!data?.user?.id) {
          let token: string | null = null
          try { token = localStorage.getItem(RESTORE_KEY) } catch { /* storage blocked */ }
          if (token) {
            const r = await fetch('/api/auth/restore', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            })
            if (r.ok) data = await getProfile().catch(() => null)
            else if (r.status === 401) { try { localStorage.removeItem(RESTORE_KEY) } catch { /* ignore */ } }
          }
        }
        const user = data?.user
        if (!user?.id) return // truly signed out — normal splash/login flow
        setUserId(user.id)
        setUserName(user.name)
        setContact(user.contact)
        if (user.birthDate) setBirthDate(user.birthDate)
        try {
          const walletRes = await fetch('/api/wallet')
          if (walletRes.ok) {
            const walletData = await walletRes.json()
            setBalance(walletData.balance ?? 0)
            if (walletData.needsPrivacyReconsent) setNeedsPrivacyReconsent(true)
          }
        } catch { /* home-screen's own balance polling will catch up */ }
        setScreen('home')
      } catch { /* offline on cold start — stay on splash */ }
    })()

  }, [])

  // Whenever someone is signed in (any path: login, register, OAuth, restore),
  // refresh the restore token kept in localStorage.
  useEffect(() => {
    if (!userId) return
    fetch('/api/auth/restore')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (d?.token) { try { localStorage.setItem(RESTORE_KEY, d.token) } catch { /* ignore */ } } })
      .catch(() => { /* try again next launch */ })
  }, [userId])

  // Keep sessionStorage in sync so a reload doesn't sign the person out.
  // Cleared explicitly on sign-out below.
  useEffect(() => {
    if (userId) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ userId, userName, contact, balance } satisfies StoredSession))
    }
  }, [userId, userName, contact, balance])

  const openWallet = useCallback((returnTo: Screen) => {
    setWalletReturnTo(returnTo)
    setScreen('wallet')
    window.scrollTo(0, 0)
  }, [])

  // WalletScreen now handles its own real Wise checkout call directly (same
  // pattern as components/premium-modal.tsx) — nothing to wire here anymore.
  // See the comment at the top of wallet-screen.tsx for why the old
  // instant-credit demo handler was removed.

  const handleEndChat = useCallback((expert: Expert) => {
    setLastSessionExpert(expert)
    setScreen('review')
    window.scrollTo(0, 0)
  }, [])

  const showSidebar = !['splash', 'onboarding', 'login', 'register', 'minitest'].includes(screen)

  // FIX (adapt to any device, 2026-09-18): there was no width constraint at
  // all — on a tablet, a foldable, or just a desktop browser window, the
  // whole app-shell (built as a fixed mobile layout: bottom nav, full-width
  // action bars, etc.) stretched edge to edge instead of staying a
  // phone-width column. This wraps the existing <main> (completely
  // untouched otherwise — same h-dvh/overflow-hidden it always had) in an
  // outer flex container that centers it at a max width once the viewport
  // is wider than a large phone; on any actual phone (still the vast
  // majority of real usage) max-w-[480px] is wider than the screen itself,
  // so w-full just fills it exactly as before — zero visual change there.
  return (
    <div className="min-h-dvh w-full flex justify-center" style={{ background: 'var(--bg-void)' }}>
    {/* sensoraweb — full-screen web app on tablet/laptop (>= 768px): the app
        fills the whole window (no phone-width column); after sign-in a left
        sidebar replaces the bottom bar. Layout rules: app/globals.css
        ("sensoraweb desktop layout"). */}
    {/* sensoraweb — tablet & computer layout (viewport >= 768px): a left sidebar
        replaces the bottom bar and the content column is wider. Only after
        sign-in — splash/onboarding/login/register stay a centered card. */}
    {showSidebar && (
      <DesktopSidebar active={screen} userName={userName} balance={balance} onNavigate={navigate} />
    )}
    {/* FIX (reported: "інтерфейс вилазить на верхню панель на андройді" —
        back buttons/headers were rendering under the Android status bar,
        both ugly and hard to tap). native-shell-init.tsx already asks the
        native StatusBar plugin not to overlay the WebView, but that call
        only takes effect once the native Android app is rebuilt with the
        plugin bundled in — it can't fix an already-installed APK. This CSS
        padding is the web-side, always-on fix: every screen renders inside
        this single <main>, so adding safe-area-inset-top once here pushes
        every screen's header down by the real status-bar height on any
        device/build, native fix rebuilt or not, instead of patching each
        screen's own header individually. (safe-area-inset-* only reports a
        real value when viewport-fit=cover is set — see app/layout.tsx.) */}
    <main className={`h-dvh overflow-hidden bg-[var(--bg-void)] w-full max-w-[480px] relative min-w-0 sw-main md:max-w-none md:flex-1`}
      data-screen={screen}
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div key={screen} className="screen-enter h-full">
      {screen === 'splash' && (
        <SplashScreen onStart={() => navigate('onboarding')} onLogin={() => navigate('login')} />
      )}
      {/* The 3-question quiz after onboarding was removed; date of birth is
          now a field on the registration form. */}
      {screen === 'onboarding' && (
        <OnboardingScreen onNext={() => navigate('register')} />
      )}
      {screen === 'login' && (
        <LoginScreen
          onBack={() => navigate('splash')}
          onRegister={() => navigate('onboarding')}
          onLoggedIn={({ userId, name, balance, contact }) => {
            setUserId(userId)
            setUserName(name)
            setContact(contact)
            setBalance(balance)
            redeemPendingReferral(userId, name)
            // Same reasoning as the sessionStorage-restore effect above:
            // birthDate isn't part of the login response, so the zodiac
            // sign / lunar calendar / biorhythm chart on the home screen
            // don't silently fall back to "no birth date" after logging in.
            fetch(`/api/profile?userId=${encodeURIComponent(userId)}`)
              .then(res => res.ok ? res.json() : null)
              .then(data => { if (data?.user?.birthDate) setBirthDate(data.user.birthDate) })
              .catch(() => { /* home-screen still falls back to its own fetch */ })
            navigate('home')
          }}
        />
      )}
      {screen === 'minitest' && (
        <MiniTestScreen onNext={(cat: string, bd: string) => {
          setQuizCategory(cat)
          setBirthDate(bd)
          navigate('register')
        }} />
      )}
      {screen === 'register' && (
        <RegisterScreen
          birthDate={birthDate}
          // REAL FEATURE CHANGED ("прибрати код підтвердження емейл...
          // легша реєстрація"): used to stash name/contact/devCode and
          // navigate('otp') to a separate code-entry screen. Registration
          // now signs the person in directly (see
          // app/api/auth/register/route.ts, which sets the real session
          // cookie itself) — this handler is now identical in shape to
          // onOAuthComplete right below it, and goes straight to `home`.
          onRegistered={({ userId, name, contact, balance }) => {
            setUserId(userId)
            setUserName(name)
            setContact(contact)
            setBalance(balance)
            redeemPendingReferral(userId, name)
            navigate('home')
          }}
          onOAuthComplete={({ userId, name, balance }) => {
            setUserId(userId)
            setUserName(name)
            setBalance(balance)
            redeemPendingReferral(userId, name)
            navigate('home')
          }}
        />
      )}
      {screen === 'home' && (
        <HomeScreen
          userId={userId}
          userName={userName}
          contact={contact}
          balance={balance}
          birthDate={birthDate}
          quizCategory={quizCategory}
          onNavigate={navigate}
          onSelectExpert={(e) => openExpert(e, 'home')}
          onBalanceChange={setBalance}
        />
      )}
      {screen === 'search' && (
        <SearchScreen
          onNavigate={navigate}
          onSelectExpert={(e) => openExpert(e, 'search')}
        />
      )}
      {screen === 'natal-chart' && (
        <NatalChartScreen
          userId={userId}
          birthDate={birthDate}
          onBack={() => navigate('home')}
          onNavigate={navigate}
        />
      )}
      {screen === 'compatibility' && (
        <CompatibilityScreen userId={userId} onBack={() => navigate('home')} />
      )}
      {screen === 'numerology-tool' && (
        <NumerologyToolScreen birthDate={birthDate} onBack={() => navigate('home')} />
      )}
      {screen === 'tarot-pull' && (
        <TarotPullScreen onBack={() => navigate('home')} />
      )}
      {screen === 'palm-reading' && (
        <PalmReadingScreen onBack={() => navigate('home')} onTopup={() => openWallet('palm-reading')} />
      )}
      {screen === 'personal-reading' && (
        <PersonalReadingScreen userId={userId} userName={userName} onBack={() => navigate('home')} />
      )}
      {screen === 'privacy-policy' && (
        <PrivacyPolicyScreen onBack={() => navigate('settings')} />
      )}
      {screen === 'discover' && (
        <DiscoverScreen onNavigate={navigate} userId={userId} userName={userName} contact={contact} />
      )}
      {screen === 'expert' && selectedExpert && (
        <ExpertProfileScreen
          expert={selectedExpert}
          userId={userId}
          onBack={() => navigate(expertOrigin)}
          onStartChat={() => navigate('chat')}
        />
      )}
      {screen === 'chat' && selectedExpert && (
        <LiveChatScreen
          expert={selectedExpert}
          userId={userId}
          userName={userName}
          balance={balance}
          onBalanceChange={setBalance}
          onEnd={(e) => handleEndChat(e)}
          onTopup={() => openWallet('chat')}
          onNavigate={navigate}
        />
      )}
      {screen === 'wallet' && (
        <WalletScreen
          balance={balance}
          userId={userId}
          userName={userName}
          onBack={() => navigate(walletReturnTo)}
        />
      )}
      {screen === 'review' && lastSessionExpert && (
        <ReviewScreen
          expert={lastSessionExpert}
          userId={userId}
          userName={userName}
          onDone={() => navigate('home')}
        />
      )}
      {screen === 'chats' && (
        <ChatsScreen
          userId={userId}
          onNavigate={navigate}
          onSelectExpert={(e) => { setSelectedExpert(e); navigate('chat') }}
        />
      )}
      {screen === 'history' && (
        <ReadingsScreen onNavigate={navigate} birthDate={birthDate} />
      )}
      {screen === 'support' && (
        <SupportScreen onNavigate={navigate} />
      )}
      {screen === 'consult-history' && (
        <ConsultationHistoryScreen
          userId={userId}
          onBack={() => navigate('profile')}
          onSelectExpert={(e) => openExpert(e, 'consult-history')}
        />
      )}
      {screen === 'profile' && (
        <ProfileScreen
          userName={userName}
          userId={userId}
          contact={contact}
          balance={balance}
          onNavigate={navigate}
          onOpenWallet={() => openWallet('profile')}
          onOpenNotifications={() => {
            setOpenNotificationsOnSettings(true)
            navigate('settings')
          }}
        />
      )}
      {screen === 'add-friend' && (
        <AddFriendScreen
          userId={userId}
          userName={userName}
          mySignId={getZodiacSignFromDate(birthDate)}
          onBack={() => navigate('home')}
        />
      )}
      {screen === 'settings' && (
        <SettingsScreen
          userId={userId}
          userName={userName}
          contact={contact}
          onBack={() => navigate('home')}
          onNavigate={navigate}
          openNotificationsOnMount={openNotificationsOnSettings}
          onNotificationsAutoOpened={() => setOpenNotificationsOnSettings(false)}
          onSignOut={async () => {
            // BUG FIX (reported: "не працює кнопка виходу"). Also clears the
            // real httpOnly session cookie server-side (code audit fix — see
            // lib/server/session.ts). This used to be fire-and-forget
            // (fetch(...).catch(()=>{})) with the local reset happening
            // immediately regardless — on screen that looked fine (it does
            // land back on splash), but if this request never actually
            // completed (silently failed, or got dropped mid-flight by the
            // client-side navigation that followed a split second later),
            // the real cookie on the server was never cleared. Next app
            // launch, the mount effect's own fetch('/api/profile') fallback
            // (used to survive a force-quit) would then find that still-valid
            // cookie and quietly log the person right back in — looking
            // exactly like "sign out doesn't work" even though the button
            // itself was fine. Now the logout call is awaited first, so the
            // cookie is confirmed cleared before the local reset/navigate.
            try {
              await fetch('/api/auth/logout', { method: 'POST' })
            } catch { /* network error — local reset below still signs the person out of this session */ }
            setUserId(null)
            setUserName('')
            setBalance(0)
            setContact('')
            sessionStorage.removeItem(SESSION_KEY)
            try { localStorage.removeItem(RESTORE_KEY) } catch { /* ignore */ }
            navigate('splash')
          }}
          onAccountDeleted={() => {
            // The account is already gone server-side by this point (see
            // app/api/account/delete/route.ts — it deletes the row AND
            // clears the session cookie itself), so unlike onSignOut above
            // there's no separate logout call to make here. Same local
            // reset either way — nothing left to sign back into.
            setUserId(null)
            setUserName('')
            setBalance(0)
            setContact('')
            sessionStorage.removeItem(SESSION_KEY)
            try { localStorage.removeItem(RESTORE_KEY) } catch { /* ignore */ }
            navigate('splash')
          }}
        />
      )}
      {needsPrivacyReconsent && (
        <PrivacyReconsentModal
          onAgree={async () => {
            const res = await fetch('/api/auth/reconsent-privacy', { method: 'POST' })
            if (!res.ok) throw new Error('reconsent failed')
            setNeedsPrivacyReconsent(false)
          }}
        />
      )}
      {showAutoPremium && (
        <PremiumModal
          userId={userId}
          userName={userName}
          contact={contact}
          onCredited={setBalance}
          onClose={() => setShowAutoPremium(false)}
        />
      )}
      </div>
    </main>
    </div>
  )
}
