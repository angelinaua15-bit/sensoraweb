'use client'

// FILE PATH: components/ui/loader-ring.tsx
// Shared brand loading indicator — the same violet-to-magenta "comet" conic
// ring used on the splash screen (see .sensora-loader-ring in globals.css),
// pulled out into a small reusable piece so every other "Loading..." spot in
// the app (CRM tables, consultation history, anywhere else data is fetched)
// shows the same on-brand ring instead of a bare text placeholder.

interface Props {
  size?: number
  label?: string
  className?: string
}

export default function LoaderRing({ size = 40, label, className = '' }: Props) {
  const ringPadding = Math.max(2, Math.round(size / 18))
  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <div className="relative" style={{ width: size, height: size }}>
        <div
          className="absolute inset-0 rounded-full sensora-loader-ring"
          style={{ padding: ringPadding }}
        >
          <div className="w-full h-full rounded-full" style={{ background: 'var(--bg-void)' }} />
        </div>
      </div>
      {label && <p className="text-[var(--text-dim)] text-sm">{label}</p>}
    </div>
  )
}