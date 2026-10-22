'use client'

// FILE PATH: components/screens/search-screen.tsx
//
// REDESIGN (your call: "перепрацювати сторінку в стилі небули"): the flat
// list-row layout is replaced with image-forward cards — a real photo (or an
// honest color-tile fallback when a chatter has no photo on file) fills most
// of the card, name/specialty/rating sit below it, same visual language
// Nebula's Psychics tab uses. Two things from the Nebula reference were
// deliberately NOT copied, both to stay honest rather than decorative:
//  - No "Call" button / voice-call option — Sensora only has live text/photo
//    chat (see live-chat-screen.tsx), there's no calling feature to offer.
//  - No per-minute price on the cards, and no fabricated "X years on
//    Nebula" line — pricing was already removed from every client-facing
//    screen earlier ("Per-minute price label removed from the UI at your
//    request"), and Sensora doesn't track chatter tenure, so nothing here
//    invents a number that isn't real.
// The curated horizontal sections below (Online Now / Top Rated / New on
// Sensora) are Nebula-style in *presentation* only — each one is a real,
// honestly-computed slice of the same /api/experts catalog (who's online
// right now, who has the highest real rating, who has zero reviews yet),
// not a fabricated "Recommended for You" personalization Sensora doesn't
// actually compute.
import { useState, useEffect, useMemo } from 'react'
import BottomNav from '@/components/bottom-nav'
import AvatarBubble from '@/components/avatar-bubble'
import { type Expert } from '@/lib/data'
import type { Screen } from '@/app/page'
import { CrystalBallArt } from '@/components/magic-art'
import { useLanguage } from '@/components/language-provider'

interface Props {
  onNavigate: (s: Screen) => void
  onSelectExpert: (e: Expert) => void
}

const filters = ['Online', 'Rating 4.8+']
// REMOVED (your call: "популар топікс прибрати у фізікс" — Psychics tab):
// the `popular` tag shortcuts ('Love', 'Career', ...) and the "POPULAR
// TOPICS" row they fed are gone. Search itself still works the same way,
// just without this row taking up space above the actual expert lists.

