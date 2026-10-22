'use client'

// FILE PATH: components/magic-art.tsx
// A small hand-built library of inline SVG illustrations in Sensora's own
// palette (violet/magenta/gold on deep cosmic purple). These stand in for
// the "pictures" the design should have — generated as vector art rather
// than hot-linked photos, so there's no external network dependency, no
// licensing question, and they always render crisply at any size while
// matching the brand exactly.

import { useId } from 'react'
// For TarotCategoryIcon below — the same real, verified public-domain
// Rider-Waite-Smith card artwork already wired up for the Tarot pull screen
// (see lib/tarot-deck.ts), just shrunk into a small badge.
import { MAJOR_ARCANA } from '@/lib/tarot-deck'

// BUG FIX (minor, code audit): this used to be a plain module-level counter
// (`let uid = 0`), which isn't guaranteed to line up between a server render
// and the client hydration pass (or React StrictMode's intentional double
// invocation) the way it does here — components/brand/sensora-logo.tsx
// already solves the identical "unique <defs> id per instance" problem with
// React's useId(), which is specifically designed to stay stable across
// that boundary. Matching that pattern here too.
function useGradId(prefix: string) {
  const id = useId()
  return `${prefix}${id}`
}

export function CrystalBallArt({ size = 96 }: { size?: number }) {
  const g1 = useGradId('cb')
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
      <defs>
        <radialGradient id={g1} cx="38%" cy="32%" r="65%">
          <stop offset="0%" stopColor="var(--text-primary)" stopOpacity="0.9" />
          <stop offset="35%" stopColor="var(--text-accent-soft)" stopOpacity="0.55" />
          <stop offset="70%" stopColor="#7C3AED" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--bg-elevated)" stopOpacity="0.15" />
        </radialGradient>
      </defs>
      <ellipse cx="48" cy="80" rx="22" ry="5" fill="var(--bg-mid)" />
      <path d="M30 76 L36 62 H60 L66 76 Z" fill="var(--bg-elevated)" stroke="#7C3AED" strokeWidth="1.5" />
      <circle cx="48" cy="42" r="30" fill={`url(#${g1})`} stroke="#D946EF" strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx="38" cy="30" r="6" fill="var(--text-primary)" opacity="0.6" />
      <path d="M48 12 l2 6 6 2-6 2-2 6-2-6-6-2 6-2z" fill="#F5C542" />
      <path d="M74 20 l1.4 4 4 1.4-4 1.4-1.4 4-1.4-4-4-1.4 4-1.4z" fill="var(--text-primary)" opacity="0.8" />
    </svg>
  )
}

export function ZodiacWheelArt({ size = 220, highlight }: { size?: number; highlight?: string }) {
  const g1 = useGradId('zw')
  const glyphs = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓']
  const r = 96
  const cx = 110
  const cy = 110
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" fill="none">
      <defs>
        <radialGradient id={g1} cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#5B2A9E" />
          <stop offset="100%" stopColor="#1A0E45" />
        </radialGradient>
      </defs>
      {/* Fixed colors on purpose: the wheel always sits on a dark card, but
          it used theme variables (--bg-void, --text-muted) that flip in the
          Light theme and made it a dark, low-contrast blob. */}
      <circle cx={cx} cy={cy} r={r + 12} fill={`url(#${g1})`} stroke="rgba(245,197,66,0.45)" />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(217,170,255,0.55)" strokeWidth="1" strokeDasharray="2 4" />
      <circle cx={cx} cy={cy} r={r - 26} fill="none" stroke="rgba(217,170,255,0.4)" strokeWidth="1" />
      {glyphs.map((g, i) => {
        const angle = (i / 12) * Math.PI * 2 - Math.PI / 2
        const x = cx + Math.cos(angle) * (r - 13)
        const y = cy + Math.sin(angle) * (r - 13)
        return (
          <text key={g} x={x} y={y + 4} textAnchor="middle"
            fontSize="13" fill={highlight === g ? '#F5C542' : '#FFFFFF'} opacity={highlight === g ? 1 : 0.85}>
            {g}
          </text>
        )
      })}
      <circle cx={cx} cy={cy} r="5" fill="#D946EF" />
    </svg>
  )
}

