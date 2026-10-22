'use client'

// FILE PATH: components/screens/readings-screen.tsx
import { useState } from 'react'
import {
  ZODIAC_SIGNS, getZodiacSignFromDate,
  getReadingQuizzes, getReadingChallenges, getReadingPractices, getDiscoverArticles,
  getSignReadingBlurb, getQuizContent, getPracticeSteps, getChallengePreview,
} from '@/lib/data'
import BottomNav from '@/components/bottom-nav'
import { WitchHatArt, FlameArt, LotusArt, CrescentMoonArt, TarotCardArt, NebulaOrbArt, MoonPhasesArt } from '@/components/magic-art'
import { ArticleModal, QuizModal, PracticeModal } from '@/components/content-modals'
import { useLanguage } from '@/components/language-provider'
import type { Screen } from '@/app/page'

interface Props {
  onNavigate: (s: Screen) => void
  birthDate?: string
}

const QUIZ_ART: Record<string, React.ReactNode> = {
  q1: <WitchHatArt size={44} />,
  q2: <FlameArt size={44} />,
  q3: <LotusArt size={44} />,
  q4: <CrescentMoonArt size={44} />,
}

const PRACTICE_ART: Record<string, React.ReactNode> = {
  p1: <NebulaOrbArt size={56} />,
  p2: <CrescentMoonArt size={44} />,
  p3: <TarotCardArt size={36} symbol="🌌" />,
  p4: <TarotCardArt size={36} symbol="🕯️" />,
}

function ArticleArt({ art, size = 30 }: { art: string; size?: number }) {
  if (art === 'moon') return <MoonPhasesArt size={size * 2.2} />
  if (art === 'lotus') return <LotusArt size={size} />
  if (art === 'tarot') return <TarotCardArt size={size * 0.6} />
  return <NebulaOrbArt size={size} />
}

type Open =
  | { kind: 'article'; id: string }
  | { kind: 'quiz'; id: string }
  | { kind: 'practice'; id: string; title: string }
  | null

