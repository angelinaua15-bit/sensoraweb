'use client'

// FILE PATH: components/content-modals.tsx
import { useState } from 'react'
import ModalPortal from '@/components/modal-portal'
import type { QuizContent, QuizArtKey } from '@/lib/data'
import {
  MoonPhasesArt, CrystalBallArt, TarotCardArt, ZodiacWheelArt,
  NebulaOrbArt, WitchHatArt, LotusArt, CrescentMoonArt, FlameArt,
} from '@/components/magic-art'
import { useLanguage } from '@/components/language-provider'

function ModalShell({ onClose, children }: { onClose: () => void; children: React.ReactNode }) {
  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
        style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}>
        <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pt-5 pb-7 flex flex-col screen-enter"
          style={{ background: 'linear-gradient(180deg,var(--bg-mid),var(--bg-void))', border: '1px solid rgba(217,70,239,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
          <button onClick={onClose} className="self-end w-8 h-8 flex items-center justify-center rounded-full mb-2" style={{ background: 'var(--surface-1)' }} aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          {children}
        </div>
      </div>
    </ModalPortal>
  )
}

// ─── Article ─────────────────────────────────────────────────────────────────

export function ArticleModal({ title, category, readMins, body, onClose }: {
  title: string; category: string; readMins: number; body: string[]; onClose: () => void
}) {
  const { t } = useLanguage()
  return (
    <ModalShell onClose={onClose}>
      <p className="text-[#D946EF] text-[10px] font-medium tracking-wide mb-2">{category.toUpperCase()} • {readMins} {t('modal.minReadSuffix')}</p>
      <h2 className="text-[var(--text-primary)] text-lg font-serif mb-4 leading-snug">{title}</h2>
      <div className="flex flex-col gap-3 pb-2">
        {body.map((p, i) => (
          <p key={i} className="text-[var(--text-muted)] text-sm leading-relaxed">{p}</p>
        ))}
      </div>
    </ModalShell>
  )
}

// ─── Quiz ─────────────────────────────────────────────────────────────────────
// Real, in-brand thematic art per question (no stock photos) — reuses the
// same illustration set already built in magic-art.tsx, so the visuals stay
// consistent with the rest of the app instead of introducing a new style.
function QuizArt({ art, size = 72 }: { art?: QuizArtKey; size?: number }) {
  if (!art) return null
  switch (art) {
    case 'moon': return <MoonPhasesArt size={size * 1.6} />
    case 'crystal': return <CrystalBallArt size={size} />
    case 'tarot': return <TarotCardArt size={size * 0.7} />
    case 'zodiac': return <ZodiacWheelArt size={size} />
    case 'nebula': return <NebulaOrbArt size={size} />
    case 'witch': return <WitchHatArt size={size} />
    case 'lotus': return <LotusArt size={size} />
    case 'crescent': return <CrescentMoonArt size={size} />
    case 'flame': return <FlameArt size={size} />
    default: return null
  }
}

