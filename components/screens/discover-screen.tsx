'use client'

// FILE PATH: components/screens/discover-screen.tsx
//
// BATTLE-PASS REDESIGN (your call: "зроби діскавер як батл пас, за певну
// кількість доларів відкриваються якісь квізи... прибрати більшість квізів
// залишити тільки норм... комін сун прибрати... максимально почистити"):
//
// 1. The "Popular on Sensora" course section is gone completely — all 4
//    entries were dead "coming soon" placeholders with no real content and
//    no click handler (see lib/data.ts's old DiscoverCourse block, now
//    deleted). That was the emptiest, most "in waiting" part of this screen,
//    so it's the first thing removed.
// 2. Quiz unlocking no longer uses a flat `locked: boolean`. Each quiz now
//    has a real dollar threshold (`unlockSpend`) and unlocks once the
//    signed-in client's real lifetime spend on paid chat minutes reaches it
//    — the exact same number already shown on the Profile screen (sum of
//    completed `type: 'session'` transactions from GET /api/wallet). Tapping
//    a locked quiz no longer jumps straight into the buy-minutes flow
//    (PremiumModal) — buying a balance doesn't unlock anything by itself,
//    only actually using paid chat minutes does — it opens a small sheet
//    showing progress toward the threshold with a "find an expert" CTA.
// 3. Down from 6 quizzes to the 3 strongest (see lib/data.ts for exactly
//    which 3 and why): free entry hook, then $20, then $50.
import { useState, useMemo, useEffect } from 'react'
import BottomNav from '@/components/bottom-nav'
import { getDiscoverQuizzes, getQuizContent, type DiscoverCategory, type DiscoverQuiz } from '@/lib/data'
import { QuizModal } from '@/components/content-modals'
import ModalPortal from '@/components/modal-portal'
import { useTheme } from '@/components/theme-provider'
import { useLanguage } from '@/components/language-provider'
import type { Screen } from '@/app/page'

interface Props {
  onNavigate: (s: Screen) => void
  userId?: string | null
  userName?: string
  contact?: string
}

const cats: ('All' | DiscoverCategory)[] = ['All', 'Energy', 'Manifestation', 'Relationships']

function LockBadge({ label }: { label?: string }) {
  return (
    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full pl-1.5 pr-2 py-1"
      style={{ background: 'rgba(11,6,32,0.6)', border: '1px solid rgba(255,255,255,0.25)' }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
      {label && <span className="text-[9px] font-semibold text-white">{label}</span>}
    </div>
  )
}

function SectionHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-2 mb-3">
      <span className="w-1 h-4 rounded-full mt-1 flex-shrink-0" style={{ background: 'linear-gradient(180deg,#D946EF,#7C3AED)' }} />
      <div>
        <h3 className="text-[var(--text-primary)] text-base font-medium leading-tight">{title}</h3>
        <p className="text-[var(--text-dim)] text-[11px] mt-0.5">{subtitle}</p>
      </div>
    </div>
  )
}

type Open =
  | { kind: 'quiz'; id: string }
  | { kind: 'locked'; title: string; unlockSpend: number }
  | null

