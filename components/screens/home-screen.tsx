'use client'

// FILE PATH: components/screens/home-screen.tsx
import { useState, useEffect, useCallback } from 'react'
import BottomNav from '@/components/bottom-nav'
import ModalPortal from '@/components/modal-portal'
import DailyPredictionGate from '@/components/daily-prediction-card'
import BirthDateSelect from '@/components/ui/birth-date-select'
import { ZodiacWheelArt } from '@/components/magic-art'
// REMOVED (your call: "все що на фото під ніж" + "календар вирізати всьо
// мор фор ю"): the whole "More for you" tab switcher (Calendar/Events/Tips/
// Relationships/Mood/Tarot/YesNo/Biorhythms) is gone from this screen, along
// with the standalone "Get 3 minutes free" card, the "New to Sensora? Watch
// a quick video intro" banner, and the period tabs (Yesterday/Today/
// Tomorrow/Week/Month/Year) + their Career/Love/Health grid. BiorhythmChart,
// MoodTrendChart, ProgressRing and most of today-widgets.tsx's exports were
// only ever used inside that section — trimmed along with it. The one real
// feature that lived only behind the Calendar tab's "edit" link — setting
// birth time/place/UTC offset, which the natal chart needs for an accurate
// Ascendant/houses — still needs a way in, so it's now reachable from a
// small link next to the sign panel instead (see openBirthInfoEditor below).
import { PersonalTarotVideoBanner, IntroVideoBanner } from '@/components/today-widgets'
import { useLanguage } from '@/components/language-provider'
import { useFreeTrialAvailable } from '@/lib/use-free-trial'
import { getDeviceId } from '@/lib/device-id'
import { PRICE_PER_MIN_USD } from '@/lib/minute-packages'
import {
  ZODIAC_SIGNS, SIGN_CHART, getHoroscope, getZodiacSignFromDate,
  type Expert,
} from '@/lib/data'
import type { Screen } from '@/app/page'

interface Props {
  userId?: string | null
  userName: string
  contact?: string
  balance: number
  birthDate?: string
  quizCategory: string | null
  onNavigate: (s: Screen) => void
  onSelectExpert: (e: Expert) => void
  // Lets a minute-package purchase (PremiumModal) update the wallet-balance
  // pill in the header immediately, without a full reload.
  onBalanceChange: (balance: number) => void
}

interface ProfileInfo {
  birthDate?: string
  birthTime?: string
  birthPlace?: string
  latitude?: number
  longitude?: number
  utcOffsetHours?: number
  relationshipStatus?: string
  isPremium?: boolean
}

// UTC offset picker for the birth-info editor — real time zones aren't
// evenly spaced by longitude (see computeNatalChart's own note on this),
// so rather than silently guess, the person picks their real standard-time
// offset at birth. This is what lets the Ascendant/houses stop being
// "estimated" and become a real, disclosed-precise calculation.
const UTC_OFFSETS = [
  -12, -11, -10, -9.5, -9, -8, -7, -6, -5, -4.5, -4, -3.5, -3, -2, -1, 0,
  1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 5.75, 6, 6.5, 7, 8, 8.75, 9, 9.5, 10, 10.5, 11, 12, 12.75, 13, 14,
]