export function QuizModal({ title, content, onClose }: {
  title: string; content: QuizContent; onClose: () => void
}) {
  const { t } = useLanguage()
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  // Tallies how many times each `outcome` key was picked (A/B/C/D, etc.) —
  // only used by quizzes whose options carry an outcome; legacy quizzes
  // (plain string options, e.g. q1-q4 on the Readings screen) never touch
  // this and fall back to the single static `content.result` below,
  // unchanged from before.
  const [counts, setCounts] = useState<Record<string, number>>({})
  const q = content.questions[step]

  const pick = (opt: QuizContent['questions'][number]['options'][number]) => {
    if (typeof opt !== 'string') {
      setCounts(prev => ({ ...prev, [opt.outcome]: (prev[opt.outcome] ?? 0) + 1 }))
    }
    if (step < content.questions.length - 1) setStep(s => s + 1)
    else setDone(true)
  }

  if (done) {
    // Whichever outcome key was picked most wins; ties resolve to whichever
    // appears first in `results` (stable, not random) so the same answers
    // always produce the same result.
    let winner: string | null = null
    if (content.results) {
      let best = -1
      for (const key of Object.keys(content.results)) {
        const c = counts[key] ?? 0
        if (c > best) { best = c; winner = key }
      }
    }
    const resolved = winner && content.results ? content.results[winner] : null

    return (
      <ModalShell onClose={onClose}>
        <div className="flex flex-col items-center text-center gap-4 py-4">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
            style={{ background: 'linear-gradient(135deg,#7C3AED33,#D946EF22)', border: '1.5px solid rgba(217,70,239,0.4)' }}>
            ✨
          </div>
          <h2 className="text-[var(--text-primary)] text-lg font-serif">{resolved ? resolved.title : t('modal.yourResult')}</h2>
          <p className="text-[var(--text-accent-soft)] text-sm leading-relaxed">{resolved ? resolved.body : content.result}</p>
          {/* REAL FEATURE ADDED (your call: "щоб не було потім суперечок із
              чатером в чаті якщо вона пройде і буде щось не так"): every
              quiz result — old and new, on Discover or Readings — now ends
              with the same honest disclaimer, shown once here instead of
              hand-written into each individual result string (which would
              be easy to forget on a future quiz). It frames the result as
              light self-reflection, not a definitive reading, so it can
              never be quoted back at a live chatter as "but the quiz said
              X" when their real, personalized reading says something
              different. */}
          <p className="text-[var(--text-dim)] text-[11px] leading-relaxed mt-1">{t('modal.quizDisclaimer')}</p>
          <button onClick={onClose}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm active:scale-95 transition-transform mt-2"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
            {t('modal.done')}
          </button>
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell onClose={onClose}>
      <p className="text-[var(--text-dim)] text-[10px] tracking-wider mb-1">{title.toUpperCase()}</p>
      <p className="text-[var(--text-muted)] text-xs mb-3">{t('modal.questionOf', { n: step + 1, total: content.questions.length })}</p>
      {q.art && (
        <div className="flex justify-center mb-3">
          <QuizArt art={q.art} />
        </div>
      )}
      <h2 className="text-[var(--text-primary)] text-base font-medium mb-5 leading-snug text-center">{q.q}</h2>
      <div className="flex flex-col gap-2.5">
        {q.options.map((opt, i) => {
          const label = typeof opt === 'string' ? opt : opt.text
          return (
            <button key={i} onClick={() => pick(opt)}
              className="p-3.5 rounded-2xl text-left text-sm text-[var(--text-primary)] active:scale-[0.98] transition-transform"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }}>
              {label}
            </button>
          )
        })}
      </div>
    </ModalShell>
  )
}

// ─── Guided practice / challenge preview ──────────────────────────────────────

export function PracticeModal({ title, steps, onClose }: {
  title: string; steps: string[]; onClose: () => void
}) {
  const { t } = useLanguage()
  const [step, setStep] = useState(0)
  const [finished, setFinished] = useState(false)

  if (finished) {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex flex-col items-center text-center gap-4 py-4">
          {/* REAL PHOTO (your call: swap flat emoji icons for real photos of
              magical things app-wide) — same full-moon photo already used
              for the "wanting vs attracting" Discover article, reused here
              for visual consistency rather than sourcing a near-duplicate. */}
          <div className="w-16 h-16 rounded-full overflow-hidden" style={{ border: '1.5px solid rgba(217,70,239,0.4)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://images.unsplash.com/photo-1507502707541-f369a3b18502?auto=format&fit=crop&w=150&q=80" alt=""
              className="w-full h-full object-cover" />
          </div>
          <h2 className="text-[var(--text-primary)] text-lg font-serif">{t('modal.nicelyDone')}</h2>
          <p className="text-[var(--text-muted)] text-sm">{t('modal.completedAllSteps')}</p>
          <button onClick={onClose}
            className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm active:scale-95 transition-transform mt-2"
            style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
            {t('modal.close')}
          </button>
        </div>
      </ModalShell>
    )
  }

  return (
    <ModalShell onClose={onClose}>
      <h2 className="text-[var(--text-primary)] text-base font-serif mb-1">{title}</h2>
      <p className="text-[var(--text-dim)] text-xs mb-5">{t('modal.stepOf', { n: step + 1, total: steps.length })}</p>

      <div className="flex gap-1 mb-5">
        {steps.map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full" style={{ background: i <= step ? '#D946EF' : 'var(--surface-3)' }} />
        ))}
      </div>

      <p key={step} className="text-[var(--text-primary)] text-sm leading-relaxed mb-8 screen-enter">{steps[step]}</p>

      <div className="flex gap-2 mt-auto">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)}
            className="flex-1 py-3 rounded-2xl text-sm text-[var(--text-muted)]" style={{ background: 'var(--surface-1)' }}>
            {t('modal.back')}
          </button>
        )}
        <button onClick={() => step < steps.length - 1 ? setStep(s => s + 1) : setFinished(true)}
          className="flex-1 py-3 rounded-2xl text-sm font-medium text-white active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {step < steps.length - 1 ? t('modal.next') : t('modal.finish')}
        </button>
      </div>
    </ModalShell>
  )
}