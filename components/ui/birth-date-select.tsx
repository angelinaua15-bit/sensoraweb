'use client'

// FILE PATH: components/ui/birth-date-select.tsx
// Reusable Day / Month / Year birth-date picker — replaces the native
// `<input type="date">` calendar specifically for date-of-birth fields.
// The browser's built-in calendar popup only steps one month at a time
// (there's no direct way to jump to a year), which makes picking a birth
// year — often 20-80 years back — tediously slow.
//
// BUG FIX (real device screenshots: "зробити по іншому і краще щоб виглядав
// вибір місяця і числа" — the day/month picker needs to look different and
// better): this used to render as three native <select> elements. On the
// web that's an OK compromise, but on a real Android/Capacitor WebView,
// tapping a <select> hands control to the OS's own plain system list —
// grey, default system font, zero relation to the app's violet theme —
// exactly what the screenshots showed. `<select>`'s *popup* can never be
// restyled from CSS; only the closed-state trigger can. So instead of a
// native <select>, each of Day/Month/Year is now a styled button that
// opens the app's own bottom sheet (PickerSheet below, built the same way
// every other modal in this app is — see ModalPortal/fortune-wheel-modal),
// with the app's real fonts, colors, and a checkmark on the selected row.
// Tapping a row selects it and closes the sheet immediately — one tap, same
// as before, just fully our own UI now instead of a system fallback.
//
// Still emits/accepts the same 'YYYY-MM-DD' string the rest of the app
// already reads from birthDate/birthDateInput state, so every existing
// caller (numerology-tool-screen, compatibility-screen, home-screen,
// add-friend-screen, mini-test-screen) needs zero changes.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import ModalPortal from '@/components/modal-portal'

interface Props {
  value: string // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void
  minYear?: number
  maxDate?: Date
  size?: 'sm' | 'lg'
  className?: string
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

// `month` here is 1-based (1 = January). Passed as the 0-based monthIndex
// with day 0, this rolls back to the last day of the *previous* Date-API
// month — which, offset by the 1-based/0-based mismatch, is exactly the
// last day of the intended 1-based month. (e.g. month=7 for July -> Date's
// monthIndex 7 is August -> day 0 of August = July 31.)
function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate()
}

function parseValue(v: string): [number | null, number | null, number | null] {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  if (!match) return [null, null, null]
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function ChevronIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--text-dim)', flexShrink: 0 }} aria-hidden>
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

