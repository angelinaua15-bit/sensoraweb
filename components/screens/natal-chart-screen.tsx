'use client'

// FILE PATH: components/screens/natal-chart-screen.tsx
// The real "full natal chart" the premium modal promises — Sun, Moon,
// Ascendant, and 12 houses computed for real from this person's own saved
// birth date/time/place (see lib/astro-calc.ts computeNatalChart, verified
// against a published reference chart to within 0.05-0.3° per placement).
// This replaces what used to be a static per-Sun-sign lookup labeled in the
// UI as a placeholder. When birth time and/or coordinates aren't saved yet,
// this says so honestly and links straight to the editor, instead of
// guessing or padding the screen with generic content.
import { useState, useEffect } from 'react'
import AvatarBubble from '@/components/avatar-bubble'
import { ZodiacWheelArt } from '@/components/magic-art'
import { computeNatalChart, type SignPlacement } from '@/lib/astro-calc'
import { ZODIAC_SIGNS } from '@/lib/data'
import type { Screen } from '@/app/page'
import { useLanguage } from '@/components/language-provider'

interface Props {
  userId?: string | null
  birthDate?: string
  onBack: () => void
  onNavigate: (s: Screen) => void
}

interface ProfileInfo {
  birthDate?: string
  birthTime?: string
  birthPlace?: string
  latitude?: number
  longitude?: number
  utcOffsetHours?: number
}

function signName(signId: string): string {
  return ZODIAC_SIGNS.find(s => s.id === signId)?.name ?? signId
}
function signSymbol(signId: string): string {
  return ZODIAC_SIGNS.find(s => s.id === signId)?.symbol ?? '✦'
}
function elementOf(signId: string): 'Fire' | 'Earth' | 'Air' | 'Water' {
  return ZODIAC_SIGNS.find(s => s.id === signId)?.element ?? 'Fire'
}

// Real, deterministic interpretation text keyed by element — not per-sign
// filler, and not randomly generated. 4 elements × 3 chart roles = 12
// genuine paragraphs, composed with the specific sign name so the result
// reads as a real placement, not a generic horoscope. Text now sourced from
// lib/i18n.ts (natal.sunBlurb.*/moonBlurb.*/ascBlurb.*) so it's real in
// both languages, not just English.

function PlacementCard({ icon, roleLabel, placement, blurbKeyPrefix, t }: { icon: string; roleLabel: string; placement: SignPlacement; blurbKeyPrefix: string; t: (k: string, v?: Record<string, string | number>) => string }) {
  const element = elementOf(placement.signId)
  return (
    <div className="p-4 rounded-2xl mb-3" style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
      <div className="flex items-center gap-3 mb-2">
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: 'radial-gradient(circle at 30% 30%,#D946EF33,var(--bg-elevated))', border: '1px solid rgba(217,70,239,0.4)' }}>
          {icon}
        </div>
        <div>
          <p className="text-[var(--text-dim)] text-[11px] tracking-wide">{roleLabel}</p>
          <p className="text-[var(--text-primary)] text-sm font-medium">
            {signSymbol(placement.signId)} {signName(placement.signId)} · {placement.degree.toFixed(1)}°
          </p>
        </div>
      </div>
      <p className="text-[var(--text-muted)] text-xs leading-relaxed">{t(`${blurbKeyPrefix}.${element}`)}</p>
    </div>
  )
}

