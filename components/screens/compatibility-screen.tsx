'use client'

// FILE PATH: components/screens/compatibility-screen.tsx
// Real two-chart compatibility — computes both people's actual natal charts
// (Sun/Moon/Ascendant) and scores the real pairings between them, instead
// of the Today screen's quick "pick a zodiac sign" widget (which only ever
// compares one Sun-sign pair). See app/api/compatibility/route.ts and
// lib/astro-calc.ts getChartCompatibility for the real scoring logic.
import { useState, useEffect } from 'react'
import type { CompatibilityReport } from '@/lib/server/db'
import BirthDateSelect from '@/components/ui/birth-date-select'
// Real vector art (same library used elsewhere) — this screen previously
// had zero illustration, just a form and a plain percentage number.
import { LotusArt, NebulaOrbArt } from '@/components/magic-art'
import { useLanguage } from '@/components/language-provider'

interface Props {
  userId?: string | null
  onBack: () => void
}

const UTC_OFFSETS = [
  -12, -11, -10, -9.5, -9, -8, -7, -6, -5, -4.5, -4, -3.5, -3, -2, -1, 0,
  1, 2, 3, 3.5, 4, 4.5, 5, 5.5, 5.75, 6, 6.5, 7, 8, 8.75, 9, 9.5, 10, 10.5, 11, 12, 12.75, 13, 14,
]

interface CompatResult {
  score: number
  sun: { score: number; note: string }
  moon: { score: number; note: string }
  ascendant: { score: number; note: string } | null
  ascendantIncluded: boolean
}

export default function CompatibilityScreen({ userId, onBack }: Props) {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [place, setPlace] = useState('')
  const [utcOffset, setUtcOffset] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<CompatResult | null>(null)
  const [history, setHistory] = useState<CompatibilityReport[]>([])

  useEffect(() => {
    fetch(`/api/compatibility?userId=${encodeURIComponent(userId ?? 'u1')}`)
      .then(r => r.json())
      .then(d => setHistory(d.reports ?? []))
      .catch(() => {})
  }, [userId])

  const submit = async () => {
    if (!name.trim() || !date) return
    setSubmitting(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/compatibility', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId ?? 'u1',
          partnerName: name,
          partnerBirthDate: date,
          partnerBirthTime: time || undefined,
          partnerBirthPlace: place || undefined,
          partnerUtcOffsetHours: utcOffset === '' ? undefined : Number(utcOffset),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || t('compat.computeError'))
      setResult(data.compat)
      setHistory(prev => [data.report, ...prev])
    } catch (e: any) {
      setError(e.message || t('compat.somethingWrong'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--surface-1)' }}>
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-1)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <p className="text-[var(--text-primary)] text-sm font-medium">{t('compat.title')}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex justify-center mb-3">
          <LotusArt size={64} />
        </div>

        <p className="text-[var(--text-dim)] text-xs leading-relaxed mb-4">
          {t('compat.intro')}
        </p>

        <div className="flex flex-col gap-3 mb-4">
          <input value={name} onChange={e => setName(e.target.value)} placeholder={t('compat.theirName')}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }} />
          <BirthDateSelect value={date} onChange={setDate} />
          <input type="time" value={time} onChange={e => setTime(e.target.value)} placeholder={t('compat.birthTimeOptional')}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)', colorScheme: 'dark' }} />
          <input value={place} onChange={e => setPlace(e.target.value)} placeholder={t('compat.birthPlaceOptional')}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }} />
          <select value={utcOffset} onChange={e => setUtcOffset(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }}>
            <option value="" style={{ color: '#000' }}>{t('compat.timezoneOptional')}</option>
            {UTC_OFFSETS.map(o => <option key={o} value={o} style={{ color: '#000' }}>{`UTC${o >= 0 ? '+' : ''}${o}`}</option>)}
          </select>
        </div>

        {error && <p className="text-[#EF4444] text-xs mb-3">{error}</p>}

        <button onClick={submit} disabled={submitting || !name.trim() || !date}
          className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-50 mb-5"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {submitting ? t('compat.calculating') : t('compat.checkCompatibility')}
        </button>

        {result && (
          <div className="rounded-2xl p-5 mb-5 relative overflow-hidden" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.4 }}>
              <NebulaOrbArt size={180} />
            </div>
            <p className="relative text-center text-4xl font-bold mb-3"
              style={{ color: result.score >= 75 ? '#22C55E' : result.score >= 55 ? '#F5C542' : '#EF4444' }}>
              {result.score}%
            </p>
            <div className="flex flex-col gap-2.5">
              <div>
                <p className="text-[var(--text-accent-soft)] text-xs font-medium mb-0.5">☉ {t('compat.sun')} — {result.sun.score}%</p>
                <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">{result.sun.note}</p>
              </div>
              <div>
                <p className="text-[var(--text-accent-soft)] text-xs font-medium mb-0.5">☽ {t('compat.moon')} — {result.moon.score}%</p>
                <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">{result.moon.note}</p>
              </div>
              {result.ascendant ? (
                <div>
                  <p className="text-[var(--text-accent-soft)] text-xs font-medium mb-0.5">↑ {t('compat.ascendant')} — {result.ascendant.score}%</p>
                  <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">{result.ascendant.note}</p>
                </div>
              ) : (
                <p className="text-[var(--text-dim)] text-[11px] leading-relaxed">{t('compat.ascendantNotIncluded')}</p>
              )}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div>
            <p className="text-[var(--text-primary)] text-sm font-medium mb-2">{t('compat.pastChecks')}</p>
            <div className="flex flex-col gap-2">
              {history.map(h => (
                <div key={h.id} className="p-3 rounded-xl flex items-center justify-between" style={{ background: 'var(--surface-0)', border: '1px solid var(--surface-1)' }}>
                  <div>
                    <p className="text-[var(--text-primary)] text-xs font-medium">{h.partnerName}</p>
                    <p className="text-[var(--text-dim)] text-[10px]">{h.createdAt}</p>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: h.score >= 75 ? '#22C55E' : h.score >= 55 ? '#F5C542' : '#EF4444' }}>{h.score}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}