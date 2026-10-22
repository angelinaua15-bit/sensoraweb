'use client'

// FILE PATH: components/progress-ring.tsx
interface Props {
  value: number // 0-100
  color: string
  label: string
  size?: number
}

export default function ProgressRing({ value, color, label, size = 62 }: Props) {
  const stroke = 5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke="var(--surface-2)" strokeWidth={stroke}
          />
          <circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={c} strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            style={{ transition: 'stroke-dashoffset 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[var(--text-primary)] text-xs font-semibold">{value}%</span>
        </div>
      </div>
      <span className="text-[var(--text-muted)] text-[10px]">{label}</span>
    </div>
  )
}