export function TarotCardArt({ size = 64, symbol = '✦' }: { size?: number; symbol?: string }) {
  const g1 = useGradId('tc')
  return (
    <svg width={size} height={size * 1.5} viewBox="0 0 64 96" fill="none">
      <defs>
        <linearGradient id={g1} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4C1D95" />
          <stop offset="100%" stopColor="var(--bg-mid)" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="92" rx="6" fill={`url(#${g1})`} stroke="#D946EF" strokeOpacity="0.5" strokeWidth="1.5" />
      <rect x="7" y="7" width="50" height="82" rx="4" fill="none" stroke="#F5C542" strokeOpacity="0.4" strokeWidth="1" />
      <circle cx="32" cy="48" r="15" fill="none" stroke="var(--text-accent-soft)" strokeOpacity="0.6" strokeWidth="1" />
      <text x="32" y="54" textAnchor="middle" fontSize="18" fill="#F5C542">{symbol}</text>
    </svg>
  )
}

// ─── Category icons (requested: "Астрологія - зірки, Нумерологія - цифри,
// Таро - реальні карти" — give each of these three a matching themed icon,
// used everywhere in the app that shows a category chip/tag). Each is its
// own small piece so a call site can use one directly, or go through
// CategoryIcon() below to look one up by the category's name string — the
// same strings already used throughout the app (search-screen's "Popular
// Topics", expert.tags/specialty, mini-test-screen's recommended category).
export function AstrologyIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2l1.9 5.6L19.5 9.5l-5.6 1.9L12 17l-1.9-5.6L4.5 9.5l5.6-1.9L12 2z" fill="#F5C542" />
      <path d="M19 13.5l0.9 2.6 2.6 0.9-2.6 0.9-0.9 2.6-0.9-2.6-2.6-0.9 2.6-0.9 0.9-2.6z" fill="#D946EF" opacity="0.9" />
      <circle cx="5" cy="17.5" r="1.3" fill="#9D5FF5" opacity="0.9" />
    </svg>
  )
}

export function NumerologyIcon({ size = 20 }: { size?: number }) {
  const g1 = useGradId('nm')
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id={g1} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#D946EF" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10.5" fill={`url(#${g1})`} opacity="0.22" />
      <circle cx="12" cy="12" r="10.5" fill="none" stroke="#F5C542" strokeOpacity="0.55" strokeWidth="1" />
      <text x="12" y="16.5" textAnchor="middle" fontSize="12.5" fontWeight="700" fill="#F5C542" fontFamily="serif">7</text>
    </svg>
  )
}

