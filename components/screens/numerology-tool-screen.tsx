'use client'

// FILE PATH: components/screens/numerology-tool-screen.tsx
// The real destination behind the Fortune Wheel's "Numerology calculator"
// segment, which previously had no screen to land on at all. Uses the
// standard life-path-number algorithm (lib/numerology.ts) — a real,
// deterministic calculation from a birth date, not a random result.
import { useState } from 'react'
import { calculateLifePathNumber, LIFE_PATH_MEANINGS } from '@/lib/numerology'
import BirthDateSelect from '@/components/ui/birth-date-select'
// Real vector art (same library already used on readings/natal-chart/
// onboarding screens) — this screen previously had no illustration at all,
// just plain text before and after entering a birth date.
import { NebulaOrbArt, CrystalBallArt } from '@/components/magic-art'
import { useLanguage } from '@/components/language-provider'

interface Props {
  birthDate?: string
  onBack: () => void
}

export default function NumerologyToolScreen({ birthDate, onBack }: Props) {
  const { t } = useLanguage()
  const [dateInput, setDateInput] = useState(birthDate ?? '')
  const number = dateInput ? calculateLifePathNumber(dateInput) : null
  const meaning = number ? LIFE_PATH_MEANINGS[number] : null

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--surface-1)' }}>
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-1)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <p className="text-[var(--text-primary)] text-sm font-medium">{t('numTool.title')}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <p className="text-[var(--text-dim)] text-xs leading-relaxed mb-4">
          {t('numTool.intro')}
        </p>

        <BirthDateSelect value={dateInput} onChange={setDateInput} className="mb-5" />

        {/* BUG FIX (same family as the Readings-screen gradient cards: fixed
            dark hex faded into var(--bg-elevated) — near-white in light
            theme — under theme-variable text meant for a light surface; the
            big result number was the most visible instance of this since
            it's the largest text on the card). Fixed gradient + fixed light
            text. */}
        {meaning && number && (
          <div className="rounded-2xl p-6 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#3B1068,#6D28D9)', border: '1px solid rgba(124,58,237,0.35)' }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.5 }}>
              <NebulaOrbArt size={200} />
            </div>
            <p className="relative text-white text-5xl font-serif font-light mb-2">{number}</p>
            <p className="relative text-[#D946EF] text-sm font-semibold mb-3">{meaning.title}</p>
            <p className="relative text-[#D9C6FF] text-xs leading-relaxed">{meaning.body}</p>
          </div>
        )}

        {!dateInput && (
          <div className="flex flex-col items-center mt-6">
            <CrystalBallArt size={84} />
            <p className="text-[var(--text-dim)] text-xs text-center mt-3">{t('numTool.enterDate')}</p>
          </div>
        )}
      </div>
    </div>
  )
}