export default function ReadingsScreen({ onNavigate, birthDate }: Props) {
  const { t, locale } = useLanguage()
  const signId = getZodiacSignFromDate(birthDate)
  const sign = ZODIAC_SIGNS.find(s => s.id === signId)!
  const blurb = getSignReadingBlurb(signId, locale)
  const readingQuizzes = getReadingQuizzes(locale)
  const readingChallenges = getReadingChallenges(locale)
  const readingPractices = getReadingPractices(locale)
  const discoverArticles = getDiscoverArticles(locale)
  const quizContent = getQuizContent(locale)
  const practiceSteps = getPracticeSteps(locale)
  const challengePreview = getChallengePreview(locale)
  const moreArticles = discoverArticles.slice(0, 3)
  const [open, setOpen] = useState<Open>(null)

  const activeArticle = open?.kind === 'article' ? discoverArticles.find(a => a.id === open.id) : null
  const activeQuiz = open?.kind === 'quiz' ? readingQuizzes.find(q => q.id === open.id) : null

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-2">
        <div className="grid grid-cols-[2rem_1fr_2rem] items-center mb-5">
          <button onClick={() => onNavigate('home')} aria-label="Back"
            className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <h2 className="text-[var(--text-primary)] text-lg font-serif text-center">{t('readings.title')}</h2>
        </div>

        {/* Personalized for the user's real sign, not a generic banner.
            BUG FIX (reported: "не дуже шрифти читаються на градієнті" — text
            hard to read on the gradient): this used to fade from a fixed
            dark hex (#4C1D95) into var(--bg-elevated), which is near-white
            in light theme — so the card went dark-to-light across its own
            width, while the blurb text stayed var(--text-primary) (dark in
            light theme, meant for a light surface). Same text sat unreadable
            on the dark half and fine on the light half. Fixed by making the
            whole gradient fixed/theme-independent — this "mystical" card
            reads the same vivid purple in both themes now — and switching
            its text to a fixed light color to match. */}
        <div className="rounded-2xl p-4 mb-6 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg,#4C1D95,#6D28D9)', border: '1px solid rgba(217,70,239,0.25)' }}>
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.16)' }}>
            {sign.symbol}
          </div>
          <div className="min-w-0">
            <p className="text-[#F5C542] text-[10px] font-medium tracking-wide mb-0.5">{t('readings.pickedFor', { sign: sign.name.toUpperCase() })}</p>
            <p className="text-white/90 text-xs leading-snug">{blurb}</p>
          </div>
        </div>

        <h3 className="text-[var(--text-primary)] text-base font-medium mb-3">{t('readings.explorePotential')}</h3>
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {/* Same gradient-legibility bug as the "picked for" banner above
              (fixed dark hex faded into var(--bg-mid), which is pure white
              in light theme) — fixed the same way: fully fixed gradient +
              fixed light text/badge colors instead of theme variables that
              assumed a dark theme. */}
          {readingQuizzes.map(q => (
            <button key={q.id} onClick={() => setOpen({ kind: 'quiz', id: q.id })}
              className="relative flex-shrink-0 w-32 h-32 rounded-2xl p-4 flex flex-col justify-between text-left overflow-hidden active:scale-[0.97] transition-transform"
              style={{ background: 'linear-gradient(135deg,#3B1068,#4C1D95)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {QUIZ_ART[q.id]}
              <div>
                <p className="text-white text-xs font-medium leading-snug">{q.title}</p>
              </div>
              <div className="flex gap-1.5 mt-1">
                <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.18)', color: '#D9C6FF' }}>{t('readings.quiz')}</span>
                <span className="text-[9px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.14)', color: '#B4A9D6' }}>{t('readings.minutesShort', { n: q.minutes })}</span>
              </div>
            </button>
          ))}
        </div>

        <h3 className="text-[var(--text-primary)] text-base font-medium mb-3">{t('readings.improveYourself')}</h3>
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {/* Same gradient-legibility bug as above — fixed gradient + fixed
              light text instead of var(--bg-elevated)/var(--text-*). */}
          {readingChallenges.map(c => (
            <button key={c.id}
              onClick={() => setOpen({ kind: 'practice', id: `challenge-${c.id}`, title: `${c.title} — Day 1` })}
              className="flex-shrink-0 w-56 rounded-2xl p-4 text-left active:scale-[0.97] transition-transform"
              style={{ background: 'linear-gradient(135deg,#4C1D95,#6D28D9)', border: '1px solid rgba(217,70,239,0.2)' }}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{c.icon}</span>
                <span className="text-[10px] px-2.5 py-1 rounded-full font-medium flex items-center gap-1"
                  style={{ background: 'rgba(217,70,239,0.25)', color: '#F5D9FC' }}>
                  🕐 {t('readings.dayChallenge', { days: c.days })}
                </span>
              </div>
              <p className="text-white text-sm font-medium mb-1">{c.title}</p>
              <p className="text-white/75 text-[11px] leading-relaxed line-clamp-2">{c.desc}</p>
            </button>
          ))}
        </div>

        <h3 className="text-[var(--text-primary)] text-base font-medium mb-3">{t('readings.practiceEveryday')}</h3>
        <div className="flex gap-3 mb-6 overflow-x-auto pb-1 scrollbar-hide">
          {readingPractices.map(p => (
            <button key={p.id}
              onClick={() => setOpen({ kind: 'practice', id: p.id, title: p.title })}
              className="flex-shrink-0 w-40 rounded-2xl overflow-hidden text-left active:scale-[0.97] transition-transform"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
              <div className="h-24 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg,#4C1D95,#3B1068)' }}>
                {PRACTICE_ART[p.id]}
              </div>
              <div className="p-3">
                <span className="text-[9px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 mb-1.5"
                  style={{ background: 'rgba(124,58,237,0.25)', color: 'var(--text-accent-soft)' }}>
                  {p.type === 'Audio' ? '▶' : '📄'} {p.type === 'Audio' ? t('readings.audio') : t('readings.article')}
                </span>
                <p className="text-[var(--text-primary)] text-xs font-medium leading-snug">{p.title}</p>
              </div>
            </button>
          ))}
        </div>

        <h3 className="text-[var(--text-primary)] text-base font-medium mb-3">{t('readings.moreToExplore')}</h3>
        <div className="flex flex-col gap-2.5 pb-4">
          {moreArticles.map(a => (
            <button key={a.id} onClick={() => setOpen({ kind: 'article', id: a.id })}
              className="flex items-center gap-3 p-3 rounded-2xl text-left active:scale-[0.98] transition-transform"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={{ background: 'linear-gradient(135deg,#4C1D95,#3B1068)' }}>
                <ArticleArt art={a.art} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-primary)] text-xs font-medium leading-snug mb-0.5">{a.title}</p>
                <span className="text-[#9D5FF5] text-[10px]">{t('readings.minRead', { n: a.readMins })} • {t(`category.${a.category}`)}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
      <BottomNav active="history" onNavigate={onNavigate} />

      {open?.kind === 'article' && activeArticle && (
        <ArticleModal title={activeArticle.title} category={t(`category.${activeArticle.category}`)} readMins={activeArticle.readMins} body={activeArticle.body} onClose={() => setOpen(null)} />
      )}
      {open?.kind === 'quiz' && activeQuiz && quizContent[activeQuiz.id] && (
        <QuizModal title={activeQuiz.title} content={quizContent[activeQuiz.id]} onClose={() => setOpen(null)} />
      )}
      {open?.kind === 'practice' && practiceSteps[open.id] && (
        <PracticeModal title={open.title} steps={practiceSteps[open.id]} onClose={() => setOpen(null)} />
      )}
      {open?.kind === 'practice' && open.id.startsWith('challenge-') && challengePreview[open.id.replace('challenge-', '')] && (
        <PracticeModal title={open.title} steps={challengePreview[open.id.replace('challenge-', '')]} onClose={() => setOpen(null)} />
      )}
    </div>
  )
}