// Real card face (not a drawn glyph) shrunk into a small gold-edged badge —
// "The Star" is the fixed representative card for this icon everywhere it's
// used (a consistent badge, not a random daily card).
export function TarotCategoryIcon({ size = 20 }: { size?: number }) {
  const card = MAJOR_ARCANA.find(c => c.id === 'star') ?? MAJOR_ARCANA[0]
  return (
    <span
      className="inline-flex items-center justify-center rounded-[4px] overflow-hidden flex-shrink-0"
      style={{ width: size, height: size * 1.5, background: 'linear-gradient(135deg,#D4AF37,#F5DFA0 45%,#B8860B)', padding: Math.max(1, size * 0.07) }}
    >
      <span className="w-full h-full rounded-[2px] overflow-hidden block" style={{ background: '#1A0B2E' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={card.imageUrl} alt="" className="w-full h-full" style={{ objectFit: 'cover' }} />
      </span>
    </span>
  )
}

// Looks up the right themed icon by category name (case-insensitive,
// matches the plain English category strings already used across the app).
// Returns null for anything outside the three requested categories, so call
// sites can drop this in unconditionally without leaving a gap for
// categories that don't have a themed icon (yet).
export function CategoryIcon({ category, size = 20 }: { category: string; size?: number }) {
  const key = category.trim().toLowerCase()
  if (key === 'astrology') return <AstrologyIcon size={size} />
  if (key === 'numerology') return <NumerologyIcon size={size} />
  if (key === 'tarot') return <TarotCategoryIcon size={size} />
  return null
}

export function MoonPhasesArt({ size = 220 }: { size?: number }) {
  const phases = [0, 0.25, 0.5, 0.75, 1]
  return (
    <svg width={size} height={size / 4} viewBox="0 0 220 55" fill="none">
      {phases.map((p, i) => {
        const cx = 20 + i * 46
        return (
          <g key={i}>
            <circle cx={cx} cy="27" r="16" fill="var(--bg-elevated)" stroke="rgba(217,70,239,0.3)" />
            <path
              d={
                p === 0 ? `M ${cx} 11 A 16 16 0 0 1 ${cx} 43 A 16 16 0 0 1 ${cx} 11`
                : p === 1 ? `M ${cx} 11 A 16 16 0 0 0 ${cx} 43 A 16 16 0 0 0 ${cx} 11`
                : `M ${cx} 11 A 16 16 0 0 1 ${cx} 43 A ${p === 0.5 ? 0 : 8} 16 0 0 ${p < 0.5 ? 0 : 1} ${cx} 11`
              }
              fill="var(--text-primary)" opacity="0.9"
            />
          </g>
        )
      })}
    </svg>
  )
}

export function NebulaOrbArt({ size = 140 }: { size?: number }) {
  const g1 = useGradId('nb')
  const g2 = useGradId('nb2')
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none">
      <defs>
        <radialGradient id={g1} cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#D946EF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#D946EF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={g2} cx="65%" cy="65%" r="60%">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="70" cy="70" r="68" fill={`url(#${g1})`} />
      <circle cx="70" cy="70" r="68" fill={`url(#${g2})`} />
      <circle cx="45" cy="40" r="1.6" fill="var(--text-primary)" />
      <circle cx="95" cy="55" r="1.2" fill="#F5C542" />
      <circle cx="80" cy="95" r="1.6" fill="var(--text-primary)" />
      <circle cx="55" cy="100" r="1" fill="var(--text-accent-soft)" />
    </svg>
  )
}

// REAL FEATURE ADDED ("реальна куля містична і максимально реалістична"):
// NebulaOrbArt above is deliberately flat/minimal (a soft glow + a few
// dots) — fine as ambient decoration elsewhere, but too plain for the
// packages modal's lead visual. This is a proper glass-sphere illustration:
// a real radial highlight where light would hit real glass (top-left),
// darker glass falloff toward the rim, a soft blurred "mist" swirling
// inside (feGaussianBlur, not just a flat fill), a thin rim-light arc where
// the edge catches light, a warm ambient glow behind the whole sphere, a
// soft grounded shadow under it, and a few small spark accents drifting
// around it (same 4-point spark shape already used in the real logo mark).
export function MysticOrbArt({ size = 140 }: { size?: number }) {
  const glow = useGradId('mo-glow')
  const glass = useGradId('mo-glass')
  const mistA = useGradId('mo-mistA')
  const mistB = useGradId('mo-mistB')
  const blur = useGradId('mo-blur')
  const rim = useGradId('mo-rim')
  return (
    <svg width={size} height={size} viewBox="0 0 140 140" fill="none">
      <defs>
        <radialGradient id={glow} cx="50%" cy="46%" r="62%">
          <stop offset="0%" stopColor="#D946EF" stopOpacity="0.38" />
          <stop offset="55%" stopColor="#7C3AED" stopOpacity="0.16" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={glass} cx="36%" cy="30%" r="72%">
          <stop offset="0%" stopColor="#F5F3FF" stopOpacity="0.95" />
          <stop offset="18%" stopColor="#D9C6FF" stopOpacity="0.55" />
          <stop offset="42%" stopColor="#9D5FF5" stopOpacity="0.38" />
          <stop offset="72%" stopColor="#4C1D95" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#1D0F3A" stopOpacity="0.85" />
        </radialGradient>
        <radialGradient id={mistA} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#E879F9" stopOpacity="0.5" />
          <stop offset="100%" stopColor="#E879F9" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={mistB} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7C3AED" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={rim} x1="20%" y1="10%" x2="80%" y2="90%">
          <stop offset="0%" stopColor="#F5F3FF" stopOpacity="0.9" />
          <stop offset="40%" stopColor="#D946EF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0" />
        </linearGradient>
        <filter id={blur} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4.2" />
        </filter>
      </defs>

      {/* Ambient glow behind the sphere */}
      <circle cx="70" cy="66" r="66" fill={`url(#${glow})`} />

      {/* Grounded soft shadow */}
      <ellipse cx="70" cy="122" rx="30" ry="6" fill="#000000" opacity="0.35" filter={`url(#${blur})`} />

      {/* The glass sphere itself */}
      <circle cx="70" cy="66" r="46" fill={`url(#${glass})`} />

      {/* Swirling inner mist, softly blurred like real smoke inside glass */}
      <g filter={`url(#${blur})`} opacity="0.8">
        <ellipse cx="58" cy="78" rx="20" ry="10" fill={`url(#${mistA})`} transform="rotate(-18 58 78)" />
        <ellipse cx="84" cy="58" rx="16" ry="8" fill={`url(#${mistB})`} transform="rotate(24 84 58)" />
        <ellipse cx="66" cy="52" rx="12" ry="6" fill={`url(#${mistA})`} transform="rotate(-6 66 52)" />
      </g>

      {/* Rim light where the edge catches light */}
      <circle cx="70" cy="66" r="45.2" fill="none" stroke={`url(#${rim})`} strokeWidth="1.6" />

      {/* Bright glass specular highlight, top-left */}
      <ellipse cx="54" cy="46" rx="10" ry="6.5" fill="#FFFFFF" opacity="0.75" transform="rotate(-28 54 46)" />
      <ellipse cx="49" cy="40" rx="3.2" ry="2" fill="#FFFFFF" opacity="0.9" transform="rotate(-28 49 40)" />

      {/* Small drifting spark accents around the orb — same 4-point spark
          shape as the real Sensora logo mark, per the brand guide. */}
      <path d="M116 40 l2.4 6.2 6.2 2.4-6.2 2.4-2.4 6.2-2.4-6.2-6.2-2.4 6.2-2.4z" fill="#F5C542" opacity="0.85" />
      <path d="M22 96 l1.6 4.1 4.1 1.6-4.1 1.6-1.6 4.1-1.6-4.1-4.1-1.6 4.1-1.6z" fill="#F5F3FF" opacity="0.7" />
      <circle cx="106" cy="98" r="1.6" fill="#D946EF" opacity="0.8" />
    </svg>
  )
}

export function WitchHatArt({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <path d="M28 6 L46 42 H10 Z" fill="#3B1068" stroke="#D946EF" strokeOpacity="0.4" />
      <ellipse cx="28" cy="42" rx="20" ry="5" fill="var(--bg-mid)" stroke="#D946EF" strokeOpacity="0.4" />
      <rect x="16" y="30" width="24" height="5" rx="1" fill="#F5C542" opacity="0.85" />
      <circle cx="28" cy="14" r="2" fill="#F5C542" />
    </svg>
  )
}

export function LotusArt({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <ellipse cx="28" cy="44" rx="18" ry="4" fill="var(--bg-mid)" />
      <path d="M28 44 C 20 34 20 20 28 10 C 36 20 36 34 28 44 Z" fill="#E879F9" opacity="0.85" />
      <path d="M28 44 C 14 38 8 26 12 16 C 22 20 28 30 28 44 Z" fill="#D946EF" opacity="0.7" />
      <path d="M28 44 C 42 38 48 26 44 16 C 34 20 28 30 28 44 Z" fill="#D946EF" opacity="0.7" />
      <circle cx="28" cy="40" r="3" fill="#F5C542" />
    </svg>
  )
}

export function CrescentMoonArt({ size = 56 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <circle cx="28" cy="28" r="18" fill="var(--bg-elevated)" stroke="rgba(217,70,239,0.35)" />
      <path d="M34 12 A 18 18 0 1 0 34 44 A 14 14 0 1 1 34 12 Z" fill="var(--text-primary)" opacity="0.92" />
      <circle cx="20" cy="20" r="1.4" fill="#F5C542" />
      <circle cx="14" cy="34" r="1" fill="var(--text-primary)" />
    </svg>
  )
}

export function FlameArt({ size = 56 }: { size?: number }) {
  const g1 = useGradId('fl')
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none">
      <defs>
        <linearGradient id={g1} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#D946EF" />
          <stop offset="100%" stopColor="#F5C542" />
        </linearGradient>
      </defs>
      <path d="M28 6 C 40 20 40 30 32 38 C 36 30 30 26 28 22 C 26 30 18 32 20 42 C 10 36 12 22 20 14 C 18 22 22 20 24 14 C 26 10 27 8 28 6 Z"
        fill={`url(#${g1})`} />
    </svg>
  )
}