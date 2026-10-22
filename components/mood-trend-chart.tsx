'use client'

// FILE PATH: components/mood-trend-chart.tsx
export interface MoodTrendPoint {
  entryDate: string
  rating: number | null
}

interface Props {
  points: MoodTrendPoint[]
  width?: number
  height?: number
}

// Real history, not a randomized "vibe" graph — each point is an actual
// rating the person gave their horoscope on that real calendar day (see
// lib/server/db.ts saveMoodEntry / /api/mood), persisted in Supabase so it
// survives a reload. Days with no rating are skipped (gapped line) rather
// than interpolated or defaulted to a fake value.
export default function MoodTrendChart({ points, width = 320, height = 120 }: Props) {
  const rated = points.filter(p => p.rating !== null) as { entryDate: string; rating: number }[]
  if (rated.length < 2) return null

  const padding = { top: 12, right: 8, bottom: 20, left: 20 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const xFor = (i: number) => padding.left + (i / (rated.length - 1)) * innerW
  const yFor = (v: number) => padding.top + innerH - ((v - 1) / 4) * innerH // rating scale 1..5

  const linePath = rated.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(p.rating).toFixed(1)}`).join(' ')

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      {[1, 3, 5].map(lvl => (
        <line key={lvl} x1={padding.left} x2={width - padding.right} y1={yFor(lvl)} y2={yFor(lvl)}
          stroke="var(--surface-1)" strokeWidth={1} />
      ))}
      <path d={linePath} fill="none" stroke="#D946EF" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {rated.map((p, i) => (
        <circle key={p.entryDate} cx={xFor(i)} cy={yFor(p.rating)} r={3} fill="#F5C542" />
      ))}
    </svg>
  )
}