'use client'

// FILE PATH: components/today-widgets.tsx
import { useState } from 'react'
import ModalPortal from '@/components/modal-portal'
import { TarotCardArt } from '@/components/magic-art'
import { getMoonPhase, formatSignDegree, getCompatibility, findNextMoonEvent, countMoonEvents } from '@/lib/astro-calc'
import { ZODIAC_SIGNS, getDaySnapshot, getWeekDays, getMonthWeeks, type HoroscopePeriod } from '@/lib/data'
import { useLanguage } from '@/components/language-provider'
import { PERSONAL_READING_PRICE } from '@/lib/personal-reading'
import { MAJOR_ARCANA } from '@/lib/tarot-deck'

// A real moon-phase icon — the crescent/gibbous shape is derived from the
// actual illumination fraction computed in lib/astro-calc.ts (not a fixed
// decorative asset), so it visually matches the phase name and % shown next
// to it. The math: the terminator is drawn as an ellipse arc whose horizontal
// radius is r*|cos(2*pi*f)| (f = phase fraction, folded into [0, 0.5] so the
// waxing and waning halves reuse the same, verified-correct shape), then
// mirrored horizontally for the waning half so first/last quarter read as
// distinct (opposite-side) half-moons instead of looking identical.
function MoonPhaseIcon({ phaseFraction, size = 40 }: { phaseFraction: number; size?: number }) {
  const r = size / 2 - 3
  const cx = size / 2
  const cy = size / 2
  const f = ((phaseFraction % 1) + 1) % 1
  const fEff = f <= 0.5 ? f : 1 - f
  const cosVal = Math.cos(2 * Math.PI * fEff)
  const rx = Math.abs(r * cosVal)
  const sweep2 = cosVal >= 0 ? 1 : 0
  const mirror = f > 0.5
  const path = `M ${cx} ${(cy - r).toFixed(2)} A ${r} ${r} 0 0 1 ${cx} ${(cy + r).toFixed(2)} A ${rx.toFixed(2)} ${r} 0 0 ${sweep2} ${cx} ${(cy - r).toFixed(2)} Z`
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={cx} cy={cy} r={r} fill="#160829" stroke="rgba(217,70,239,0.35)" strokeWidth={1} />
      <path d={path} fill="var(--text-primary)" opacity={0.95} transform={mirror ? `translate(${size},0) scale(-1,1)` : undefined} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(245,197,66,0.25)" strokeWidth={1} />
    </svg>
  )
}

// ─── small inline icons (kept local — these are simple line icons, not the
// full illustrated art in magic-art.tsx) ────────────────────────────────────

function TipIcon({ kind }: { kind: string }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'var(--text-accent-soft)', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (kind === 'flower') return (
    <svg {...common}><circle cx="12" cy="12" r="2.5" /><path d="M12 2a3 3 0 0 1 0 6 3 3 0 0 1 0-6ZM12 16a3 3 0 0 1 0 6 3 3 0 0 1 0-6ZM2 12a3 3 0 0 1 6 0 3 3 0 0 1-6 0ZM16 12a3 3 0 0 1 6 0 3 3 0 0 1-6 0Z" /></svg>
  )
  if (kind === 'bag') return (
    <svg {...common}><path d="M6 8h12l1 12H5L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>
  )
  return (
    <svg {...common}><path d="M4 13c0-4 3-8 8-8s8 4 8 8" /><path d="M2 13h20l-2 4H4l-2-4Z" /></svg>
  )
}

// ─── Lunar calendar ─────────────────────────────────────────────────────────

function fmtShortDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function LunarCalendarCard({
  birthDate, birthTime, birthPlace, onEditBirthInfo, period,
}: {
  birthDate?: string
  birthTime?: string
  birthPlace?: string
  onEditBirthInfo: () => void
  period: HoroscopePeriod
}) {
  const { t } = useLanguage()
  const today = new Date()

  // Yesterday/Today/Tomorrow show the real moon phase for that specific
  // date (previously this always computed `new Date()` regardless of the
  // selected tab, so all three looked identical — that was the bug).
  const dayOffset = period === 'Yesterday' ? -1 : period === 'Tomorrow' ? 1 : 0
  const targetDate = new Date(today.getTime() + dayOffset * 86400000)
  const moon = getMoonPhase(targetDate)
  const moonSign = ZODIAC_SIGNS.find(s => s.id === moon.signId)
  const showDateBadge = period === 'Yesterday' || period === 'Tomorrow'

  // Week/Month/Year get genuinely period-scoped content instead of just
  // repeating today's single-day snapshot: real upcoming New/Full Moon
  // dates (or counts, for Year), computed with the same deterministic
  // moon math as everything else here — nothing randomized or fake.
  let rangeNote: string | null = null
  if (period === 'Week') {
    const nextNew = findNextMoonEvent(today, 'New Moon', 7)
    const nextFull = findNextMoonEvent(today, 'Full Moon', 7)
    const candidates = [
      nextNew && { ...nextNew, label: 'New Moon' },
      nextFull && { ...nextFull, label: 'Full Moon' },
    ].filter((x): x is { date: Date; daysAway: number; label: string } => !!x)
    const soonest = candidates.sort((a, b) => a.daysAway - b.daysAway)[0]
    rangeNote = soonest
      ? `${soonest.label} in ${soonest.daysAway}d (${fmtShortDate(soonest.date)})`
      : `Steady ${moon.phaseName} all week — no major shift ahead`
  } else if (period === 'Month') {
    const nextNew = findNextMoonEvent(today, 'New Moon', 31)
    const nextFull = findNextMoonEvent(today, 'Full Moon', 31)
    const parts = [
      nextNew && `New Moon ${fmtShortDate(nextNew.date)}`,
      nextFull && `Full Moon ${fmtShortDate(nextFull.date)}`,
    ].filter(Boolean)
    rangeNote = parts.length ? parts.join(' · ') : null
  } else if (period === 'Year') {
    const newCount = countMoonEvents(today, 'New Moon', 365)
    const fullCount = countMoonEvents(today, 'Full Moon', 365)
    rangeNote = `${newCount} New Moons · ${fullCount} Full Moons ahead this year`
  }

  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
      <button onClick={onEditBirthInfo} className="w-full flex items-center justify-between mb-3">
        <h3 className="text-[var(--text-primary)] text-sm font-medium">{t('widgets.lunarCalendar')}</h3>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
      </button>
      <div className="flex flex-col gap-1.5 mb-3 text-xs">
        <div className="flex justify-between"><span className="text-[var(--text-dim)]">{t('widgets.dateOfBirth')}</span><span className="text-[var(--text-accent-soft)]">{birthDate || t('widgets.addInAccountDetails')}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-dim)]">{t('widgets.timeOfBirth')}</span><span className="text-[var(--text-accent-soft)]">{birthTime || t('widgets.notSet')}</span></div>
        <div className="flex justify-between"><span className="text-[var(--text-dim)]">{t('widgets.placeOfBirth')}</span><span className="text-[var(--text-accent-soft)]">{birthPlace || t('widgets.notSet')}</span></div>
      </div>
      <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: 'rgba(124,58,237,0.1)' }}>
        <MoonPhaseIcon phaseFraction={moon.phaseFraction} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[var(--text-primary)] text-xs font-medium">
              {moon.phaseName} — In {moonSign?.name ?? 'Aries'} {moonSign?.symbol} ({formatSignDegree(moon.signDegree)})
            </p>
            {showDateBadge && (
              <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0" style={{ background: 'rgba(217,70,239,0.18)', color: '#E879F9' }}>
                {t(`today.period.${period}`)} · {fmtShortDate(targetDate)}
              </span>
            )}
          </div>
          <p className="text-[var(--text-dim)] text-[10px] mt-0.5">{t('widgets.illumination', { pct: moon.illumination })}</p>
          {rangeNote && <p className="text-[#9D5FF5] text-[10px] mt-1 font-medium">{rangeNote}</p>}
        </div>
      </div>
    </div>
  )
}

// ─── Week/Month pulse strip ─────────────────────────────────────────────────
// Gives Week and Month a shape no daily tab has — a real day-by-day (Week) or
// week-by-week (Month) energy readout — instead of the exact same card layout
// as Yesterday/Today/Tomorrow with only the sentences swapped. Deterministic
// per sign+date (lib/data.ts getDaySnapshot), same convention as everything
// else on this screen: no Math.random(), no server round trip needed.