// ─── Expert card ────────────────────────────────────────────────────────────
// Used to also take a `variant="compact"` for the now-removed Online Now /
// Top Rated / New on Sensora horizontal rows — single grid variant now that
// every expert shows in one flat "All Psychics" grid (your call: "щоб не
// було розподілу між чатерами").
function ExpertCard({ exp, onSelect, t }: {
  exp: Expert; onSelect: () => void
  t: (k: string, vars?: Record<string, string | number>) => string
}) {
  const photoHeight = 168
  return (
    <button onClick={onSelect}
      className="text-left rounded-3xl overflow-hidden active:scale-[0.97] transition-transform relative w-full"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
      <div className="relative" style={{ height: photoHeight }}>
        {exp.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={exp.avatarUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          // Honest fallback for a chatter with no photo on file yet — a
          // color-tile derived from AvatarBubble's own hashing (so the same
          // chatter always gets the same color everywhere in the app),
          // with a large initials bubble centered, instead of pretending
          // there's a real photo.
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
            <AvatarBubble initials={exp.avatar} size={photoHeight * 0.5} />
          </div>
        )}
        {exp.online && (
          <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold"
            style={{ background: 'rgba(11,6,32,0.6)', color: '#22C55E', backdropFilter: 'blur(4px)' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />{t('search.online')}
          </span>
        )}
        {exp.badge && (
          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-semibold"
            style={{ background: exp.badge === 'Master' ? 'rgba(217,70,239,0.85)' : 'rgba(124,58,237,0.85)', color: '#fff', backdropFilter: 'blur(4px)' }}>
            {exp.badge}
          </span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-[var(--text-primary)] text-xs font-medium truncate mb-0.5">{exp.name}</p>
        <p className="text-[var(--text-dim)] text-[10px] truncate mb-1">{exp.specialty.length ? exp.specialty.join(' • ') : t('search.notSet')}</p>
        {exp.rating === null ? (
          <span className="text-[var(--text-muted)] text-[10px]">{t('search.newNoReviews')}</span>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-[#F5C542] text-[10px]">★</span>
            <span className="text-[var(--text-muted)] text-[10px]">{exp.rating} ({exp.reviews})</span>
          </div>
        )}
      </div>
    </button>
  )
}

export default function SearchScreen({ onNavigate, onSelectExpert }: Props) {
  const { t } = useLanguage()
  const [query, setQuery] = useState('')
  const [activeFilters, setActiveFilters] = useState<string[]>([])

  const [experts, setExperts] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    let cancelled = false
    fetch('/api/experts')
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (!cancelled && data?.experts) setExperts(data.experts) })
      .catch(() => { /* results list just stays empty */ })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const toggleFilter = (f: string) =>
    setActiveFilters(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])

  const results = useMemo(() => {
    let list = [...experts]
    if (query) list = list.filter(e => e.name.toLowerCase().includes(query.toLowerCase()) || e.specialty.some(s => s.toLowerCase().includes(query.toLowerCase())))
    if (activeFilters.includes('Online')) list = list.filter(e => e.online)
    if (activeFilters.includes('Rating 4.8+')) list = list.filter(e => e.rating !== null && e.rating >= 4.8)
    return list
  }, [query, activeFilters, experts])

  // REMOVED (your call: "щоб не було розподілу між чатерами") — Psychics tab
  // used to split experts into three curated horizontal rows — Online Now /
  // Top Rated / New on Sensora — before the full "All Psychics" grid below.
  // That grouping is gone; every real expert from /api/experts now shows in
  // one flat list, same filtering by search/Online/Rating as before.
  const browsing = !query && activeFilters.length === 0

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-2">
        <div className="flex items-center gap-2.5 mb-4">
          <button onClick={() => onNavigate('home')} aria-label={t('search.back')}
            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--surface-1)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          </button>
          <h2 className="text-[var(--text-primary)] text-xl font-medium">{t('search.title')}</h2>
        </div>

        <div className="relative mb-4">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2" strokeLinecap="round">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <input value={query} onChange={e => setQuery(e.target.value)}
            placeholder={t('search.placeholder')}
            className="w-full pl-10 pr-4 py-3 rounded-2xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none"
            style={{ background:'var(--surface-1)', border:'1px solid var(--surface-2)' }} />
        </div>

        {/* Filter pills — restyled as a bolder segmented look (Nebula's
            All/Call/Chat row), same Online/Rating filters as before since
            those are the only two real, honest filters this catalog
            supports (no "Call" — see the file-top note). */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map(f => {
            const on = activeFilters.includes(f)
            return (
              <button key={f} onClick={() => toggleFilter(f)}
                className="px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap flex-shrink-0 transition-all active:scale-95"
                style={{
                  background: on ? 'linear-gradient(135deg,#7C3AED,#D946EF)' : 'var(--surface-1)',
                  border: `1px solid ${on ? 'transparent' : 'var(--surface-2)'}`,
                  color: on ? '#fff' : 'var(--text-muted)',
                  boxShadow: on ? '0 4px 16px rgba(217,70,239,0.35)' : 'none',
                }}>
                {t(`search.filter.${f}`)}
              </button>
            )
          })}
        </div>

        <p className="text-[var(--text-dim)] text-xs mb-3 tracking-wider">
          {browsing ? t('search.allPsychics') : t('search.resultsCount', { n: results.length })}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {results.map(exp => (
            <ExpertCard key={exp.id} exp={exp} onSelect={() => onSelectExpert(exp)} t={t} />
          ))}
        </div>
        {!loading && results.length === 0 && (
          <div className="flex flex-col items-center gap-3 py-12 text-center">
            <CrystalBallArt size={72} />
            <p className="text-[var(--text-muted)] text-sm">{experts.length === 0 ? t('search.noPsychicsYet') : t('search.nothingFound')}</p>
            <p className="text-[var(--text-dim)] text-xs">{experts.length === 0 ? t('search.checkBackSoon') : t('search.tryChangingFilters')}</p>
          </div>
        )}
      </div>
      <BottomNav active="search" onNavigate={onNavigate} />
    </div>
  )
}
