'use client'

// Ambient floating sparkles layered on top of every screen. Pure CSS
// (see .sensora-spark / sensora-float-up in app/globals.css) — no animation
// loop in JS, so it costs nothing and never drifts out of sync. Purely
// decorative: fixed, pointer-events-none, and low-opacity so it never
// competes with real UI or blocks taps on the bottom nav underneath it.
const SPARKS = [
  { left: '8%', size: 3, delay: '0s', duration: '7s' },
  { left: '22%', size: 2, delay: '1.2s', duration: '6s' },
  { left: '38%', size: 4, delay: '2.4s', duration: '8s' },
  { left: '54%', size: 2, delay: '0.6s', duration: '6.5s' },
  { left: '68%', size: 3, delay: '3s', duration: '7.5s' },
  { left: '81%', size: 2, delay: '1.8s', duration: '6s' },
  { left: '92%', size: 3, delay: '4s', duration: '8s' },
  { left: '46%', size: 2, delay: '5s', duration: '7s' },
]

export default function SparkleField() {
  return (
    <div className="fixed inset-0 z-40 pointer-events-none overflow-hidden" aria-hidden>
      {SPARKS.map((s, i) => (
        <span
          key={i}
          className="sensora-spark"
          style={{
            left: s.left,
            bottom: '18%',
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: s.duration,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  )
}
