'use client'

// FILE PATH: components/screens/tarot-pull-screen.tsx
// The real destination behind the Fortune Wheel's "Tarot card pull" segment,
// which previously had no screen to land on at all. A genuine random draw
// (not a stand-in for fake data — a tarot pull is supposed to be random,
// the same way the Fortune Wheel spin itself is) from the real 22-card
// Major Arcana (lib/tarot-deck.ts), each with a real, standard meaning.
import { useState } from 'react'
import { MAJOR_ARCANA, type TarotCard } from '@/lib/tarot-deck'
// TarotCardArt (hand-drawn vector, same library used on readings-screen,
// natal-chart-screen, onboarding-screen) is now only the face-down CARD
// BACK — a nice mystical frame while drawing. Once flipped, the card shows
// its real face: the actual 1909 Rider-Waite-Smith Major Arcana artwork
// (see lib/tarot-deck.ts for why this specific deck, and how each image URL
// was verified). NebulaOrbArt still sits behind either state as ambient glow.
import { TarotCardArt, NebulaOrbArt } from '@/components/magic-art'
import { useLanguage } from '@/components/language-provider'

interface Props {
  onBack: () => void
}

export default function TarotPullScreen({ onBack }: Props) {
  const { t } = useLanguage()
  const [card, setCard] = useState<TarotCard | null>(null)
  const [flipped, setFlipped] = useState(false)
  const [drawing, setDrawing] = useState(false)
  // If the real Rider-Waite-Smith artwork can't load (offline, Commons
  // unreachable) — fall back to the vector symbol instead of a broken-image
  // icon, per card.
  const [imgFailed, setImgFailed] = useState(false)

  const draw = () => {
    if (drawing) return
    setDrawing(true)
    setFlipped(false)
    setImgFailed(false)
    const picked = MAJOR_ARCANA[Math.floor(Math.random() * MAJOR_ARCANA.length)]
    setTimeout(() => {
      setCard(picked)
      setFlipped(true)
      setDrawing(false)
    }, 500)
  }

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--surface-1)' }}>
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-1)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <p className="text-[var(--text-primary)] text-sm font-medium">{t('tarotPull.title')}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center">
        <p className="text-[var(--text-dim)] text-xs leading-relaxed mb-6 text-center max-w-xs">
          {t('tarotPull.intro')}
        </p>

        {/* Real card face uses the actual 1909 Rider-Waite-Smith artwork
            (public domain — see lib/tarot-deck.ts) instead of the vector
            symbol, framed to look like a genuine, expensive physical tarot
            card: a thin gold edge, deep drop shadow, and a real 3D flip from
            the card back to the face. Card back (drawing/idle state) keeps
            the original hand-drawn TarotCardArt — it never needs to be a
            real photo since no real deck shows its own back. */}
        <div className="relative flex items-center justify-center mb-6" style={{ width: 196, height: 320, perspective: 1200, WebkitPerspective: 1200 }}>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.8 }}>
            <NebulaOrbArt size={260} />
          </div>

          {/* BUG FIX (real device screenshot: "тут немає реальних карт а
              якась фігня" — after flipping, the card stayed on its back
              instead of showing the real face). Root cause: `filter:
              drop-shadow(...)` was applied to the SAME element as
              `transform-style: preserve-3d`. That's a real, documented
              WebKit/Blink rendering bug — putting a `filter` on a
              preserve-3d element forces it into its own compositing layer,
              which silently flattens the 3D context underneath it. The flip
              state itself was always correct (the name/meaning text below
              updated fine, proving `flipped`/`card` were right) — the
              browser just kept painting the back face on top regardless of
              rotation instead of hiding it via backface-visibility like
              it's supposed to. Fix: the drop-shadow now lives on its own
              plain wrapper OUTSIDE the preserve-3d element, not on it.
              Also added the -webkit- prefixed versions of
              perspective/transform-style/backface-visibility, since
              Android's WebView (this app's real runtime, not just a
              desktop browser) has historically needed the prefixed form
              for backface-visibility to actually hide the wrong face. */}
          <div className="relative w-full h-full" style={{ filter: 'drop-shadow(0 16px 40px rgba(124,58,237,0.45))' }}>
            <div
              className="relative w-full h-full"
              style={{
                transformStyle: 'preserve-3d',
                WebkitTransformStyle: 'preserve-3d',
                transition: 'transform 0.6s cubic-bezier(0.2,0.8,0.2,1)',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }}
            >
              {/* Card back */}
              <div className="absolute inset-0 flex items-center justify-center"
                style={{ backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
                <TarotCardArt size={168} symbol="✦" />
              </div>

              {/* Card face — real artwork, gold-edged frame */}
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden flex items-center justify-center"
                style={{
                  backfaceVisibility: 'hidden',
                  WebkitBackfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                  background: 'linear-gradient(135deg,#D4AF37,#F5DFA0 45%,#B8860B)',
                  padding: 4,
                }}
              >
                <div className="w-full h-full rounded-xl overflow-hidden" style={{ background: '#1A0B2E' }}>
                  {card && !imgFailed ? (
                    <img
                      src={card.imageUrl}
                      alt={card.name}
                      onError={() => setImgFailed(true)}
                      className="w-full h-full"
                      style={{ objectFit: 'cover' }}
                    />
                  ) : card ? (
                    <div className="w-full h-full flex items-center justify-center text-6xl">{card.symbol}</div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>

        {flipped && card && (
          <p className="text-[var(--text-primary)] text-base font-serif text-center mb-1">{card.name}</p>
        )}
        {/* Attribution — good practice for a public-domain historical work,
            even though the license doesn't legally require it. */}
        {flipped && card && !imgFailed && (
          <p className="text-[var(--text-dim)] text-[10px] text-center mb-4">{t('tarotPull.attribution')}</p>
        )}

        {card && flipped && (
          <div className="w-full rounded-2xl p-4 mb-5" style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
            <p className="text-[var(--text-muted)] text-xs leading-relaxed text-center">{card.meaning}</p>
          </div>
        )}

        <button onClick={draw} disabled={drawing}
          className="w-full py-3.5 rounded-2xl text-white text-sm font-semibold disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
          {drawing ? t('tarotPull.drawing') : card ? t('tarotPull.drawAgain') : t('tarotPull.drawACard')}
        </button>
      </div>
    </div>
  )
}