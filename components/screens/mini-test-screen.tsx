'use client'

// FILE PATH: components/screens/mini-test-screen.tsx
import { useState } from 'react'
import BirthDateSelect from '@/components/ui/birth-date-select'
import { AstrologyIcon, NumerologyIcon, TarotCategoryIcon } from '@/components/magic-art'
import { useLanguage } from '@/components/language-provider'
import { calculateAge } from '@/lib/validation'

// catRecommend keys/values stay real English category identifiers — they're
// passed to onNext() and compared elsewhere in the app (e.g. rec.toLowerCase()
// matched against 'astrology'/'numerology'/'tarot' in magic-art.tsx's
// CategoryIcon), so translating the VALUES would silently break that
// matching. Only the on-screen labels are localized, via miniTest.cat.*.
const catRecommend: Record<string, string> = {
  calm: 'Astrology', anxious: 'Tarot', pensive: 'Numerology', openminded: 'Compatibility',
  love: 'Compatibility', career: 'Numerology', future: 'Astrology', spirit: 'Tarot',
  analytic: 'Astrology', intuitive: 'Tarot', divination: 'Tarot', practical: 'Numerology',
}

interface Props { onNext: (category: string, birthDate: string) => void }

export default function MiniTestScreen({ onNext }: Props) {
  const { t } = useLanguage()
  const catLabel = (cat: string) => t(`miniTest.cat.${cat.toLowerCase()}`)
  const questions = [
    {
      q: t('miniTest.q1'),
      opts: [
        { icon: '🌙', label: t('miniTest.q1.calm.label'), desc: t('miniTest.q1.calm.desc'), val: 'calm' },
        { icon: '💭', label: t('miniTest.q1.anxious.label'), desc: t('miniTest.q1.anxious.desc'), val: 'anxious' },
        { icon: '🌫️', label: t('miniTest.q1.pensive.label'), desc: t('miniTest.q1.pensive.desc'), val: 'pensive' },
        { icon: '🌈', label: t('miniTest.q1.openminded.label'), desc: t('miniTest.q1.openminded.desc'), val: 'openminded' },
      ],
    },
    {
      q: t('miniTest.q2'),
      opts: [
        { icon: '❤️', label: t('miniTest.q2.love.label'), desc: t('miniTest.q2.love.desc'), val: 'love' },
        { icon: '💼', label: t('miniTest.q2.career.label'), desc: t('miniTest.q2.career.desc'), val: 'career' },
        { icon: '🌟', label: t('miniTest.q2.future.label'), desc: t('miniTest.q2.future.desc'), val: 'future' },
        { icon: '🧘', label: t('miniTest.q2.spirit.label'), desc: t('miniTest.q2.spirit.desc'), val: 'spirit' },
      ],
    },
    {
      q: t('miniTest.q3'),
      opts: [
        { icon: '📊', label: t('miniTest.q3.analytic.label'), desc: t('miniTest.q3.analytic.desc'), val: 'analytic' },
        { icon: '💫', label: t('miniTest.q3.intuitive.label'), desc: t('miniTest.q3.intuitive.desc'), val: 'intuitive' },
        { icon: '🎴', label: t('miniTest.q3.divination.label'), desc: t('miniTest.q3.divination.desc'), val: 'divination' },
        { icon: '🤝', label: t('miniTest.q3.practical.label'), desc: t('miniTest.q3.practical.desc'), val: 'practical' },
      ],
    },
  ]
  const [phase, setPhase] = useState<'birthdate' | 'quiz'>('birthdate')
  const [birthDate, setBirthDate] = useState('')
  const [birthDateError, setBirthDateError] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<string[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const submitBirthDate = () => {
    if (!birthDate) {
      setBirthDateError(t('miniTest.enterBirthDate'))
      return
    }
    const d = new Date(birthDate)
    if (isNaN(d.getTime()) || d > new Date()) {
      setBirthDateError(t('miniTest.invalidBirthDate'))
      return
    }
    // REAL FEATURE ADDED ("модерація віку при реєстрації, щоб люди молодші
    // 18 років не могли зареєструватись"): this is the very first screen
    // that ever collects a birth date, before the person even reaches the
    // registration form — so it's the earliest, friendliest place to stop
    // an under-18 signup. Age is computed carefully (not just year
    // subtraction) so someone whose birthday is later this year than today
    // is correctly still counted as one year younger.
    if (calculateAge(d) < 18) {
      setBirthDateError(t('miniTest.under18'))
      return
    }
    setBirthDateError(null)
    setPhase('quiz')
  }

  if (phase === 'birthdate') {
    return (
      <div className="h-full overflow-y-auto flex flex-col px-8 pt-8 pb-14"
        style={{ background: 'linear-gradient(180deg,var(--bg-void) 0%,var(--bg-deep) 100%)' }}>
        <div className="flex gap-1 mb-6">
          <div className="flex-1 h-1 rounded-full" style={{ background: '#D946EF' }} />
          <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--surface-3)' }} />
          <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--surface-3)' }} />
          <div className="flex-1 h-1 rounded-full" style={{ background: 'var(--surface-3)' }} />
        </div>

        <p className="text-[var(--text-muted)] text-xs mb-1">{t('miniTest.beforeWeStart')}</p>
        <h2 className="font-serif text-xl text-[var(--text-primary)] mb-2 leading-snug">{t('miniTest.whenWereYouBorn')}</h2>
        <p className="text-[var(--text-dim)] text-sm mb-7 leading-relaxed">
          {t('miniTest.birthDateHint')}
        </p>

        <div className="flex-1 flex flex-col">
          <label className="text-[var(--text-muted)] text-xs mb-1.5 block">{t('miniTest.dateOfBirth')}</label>
          <BirthDateSelect
            value={birthDate}
            onChange={v => { setBirthDate(v); setBirthDateError(null) }}
            size="lg"
          />
          {birthDateError && <p className="text-[#EF4444] text-xs mt-2">{birthDateError}</p>}
        </div>

        <button onClick={submitBirthDate}
          className="w-full py-4 rounded-2xl font-semibold text-base mt-6 active:scale-95 transition-all"
          style={birthDate
            ? { background: 'linear-gradient(135deg,#7C3AED,#D946EF)', color: '#fff', boxShadow: '0 8px 32px rgba(217,70,239,0.35)' }
            : { background: 'rgba(124,58,237,0.15)', color: 'var(--text-muted)', border: '1px solid rgba(124,58,237,0.3)' }
          }>
          {t('miniTest.next')}
        </button>
      </div>
    )
  }

  const current = questions[step]

  const pick = (val: string) => setSelected(val)

  const advance = () => {
    if (!selected) return
    const newAnswers = [...answers, selected]
    setAnswers(newAnswers)
    if (step < questions.length - 1) {
      setStep(s => s + 1)
      setSelected(null)
    } else {
      setDone(true)
    }
  }

  const finish = () => {
    const cat = answers[0] || 'calm'
    onNext(catRecommend[cat] || 'Astrology', birthDate)
  }

  if (done) {
    const rec = catRecommend[answers[0]] || 'Astrology'
    return (
      <div className="h-full overflow-y-auto flex flex-col items-center justify-center px-8 pb-14 gap-8"
        style={{ background:'linear-gradient(180deg,var(--bg-void) 0%,var(--bg-deep) 100%)' }}>
        <div className="flex flex-col items-center gap-4 text-center">
          {/* BUG FIX: this circle used to show the same generic ✨ regardless
              of which category the quiz actually recommended — a fixed
              Astrology-icon-shaped case (star ring) with a real card image
              swapped in for Tarot reads as a much more deliberate, "we
              actually looked at your answers" result than one emoji for
              every outcome. */}
          <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl overflow-hidden"
            style={{ background:'linear-gradient(135deg,#7C3AED33,#D946EF22)', border:'1.5px solid rgba(217,70,239,0.4)' }}>
            {rec.toLowerCase() === 'astrology' ? <AstrologyIcon size={36} />
              : rec.toLowerCase() === 'numerology' ? <NumerologyIcon size={36} />
              : rec.toLowerCase() === 'tarot' ? <TarotCategoryIcon size={30} />
              : (
                /* REAL PHOTO (your call: "більше реальних фото... по всій
                    апці щоб оживити") — this branch is the Compatibility
                    outcome (the only one of the 4 recommendations with no
                    dedicated icon component, so it always fell back to a
                    generic ✨ before). Real couple-at-sunset photo, already
                    used for the "relationship healing" Discover article,
                    reused here since it's the same theme. */
                // eslint-disable-next-line @next/next/no-img-element
                <img src="https://images.unsplash.com/photo-1652391662470-88d4a44349c6?auto=format&fit=crop&w=160&q=80" alt=""
                  className="w-full h-full object-cover" />
              )}
          </div>
          <h2 className="font-serif text-2xl text-[var(--text-primary)]">{t('miniTest.yourResult')}</h2>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed">
            {t('miniTest.basedOnAnswers')}
          </p>
          <div
            className="px-6 py-3 rounded-2xl"
            style={{ background:'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(217,70,239,0.15))', border:'1px solid rgba(217,70,239,0.4)' }}
          >
            <p className="text-[#D946EF] text-xl font-semibold">{catLabel(rec)}</p>
          </div>
          <p className="text-[var(--text-dim)] text-xs leading-relaxed max-w-xs">
            {t('miniTest.foundBestExperts', { category: catLabel(rec).toLowerCase() })}
          </p>
        </div>
        <button onClick={finish}
          className="w-full max-w-xs py-4 rounded-2xl text-white font-semibold text-base active:scale-95 transition-transform"
          style={{ background:'linear-gradient(135deg,#7C3AED,#D946EF)', boxShadow:'0 8px 32px rgba(217,70,239,0.4)' }}>
          {t('miniTest.getStarted')}
        </button>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto flex flex-col px-8 pt-8 pb-14"
      style={{ background:'linear-gradient(180deg,var(--bg-void) 0%,var(--bg-deep) 100%)' }}>
      <div className="flex gap-1 mb-6">
        <div className="flex-1 h-1 rounded-full" style={{ background: '#D946EF' }} />
        {questions.map((_, i) => (
          <div key={i} className="flex-1 h-1 rounded-full transition-all"
            style={{ background: i <= step ? '#D946EF' : 'var(--surface-3)' }} />
        ))}
      </div>

      <p className="text-[var(--text-muted)] text-xs mb-1">{t('miniTest.questionOf', { n: step + 1, total: questions.length })}</p>
      <h2 className="font-serif text-xl text-[var(--text-primary)] mb-7 leading-snug">{current.q}</h2>

      <div className="flex flex-col gap-3 flex-1">
        {current.opts.map(opt => {
          const isSel = selected === opt.val
          return (
            <button key={opt.val} onClick={() => pick(opt.val)}
              className="flex items-center gap-4 p-4 rounded-2xl text-left transition-all"
              style={{
                background: isSel ? 'rgba(124,58,237,0.2)' : 'var(--surface-1)',
                border:`1px solid ${isSel ? 'rgba(124,58,237,0.65)' : 'var(--surface-2)'}`,
              }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0"
                style={{ background: isSel ? 'rgba(217,70,239,0.2)' : 'rgba(124,58,237,0.15)' }}>
                {opt.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-primary)] text-sm font-medium">{opt.label}</p>
                <p className="text-[var(--text-muted)] text-xs">{opt.desc}</p>
              </div>
              {isSel && (
                <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                  style={{ background:'#7C3AED' }}>
                  <svg width="10" height="8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
              )}
            </button>
          )
        })}
      </div>

      <button onClick={advance}
        className="w-full py-4 rounded-2xl font-semibold text-base mt-6 active:scale-95 transition-all"
        style={selected
          ? { background:'linear-gradient(135deg,#7C3AED,#D946EF)', color:'#fff', boxShadow:'0 8px 32px rgba(217,70,239,0.35)' }
          : { background:'rgba(124,58,237,0.15)', color:'var(--text-muted)', border:'1px solid rgba(124,58,237,0.3)' }
        }>
        {t('miniTest.next')}
      </button>
    </div>
  )
}