export function PeriodPulseStrip({ period, signId }: { period: HoroscopePeriod; signId: string }) {
  const { t, locale } = useLanguage()
  if (period !== 'Week' && period !== 'Month') return null

  const today = new Date()
  const dates = period === 'Week' ? getWeekDays(today) : getMonthWeeks(today)
  // BUG FIX (2026-09-18): missing locale meant the "vibe" word (Focused,
  // Social, etc.) always stayed English here too — see DAY_VIBES_EN/_UK in
  // lib/data.ts.
  const snapshots = dates.map(d => getDaySnapshot(signId, d, locale))
  const localeTag = locale === 'es' ? 'es-ES' : 'en-US'
  const now = new Date(); now.setHours(0, 0, 0, 0)

  return (
    <div className="mb-4">
      <h3 className="text-[var(--text-primary)] text-sm font-medium mb-3">
        {period === 'Week' ? t('widgets.weekPulse') : t('widgets.monthPulse')}
      </h3>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {snapshots.map((s, i) => {
          const isToday = period === 'Week' && s.date.getTime() === now.getTime()
          const chipLabel = period === 'Week'
            ? s.date.toLocaleDateString(localeTag, { weekday: 'short' })
            : `${t('widgets.weekOf')} ${s.date.getDate()}`
          return (
            <div key={i} className="flex-shrink-0 w-16 rounded-2xl p-2.5 flex flex-col items-center gap-1.5"
              style={{
                background: isToday ? 'rgba(217,70,239,0.12)' : 'var(--surface-1)',
                border: isToday ? '1px solid rgba(217,70,239,0.4)' : '1px solid var(--surface-2)',
              }}>
              <span className="text-[var(--text-dim)] text-[9px] font-medium uppercase truncate w-full text-center">{chipLabel}</span>
              <div className="relative w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: `conic-gradient(#D946EF ${s.energy}%, var(--surface-2) 0)` }}>
                <div className="w-[26px] h-[26px] rounded-full flex items-center justify-center text-[9px] font-semibold text-[var(--text-primary)]" style={{ background: 'var(--bg-mid)' }}>
                  {s.energy}
                </div>
              </div>
              <span className="text-[var(--text-accent-soft)] text-[9px] text-center leading-tight">{s.vibe}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Key astrology event (Premium-gated) ────────────────────────────────────
// NOTE on i18n scope: `title`/`body` come from lib/data.ts's deterministic
// content pools, which are English-only for now (see the scope note at the
// top of lib/i18n.ts) — only this card's chrome is translated.

// Broader tabs (Week/Month/Year) now carry several distinct, real aspects
// instead of a single card whose text is just re-labeled — `events` has 1
// entry for Yesterday/Today/Tomorrow and 3-6 for Week/Month/Year (see
// lib/data.ts getAstrologyEvents). The first event previews unlocked (same
// as before); the rest sit behind the same real premium gate.
export function AstrologyEventCard({
  dateLabel, events, locked, onUnlock,
}: {
  dateLabel: string
  events: { title: string; body: string }[]
  locked: boolean
  onUnlock: () => void
}) {
  if (events.length === 0) return null
  const [first, ...rest] = events
  const { t } = useLanguage()
  return (
    <div className="w-full rounded-2xl p-4 mb-4 relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg,var(--bg-elevated),var(--bg-mid))', border: '1px solid rgba(217,70,239,0.2)' }}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] px-2.5 py-1 rounded-lg font-semibold" style={{ background: 'rgba(124,58,237,0.3)', color: 'var(--text-accent-soft)' }}>
          {/* Previously hardcoded " · N aspects" in English regardless of
              the selected locale — everything else on this card is
              translated via t(), this was the one string that wasn't. */}
          {dateLabel}{events.length > 1 ? ` · ${t('widgets.aspectsCount', { n: events.length })}` : ''}
        </span>
        {locked && (
          <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,0,0,0.35)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
          </span>
        )}
      </div>
      <button onClick={locked ? onUnlock : undefined} className="w-full text-left" disabled={!locked}>
        <p className="text-[var(--text-primary)] text-sm font-medium mb-1.5">{first.title}</p>
        <p className="text-[var(--text-muted)] text-xs leading-relaxed" style={locked ? { filter: 'blur(3px)', userSelect: 'none' } : undefined}>
          {first.body}
        </p>
      </button>
      {rest.length > 0 && (
        <button onClick={onUnlock} className="w-full text-left mt-3 pt-3 flex flex-col gap-2.5" style={{ borderTop: '1px solid var(--surface-2)' }}>
          {rest.map((ev, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: '#D946EF' }} />
              <div className="min-w-0">
                <p className="text-[var(--text-primary)] text-xs font-medium">{ev.title}</p>
                <p className="text-[#8b7fb5] text-[11px] leading-snug line-clamp-2" style={locked ? { filter: 'blur(3px)', userSelect: 'none' } : undefined}>
                  {ev.body}
                </p>
              </div>
              {locked && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" className="flex-shrink-0 mt-0.5"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
              )}
            </div>
          ))}
        </button>
      )}
    </div>
  )
}

// ─── Personal tips (tap a tag to read the day's note) ───────────────────────
// NOTE on i18n scope: each tip's `label`/`text` come from lib/data.ts's
// content pools (English-only for now) — only the section header is
// translated here.

export function PersonalTipsCard({ tips }: { tips: { icon: string; label: string; text: string }[] }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState<{ label: string; text: string } | null>(null)
  return (
    <div className="mb-4">
      <h3 className="text-[var(--text-primary)] text-sm font-medium mb-3">{t('widgets.personalTips')}</h3>
      <div className="grid grid-cols-3 gap-2">
        {tips.map(tip => (
          <button key={tip.label} onClick={() => setOpen(tip)}
            className="rounded-2xl py-3 flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }}>
            <TipIcon kind={tip.icon} />
            <span className="text-[var(--text-accent-soft)] text-[11px] font-medium">{tip.label}</span>
          </button>
        ))}
      </div>
      {open && (
        <ModalPortal>
          <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center" style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 screen-enter" style={{ background: 'linear-gradient(180deg,var(--bg-mid),var(--bg-void))', border: '1px solid rgba(217,70,239,0.25)' }}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-[var(--text-primary)] text-sm font-medium">{open.label}</p>
                <button onClick={() => setOpen(null)} className="text-[var(--text-muted)] text-xs">✕</button>
              </div>
              <p className="text-[var(--text-accent-soft)] text-sm leading-relaxed">{open.text}</p>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}

// ─── Tarot insight CTA (links into the real Readings tarot content) ────────

export function TarotInsightCard({ onDiscover }: { onDiscover: () => void }) {
  const { t } = useLanguage()
  return (
    <div className="mb-4">
      <h3 className="text-[var(--text-primary)] text-sm font-medium mb-3">{t('widgets.tarotInsight')}</h3>
      <div className="rounded-2xl p-6 flex flex-col items-center text-center gap-4"
        style={{ background: 'radial-gradient(circle at 50% 20%,#3B1068,var(--bg-mid))', border: '1px solid rgba(217,70,239,0.2)' }}>
        <div className="flex -space-x-6">
          <div className="opacity-40 -rotate-6"><TarotCardArt size={56} /></div>
          <div><TarotCardArt size={72} /></div>
          <div className="opacity-40 rotate-6"><TarotCardArt size={56} /></div>
        </div>
        <button onClick={onDiscover}
          className="px-6 py-3 rounded-full text-white text-xs font-semibold active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {t('widgets.discoverAwaits')}
        </button>
      </div>
    </div>
  )
}

// ─── Yes / No for today ─────────────────────────────────────────────────────
// NOTE on i18n scope: the yes/no items themselves come from lib/data.ts
// content pools (English-only for now) — only the two column headers here
// are translated.

export function YesNoTodayCard({ yes, no }: { yes: string[]; no: string[] }) {
  const { t } = useLanguage()
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[#22C55E] text-xs font-semibold mb-2">{t('widgets.yesForToday')}</p>
          <div className="flex flex-col gap-2">
            {yes.map(item => (
              <div key={item} className="flex items-start gap-1.5">
                <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(34,197,94,0.2)' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
                </span>
                <span className="text-[var(--text-accent-soft)] text-[11px] leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-[#EF4444] text-xs font-semibold mb-2">{t('widgets.noForToday')}</p>
          <div className="flex flex-col gap-2">
            {no.map(item => (
              <div key={item} className="flex items-start gap-1.5">
                <span className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: 'rgba(239,68,68,0.18)' }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="3"><path d="M18 6 6 18M6 6l12 12" /></svg>
                </span>
                <span className="text-[var(--text-accent-soft)] text-[11px] leading-snug">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Free minutes banner — this claim is real: the live-chat screen already
// starts every session with a 180-second free timer before per-minute
// billing kicks in, so "3 minutes free" here isn't a UI promise with nothing
// behind it. ─────────────────────────────────────────────────────────────────

export function FreeMinutesBanner({ onClaim }: { onClaim: () => void }) {
  const { t } = useLanguage()
  return (
    <button onClick={onClaim}
      className="w-full rounded-2xl p-4 mb-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
      style={{ background: 'linear-gradient(135deg,var(--bg-mid),var(--bg-elevated))', border: '1px solid rgba(245,197,66,0.35)', boxShadow: '0 2px 10px rgba(11,6,32,0.06)' }}>
      <span className="text-2xl flex-shrink-0">🎁</span>
      <div className="flex-1">
        <p className="text-[var(--text-primary)] text-sm font-semibold">{t('widgets.get3MinFree')}</p>
        <p className="text-[var(--text-muted)] text-[11px]">{t('widgets.startChatWithPsychic')}</p>
      </div>
      {/* BUG FIX (light theme, found via real-device screenshot): this used
          text-[var(--bg-mid)] assuming dark theme (where --bg-mid is near-
          black, reading fine on the gold pill). In light theme --bg-mid
          resolves to #FFFFFF, so the CTA silently became white text on gold
          — nearly unreadable. Pinned to a fixed dark plum that reads clearly
          on #F5C542 in both themes instead of an inverted theme variable. */}
      <span className="px-4 py-2 rounded-full text-xs font-semibold flex-shrink-0" style={{ background: '#F5C542', color: '#2B1055' }}>
        {t('widgets.claim')}
      </span>
    </button>
  )
}

// ─── Personal Tarot Spread Video banner ─────────────────────────────────────
// New paid product: the client requests a personal tarot spread, a real
// staff member (chatter) records and uploads an actual video reading for
// that specific request (see /api/personal-reading + personal-reading-screen.tsx).
// This banner is the "visible place" placement for it on the Today screen,
// styled to match FreeMinutesBanner just above rather than introducing a
// new visual language.
//
// BUG FIX 1 (light theme, reported "погано видно" — hard to see on a real
// device): --bg-mid/--bg-elevated/--bg-void are all near-white in light
// theme (see app/globals.css), so this card's gradient fill barely differed
// from the page behind it — the only separation was a 25%-opacity magenta
// border, the same hue family as the lavender-tinted background, which
// nearly disappeared.
// BUG FIX 2 (your follow-up: "потрібно зробити це помітнішим щоб зразу було
// видно" — should stand out immediately): a subtle card-shell fix wasn't
// enough for a $50 product you want people to actually notice. Rebuilt this
// as a vivid promo banner using the same solid-gradient "premium promo"
// language already established just below it on this screen (see the real
// premium-teaser button in home-screen.tsx: solid #7C3AED→#D946EF fill,
// white text, decorative glow blob, drop shadow) instead of the quiet
// card-shell style shared with the free-minutes/intro-video rows — so it now
// reads as a distinct, eye-catching offer in both themes, not just "less
// invisible" than before. Added a small gold "NEW" badge for the same reason.
//
// BUG FIX 3 (your latest: move it right after the Start-chat button, and
// make it "максимально круто і дорого" — as premium-looking as possible with
// a real image, not just an icon). Placement moved in home-screen.tsx — this
// is now the very next thing after the Start CTA, not buried below the daily
// horoscope. For the visual: rather than one flat emoji in a circle, this
// now shows a fanned preview of three REAL card faces — the actual 1909
// Rider–Waite–Smith artwork already wired up for the Tarot pull screen (see
// lib/tarot-deck.ts; same legally-clean public-domain source, no new
// copyright risk), each in its own thin gold frame like a real physical
// card, splayed like a hand of cards. Picked Star/Sun/World specifically —
// the three most visually striking "good news" cards in the deck — as a
// promo preview, not a real reading result. Dark jewel-toned background +
// dual glow blobs + the same sensora-glow-pulse breathing animation used on
// the Start CTA gives it the same "look here, this matters" weight as the
// screen's one other unmissable button, instead of competing quietly with
// the flat-color rows around it.
export function PersonalTarotVideoBanner({ onOpen }: { onOpen: () => void }) {
  const { t } = useLanguage()
  const previewIds = ['star', 'sun', 'world']
  const previewCards = previewIds.map(id => MAJOR_ARCANA.find(c => c.id === id)!).filter(Boolean)

  return (
    <button onClick={onOpen}
      className="sensora-glow-pulse w-full rounded-3xl mb-4 text-left active:scale-[0.98] transition-transform relative overflow-hidden flex-shrink-0"
      style={{
        background: 'linear-gradient(135deg,#1A0B2E,#3B1068 55%,#5B21B6)',
        boxShadow: '0 14px 40px rgba(124,58,237,0.45)',
        border: '1px solid rgba(245,197,66,0.25)',
      }}>
      <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-30 pointer-events-none" style={{ background: 'radial-gradient(circle,#F5C542,transparent 70%)' }} />
      <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle,#D946EF,transparent 70%)' }} />

      <span className="absolute top-3 right-3 text-[8px] font-bold px-2 py-0.5 rounded-full tracking-wide z-10"
        style={{ background: '#F5C542', color: '#2B1055' }}>
        {t('widgets.personalTarotVideo.badge')}
      </span>

      {/* BUG FIX (your feedback: shift the card-fan and text a little to
          the right, without anything ending up overlapping) — the fanned
          cards used to sit right at the row's left inset, and the leftmost
          card rotates counter-clockwise around its own bottom edge, which
          swings its top corner further left than its box, crowding the
          rounded corner. More left padding (not just a bigger gap) gives
          the whole fan room to rotate into without approaching that corner;
          the extra gap between the fan and the text keeps the title from
          also feeling cramped. Right side (badge, CTA) untouched, so
          nothing new overlaps there. */}
      {/* BUG FIX ROUND 2 (your feedback again: "змістити вправо текст там де
          таро" — the text next to the card fan needed to move further
          right, the pl-6/gap-4 from the last round wasn't enough): bumped
          the gap between the card fan and the text block from gap-4 to
          gap-6, and gave the text column its own ml-1 on top of that — the
          fan itself stays exactly where the last fix put it (its own
          corner-crowding problem is still fixed), only the text shifts. */}
      <div className="relative z-10 flex items-center gap-6 pl-6 pr-4 py-4">
        {/* Fanned real-card preview — see comment above for why these three
            cards and this source. */}
        <div className="relative flex-shrink-0" style={{ width: 78, height: 88 }}>
          {previewCards.map((c, i) => (
            <div key={c.id} className="absolute rounded-lg overflow-hidden"
              style={{
                width: 44, height: 76,
                top: 6, left: i * 17,
                transform: `rotate(${(i - 1) * 14}deg)`,
                transformOrigin: 'bottom center',
                zIndex: 3 - Math.abs(i - 1),
                background: 'linear-gradient(135deg,#D4AF37,#F5DFA0 45%,#B8860B)',
                padding: 2,
                boxShadow: '0 6px 16px rgba(0,0,0,0.5)',
              }}>
              <div className="w-full h-full rounded-md overflow-hidden" style={{ background: '#1A0B2E' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.imageUrl} alt="" className="w-full h-full" style={{ objectFit: 'cover' }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex-1 min-w-0 ml-1">
          {/* BUG FIX ROUND 2 — reported again from a real-device screenshot:
              the "NEW" badge still clipped the "o" in "Video". pr-10 (40px)
              turned out to be a bit short of the badge's actual footprint —
              roughly 34px of badge width (px-2 text plus its own padding)
              sitting at right-3 (12px inset) eats about 46-50px of the row's
              right edge, more than pr-10 reserved. Bumped to pr-16 (64px)
              for real headroom instead of a value that only looked right on
              one screen size. */}
          <p className="text-white text-sm font-semibold leading-snug pr-16">{t('widgets.personalTarotVideo.title')}</p>
          <p className="text-white/75 text-[11px] mt-0.5">{t('widgets.personalTarotVideo.subtitle', { price: `$${PERSONAL_READING_PRICE}` })}</p>
          <span className="inline-block mt-2.5 px-4 py-1.5 rounded-full text-xs font-bold"
            style={{ background: '#fff', color: '#7C3AED' }}>
            {t('widgets.personalTarotVideo.cta')}
          </span>
        </div>
      </div>
    </button>
  )
}

// ─── Intro video banner ─────────────────────────────────────────────────────
// A short "get to know Sensora" clip on the Today screen. Kept intentionally
// lightweight: the banner itself is just a compact row (same footprint as
// FreeMinutesBanner/PersonalTarotVideoBanner above) with a small static
// poster thumbnail — no <video> element, and nothing fetched, until the
// user actually taps it. Tapping opens a modal with the real player, which
// uses preload="none" so the ~5MB clip only loads once someone chooses to
// watch, never just from having the Today screen open.
export function IntroVideoBanner() {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full rounded-2xl p-4 mb-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform flex-shrink-0"
        style={{ background: 'linear-gradient(135deg,var(--bg-mid),var(--bg-elevated))', border: '1px solid rgba(157,95,245,0.25)' }}>
        <span className="relative flex-shrink-0 w-11 h-11 rounded-xl overflow-hidden" style={{ background: 'var(--surface-2)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/videos/intro-poster.jpg" alt="" className="w-full h-full object-cover" />
          <span className="absolute inset-0 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.25)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </span>
        <div className="flex-1">
          <p className="text-[var(--text-primary)] text-sm font-semibold">{t('widgets.introVideo.title')}</p>
          <p className="text-[var(--text-muted)] text-[11px]">{t('widgets.introVideo.subtitle')}</p>
        </div>
        <span className="px-4 py-2 rounded-full text-xs font-semibold text-white flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {t('widgets.introVideo.cta')}
        </span>
      </button>
      {open && (
        <ModalPortal>
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4"
            style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}
            onClick={() => setOpen(false)}>
            <div className="w-full max-w-sm rounded-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
              <video
                src="/videos/intro.mp4"
                poster="/videos/intro-poster.jpg"
                controls
                autoPlay
                playsInline
                preload="none"
                className="w-full h-auto block"
                style={{ aspectRatio: '16 / 9', background: '#000' }}
              />
            </div>
            <button onClick={() => setOpen(false)} aria-label="Close"
              className="absolute top-4 right-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.4)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </ModalPortal>
      )}
    </>
  )
}

// ─── My relationships ───────────────────────────────────────────────────────
// STATUS_OPTIONS values are the canonical strings stored in Supabase
// (users.relationship_status) — only their on-screen label is translated
// (via widgets.status.<value>), so switching language never changes what's
// actually saved.

const STATUS_OPTIONS = ['Single', 'In a relationship', 'Engaged', 'Married', "It's complicated"] as const

export function RelationshipsCard({
  status, onChangeStatus, mySignId, onOpenLovePsychic, onOpenDeepCompatibility,
}: {
  status: string
  onChangeStatus: (s: string) => void
  mySignId: string
  onOpenLovePsychic: () => void
  onOpenDeepCompatibility: () => void
}) {
  const { t } = useLanguage()
  const [editing, setEditing] = useState(false)
  const [showCompat, setShowCompat] = useState(false)
  const statusLabel = (s: string) => t(`widgets.status.${s}`)

  return (
    <div className="mb-4">
      <h3 className="text-[var(--text-primary)] text-base font-medium mb-1">{t('widgets.myRelationships')}</h3>
      <p className="text-[var(--text-dim)] text-xs leading-relaxed mb-3">
        {t('widgets.relationshipsIntro')}
      </p>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[var(--text-muted)] text-xs">{t('widgets.yourStatus')}</span>
        <span className="text-[#D946EF] text-xs font-medium">{statusLabel(status)}</span>
        <button onClick={() => setEditing(v => !v)} className="text-[var(--text-dim)]" aria-label="Edit status">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
        </button>
      </div>
      {editing && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {STATUS_OPTIONS.map(s => (
            <button key={s} onClick={() => { onChangeStatus(s); setEditing(false) }}
              className="px-3 py-1 rounded-full text-[10px]"
              style={{ background: s === status ? 'rgba(217,70,239,0.25)' : 'var(--surface-1)', color: s === status ? '#D946EF' : 'var(--text-muted)' }}>
              {statusLabel(s)}
            </button>
          ))}
        </div>
      )}

      {/* BUG FIX (same family as the Readings-screen gradient cards: fixed
          dark hex faded into var(--bg-elevated), near-white in light theme,
          under theme-variable text meant for a light surface — unreadable on
          the dark half in light mode). Fixed gradient + fixed light text. */}
      <button onClick={() => setShowCompat(true)}
        className="w-full rounded-2xl p-4 mb-3 text-left active:scale-[0.98] transition-transform"
        style={{ background: 'linear-gradient(135deg,#4C1D95,#6D28D9)', border: '1px solid rgba(217,70,239,0.25)' }}>
        <p className="text-white text-sm font-semibold mb-3">{t('widgets.compatibilityTitle')}</p>
        <span className="px-4 py-1.5 rounded-full text-xs font-semibold" style={{ background: '#fff', color: '#4C1D95' }}>{t('widgets.readInsights')}</span>
      </button>

      <button onClick={onOpenLovePsychic}
        className="w-full rounded-2xl p-3 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
        <div className="w-9 h-9 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }} />
        <p className="text-[var(--text-accent-soft)] text-xs leading-snug">
          {t('widgets.lovePsychicPrompt')}
        </p>
      </button>

      {showCompat && (
        <CompatibilityModal
          mySignId={mySignId}
          onClose={() => setShowCompat(false)}
          onOpenDeepCompatibility={() => { setShowCompat(false); onOpenDeepCompatibility() }}
        />
      )}
    </div>
  )
}

function CompatibilityModal({ mySignId, onClose, onOpenDeepCompatibility }: { mySignId: string; onClose: () => void; onOpenDeepCompatibility: () => void }) {
  const { t } = useLanguage()
  const [partnerSign, setPartnerSign] = useState<string>(mySignId === 'leo' ? 'libra' : 'leo')
  const result = getCompatibility(mySignId, partnerSign)
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center" style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}>
        <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 screen-enter" style={{ background: 'linear-gradient(180deg,var(--bg-mid),var(--bg-void))', border: '1px solid rgba(217,70,239,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
          <div className="flex justify-between items-center mb-4">
            <p className="text-[var(--text-primary)] text-sm font-serif">{t('widgets.compatibility')}</p>
            <button onClick={onClose} className="text-[var(--text-muted)] text-xs">✕</button>
          </div>
          <p className="text-[var(--text-dim)] text-xs mb-2">{t('widgets.pickPartnerSign')}</p>
          <div className="grid grid-cols-6 gap-1.5 mb-5">
            {ZODIAC_SIGNS.map(z => (
              <button key={z.id} onClick={() => setPartnerSign(z.id)}
                className="aspect-square rounded-xl flex items-center justify-center text-base"
                style={{ background: partnerSign === z.id ? 'linear-gradient(135deg,#7C3AED,#D946EF)' : 'var(--surface-1)', color: partnerSign === z.id ? '#fff' : 'var(--text-muted)' }}>
                {z.symbol}
              </button>
            ))}
          </div>
          <div className="rounded-2xl p-5 text-center mb-3" style={{ background: 'rgba(124,58,237,0.12)' }}>
            <p className="text-4xl font-bold mb-1" style={{ color: result.score >= 75 ? '#22C55E' : result.score >= 55 ? '#F5C542' : '#EF4444' }}>
              {result.score}%
            </p>
            <p className="text-[var(--text-accent-soft)] text-xs leading-relaxed">{result.note}</p>
          </div>
          <p className="text-[var(--text-dim)] text-[10px] mb-3 leading-relaxed text-center">
            This quick check only compares elements (Fire/Earth/Air/Water). For a real synastry using both of your actual birth charts (Sun, Moon, and Ascendant), go deeper below.
          </p>
          <button onClick={onOpenDeepCompatibility}
            className="w-full py-3 rounded-full text-white text-xs font-semibold"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
            ✨ Deeper compatibility (real birth charts)
          </button>
        </div>
      </div>
    </ModalPortal>
  )
}