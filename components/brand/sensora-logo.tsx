'use client'

// FILE PATH: components/brand/sensora-logo.tsx
// The real Sensora brand mark — a gradient ribbon "S" with a sparkle at its
// crossing point, hand-traced from the reference artwork to match its
// tapered stroke (thin curled tips, thicker through the belly) and glossy
// highlight-to-shadow gradient. Replaces the old placeholder 🌙 emoji badge
// that stood in for a logo everywhere (CRM sidebar, staff
// login/apply/activate, splash screen).
// Animation, layered from globals.css: a soft glow breathing behind the
// ribbon (sensora-logo-glow-el), a sparkle pulse at the crossing
// (sensora-logo-sparkle-el), and — only when `drawOn` is set, which the
// splash screen uses on first paint — a one-time stroke draw-on reveal
// across every ribbon segment (sensora-logo-draw-el). Each segment uses a
// fixed pathLength so the draw-on animation never depends on the actual
// curve geometry. A separate `loop` mode (sensora-logo-draw-loop-el) plays
// a short trail of light continuously travelling along the ribbon, on
// repeat — used to make the S itself read as an active loading indicator
// (splash screen's "awakening" loader), rather than just a static mark
// sitting inside a spinning ring.
import { useId } from 'react'

interface Props {
  size?: number
  withWordmark?: boolean
  wordmarkSize?: 'sm' | 'md' | 'lg'
  drawOn?: boolean
  // Continuous traveling-light animation along the ribbon, looped forever —
  // for loading states, as opposed to `drawOn`'s one-time reveal.
  loop?: boolean
  className?: string
  // 'svg' (default) is the hand-traced vector mark below — used for every
  // small badge (CRM sidebar, staff login/apply/activate) where only the
  // icon renders next to separate HTML text, and where a raster crop of the
  // source photo would show visible edges at 30-40px.
  // 'photo' renders the exact original artwork file (mark + wordmark baked
  // into one image, /public/sensora-logo.png) pixel-for-pixel — used for the
  // splash screen, which is the one place the full lockup appears at real
  // size and a crop isn't needed. See note in the splash screen and the
  // repo README about adding that file to /public in v0.
  variant?: 'svg' | 'photo'
}

// Tapered ribbon, thin tips through a thick belly — widths chosen to step up
// and down gradually so the segment joins blend instead of showing a seam.
const RIBBON_SEGMENTS: Array<{ d: string; w: number }> = [
  { d: 'M148,48 C152,34 138,22 122,26', w: 5 },
  { d: 'M123,25.5 C112,23 100,25 90,32', w: 8 },
  { d: 'M91,31 C70,46 62,64 73,80', w: 11 },
  { d: 'M73,80 C82,97 95,100 100,108', w: 11.5 },
  { d: 'M100,108 C104,116 117,118 127,137', w: 11.5 },
  { d: 'M127,137 C136,152 130,166 113,174', w: 11 },
  { d: 'M114,173.5 C100,180 85,180.5 72,178', w: 8 },
  { d: 'M72,178 C64,176.5 58,172 55,166', w: 5 },
]

const GLOW_D = 'M148,48 C152,34 138,22 122,26 C88,20 56,48 72,80 C82,98 96,100 100,108 C104,116 118,118 128,138 C142,164 108,186 68,178'

