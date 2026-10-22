'use client'

// FILE PATH: components/biorhythm-chart.tsx
import type { BiorhythmPoint } from '@/lib/astro-calc'

interface Props {
  points: BiorhythmPoint[]
  width?: number
  height?: number
  // Localized word for "Today" on the highlighted tick — previously
  // hardcoded as the literal English string 'Today' below regardless of
  // which language the rest of the app was showing, so a Ukrainian-locale
  // user would see every other date label in Ukrainian and one stray
  // "Today" in English right in the middle of the axis. Defaults to
  // 'Today' only so this stays a non-breaking change for any other caller.
  todayLabel?: string
}

// Hand-rolled SVG line chart — deliberately not pulling in a charting library
// (recharts, chart.js, etc.) for three lines and a vertical marker. One more
// dependency for this little a chart isn't worth it, and it keeps this file
// framework-agnostic if it's ever reused outside this screen.
//
// Default height shrunk from 200 to 130 — this was one of the largest
// single blocks on the Today screen relative to how often someone actually
// looks at it, and it's now tucked into the "More for you" tab row in
// home-screen.tsx instead of always sitting full-size in the main scroll.
export default function BiorhythmChart({ points, width = 320, height = 130, todayLabel = 'Today' }: Props) {
  if (points.length === 0) return null

  const padding = { top: 10, right: 8, bottom: 24, left: 34 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const xFor = (i: number) => padding.left + (i / (points.length - 1)) * innerW
  const yFor = (v: number) => padding.top + innerH / 2 - (v / 100) * (innerH / 2)

  const lineFor = (key: 'physical' | 'emotional' | 'intellectual') =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p[key]).toFixed(1)}`).join(' ')

  const todayIndex = points.findIndex(p => p.isToday)
  const gridLevels = [-100, -50, 0, 50, 100]

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {gridLevels.map(lvl => (
        <g key={lvl}>
          <line x1={padding.left} x2={width - padding.right} y1={yFor(lvl)} y2={yFor(lvl)}
            stroke={lvl === 0 ? 'var(--surface-4)' : 'var(--surface-1)'} strokeWidth={1} />
          <text x={padding.left - 6} y={yFor(lvl) + 3} fontSize="9" fill="var(--text-dim)" textAnchor="end">
            {lvl > 0 ? `${lvl}%` : lvl === 0 ? '0' : `${lvl}%`}
          </text>
        </g>
      ))}

      {todayIndex >= 0 && (
        <line x1={xFor(todayIndex)} x2={xFor(todayIndex)} y1={padding.top} y2={height - padding.bottom}
          stroke="rgba(245,197,66,0.6)" strokeWidth={1} strokeDasharray="3 3" />
      )}

      <path d={lineFor('physical')} fill="none" stroke="#7C9CF5" strokeWidth={2} />
      <path d={lineFor('emotional')} fill="none" stroke="#FB7185" strokeWidth={2} />
      <path d={lineFor('intellectual')} fill="none" stroke="#F5C542" strokeWidth={2} />

      {points.map((p, i) => (
        <text key={p.dateIso} x={xFor(i)} y={height - 6} fontSize="9"
          fill={p.isToday ? '#F5C542' : 'var(--text-dim)'} fontWeight={p.isToday ? 700 : 400} textAnchor="middle">
          {p.isToday ? todayLabel : p.label}
        </text>
      ))}
    </svg>
  )
}