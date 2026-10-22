'use client'

// FILE PATH: components/avatar-bubble.tsx
interface Props {
  initials: string
  size?: number
  online?: boolean
  /** Real uploaded profile photo URL. When present, renders the actual photo instead of the initials bubble. */
  photoUrl?: string | null
}

const COLORS = [
  ['var(--bg-elevated)','#7C3AED'],
  ['#1a0c3e','#D946EF'],
  ['#0f1a3e','#3B82F6'],
  ['#1a0c2a','#9D5FF5'],
  ['#0e1f36','#22C55E'],
  ['#2a1020','#E879F9'],
]

function colorFor(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = s.charCodeAt(i) + ((h << 5) - h)
  return COLORS[Math.abs(h) % COLORS.length]
}

export default function AvatarBubble({ initials, size = 44, online, photoUrl }: Props) {
  const [bg, border] = colorFor(initials)
  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt={initials}
          className="w-full h-full rounded-full object-cover select-none"
          style={{ border: `1.5px solid ${border}55` }}
        />
      ) : (
        <div
          className="w-full h-full rounded-full flex items-center justify-center font-semibold select-none"
          style={{
            background: `radial-gradient(circle at 30% 30%, ${border}33, ${bg})`,
            border: `1.5px solid ${border}55`,
            fontSize: size * 0.34,
            color: 'var(--text-primary)',
          }}
        >
          {initials}
        </div>
      )}
      {online !== undefined && (
        <span
          className="absolute bottom-0 right-0 rounded-full border-2 border-[var(--bg-deep)]"
          style={{
            width: size * 0.28,
            height: size * 0.28,
            background: online ? '#22C55E' : '#4B5563',
          }}
        />
      )}
    </div>
  )
}