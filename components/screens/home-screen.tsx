'use client'

// FILE PATH: components/screens/home-screen.tsx
// REDESIGNED (Nov 2026, "live consultations first"): the home screen is now
// one non-scrolling screen whose only job is to get the person into a live
// chat with a real advisor:
//   1. compact header — greeting, minutes balance, settings;
//   2. a big "live" hero built from the advisors' real photos, with how many
//      are online right now and one main button ("Start a live chat");
//   3. a row of advisors who are online now (tap → their profile);
//   4. the intro video.
// The daily horoscope, birth chart, zodiac header and tarot-video banner were
// removed from this screen (App Store 4.3(b): the app must not primarily be a
// horoscope / zodiac app). Those screens still exist in the code but are no
// longer linked from here.
import { useState, useEffect, useMemo } from 'react'
import BottomNav from '@/components/bottom-nav'
import ModalPortal from '@/components/modal-portal'
import { IntroVideoBanner } from '@/components/today-widgets'
import { useLanguage } from '@/components/language-provider'
import { useFreeTrialAvailable } from '@/lib/use-free-trial'
import { getDeviceId } from '@/lib/device-id'
import { PRICE_PER_MIN_USD } from '@/lib/minute-packages'
import type { Expert } from '@/lib/data'
import type { Screen } from '@/app/page'

interface Props {
  userId?: string | null
  userName: string
  contact?: string
  balance: number
  birthDate?: string
  quizCategory: string | null
  onNavigate: (s: Screen) => void
  onSelectExpert: (e: Expert) => void
  onBalanceChange: (balance: number) => void
}

// /api/experts returns the public profile, which also carries the real photo.
type ApiExpert = Expert & { avatarUrl?: string | null }


const HOME_CSS = `
@keyframes shAurora { 0% { transform: rotate(0deg) scale(1); } 50% { transform: rotate(180deg) scale(1.15); } 100% { transform: rotate(360deg) scale(1); } }
.sh-aurora { background: conic-gradient(from 0deg, #7C3AED, #D946EF, #3B1E8C, #F5C542, #7C3AED); filter: blur(60px); opacity: .45; animation: shAurora 14s linear infinite; }
@keyframes shKen { from { transform: scale(1.02); } to { transform: scale(1.12); } }
.sh-kenburns { animation: shKen 5s ease-out forwards; }
@keyframes shTwinkle { 0%,100% { opacity: 0; transform: scale(.6); } 50% { opacity: .9; transform: scale(1); } }
.sh-twinkle { opacity: 0; animation: shTwinkle 3.2s ease-in-out infinite; text-shadow: 0 0 8px #F0ABFC; }
@keyframes shSlide { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: none; } }
.sh-slide-in { animation: shSlide .6s ease-out both; }
@keyframes shPop { from { opacity: 0; transform: translateY(8px) scale(.92); } to { opacity: 1; transform: none; } }
.sh-pop { animation: shPop .45s ease-out both; }
@keyframes shRing { 0% { box-shadow: 0 0 0 0 rgba(34,197,94,.55); } 70% { box-shadow: 0 0 0 7px rgba(34,197,94,0); } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); } }
.sh-ring { animation: shRing 2s ease-out infinite; }
@keyframes shShine { 0% { left: -60%; } 60%,100% { left: 130%; } }
.sh-shine::after { content: ''; position: absolute; top: 0; bottom: 0; width: 40%; left: -60%; background: linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent); animation: shShine 3s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) { .sh-aurora, .sh-kenburns, .sh-twinkle, .sh-ring, .sh-shine::after { animation: none; } .sh-twinkle { opacity: .6; } }
`

function initialsOf(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'S'
}

