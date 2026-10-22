'use client'

// FILE PATH: components/screens/onboarding-screen.tsx
import { useState } from 'react'
import { NebulaOrbArt, CrystalBallArt, TarotCardArt } from '@/components/magic-art'
import { useLanguage } from '@/components/language-provider'

interface Props { onNext: () => void }

export default function OnboardingScreen({ onNext }: Props) {
  const { t } = useLanguage()
  const slides = [
    { art: <NebulaOrbArt size={112} />, title: t('onboarding.slide1.title'), desc: t('onboarding.slide1.desc') },
    { art: <CrystalBallArt size={104} />, title: t('onboarding.slide2.title'), desc: t('onboarding.slide2.desc') },
    { art: <TarotCardArt size={64} symbol="🔮" />, title: t('onboarding.slide3.title'), desc: t('onboarding.slide3.desc') },
  ]
  const [slide, setSlide] = useState(0)

  const advance = () => {
    if (slide < slides.length - 1) setSlide(s => s + 1)
    else onNext()
  }

  const { art, title, desc } = slides[slide]

  return (
    <div
      className="h-full overflow-y-auto flex flex-col px-8 pb-14 pt-6 relative sensora-bg"
    >
      <div className="flex justify-end">
        <button onClick={onNext} className="text-[var(--text-muted)] text-sm py-2">{t('onboarding.skip')}</button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-10">
        <div
          key={slide}
          className="w-32 h-32 rounded-full flex items-center justify-center screen-enter"
          style={{ background:'linear-gradient(135deg,var(--bg-elevated),var(--bg-deep))', border:'2px solid rgba(124,58,237,0.4)', boxShadow:'0 0 48px rgba(217,70,239,0.18)' }}
        >
          {art}
        </div>
        <div className="flex flex-col items-center gap-3 text-center">
          <h2 className="font-serif text-2xl text-[var(--text-primary)] leading-snug whitespace-pre-line">{title}</h2>
          <p className="text-[var(--text-muted)] text-sm leading-relaxed max-w-xs">{desc}</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div key={i} className="h-1.5 rounded-full transition-all duration-300"
              style={{ width: i === slide ? 28 : 8, background: i === slide ? '#D946EF' : 'var(--surface-3)' }} />
          ))}
        </div>
        <button
          onClick={advance}
          className="w-full max-w-xs py-4 rounded-2xl text-white font-semibold text-base active:scale-95 transition-transform"
          style={{ background:'linear-gradient(135deg,#7C3AED,#D946EF)', boxShadow:'0 8px 32px rgba(217,70,239,0.35)' }}
        >
          {t('onboarding.next')}
        </button>
      </div>
    </div>
  )
}