export default function SensoraLogo({ size = 40, withWordmark = false, wordmarkSize = 'md', drawOn = false, loop = false, className = '', variant = 'svg' }: Props) {
  // Gradient/filter ids must be unique per instance — this mark renders many
  // times on one page (sidebar badge + header, etc.), and SVG <defs> ids are
  // global to the document, so reusing a literal id would make every
  // instance repaint from whichever copy mounted last.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const ribbonId = `sensora-ribbon-${uid}`
  const glowId = `sensora-glow-${uid}`
  const softGlowId = `sensora-softglow-${uid}`

  if (variant === 'photo') {
    // The real artwork file, full lockup (mark + "SENSORA" wordmark already
    // in the image) — no separate wordmark is ever rendered alongside this
    // variant since the photo already includes it.
    return (
      <span className={`inline-flex items-center justify-center relative ${className}`} style={{ width: size, height: size }}>
        {/* No decorative glow layer here on purpose — the source artwork now
            has a real transparent background (see public/sensora-logo.png),
            so it already blends directly into the app's own ambient
            .sensora-bg gradient. An added glow span here previously painted
            a soft filled disc behind the whole mark that read as a distinct
            rounded "card" rather than atmosphere — removed per feedback. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sensora-logo.png"
          alt="Sensora"
          className={drawOn ? 'sensora-logo-photo-enter' : undefined}
          style={{ width: size, height: size, objectFit: 'contain', position: 'relative', zIndex: 1 }}
        />
      </span>
    )
  }

  const mark = (
    <svg width={size} height={size * 1.1} viewBox="0 0 200 220" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={ribbonId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="30%" stopColor="#DCCCFA" />
          <stop offset="55%" stopColor="#9D6CF0" />
          <stop offset="100%" stopColor="#6D28D9" />
        </linearGradient>
        <radialGradient id={glowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F0E8FF" stopOpacity="0.85" />
          <stop offset="40%" stopColor="#B794F6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0" />
        </radialGradient>
        <filter id={softGlowId} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Breathing glow layer behind the ribbon */}
      <path
        className="sensora-logo-glow-el"
        d={GLOW_D}
        fill="none" stroke="#6D28D9" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" opacity="0.35" filter={`url(#${softGlowId})`}
      />

      {/* Crisp gradient ribbon, tapered — the draw-on reveal (splash only) applies to every segment */}
      {RIBBON_SEGMENTS.map((seg, i) => (
        <path
          key={i}
          className={drawOn ? 'sensora-logo-draw-el' : undefined}
          pathLength={drawOn ? 1 : undefined}
          style={drawOn ? { animationDelay: `${i * 0.05}s` } : undefined}
          d={seg.d}
          fill="none" stroke={`url(#${ribbonId})`} strokeWidth={seg.w} strokeLinecap="round"
        />
      ))}

      {/* Loading mode only: the ribbon above stays fully drawn (a clear,
          recognizable S at all times) and a short bright trail of light
          continuously chases along the same path on top of it, looping
          forever — the S itself doubles as the loading animation, instead
          of being a static icon sitting inside a separate spinner ring. */}
      {loop && RIBBON_SEGMENTS.map((seg, i) => (
        <path
          key={`shimmer-${i}`}
          className="sensora-logo-shimmer-el"
          pathLength={1}
          style={{ animationDelay: `${i * 0.1}s` }}
          d={seg.d}
          fill="none" stroke="#FFFFFF" strokeWidth={seg.w} strokeLinecap="round"
        />
      ))}

      {/* Sparkle at the crossing point */}
      <circle cx="100" cy="108" r="20" fill={`url(#${glowId})`} className="sensora-logo-sparkle-el" />
      <g transform="translate(100,108)" className="sensora-logo-sparkle-el">
        <path d="M0,-17 L3,-3 L17,0 L3,3 L0,17 L-3,3 L-17,0 L-3,-3 Z" fill="#FFFFFF" />
        <path d="M0,-8 L1.2,-1.2 L8,0 L1.2,1.2 L0,8 L-1.2,1.2 L-8,0 L-1.2,-1.2 Z" fill="#FFFFFF" opacity="0.95" />
      </g>
    </svg>
  )

  if (!withWordmark) return <span className={className} style={{ display: 'inline-flex' }}>{mark}</span>

  const wordmarkClass = wordmarkSize === 'lg' ? 'text-4xl tracking-[0.35em]' : wordmarkSize === 'sm' ? 'text-sm tracking-[0.2em]' : 'text-xl tracking-[0.3em]'

  return (
    <span className={`inline-flex flex-col items-center gap-2 ${className}`}>
      {mark}
      <span
        className={`font-serif font-light ${wordmarkClass}`}
        style={{ background: 'linear-gradient(135deg,var(--text-primary) 0%,#D946EF 55%,#7C3AED 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}
      >
        SENSORA
      </span>
    </span>
  )
}