export default function HomeScreen({ userId, userName, balance, onNavigate, onSelectExpert }: Props) {
  const { t } = useLanguage()
  const freeTrialAvailable = useFreeTrialAvailable(userId ?? null)

  const [experts, setExperts] = useState<ApiExpert[]>([])
  useEffect(() => {
    let cancelled = false
    const load = () => fetch('/api/experts')
      .then(res => (res.ok ? res.json() : null))
      .then(data => { if (!cancelled && Array.isArray(data?.experts)) setExperts(data.experts) })
      .catch(() => {})
    load()
    // Keep "online now" fresh while the screen is open.
    const id = setInterval(load, 30000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const online = useMemo(() => experts.filter(e => e.online), [experts])
  // Advisors shown in the "online now" row: online first, then everyone else.
  const rowExperts = useMemo(
    () => [...online, ...experts.filter(e => !e.online)].slice(0, 12),
    [experts, online],
  )
  // Hero: one big portrait at a time (whole face visible), cross-fading
  // between advisors every few seconds. Online advisors with a photo first.
  const heroPeople = useMemo(() => {
    const withPhoto = [...online, ...experts.filter(e => !e.online)].filter(e => e.avatarUrl)
    return withPhoto.slice(0, 8)
  }, [experts, online])
  const [heroIdx, setHeroIdx] = useState(0)
  useEffect(() => {
    if (heroPeople.length < 2) return
    const id = setInterval(() => setHeroIdx(i => (i + 1) % heroPeople.length), 4500)
    return () => clearInterval(id)
  }, [heroPeople.length])
  const current = heroPeople.length ? heroPeople[heroIdx % heroPeople.length] : null

  // Topics shown as chips in the hero; one of them is highlighted in turn.
  const topics = ['home.topicLove', 'home.topicCareer', 'home.topicFamily', 'home.topicDecision', 'home.topicFuture']
  const [topicIdx, setTopicIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTopicIdx(i => (i + 1) % topics.length), 2200)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Same behaviour the old "Start Chat" button had: if the free 3 minutes are
  // still unused, a short popup says so first; then the person lands on the
  // advisors list to pick someone.
  const [showFreeTrialPopup, setShowFreeTrialPopup] = useState(false)
  const handleStartChat = async () => {
    let available = freeTrialAvailable
    if (available === null) {
      try {
        const res = await fetch(`/api/session/free-trial?deviceId=${encodeURIComponent(getDeviceId())}`)
        const data = res.ok ? await res.json() : { available: false }
        available = !!data.available
      } catch {
        available = false
      }
    }
    if (available) setShowFreeTrialPopup(true)
    else onNavigate('search')
  }
  const proceedToSearch = () => {
    setShowFreeTrialPopup(false)
    onNavigate('search')
  }

  const minutes = Math.floor(balance / PRICE_PER_MIN_USD)

  return (
    <div className="flex flex-col h-full sensora-bg">
      <style>{HOME_CSS}</style>
      {/* One screen, no scrolling: header + hero (takes all spare height) +
          online row + video. overflow-y-auto is only a safety net for very
          small phones. */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-3 flex flex-col gap-3">

        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/sensora-mark.png" alt="Sensora" style={{ height: 30, width: 'auto' }} />
            <div className="min-w-0">
              <p className="text-[var(--text-primary)] text-base font-serif truncate">
                {t('home.hi', { name: userName || t('today.seekerFallback') })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => onNavigate('wallet')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full active:scale-95 transition-transform"
              style={{ background: 'rgba(217,70,239,0.12)', border: '1px solid rgba(217,70,239,0.3)' }}>
              <span className="text-[#D946EF] text-sm">🪙</span>
              <span className="text-[var(--text-primary)] text-sm font-semibold">
                {t('wallet.minutesShort', { mins: minutes })}
              </span>
            </button>
            <button onClick={() => onNavigate('settings')}
              className="w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0"
              style={{ background: 'var(--surface-1)' }} aria-label={t('settings.title')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Live hero — one big real portrait at a time, cross-fading */}
        <div className="sw-home-hero relative flex-1 min-h-[300px] rounded-3xl overflow-hidden"
          style={{ background: 'linear-gradient(160deg,#2a1668,#170c3d)', border: '1px solid rgba(217,70,239,0.35)', boxShadow: '0 10px 40px rgba(124,58,237,0.35)' }}>

          {/* animated aurora behind the photo (visible while photos load) */}
          <div className="sh-aurora absolute -inset-1/4" />

          {heroPeople.map((e, i) => {
            const active = i === heroIdx % heroPeople.length
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={e.id} src={e.avatarUrl as string} alt=""
                className={`absolute inset-0 w-full h-full object-cover ${active ? 'sh-kenburns' : ''}`}
                style={{ objectPosition: 'center 18%', opacity: active ? 1 : 0, transition: 'opacity 1.2s ease' }} />
            )
          })}

          {/* readability overlay: transparent at the top so the face stays clear */}
          <div className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(180deg, rgba(23,12,61,0.35) 0%, rgba(23,12,61,0) 22%, rgba(23,12,61,0) 40%, rgba(23,12,61,0.75) 62%, rgba(23,12,61,0.97) 100%)' }} />

          {/* twinkling sparkles */}
          {[[12, 30], [82, 22], [70, 48], [20, 55], [90, 60], [45, 12]].map(([x, y], i) => (
            <span key={i} className="sh-twinkle absolute text-white pointer-events-none"
              style={{ left: `${x}%`, top: `${y}%`, fontSize: i % 2 ? 10 : 14, animationDelay: `${i * 0.7}s` }}>✦</span>
          ))}

          {/* top: online counter + who is on screen */}
          <div className="absolute top-3 inset-x-3 flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)' }}>
              <span className="relative flex w-2.5 h-2.5">
                {online.length > 0 && <span className="absolute inline-flex w-full h-full rounded-full bg-[#22C55E] opacity-75 animate-ping" />}
                <span className="relative inline-flex w-2.5 h-2.5 rounded-full" style={{ background: online.length > 0 ? '#22C55E' : '#9184B5' }} />
              </span>
              <span className="text-white text-xs font-semibold">
                {online.length > 0 ? t('home.liveNowCount', { n: online.length }) : t('home.liveNowNone')}
              </span>
            </div>
          </div>

          {current && (
            <button key={current.id} onClick={() => onSelectExpert(current)}
              className="sh-slide-in absolute right-3 top-[38%] flex items-center gap-2 pl-1 pr-3 py-1 rounded-full active:scale-95 transition-transform"
              style={{ background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={current.avatarUrl as string} alt="" className="w-7 h-7 rounded-full object-cover" />
              <span className="text-white text-xs font-semibold">
                {current.online ? t('home.isOnline', { name: current.name }) : current.name}
              </span>
              {current.online && <span className="w-2 h-2 rounded-full bg-[#22C55E]" />}
            </button>
          )}

          <div className="absolute inset-x-0 bottom-0 p-4 flex flex-col gap-2.5">
            {/* face pile of advisors */}
            {heroPeople.length > 1 && (
              <div className="flex items-center">
                {heroPeople.slice(0, 5).map((e, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={e.id} src={e.avatarUrl as string} alt=""
                    className="w-8 h-8 rounded-full object-cover sh-pop"
                    style={{ marginLeft: i ? -10 : 0, border: '2px solid #1c0f48', animationDelay: `${i * 0.08}s` }} />
                ))}
                {experts.length > 5 && (
                  <span className="ml-1.5 text-white/80 text-xs font-semibold">+{experts.length - 5}</span>
                )}
              </div>
            )}
            <h1 className="text-white text-[26px] font-serif leading-tight">{t('home.heroTitle')}</h1>
            {/* topics — highlighted one by one */}
            <div className="flex flex-wrap gap-1.5">
              {topics.map((k, i) => (
                <button key={k} onClick={handleStartChat}
                  className="px-2.5 py-1 rounded-full text-[11px] font-medium transition-all duration-500"
                  style={i === topicIdx
                    ? { background: 'linear-gradient(135deg,#7C3AED,#D946EF)', color: '#fff', transform: 'scale(1.06)' }
                    : { background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)' }}>
                  {t(k)}
                </button>
              ))}
            </div>
            <button onClick={handleStartChat}
              className="sh-shine relative overflow-hidden mt-1 w-full py-3.5 rounded-2xl text-white text-base font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)', boxShadow: '0 8px 28px rgba(217,70,239,0.5)' }}>
              💬 {t('home.heroCta')}
            </button>
            {freeTrialAvailable && (
              <span className="self-center text-[#F5C542] text-xs font-semibold">🎁 {t('home.freeMinutes')}</span>
            )}
          </div>
        </div>

        {/* Online now row */}
        {rowExperts.length > 0 && (
          <div className="flex-shrink-0">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[var(--text-primary)] text-sm font-semibold">{t('home.onlineNow')}</p>
              <button onClick={() => onNavigate('search')} className="text-[#D946EF] text-xs font-medium">
                {t('home.seeAll')} →
              </button>
            </div>
            <div className="flex gap-2.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
              {rowExperts.map((e, idx) => (
                <button key={e.id} onClick={() => onSelectExpert(e)}
                  className="sh-pop flex-shrink-0 w-[92px] rounded-2xl p-2 flex flex-col items-center text-center active:scale-95 transition-transform"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)', animationDelay: `${0.15 + idx * 0.06}s` }}>
                  <span className="relative w-14 h-14 mb-1.5">
                    {e.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={e.avatarUrl} alt={e.name} className={`w-14 h-14 rounded-full object-cover ${e.online ? 'sh-ring' : ''}`}
                        style={{ border: `2px solid ${e.online ? '#22C55E' : 'rgba(217,70,239,0.5)'}` }} />
                    ) : (
                      <span className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold"
                        style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
                        {e.avatar || initialsOf(e.name)}
                      </span>
                    )}
                    {e.online && (
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full"
                        style={{ background: '#22C55E', border: '2px solid var(--bg-void)' }} />
                    )}
                  </span>
                  <span className="text-[var(--text-primary)] text-[11px] font-medium truncate w-full">{e.name}</span>
                  {e.pricePerMin !== null && (
                    <span className="text-[var(--text-dim)] text-[10px]">${e.pricePerMin}{t('home.perMin')}</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Intro video */}
        <div className="flex-shrink-0 sw-home-video">
          <IntroVideoBanner />
        </div>
      </div>

      <BottomNav active="home" onNavigate={onNavigate} />

      {showFreeTrialPopup && (
        <ModalPortal>
          <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center"
            style={{ background: 'var(--scrim)', backdropFilter: 'blur(4px)' }}
            onClick={() => setShowFreeTrialPopup(false)}>
            <div className="w-full max-w-sm rounded-t-3xl sm:rounded-3xl px-6 pt-6 pb-7 flex flex-col items-center text-center screen-enter"
              onClick={e => e.stopPropagation()}
              style={{ background: 'linear-gradient(180deg,var(--bg-mid),var(--bg-void))', border: '1px solid rgba(245,197,66,0.3)' }}>
              <p className="text-4xl mb-3">🎁</p>
              <h2 className="text-[var(--text-primary)] text-lg font-serif mb-2">{t('today.freeTrialPopupTitle')}</h2>
              <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-6">{t('today.freeTrialAvailable')}</p>
              <button onClick={proceedToSearch}
                className="w-full py-3.5 rounded-2xl text-white font-semibold text-sm active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
                {t('today.freeTrialPopupCta')}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