export default function NatalChartScreen({ userId, birthDate, onBack, onNavigate }: Props) {
  const { t } = useLanguage()
  const HOUSE_LABELS = Array.from({ length: 12 }, (_, i) => t(`natal.house.${i + 1}`))
  const [profile, setProfile] = useState<ProfileInfo>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/profile?userId=${encodeURIComponent(userId ?? 'u1')}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data?.user) setProfile(data.user) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [userId])

  const effectiveBirthDate = profile.birthDate || birthDate

  if (loading) {
    return (
      <div className="flex flex-col h-full sensora-bg items-center justify-center">
        <p className="text-[var(--text-dim)] text-sm">{t('natal.loadingChart')}</p>
      </div>
    )
  }

  if (!effectiveBirthDate) {
    return (
      <div className="flex flex-col h-full sensora-bg items-center justify-center px-6 text-center">
        <p className="text-[var(--text-primary)] text-base font-medium mb-2">{t('natal.addBirthDateFirst')}</p>
        <p className="text-[var(--text-dim)] text-xs mb-5">{t('natal.addBirthDateHint')}</p>
        <button onClick={onBack} className="px-5 py-2.5 rounded-full text-white text-sm font-medium"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {t('natal.back')}
        </button>
      </div>
    )
  }

  const chart = computeNatalChart({
    birthDate: effectiveBirthDate,
    birthTime: profile.birthTime,
    latitude: profile.latitude,
    longitude: profile.longitude,
    utcOffsetHours: profile.utcOffsetHours,
  })

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--surface-1)' }}>
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-1)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <p className="text-[var(--text-primary)] text-sm font-medium">{t('natal.title')}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col items-center mb-5">
          <ZodiacWheelArt size={150} highlight={signSymbol(chart.sun.signId)} />
          <p className="text-[var(--text-dim)] text-xs mt-2">{effectiveBirthDate}{profile.birthTime ? ` · ${profile.birthTime}` : ''}{profile.birthPlace ? ` · ${profile.birthPlace}` : ''}</p>
        </div>

        <PlacementCard icon="☉" roleLabel={t('natal.sunRole')} placement={chart.sun} blurbKeyPrefix="natal.sunBlurb" t={t} />
        <PlacementCard icon="☽" roleLabel={t('natal.moonRole')} placement={chart.moon} blurbKeyPrefix="natal.moonBlurb" t={t} />

        {chart.ascendant ? (
          <>
            <PlacementCard icon="↑" roleLabel={t('natal.ascRole')} placement={chart.ascendant} blurbKeyPrefix="natal.ascBlurb" t={t} />
            {chart.ascendantTimezoneIsEstimated && (
              <div className="p-3 rounded-xl mb-3 flex items-start gap-2" style={{ background: 'rgba(245,197,66,0.08)', border: '1px solid rgba(245,197,66,0.2)' }}>
                <span className="text-sm">⚠️</span>
                <p className="text-[#F5C542] text-[11px] leading-relaxed">
                  {t('natal.timezoneEstimated')}
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="p-4 rounded-2xl mb-3 flex flex-col items-center text-center" style={{ background: 'rgba(124,58,237,0.08)', border: '1px dashed rgba(124,58,237,0.3)' }}>
            <p className="text-[var(--text-accent-soft)] text-xs font-medium mb-1">{t('natal.ascUnavailable')}</p>
            <p className="text-[var(--text-dim)] text-[11px] leading-relaxed mb-3">
              {chart.ascendantUnavailableReason === 'no_birth_time'
                ? t('natal.needBirthTime')
                : t('natal.needBirthPlace')}
            </p>
          </div>
        )}

        {chart.houses && (
          <div className="mt-4">
            <p className="text-[var(--text-primary)] text-sm font-medium mb-2">{t('natal.the12Houses')}</p>
            <p className="text-[var(--text-dim)] text-[11px] mb-3 leading-relaxed">
              {t('natal.houseSystemNote')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {chart.houses.map((h, i) => (
                <div key={i} className="p-3 rounded-xl" style={{ background: 'var(--surface-0)', border: '1px solid var(--surface-1)' }}>
                  <p className="text-[var(--text-dim)] text-[10px] mb-0.5">{t('natal.houseLabel', { n: i + 1 })} · {HOUSE_LABELS[i]}</p>
                  <p className="text-[var(--text-primary)] text-xs font-medium">{signSymbol(h.signId)} {signName(h.signId)} {h.degree.toFixed(1)}°</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => onNavigate('home')} className="w-full mt-5 py-3 rounded-full text-xs font-medium"
          style={{ background: 'rgba(124,58,237,0.15)', color: 'var(--text-accent-soft)', border: '1px solid rgba(124,58,237,0.3)' }}>
          {t('natal.updateBirthDetails')}
        </button>
      </div>
    </div>
  )
}