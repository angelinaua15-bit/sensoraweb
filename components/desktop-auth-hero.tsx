'use client'

// FILE PATH: components/desktop-auth-hero.tsx
// sensoraweb only: the left half of the screen on a laptop/tablet before
// sign-in (splash, onboarding, login, register, mini-test). The actual
// sign-in flow stays in the card on the right. Hidden below 768px.
import { useLanguage } from '@/components/language-provider'

export default function DesktopAuthHero() {
  const { t } = useLanguage()
  const points = [
    { title: t('onboarding.slide1.title'), desc: t('onboarding.slide1.desc'), icon: '✦' },
    { title: t('onboarding.slide2.title'), desc: t('onboarding.slide2.desc'), icon: '☾' },
    { title: t('onboarding.slide3.title'), desc: t('onboarding.slide3.desc'), icon: '✧' },
  ]
  return (
    <section className="hidden md:flex flex-col justify-center flex-1 max-w-[560px] py-10">
      <div className="flex items-center gap-3 mb-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sensora-mark.png" alt="Sensora" style={{ height: 48, width: 'auto' }} />
        <span className="font-serif text-2xl tracking-[0.25em] text-[var(--text-primary)]">SENSORA</span>
      </div>
      <h1 className="font-serif text-4xl lg:text-5xl leading-tight text-[var(--text-primary)] mb-5">
        Your guide to the unseen
      </h1>
      <p className="text-[var(--text-muted)] text-base lg:text-lg leading-relaxed mb-10">
        {t('onboarding.slide1.desc')}
      </p>
      <div className="flex flex-col gap-4">
        {points.map(p => (
          <div key={p.icon} className="flex items-start gap-4 p-4 rounded-2xl"
            style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(217,70,239,0.18)' }}>
            <span className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-lg"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)', color: '#fff' }}>{p.icon}</span>
            <div>
              <p className="text-[var(--text-primary)] text-sm font-semibold">{p.title.replace('\n', ' ')}</p>
              <p className="text-[var(--text-dim)] text-sm leading-relaxed mt-0.5">{p.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