export default function HomeScreen({ userId, userName, contact, balance, birthDate, quizCategory, onNavigate, onSelectExpert, onBalanceChange }: Props) {
  // REAL FEATURE ADDED ("3 хв безкоштовні показувались у меню після
  // реєстрації... і щоб зникало після використання, помістити на головній
  // нижче кнопки гарним читабельним текстом"): read-only check (doesn't
  // spend the trial — see lib/use-free-trial.ts), so this simply won't
  // render once the person has actually used their free 180 seconds in a
  // real chat.
  const freeTrialAvailable = useFreeTrialAvailable(userId ?? null)
  const { t, locale } = useLanguage()

  // Server-backed profile fields (birth time/place, relationship status,
  // real premium flag) — fetched once on mount so a reload always reflects
  // what's actually saved in Supabase instead of a stale local prop.
  const [profile, setProfile] = useState<ProfileInfo>({})
  useEffect(() => {
    let cancelled = false
    fetch(`/api/profile?userId=${encodeURIComponent(userId ?? 'u1')}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data?.user) setProfile(data.user) })
      .catch(() => { /* fall back to the birthDate prop below */ })
    return () => { cancelled = true }
  }, [userId])

  // REMOVED: the expert-catalog fetch and its `popular` (top-3-by-reviews)
  // derivation had no callers left once "Talk to an expert" (this screen's
  // own preview row) was removed and the Start Chat button stopped
  // auto-connecting to whoever had the most reviews — both now just send
  // the person to the real Psychics list (search-screen.tsx), which fetches
  // its own catalog already.

  const effectiveBirthDate = profile.birthDate || birthDate

  // Real sign, computed from the birth date collected at signup — not a fixed
  // guess. Only falls back to Leo if somehow no birth date was ever recorded.
  const [signId, setSignId] = useState(() => getZodiacSignFromDate(birthDate))
  useEffect(() => { setSignId(getZodiacSignFromDate(effectiveBirthDate)) }, [effectiveBirthDate])

  // Real, externally-sourced daily horoscope (app/api/horoscope, backed by
  // freehoroscopeapi.com — see lib/server/horoscope-api.ts) — separate from
  // the Career/Love/Health cards below, which stay on the app's own local
  // content pool. This is the one that actually changes day to day: the
  // server refetches it from the external API roughly every hour, keyed by
  // sign, and it always shows the current date's text. Refetches whenever
  // the person switches which sign they're browsing.
  const [dailyHoroscope, setDailyHoroscope] = useState<{ text: string; date: string } | null>(null)
  useEffect(() => {
    let cancelled = false
    // BUG FIX: this never told the server which language the person has
    // the app set to, so /api/horoscope always defaulted to English (see
    // app/api/horoscope/route.ts + lib/server/horoscope-api.ts). Now also
    // refetches whenever the person switches language, not just when they
    // switch which sign they're browsing.
    fetch(`/api/horoscope?sign=${encodeURIComponent(signId)}&lang=${encodeURIComponent(locale)}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data?.horoscope) setDailyHoroscope({ text: data.horoscope, date: data.date }) })
      .catch(() => { /* card just stays hidden if this fails */ })
    return () => { cancelled = true }
  }, [signId, locale])
  const [showBirthChart, setShowBirthChart] = useState(false)
  // BUG FIX (reported: "Todays гороскоп обрезается" — the daily horoscope
  // card's text was just being visually cut off by the card's own edge with
  // no way to read the rest): starts clamped to 3 lines with a real
  // "Show more" toggle instead of silently truncating.
  const [horoscopeExpanded, setHoroscopeExpanded] = useState(false)
  // Start Chat now always goes to the real Psychics list (search-screen.tsx)
  // instead of silently auto-connecting to whoever has the most reviews —
  // if the free trial is still unclaimed, a small popup announces it first;
  // either way, tapping "Find a psychic" / the button itself lands on search.
  const [showFreeTrialPopup, setShowFreeTrialPopup] = useState(false)
  // BUG FIX (reported: "щоб нормалльно спливали 3 хв" — the free-trial
  // popup wasn't reliably showing up). Real race condition: useFreeTrialAvailable
  // starts out as `null` (still loading) right after this screen mounts, and
  // this handler's `if (freeTrialAvailable)` treated null the same as false
  // — so a tap on Start Chat quick enough to land before that fetch resolved
  // (very plausible: it's the very first thing most people do on this
  // screen) skipped the popup and went straight to search, even for someone
  // who genuinely still had their free trial. Now: if the hook hasn't
  // resolved yet, this does its own one-off check of the same endpoint
  // before deciding, instead of trusting a value that might still be
  // mid-flight.
  const handleStartChat = async () => {
    let available = freeTrialAvailable
    if (available === null) {
      try {
        const res = await fetch(`/api/session/free-trial?deviceId=${encodeURIComponent(getDeviceId())}`)
        const data = res.ok ? await res.json() : { available: false }
        available = !!data.available
      } catch {
        available = false
      }
    }
    if (available) setShowFreeTrialPopup(true)
    else onNavigate('search')
  }
  const proceedToSearch = () => {
    setShowFreeTrialPopup(false)
    onNavigate('search')
  }
  const [editingBirthInfo, setEditingBirthInfo] = useState(false)
  const [birthDateInput, setBirthDateInput] = useState('')
  const [birthTimeInput, setBirthTimeInput] = useState('')
  const [birthPlaceInput, setBirthPlaceInput] = useState('')
  const [utcOffsetInput, setUtcOffsetInput] = useState('')
  const [savingBirthInfo, setSavingBirthInfo] = useState(false)
  const [streak, setStreak] = useState(0)

  const sign = ZODIAC_SIGNS.find(s => s.id === signId)!
  // This stays the generic, per-sign educational pairing (unchanged) — it's
  // bound to whichever sign the person is browsing via the row of zodiac
  // icons above, not necessarily their own. Their real, personally computed
  // chart (Sun/Moon/Ascendant/houses from actual birth data) now lives on
  // its own dedicated screen — see the "Full natal chart" button below and
  // components/screens/natal-chart-screen.tsx — so it's never confused with
  // "whatever sign you're currently browsing."
  const chart = SIGN_CHART[signId]
  // Only `.tip` from this is still used below ("Tip for the day") — the
  // Career/Love/Health lines this also carried are gone along with the grid
  // that showed them. Hardcoded to 'Today' now that the period tabs
  // (Yesterday/Today/Tomorrow/Week/Month/Year) are gone too — nothing left
  // on this screen lets the person pick a different one.
  const horoscope = getHoroscope(signId, 'Today', locale)

  // Real, server-computed streak (lib/server/db.ts recordDailyVisit) — one
  // call per mount, idempotent for the rest of the day.
  useEffect(() => {
    const uid = userId ?? 'u1'
    fetch('/api/streak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: uid }),
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data?.streak) setStreak(data.streak) })
      .catch(() => { /* streak badge just stays hidden if this fails */ })
  }, [userId])

  // REMOVED (your call, alongside the packages banner elsewhere on this
  // screen): this used to auto-open the buy-minutes paywall on its own
  // after a short delay on almost every visit — a Nebula-style proactive
  // upsell. Since the packages promo is being pulled off this screen
  // entirely, an auto-popup for it made even less sense than before, so
  // the whole effect (and the sessionStorage visit counter it used) is
  // gone rather than left pointing at nothing.

  const openBirthInfoEditor = useCallback(() => {
    setBirthDateInput(profile.birthDate ?? birthDate ?? '')
    setBirthTimeInput(profile.birthTime ?? '')
    setBirthPlaceInput(profile.birthPlace ?? '')
    setUtcOffsetInput(profile.utcOffsetHours !== undefined ? String(profile.utcOffsetHours) : '')
    setEditingBirthInfo(true)
  }, [profile, birthDate])

  const saveBirthInfo = useCallback(async () => {
    setSavingBirthInfo(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId ?? 'u1',
          birthDate: birthDateInput || undefined,
          birthTime: birthTimeInput || undefined,
          birthPlace: birthPlaceInput || undefined,
          utcOffsetHours: utcOffsetInput === '' ? undefined : Number(utcOffsetInput),
        }),
      })
      const data = await res.json()
      if (res.ok && data.user) setProfile(data.user)
      setEditingBirthInfo(false)
    } catch {
      // Non-fatal — the editor just stays open so the person can retry.
    } finally {
      setSavingBirthInfo(false)
    }
  }, [userId, birthDateInput, birthTimeInput, birthPlaceInput, utcOffsetInput])

  // REMOVED along with the "More for you" section and the "Did you like
  // your horoscope?" card: changeRelationshipStatus (only called from
  // RelationshipsCard) and submitRating (only called from the rating
  // widget) had no other callers left, so they're gone rather than kept
  // around unused. Their API routes (/api/relationship-status, /api/mood)
  // are untouched — nothing server-side depended on this screen calling them.

  return (
    <div className="flex flex-col h-full sensora-bg">
      {/* Once-a-day "Silpo style" card — see components/daily-prediction-card.tsx.
          Renders nothing after the first open of the calendar day, so this
          is a zero-cost no-op the rest of the time; when it IS the first
          open, it covers the screen below until the person taps Continue. */}
      <DailyPredictionGate />
      {/* ONE-SCREEN LAYOUT (your call: "сторінка не горталась вниз а була
          одна повноцінна сторінка без скролу, без пустого місця"): the
          content column is a flex column with NO spacer gaps; the daily
          horoscope card at the bottom is the one flex-1 element and absorbs
          any leftover height, so the page fills the screen (no empty
          band, no scroll). overflow-y-auto stays only as a safety net for
          very short screens where the content genuinely can't fit. */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4 flex flex-col">
        {/* REDESIGNED (your call: "перша сторінка вже настільки маленька що
            можна зробити її щоб вона не горталася вниз... перенести вліво
            вверх, проте щоб це не було перегружено в хедері"). The old
            layout was a full-width header row followed by a separate,
            centered "sign panel" block — 64px avatar + heading + moon/asc
            row + edit link + two pill buttons, ~200px of its own vertical
            space just to show "you are Pisces". That block is gone; the
            sign symbol becomes a small tappable icon inline with the
            greeting (still opens the same Birth Chart wheel on tap — no
            feature lost), and the sign/moon/ascendant line sits as one
            compact caption underneath the name instead of its own
            three-line section. The two natal-chart pills + edit-birth-info
            link move into one slim row right below, still real buttons
            doing the same things, just no longer costing a full screen's
            worth of height. Net effect: the whole "who am I" section that
            used to run header → avatar → name → moon/asc → link → buttons
            now fits in two short rows, which is what actually gets this
            screen close to fitting without scrolling on most phones,
            closer to how a native app's home tab behaves. */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <button onClick={() => setShowBirthChart(v => !v)}
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0 active:scale-95 transition-transform"
              style={{ background: 'radial-gradient(circle at 30% 30%,#D946EF33,var(--bg-elevated))', border: '2px solid rgba(217,70,239,0.5)' }}
              aria-label={sign.name}>
              {sign.symbol}
            </button>
            <div className="min-w-0">
              <p className="text-[var(--text-muted)] text-xs leading-tight">{t('today.greetingPrefix')}</p>
              <div className="flex items-center gap-2">
                <h2 className="text-[var(--text-primary)] text-lg font-serif font-light truncate">{userName || t('today.seekerFallback')}</h2>
                {streak > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0"
                    style={{ background: 'rgba(245,197,66,0.15)', color: '#F5C542' }}>
                    🔥 {t('today.streakBadge', { n: streak })}
                  </span>
                )}
              </div>
              {/* BUG FIX (your call: "убрать дублирование знака зодиака...
                  убрать солнце, увеличить луну і асцендент") carried over
                  from the old layout — still just sign/moon/ascendant, no
                  repeated ☉ line, now as one compact caption. */}
              <p className="text-[var(--text-dim)] text-[11px] mt-0.5 truncate">
                {sign.name} · ☽ {chart.moon} · Asc {chart.ascendant}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* REAL FEATURE CHANGED (your call: "$ так і не переробила як
                баланс на хвилини" — the wallet pill used to show the raw
                dollar amount. Every consultation on Sensora actually charges
                at a fixed $2/min rate (FIXED_PRICE_PER_MIN in
                lib/server/db.ts — mirrored client-side as PRICE_PER_MIN_USD
                in lib/minute-packages.ts so this file can use the same real
                number instead of guessing one), so "$6.00" and "3 min" are
                the same balance, just shown the way a phone-minutes balance
                actually reads on a consultation app. Still opens the same
                wallet screen on tap.) */}
            <button onClick={() => onNavigate('wallet')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{ background: 'rgba(217,70,239,0.12)', border: '1px solid rgba(217,70,239,0.3)' }}>
              <span className="text-[#D946EF] text-sm">🪙</span>
              <span className="text-[var(--text-primary)] text-sm font-semibold">
                {t('wallet.minutesShort', { mins: Math.floor(balance / PRICE_PER_MIN_USD) })}
              </span>
            </button>
            {/* BUG FIX (your call: "поміняти іконку налаштувань на
                шестерьонку"): the old icon was 8 straight lines radiating
                off a circle — reads more like a sun/burst than a gear. Real
                cog shape now (actual teeth, not spokes). */}
            <button onClick={() => onNavigate('settings')}
              className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
              style={{ background: 'var(--surface-1)' }} aria-label="Settings">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Slim utility row — same three real actions the old sign panel
            had (edit birth info, generic Birth Chart wheel, real personal
            natal chart), just inline and compact instead of stacked. */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <button onClick={openBirthInfoEditor} className="text-[var(--text-dim)] text-[11px] underline underline-offset-2">
            {t('today.editBirthInfo')}
          </button>
          <span className="text-[var(--text-dim)] text-[11px]">·</span>
          <button onClick={() => setShowBirthChart(v => !v)}
            className="px-3 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1"
            style={{ background: 'rgba(124,58,237,0.2)', color: 'var(--text-accent-soft)', border: '1px solid rgba(124,58,237,0.4)' }}>
            🌙 {t('today.birthChartLabel')}
          </button>
          {/* Real, personal natal chart — computed from this person's own
              saved birth data, not the generic per-sign pairing above. This
              is what actually backs the premium-modal promise of a "full
              natal chart" — see natal-chart-screen.tsx. */}
          <button onClick={() => onNavigate('natal-chart')}
            className="px-3 py-1.5 rounded-full text-[11px] font-medium flex items-center gap-1"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)', color: '#fff' }}>
            ✨ {t('today.fullNatalChartLabel')}
          </button>
        </div>

        {showBirthChart && (
          <div className="relative rounded-2xl p-4 mb-4 text-center flex flex-col items-center screen-enter overflow-hidden"
            style={{
              border: '1px solid rgba(245,197,66,0.28)',
              background: 'radial-gradient(circle at 50% 28%, #4c2a9a 0%, #2a1668 45%, #170c3d 100%)',
              boxShadow: '0 12px 32px rgba(124,58,237,0.3)',
            }}>
            {/* REAL PHOTO (your call: "зроби головну сторінку живішу і
                додай щось реальне") — real starry-night photo behind the
                zodiac wheel instead of a flat surface color, dimmed so the
                wheel/text on top stay fully readable. Same photo already
                used for the daily-prediction popup, reused for visual
                consistency across the app's "night sky" moments. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1628498188904-036f5e25e93e?auto=format&fit=crop&w=600&q=80" alt=""
              className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.22, mixBlendMode: 'screen' }} />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(23,12,61,0) 40%, rgba(23,12,61,0.55) 100%)' }} />
            {/* BUG FIX (reported: "тут трішки налазить на букву W") — the
                "Pisces — Water sign" line had a -mt-2 negative top margin
                that was fine when this card had less content above it, but
                pulled the text up far enough to clip into the wheel art's
                own bottom edge. Removed — the wheel's own bottom padding is
                enough spacing on its own. */}
            <ZodiacWheelArt size={180} highlight={sign.symbol} />
            {/* BUG FIX (reported: "темний екран" on Birth Chart): this card is
                always dark, but its text used the theme variables, which turn
                dark in the Light theme — dark text on a dark card, nearly
                invisible. The card now has its own bright violet background
                and fixed light text so it reads the same in every theme. */}
            <p className="relative text-white text-sm font-semibold mb-1 mt-2">{t('today.birthChartInfo', { sign: sign.name, element: sign.element })}</p>
            <p className="relative text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.82)' }}>
              {t('today.birthChartBody', { sign: sign.name, moon: chart.moon, ascendant: chart.ascendant, dates: sign.dates })}
            </p>
          </div>
        )}

        {/* MOVED (your call: "персонал таро розклад вище кнопки, все інше
            нижче, без пустого місця і без скролу"): the Personal Tarot
            banner now sits ABOVE Start Chat; intro video + horoscope stack
            right below the button. No spacer between them any more — the
            horoscope card is the one flex-1 element and absorbs leftover
            height, so the page is one filled screen. */}
        <PersonalTarotVideoBanner onOpen={() => onNavigate('personal-reading')} />

        {/* Primary "Start Chat" CTA — the single, unmissable action on this
            screen. Usability testing showed people (especially older/less
            tech-savvy users) took far too long to find where to tap to
            actually talk to someone.
            REAL FEATURE CHANGED (your call: "зробити кнопку старт чат
            великою і круглою з доданою пульсуючою анімацією... після
            натискання людина зразу попадає до чатерів"): switched from a
            pill to a big circle (the shape reads as "the one thing to tap"
            even faster than a pill does), and it no longer silently
            auto-connects to whichever expert happens to have the most
            reviews — it always takes the person to the real Psychics list
            (search-screen.tsx) so they choose who to talk to, exactly like
            you asked. The breathe/shine/bounce animations from the last
            round are untouched, just retargeted onto a circle.
            REAL FEATURE MOVED (your call: "перенести отримати 3 безкоштовні
            хвилини або в кінці реєстрації, або одразу після натискання
            старт чат спливаючим вікном"): the free-trial line used to just
            sit as static text under the button. Now, if the free trial is
            still unclaimed, tapping Start Chat opens a small popup
            announcing it first — see showFreeTrialPopup below — instead of
            always being visible whether or not it's relevant. */}
        {/* MOVED (your call: "кнопку опустити по центру"): the button sits
            centered in the flex-1 space between the header rows and the
            cards below it — see the one-screen layout note above. */}
        <div className="flex flex-col items-center mb-3 flex-shrink-0">
          {/* REVERTED (your call: "поверни кнопку на яку як була" — the big
              168px pulsing circle from the last round is gone; back to the
              original full-width rounded CTA bar, keeping only the glow/
              breathe animation and the onClick/free-trial-popup wiring). */}
          <button
            onClick={handleStartChat}
            className="sensora-glow-pulse sensora-cta-breathe relative overflow-hidden w-full flex items-center justify-center gap-2 rounded-2xl py-4 active:scale-[0.97] transition-transform"
            style={{
              background: 'linear-gradient(135deg,#7C3AED,#D946EF)',
              boxShadow: '0 10px 30px rgba(217,70,239,0.4)',
            }}
          >
            {/* REPLACED (your call: "прибери той блік і додай зірочки" —
                the sweeping shine band is gone; four small stars now twinkle
                at staggered positions/delays around the button instead). */}
            <span className="sensora-cta-star absolute pointer-events-none" style={{ top: '18%', left: '14%', animationDelay: '0s' }}>✦</span>
            <span className="sensora-cta-star absolute pointer-events-none" style={{ top: '65%', left: '22%', animationDelay: '0.7s' }}>✦</span>
            <span className="sensora-cta-star absolute pointer-events-none" style={{ top: '25%', right: '16%', animationDelay: '1.3s' }}>✦</span>
            <span className="sensora-cta-star absolute pointer-events-none" style={{ top: '68%', right: '24%', animationDelay: '2s' }}>✦</span>
            <span className="text-xl relative z-10">💬</span>
            <span className="text-white text-base font-bold tracking-wide relative z-10">{t('today.startChatCta')}</span>
          </button>
          <p className="text-[var(--text-dim)] text-xs mt-3 text-center">{t('today.startChatCtaSub')}</p>
        </div>

        {showFreeTrialPopup && (
          <ModalPortal>
            <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
              style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}>
              <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-7 flex flex-col items-center text-center screen-enter"
                style={{ background: 'linear-gradient(180deg,var(--bg-mid),var(--bg-void))', border: '1px solid rgba(245,197,66,0.3)' }}>
                {/* REAL PHOTO (your call: "додай справжні фото з інтернету
                    магічних штук, щоб оживити" — swap the flat 🎁 emoji for a
                    real photo, same treatment as the daily-prediction icon). */}
                <div className="w-14 h-14 rounded-full overflow-hidden mb-4"
                  style={{ border: '1.5px solid rgba(245,197,66,0.4)' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://images.unsplash.com/photo-1513885045260-6b3086b24c17?auto=format&fit=crop&w=150&q=80" alt=""
                    className="w-full h-full object-cover" />
                </div>
                <h2 className="text-[var(--text-primary)] text-lg font-serif mb-2">{t('today.freeTrialPopupTitle')}</h2>
                <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-6">{t('today.freeTrialAvailable')}</p>
                <button onClick={proceedToSearch}
                  className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm active:scale-95 transition-transform"
                  style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
                  {t('today.freeTrialPopupCta')}
                </button>
              </div>
            </div>
          </ModalPortal>
        )}

        {/* RESTORED (your call: "поверний відео і гарно його інтерпретуй" —
            bring the intro-video banner back). It was removed earlier this
            session along with the "More for you" tab switcher it used to
            live inside; the component itself (today-widgets.tsx) was never
            deleted, so nothing was rebuilt. Placed right under the tarot
            banner as a second, lighter-weight card — same compact row
            footprint, no video actually loads until the person taps it. */}
        <IntroVideoBanner />

        {/* Real daily horoscope — sourced live from an external horoscope API
            (not the app's own local content pool below), so this text
            actually changes every day and is dated. This same text (via
            app/api/cron/push-alerts) is also what gets sent as a push
            notification to the device each morning. */}
        {/* BUG FIX (reported: horoscope cut off after "Show more"): this card
            used to be flex-1 min-h-0 overflow-hidden, so expanded text taller
            than the leftover height was clipped. Now it is just flex-1 with
            its default min-height (= its own content): collapsed, it fills the
            leftover space; expanded, it grows to fit all the text and the
            screen scrolls. */}
        {dailyHoroscope && (
          <div className="rounded-2xl p-4 mb-3 relative flex-1 flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,var(--bg-elevated),var(--bg-mid))', border: '1px solid rgba(217,70,239,0.25)' }}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[#D946EF] text-[10px] font-semibold tracking-wide">{t('today.dailyHoroscopeLabel')}</p>
              <p className="text-[var(--text-dim)] text-[10px]">{dailyHoroscope.date}</p>
            </div>
            <p className={`text-[var(--text-primary)] text-sm leading-relaxed ${horoscopeExpanded ? '' : 'line-clamp-3'}`}>{dailyHoroscope.text}</p>
            {dailyHoroscope.text.length > 140 && (
              <button onClick={() => setHoroscopeExpanded(v => !v)} className="text-[#D946EF] text-xs font-medium mt-1.5">
                {horoscopeExpanded ? t('today.showLess') : t('today.showMore')}
              </button>
            )}
          </div>
        )}

        {/* REMOVED (your call: "все що на фото під ніж" + "календар вирізати
            всьо мор фор ю"): the period tabs (Yesterday/Today/Tomorrow/Week/
            Month/Year), the Career/Love/Health grid, the standalone "Get 3
            minutes free" card (the free-trial offer is still shown as the
            small text pill right under the Start Chat button above — this
            was a second, redundant copy of the same offer further down the
            page), the "New to Sensora? Watch a quick video intro" banner,
            the whole "More for you" tab switcher (Calendar/Events/Tips/
            Relationships/Mood/Tarot/YesNo/Biorhythms), the "Did you like
            your horoscope?" rating card, and the "Customize your feed"
            banner — all gone.
            REMOVED (your call, this round: "прибрати тіп фор зе дей"): the
            "TIP FOR THE DAY" card is gone too. `horoscope.tip` itself is
            untouched in lib/data.ts/the horoscope API response — nothing
            else in the app reads it, so this is a clean removal, not a
            dangling reference to a missing field. */}

        {/* REMOVED (your call: "Talk to a psychic не потрібен в кінці
            сторінки"): the "Talk to an expert" preview row is gone — the
            round Start Chat button above already takes the person straight
            to the real Psychics list, so this was a second, redundant way
            to get to the same place. */}
      </div>

      <BottomNav active="home" onNavigate={onNavigate} />

      {editingBirthInfo && (
        <ModalPortal>
          <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center" style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 screen-enter" style={{ background: 'linear-gradient(180deg,var(--bg-mid),var(--bg-void))', border: '1px solid rgba(217,70,239,0.25)' }}>
              <div className="flex justify-between items-center mb-4">
                <p className="text-[var(--text-primary)] text-sm font-medium">{t('settings.accountDetails')}</p>
                <button onClick={() => setEditingBirthInfo(false)} className="text-[var(--text-muted)] text-xs">✕</button>
              </div>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[var(--text-dim)] text-[11px] block mb-1">{t('widgets.dateOfBirth')}</label>
                  <BirthDateSelect value={birthDateInput} onChange={setBirthDateInput} />
                </div>
                <div>
                  <label className="text-[var(--text-dim)] text-[11px] block mb-1">{t('widgets.timeOfBirth')}</label>
                  <input type="time" value={birthTimeInput} onChange={e => setBirthTimeInput(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)', colorScheme: 'dark' }} />
                </div>
                <div>
                  <label className="text-[var(--text-dim)] text-[11px] block mb-1">{t('widgets.placeOfBirth')}</label>
                  <input value={birthPlaceInput} onChange={e => setBirthPlaceInput(e.target.value)} placeholder="City, Country"
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }} />
                </div>
                <div>
                  <label className="text-[var(--text-dim)] text-[11px] block mb-1">{t('today.utcOffsetLabel')}</label>
                  <select value={utcOffsetInput} onChange={e => setUtcOffsetInput(e.target.value)}
                    className="w-full rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }}>
                    <option value="" style={{ color: '#000' }}>{t('today.utcOffsetUnknown')}</option>
                    {UTC_OFFSETS.map(o => (
                      <option key={o} value={o} style={{ color: '#000' }}>{`UTC${o >= 0 ? '+' : ''}${o}`}</option>
                    ))}
                  </select>
                  <p className="text-[var(--text-dim)] text-[10px] mt-1 leading-relaxed">{t('today.utcOffsetHint')}</p>
                </div>
                <button onClick={saveBirthInfo} disabled={savingBirthInfo}
                  className="w-full py-3 rounded-full text-white text-xs font-semibold active:scale-95 transition-transform disabled:opacity-60 mt-1"
                  style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
                  {savingBirthInfo ? t('common.saving') : t('common.save')}
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}