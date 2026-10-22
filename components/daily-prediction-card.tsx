'use client'

// FILE PATH: components/daily-prediction-card.tsx
//
// REAL FEATURE ADDED (your call: "зроби передбачення як в Сільпо, яке ти
// отримуєш заразу коли входиш в застосунок і після цього уже потрапляєш на
// основну сторінку, коли людина ПЕРШИЙ РАЗ ВІДКРИВАЄ апку за день"): a
// small popup shown on top of the home screen, once per calendar day, the
// first time the app is opened that day. It reads/writes a
// `sensora_last_prediction_<date>` flag in localStorage — same pattern
// lib/device-id.ts already uses for the free-trial anti-fraud device id, so
// this doesn't introduce a new storage convention. Tapping "Continue"
// dismisses it and reveals the home screen underneath.
//
// BUG FIX #1 (reported: card pushed the whole home screen down instead of
// floating over it): this used to render as a plain `<div>` — a direct
// child of home-screen.tsx's `.sensora-bg` wrapper, where globals.css has
// `.sensora-bg > * { position: relative }` (added earlier for an unrelated
// "frozen star dot" bug) silently overriding `position: fixed` back to
// `relative`.
// BUG FIX #2 (reported: even after fix #1, it still wasn't a real
// full-viewport overlay — it rendered clipped/misplaced, floating in the
// middle of the page over visible home-screen content instead of covering
// it): `<main>` in app/page.tsx (an ancestor several levels up) is
// `overflow-hidden` + `position: relative`, and in this app's Android
// WebView that's enough to make a `position: fixed` DESCENDANT paint
// relative to `<main>`'s own clipped box instead of the real device
// viewport — a known WebView quirk, worse than the desktop-browser version
// of the same containing-block trap fix #1 targeted. This is exactly why
// every other full-screen popup in this app (PremiumModal, QuizModal,
// ArticleModal, the birth-info editor, etc.) is built on ModalPortal
// (components/modal-portal.tsx), which renders straight into
// `document.body` via a React portal — outside the whole app tree, so no
// ancestor's CSS can ever clip or reposition it. This component now follows
// that same, already-proven pattern instead of hand-rolling its own
// `position: fixed`.
//
// STYLE FIX (your call: "воно має бути як спливаюче вікно таке як з
// покупкою хв тільки менше" — it should look like the buy-minutes popup,
// just smaller): switched from a full-screen gradient takeover to the exact
// same bottom-sheet chrome premium-modal.tsx uses — dark scrim, rounded
// sheet sliding up from the bottom (or centered on larger screens) — just
// with this card's own, shorter content instead of the purchase flow.
//
// STYLE FIX #2 (this round, your call: "переоформити вікно сільпо — зробити
// як спливаючу сторінку і тоді як нажимаєш то перекидує на основну, там має
// бути велика кнопка"): back to a full-screen takeover, not a bottom sheet —
// but still on ModalPortal (bug fixes #1/#2 above still apply regardless of
// chrome), and still dismiss-to-home on tap, just a full "page" now instead
// of a small card floating over a dimmed home screen. The CTA is a full-
// width, noticeably taller button (py-5 vs the old py-3.5) so it reads as
// the one big, obvious thing to press — closer to how Silpo's own daily-
// bonus popup reads (edge-to-edge art, no visible home screen behind it
// until you tap through) than the earlier "smaller version of the buy-
// minutes sheet" was.
import { useEffect, useState } from 'react'
import ModalPortal from '@/components/modal-portal'
import { getDailyPrediction, todayKey } from '@/lib/daily-prediction'
import { useLanguage } from '@/components/language-provider'

const STORAGE_PREFIX = 'sensora_last_prediction_'

export default function DailyPredictionGate() {
  const { t, locale } = useLanguage()
  const [visible, setVisible] = useState(false)
  const [key, setKey] = useState<string | null>(null)

  useEffect(() => {
    const today = todayKey()
    const storageKey = STORAGE_PREFIX + today
    try {
      if (!localStorage.getItem(storageKey)) {
        setKey(storageKey)
        setVisible(true)
      }
    } catch {
      // Private-browsing/blocked localStorage — fail open (no gate at all)
      // rather than block the person from ever reaching home.
    }
  }, [])

  if (!visible) return null

  const prediction = getDailyPrediction(locale === 'es' ? 'es' : 'en')

  const dismiss = () => {
    if (key) {
      try { localStorage.setItem(key, '1') } catch { /* see above */ }
    }
    setVisible(false)
  }

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[300] flex flex-col items-center justify-center px-6 text-center screen-enter"
        style={{ background: 'linear-gradient(180deg,var(--bg-void) 0%,var(--bg-deep) 55%,var(--bg-mid) 100%)' }}>
        {/* Decorative glow behind the icon, same gradient-dot language the
            splash/onboarding screens already use elsewhere in the app, so
            this full-page takeover still feels like it belongs to Sensora
            rather than a generic alert. */}
        <div className="absolute w-64 h-64 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(217,70,239,0.25), transparent 70%)', filter: 'blur(10px)' }} />

        {/* REAL PHOTO (your call: "такі нежеві іконки... додай справжні фото
            з інтернету магічних штук... щоб максимально оживити") — the flat
            gradient-circle-plus-emoji icon here was the most prominent
            "generic" visual on the one screen every single person sees every
            day (first open of the app, before even reaching home). Real
            starry-night photo from Unsplash (free license, verified to
            load), cropped into the same circle, replaces the emoji. */}
        <div className="relative w-20 h-20 rounded-full overflow-hidden mb-6"
          style={{ border: '1.5px solid rgba(217,70,239,0.5)', boxShadow: '0 0 48px rgba(217,70,239,0.3)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1628498188904-036f5e25e93e?auto=format&fit=crop&w=200&q=80" alt=""
            className="w-full h-full object-cover" />
        </div>
        <p className="relative text-[#D946EF] text-xs font-semibold tracking-widest mb-3">{t('dailyPrediction.eyebrow')}</p>
        <h2 className="relative text-[var(--text-primary)] text-2xl font-serif leading-snug mb-3 max-w-xs">{prediction.title}</h2>
        <p className="relative text-[var(--text-muted)] text-sm leading-relaxed mb-10 max-w-xs">{prediction.body}</p>

        {/* Big, obvious, full-width button — this is the one thing on the
            whole page to press, and pressing it is what takes you to the
            real home screen underneath (dismiss() below just hides this
            overlay; home-screen.tsx was already rendered behind it the
            whole time, same as the old bottom-sheet version — the "page"
            feel here is purely this component covering the full screen
            until tapped through, not a real navigation). */}
        <button onClick={dismiss}
          className="relative w-full max-w-xs py-5 rounded-2xl text-white font-bold text-base active:scale-95 transition-transform"
          style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)', boxShadow: '0 10px 32px rgba(217,70,239,0.45)' }}>
          {t('dailyPrediction.continue')}
        </button>
      </div>
    </ModalPortal>
  )
}