// The custom replacement for a native <select>'s popup — a bottom sheet
// styled like every other modal in this app, with the selected row
// highlighted and scrolled into view the instant it opens.
function PickerSheet({ title, options, selected, onSelect, onClose }: {
  title: string
  options: { value: number; label: string }[]
  selected: number | null
  onSelect: (v: number) => void
  onClose: () => void
}) {
  const selectedRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    selectedRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[400] flex items-end justify-center"
        style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}>
        <div className="w-full max-w-sm rounded-t-3xl px-4 pt-4 flex flex-col"
          style={{
            background: 'linear-gradient(180deg,var(--bg-mid),var(--bg-void))',
            border: '1px solid rgba(124,58,237,0.3)',
            maxHeight: '70vh',
            paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))',
          }}
          onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2 flex-shrink-0">
            <h3 className="text-[var(--text-primary)] text-sm font-medium">{title}</h3>
            <button onClick={onClose} aria-label="Close"
              className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-1)' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2.2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="overflow-y-auto flex flex-col gap-1 pr-1 pb-1">
            {options.map(opt => {
              const isSelected = opt.value === selected
              return (
                <button
                  key={opt.value}
                  ref={isSelected ? selectedRef : undefined}
                  onClick={() => { onSelect(opt.value); onClose() }}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm flex items-center justify-between active:scale-[0.98] transition-transform flex-shrink-0"
                  style={{
                    background: isSelected ? 'rgba(124,58,237,0.25)' : 'transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {opt.label}
                  {isSelected && <span style={{ color: '#D946EF' }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </ModalPortal>
  )
}

export default function BirthDateSelect({ value, onChange, minYear = 1920, maxDate, size = 'sm', className = '' }: Props) {
  const max = maxDate ?? new Date()
  const maxYear = max.getFullYear()

  // Each dropdown keeps its own local state instead of being re-derived
  // from `value` on every render. Picking just a day (with month/year still
  // unset) doesn't form a complete 'YYYY-MM-DD' date yet, so there's
  // nothing valid to report upward — but the day the user just clicked
  // still needs to *stay visible* in that field while they go pick the
  // other two. Deriving straight from `value` made every single pick look
  // like it "didn't register," because the parent's value was still '' and
  // the displayed value snapped right back to the placeholder.
  const initial = parseValue(value)
  const [year, setYear] = useState<number | null>(initial[0])
  const [month, setMonth] = useState<number | null>(initial[1])
  const [day, setDay] = useState<number | null>(initial[2])
  const [openField, setOpenField] = useState<'day' | 'month' | 'year' | null>(null)

  // Re-sync from the parent only when it changes `value` on its own (e.g.
  // loading a saved profile, or clearing the form) — not in reaction to the
  // onChange calls this component just made itself.
  const lastEmitted = useRef(value)
  useEffect(() => {
    if (value === lastEmitted.current) return
    const [y, m, d] = parseValue(value)
    setYear(y); setMonth(m); setDay(d)
    lastEmitted.current = value
  }, [value])

  const years = useMemo(() => {
    const arr: number[] = []
    for (let yr = maxYear; yr >= minYear; yr--) arr.push(yr)
    return arr
  }, [maxYear, minYear])

  const dayCount = year && month ? daysInMonth(year, month) : 31
  const days = useMemo(() => Array.from({ length: dayCount }, (_, i) => i + 1), [dayCount])

  const dayOptions = useMemo(() => days.map(d => ({ value: d, label: String(d) })), [days])
  const monthOptions = useMemo(() => MONTHS.map((name, i) => ({ value: i + 1, label: name })), [])
  const yearOptions = useMemo(() => years.map(y => ({ value: y, label: String(y) })), [years])

  const commit = (ny: number | null, nm: number | null, nd: number | null) => {
    if (!ny || !nm || !nd) {
      setYear(ny); setMonth(nm); setDay(nd)
      if (lastEmitted.current !== '') { lastEmitted.current = ''; onChange('') }
      return
    }
    const clampedDay = Math.min(nd, daysInMonth(ny, nm))
    let iso = `${ny.toString().padStart(4, '0')}-${nm.toString().padStart(2, '0')}-${clampedDay.toString().padStart(2, '0')}`
    // Guard against landing on a future date (e.g. picking this year plus a
    // month later than today) — clamp back to today instead of silently
    // accepting an invalid future birth date.
    if (new Date(iso) > max) iso = max.toISOString().slice(0, 10)
    // BUG FIX (code audit): the three fields used to be set straight from
    // the raw (ny, nm, nd) the user just picked, while the emitted iso used
    // the *clamped* day (and, on the future-date guard above, a fully
    // different date). E.g. Day=30 picked while Month/Year were still unset,
    // then Month=February: the saved date silently became Feb 28, but the
    // Day field's shown value stayed 30 — which isn't even a valid day in
    // Feb — so the UI showed a day that didn't match what was actually
    // saved. Deriving the displayed y/m/d back out of the final `iso`
    // guarantees the three fields always show exactly the date that was
    // emitted.
    const [finalY, finalM, finalD] = parseValue(iso)
    setYear(finalY); setMonth(finalM); setDay(finalD)
    lastEmitted.current = iso
    onChange(iso)
  }

  const pad = size === 'lg' ? 'px-3 py-3.5' : 'px-2 py-2.5'
  const radius = size === 'lg' ? 'rounded-2xl' : 'rounded-xl'
  const textSize = size === 'lg' ? 'text-sm' : 'text-xs'
  const fieldClass = `min-w-0 flex-1 ${pad} ${radius} ${textSize} outline-none cursor-pointer active:scale-[0.97] transition-transform flex items-center justify-center gap-1`
  const fieldStyle: CSSProperties = { background: 'var(--surface-1)', border: '1px solid rgba(124,58,237,0.3)' }

  return (
    <div className={`flex gap-1.5 ${className}`}>
      <button type="button" aria-label="Day" className={fieldClass} style={fieldStyle} onClick={() => setOpenField('day')}>
        <span style={{ color: day ? 'var(--text-primary)' : 'var(--text-dim)' }}>{day ?? 'Day'}</span>
        <ChevronIcon />
      </button>
      <button type="button" aria-label="Month" className={fieldClass} style={{ ...fieldStyle, flexGrow: 1.6 }} onClick={() => setOpenField('month')}>
        <span style={{ color: month ? 'var(--text-primary)' : 'var(--text-dim)' }}>{month ? MONTHS[month - 1] : 'Month'}</span>
        <ChevronIcon />
      </button>
      <button type="button" aria-label="Year" className={fieldClass} style={fieldStyle} onClick={() => setOpenField('year')}>
        <span style={{ color: year ? 'var(--text-primary)' : 'var(--text-dim)' }}>{year ?? 'Year'}</span>
        <ChevronIcon />
      </button>

      {openField === 'day' && (
        <PickerSheet title="Day" options={dayOptions} selected={day}
          onSelect={v => commit(year, month, v)} onClose={() => setOpenField(null)} />
      )}
      {openField === 'month' && (
        <PickerSheet title="Month" options={monthOptions} selected={month}
          onSelect={v => commit(year, v, day)} onClose={() => setOpenField(null)} />
      )}
      {openField === 'year' && (
        <PickerSheet title="Year" options={yearOptions} selected={year}
          onSelect={v => commit(v, month, day)} onClose={() => setOpenField(null)} />
      )}
    </div>
  )
}