export default function DiscoverScreen({ onNavigate, userId, userName, contact }: Props) {
  const { t, locale } = useLanguage()
  const [activeCat, setActiveCat] = useState<'All' | DiscoverCategory>('All')
  const [open, setOpen] = useState<Open>(null)
  // This icon looked like a theme toggle (same sun glyph as theme-toggle.tsx)
  // but had no onClick at all — tapping it did nothing, which is what was
  // reported as "the theme switch button doesn't work". Wired it to the
  // same ThemeProvider the real toggle in Settings uses, so it now actually
  // flips light/dark and the icon reflects whichever theme is active.
  const { resolvedTheme, setTheme } = useTheme()
  const toggleTheme = () => setTheme(resolvedTheme === 'light' ? 'dark' : 'light')

  // Real lifetime spend, same computation profile-screen.tsx already uses:
  // sum of completed `type: 'session'` transactions from GET /api/wallet.
  // Topping up a balance doesn't count — only money actually spent talking
  // to an expert does, which is what makes this a "battle pass" you earn by
  // using Sensora rather than one you can just buy your way through.
  // Starts at `null` (still loading) rather than 0, so every quiz reads as
  // locked until the real number comes back instead of briefly flashing
  // "unlocked".
  const [lifetimeSpent, setLifetimeSpent] = useState<number | null>(null)
  useEffect(() => {
    if (!userId) { setLifetimeSpent(0); return }
    let cancelled = false
    fetch('/api/wallet')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (cancelled || !data) return
        const transactions: { type: string; status: string; amount: number }[] = data?.transactions ?? []
        const spent = transactions
          .filter(tx => tx.type === 'session' && tx.status === 'completed')
          .reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
        setLifetimeSpent(spent)
      })
      .catch(() => { if (!cancelled) setLifetimeSpent(0) })
    return () => { cancelled = true }
  }, [userId])

  const discoverQuizzes = useMemo(() => getDiscoverQuizzes(locale), [locale])
  const quizContent = useMemo(() => getQuizContent(locale), [locale])

  const matches = <T extends { category: DiscoverCategory },>(item: T) =>
    activeCat === 'All' || item.category === activeCat

  const quizzes = useMemo(() => discoverQuizzes.filter(matches), [activeCat, discoverQuizzes])

  const nothingFound = quizzes.length === 0

  const activeQuiz = open?.kind === 'quiz' ? discoverQuizzes.find(q => q.id === open.id) : null

  const isLocked = (unlockSpend: number) => unlockSpend > 0 && (lifetimeSpent ?? 0) < unlockSpend
  const openQuiz = (q: DiscoverQuiz) => setOpen(isLocked(q.unlockSpend) ? { kind: 'locked', title: q.title, unlockSpend: q.unlockSpend } : { kind: 'quiz', id: q.id })

  return (
    <div className="flex flex-col h-full sensora-bg relative">
      {/* Soft color wash behind the header — the page background was flat
          everywhere before; this gives the top of the screen some depth,
          same trick the "featured" card below uses, just subtler.
          BUG FIX: this div is a direct child of the `.sensora-bg` element,
          and globals.css has `.sensora-bg > * { position: relative }` —
          added earlier to fix a different, unrelated bug (frozen "star dot"
          specks, see the comment on that rule). That rule was silently
          overriding this div's Tailwind `absolute` class back to `relative`,
          which turned a decorative overlay into a real 256px-tall block
          sitting in normal document flow above the header — the empty gap
          reported at the top of the screen. `position` is set inline here
          instead of via a class specifically because an inline style always
          wins over an external class selector, regardless of specificity
          math or source order — the one reliable way to opt this particular
          div out of that rule without touching the rule itself (which other
          screens may still depend on). */}
      <div className="pointer-events-none -z-0"
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 256, background: 'radial-gradient(120% 100% at 50% -20%, rgba(217,70,239,0.16), transparent 70%)' }} />
      <div className="flex-1 overflow-hidden px-4 pt-3 pb-2 relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <button onClick={() => onNavigate('home')} aria-label="Back"
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-1)' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            </button>
            <h2 className="text-[var(--text-primary)] text-xl font-medium">{t('discover.title')}</h2>
          </div>
          <button onClick={toggleTheme} aria-label={resolvedTheme === 'light' ? t('discover.switchToDark') : t('discover.switchToLight')}
            className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: 'var(--surface-1)' }}>
            {resolvedTheme === 'light' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M12 2v2m0 16v2M2 12h2m16 0h2m-3.5-7.5-1.5 1.5M7 7 5.5 5.5m12 12-1.5-1.5M7 17l-1.5 1.5" />
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
              </svg>
            )}
          </button>
        </div>

        {/* Category chips — these now actually filter every section below */}
        <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          {cats.map(cat => (
            <button key={cat} onClick={() => setActiveCat(cat)}
              className="px-4 py-1.5 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all active:scale-95"
              style={{
                background: activeCat === cat ? 'linear-gradient(135deg,#7C3AED,#D946EF)' : 'var(--surface-1)',
                color: activeCat === cat ? '#fff' : 'var(--text-muted)',
                border: activeCat === cat ? 'none' : '1px solid var(--surface-2)',
                boxShadow: activeCat === cat ? '0 4px 16px rgba(217,70,239,0.35)' : 'none',
              }}>
              {cat === 'All' ? t('discover.catAll') : t(`category.${cat}`)}
            </button>
          ))}
        </div>

        {/* RESTORED (your call: "у діскавер повернути верхній банер" — bring
            back the big featured-quiz hero that used to sit above the
            quiz/article rows, before the quiz-article slider redesign). Shows
            the first quiz in the current category filter (quizzes are
            already ordered free → $20 → $50, so with "All" selected this is
            always the free, no-barrier-to-entry one) — a real quiz from the
            same data as the slider below, not a separate fabricated entry. */}
        {quizzes[0] && (
          <button onClick={() => openQuiz(quizzes[0])}
            className="relative w-full rounded-3xl overflow-hidden mb-4 text-left active:scale-[0.98] transition-transform"
            style={{ height: 132, boxShadow: '0 16px 40px rgba(124,58,237,0.35)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={quizzes[0].image} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(11,6,32,0.15) 0%, rgba(11,6,32,0.92) 100%)' }} />
            {/* BUG FIX (reported: "налазить слово"): the "FEATURED QUIZ" pill,
                the "QUIZ · 3 MIN" line and the title were all positioned
                independently inside a 120px box — the bottom stack (tag +
                two-line title + button) was taller than the box, so it grew
                upward into the pill. Now: one pill on top carries both
                labels, and the bottom is a single row (title left, button
                right) that always fits. */}
            <span className="absolute top-3 left-3.5 text-[9px] px-2.5 py-1 rounded-full font-semibold tracking-wide whitespace-nowrap"
              style={{ background: 'rgba(11,6,32,0.55)', color: '#fff', backdropFilter: 'blur(6px)' }}>
              ✨ {t('discover.featuredQuiz')}
            </span>
            <div className="absolute bottom-0 left-0 right-0 px-3.5 pb-3 flex items-end justify-between gap-3">
              <h3 className="text-white text-[15px] font-serif leading-snug flex-1 min-w-0"
                style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                {quizzes[0].title}
              </h3>
              <span className="flex-shrink-0 px-3.5 py-2 rounded-full text-[11px] font-semibold text-white whitespace-nowrap"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
                {t('discover.takeQuiz')}
              </span>
            </div>
          </button>
        )}

        {/* REDESIGN (your call: "зробити так щоб була сторінка одна і не було
            скролу в бік... по 3 квізи в одній стрічці, щоб сторінка вниз і
            зверху не гортались"): the sideways quiz/article slider is gone —
            all quizzes now sit in a fixed 3-column grid (6 quizzes = 2 rows)
            that fits on one screen. Nothing on this page scrolls any more:
            the outer container is overflow-hidden, tiles are compact. */}
        <div key={activeCat} className="screen-enter">
          {quizzes.length > 0 && (
            <>
              <SectionHeader title={t('discover.understandYourself')} subtitle={t('discover.battlePassSub')} />
              <div className="grid grid-cols-3 gap-2">
                {quizzes.map(q => {
                  const locked = isLocked(q.unlockSpend)
                  return (
                    <button key={q.id}
                      onClick={() => openQuiz(q)}
                      className="rounded-2xl overflow-hidden text-left active:scale-[0.97] transition-transform relative"
                      style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
                      <div className="relative" style={{ height: 72 }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={q.image} alt="" className={`w-full h-full object-cover ${locked ? 'opacity-60' : ''}`} />
                        {locked && <LockBadge label={`$${q.unlockSpend}`} />}
                      </div>
                      <div className="px-2 py-1.5">
                        <p className="text-[var(--text-primary)] text-[10px] font-medium leading-snug line-clamp-2" style={{ minHeight: '2.6em' }}>{q.title}</p>
                        {locked ? (
                          <p className="text-[9px] mt-0.5 font-medium" style={{ color: '#F5C542' }}>{t('discover.unlocksAt', { amount: q.unlockSpend })}</p>
                        ) : (
                          <p className="text-[var(--text-muted)] text-[9px] mt-0.5">{t('discover.quizMinShort', { n: 3 })}</p>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {nothingFound && (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="text-4xl">🔍</span>
              <p className="text-[var(--text-muted)] text-sm">{t('discover.nothingHereYet')}</p>
              <p className="text-[var(--text-dim)] text-xs">{t('discover.tryDifferentCategory')}</p>
            </div>
          )}
        </div>
      </div>
      <BottomNav active="discover" onNavigate={onNavigate} />

      {open?.kind === 'quiz' && activeQuiz && quizContent[activeQuiz.id] && (
        <QuizModal title={activeQuiz.title} content={quizContent[activeQuiz.id]} onClose={() => setOpen(null)} />
      )}
      {/* BUG FIX (reported: the "quiz locked" sheet showed up below the bottom
          menu instead of over the screen): globals.css has
          `.sensora-bg > * { position: relative }`, which silently overrides
          the sheet's own `fixed` class, so it sat in normal flow under the
          nav. ModalPortal (same one home-screen's popups use) renders it at
          the document root, outside that rule, so it overlays everything. */}
      {open?.kind === 'locked' && (
        <ModalPortal>
          <LockedQuizSheet
            title={open.title}
            unlockSpend={open.unlockSpend}
            spent={lifetimeSpent ?? 0}
            onClose={() => setOpen(null)}
            onFindExpert={() => { setOpen(null); onNavigate('search') }}
          />
        </ModalPortal>
      )}
    </div>
  )
}

// ─── Locked-quiz progress sheet ────────────────────────────────────────────
// Replaces the old behavior of just throwing the buy-minutes modal at
// someone who tapped a locked quiz. Unlocking is earned by real spend on
// live chats, not by topping up a balance, so this shows honest progress
// toward the threshold and points at the one action that actually moves it
// — starting (or continuing) a real consultation — instead of a purchase
// flow that wouldn't unlock anything by itself.
function LockedQuizSheet({ title, unlockSpend, spent, onClose, onFindExpert }: {
  title: string; unlockSpend: number; spent: number; onClose: () => void; onFindExpert: () => void
}) {
  const { t } = useLanguage()
  const pct = Math.max(0, Math.min(100, (spent / unlockSpend) * 100))
  const remaining = Math.max(0, unlockSpend - spent)
  return (
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
      style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pt-5 pb-7 flex flex-col items-center text-center screen-enter"
        style={{ background: 'linear-gradient(180deg,var(--bg-mid),var(--bg-void))', border: '1px solid rgba(217,70,239,0.25)' }}>
        <button onClick={onClose} className="self-end w-8 h-8 flex items-center justify-center rounded-full mb-2" style={{ background: 'var(--surface-1)' }} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
        <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
          style={{ background: 'linear-gradient(135deg,#7C3AED33,#D946EF22)', border: '1.5px solid rgba(217,70,239,0.4)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F5C542" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h2 className="text-[var(--text-primary)] text-base font-serif mb-1.5">{title}</h2>
        <p className="text-[var(--text-muted)] text-sm mb-4">{t('discover.lockedBody', { amount: unlockSpend })}</p>
        <div className="w-full h-2 rounded-full mb-2" style={{ background: 'var(--surface-1)' }}>
          <div className="h-2 rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#7C3AED,#D946EF)' }} />
        </div>
        <p className="text-[var(--text-dim)] text-xs mb-5">{t('discover.lockedProgress', { spent: spent.toFixed(0), goal: unlockSpend })}</p>
        <button onClick={onFindExpert}
          className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {t('discover.findExpertCta', { amount: remaining.toFixed(0) })}
        </button>
      </div>
    </div>
  )
}
