'use client'

// FILE PATH: components/screens/expert-profile-screen.tsx
import { useState, useEffect } from 'react'
import AvatarBubble from '@/components/avatar-bubble'
import { CategoryIcon } from '@/components/magic-art'
import type { Expert } from '@/lib/data'
import { useLanguage } from '@/components/language-provider'
import { useFreeTrialAvailable } from '@/lib/use-free-trial'

interface Props {
  expert: Expert
  userId?: string | null
  onBack: () => void
  onStartChat: () => void
}

interface RealReview {
  id: string
  userName: string
  rating: number
  comment: string | null
  createdAt: string
}

// Real reviews, fetched from /api/reviews — this used to be a hardcoded
// "sampleReviews" array with three fabricated names and testimonials shown
// as if they were real. If an expert genuinely has zero reviews yet, this
// screen now says so honestly instead of inventing any.
export default function ExpertProfileScreen({ expert, userId, onBack, onStartChat }: Props) {
  // REAL FEATURE CHANGED ("3 хв безкоштовні... щоб зникало після
  // використання"): this line used to be static, shown to everyone
  // regardless of whether they'd already used their free trial. Same
  // read-only check as the Today and wallet screens — see
  // lib/use-free-trial.ts.
  const freeTrialAvailable = useFreeTrialAvailable(userId ?? null)
  const { t } = useLanguage()
  const [reviews, setReviews] = useState<RealReview[]>([])
  const [stats, setStats] = useState<{ average: number; count: number } | null>(null)
  const [loadingReviews, setLoadingReviews] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoadingReviews(true)
    fetch(`/api/reviews?expertId=${encodeURIComponent(expert.id)}`)
      .then(r => r.json())
      .then(d => {
        if (cancelled) return
        setReviews(d.reviews ?? [])
        setStats(d.stats ?? { average: 0, count: 0 })
      })
      .catch(() => { if (!cancelled) setStats({ average: 0, count: 0 }) })
      .finally(() => { if (!cancelled) setLoadingReviews(false) })
    return () => { cancelled = true }
  }, [expert.id])

  // Real reviews exist → show the real computed average/count. None yet →
  // fall back to the catalog's starting numbers (same convention as
  // `sessions`, which is also a seed value, not a live count) rather than a
  // jarring "0.0 · 0 reviews" on a profile that's otherwise fully seeded.
  const displayRating = stats && stats.count > 0 ? stats.average : expert.rating
  const displayReviewsCount = stats && stats.count > 0 ? stats.count : expert.reviews
  const stars = Math.round(displayRating)
  return (
    <div className="flex flex-col h-full sensora-bg">
      {/* Hero */}
      <div className="relative flex-shrink-0 h-52"
        style={{ background:'linear-gradient(180deg,var(--bg-elevated) 0%,var(--bg-mid) 100%)' }}>
        <div className="absolute inset-0 flex items-center justify-center pt-4">
          <AvatarBubble initials={expert.avatar} size={100} photoUrl={expert.avatarUrl} />
        </div>
        <button onClick={onBack}
          className="absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background:'rgba(0,0,0,0.45)', backdropFilter:'blur(4px)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div className="absolute bottom-4 left-4 flex items-center gap-2">
          {expert.online && (
            <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
              style={{ background:'rgba(34,197,94,0.2)', color:'#22C55E', border:'1px solid rgba(34,197,94,0.4)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />{t('expertProfile.online')}
            </span>
          )}
          {expert.badge && (
            <span className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ background:'rgba(217,70,239,0.25)', color:'#D946EF', border:'1px solid rgba(217,70,239,0.4)' }}>
              {expert.badge}
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <h2 className="text-[var(--text-primary)] text-2xl font-serif font-light mb-0.5">{expert.name}</h2>
        <p className="text-[var(--text-muted)] text-sm mb-4">{expert.specialty.join(' • ')}</p>

        {/* Price stat removed from this row at your request (per-minute
            price no longer shown in the UI — the actual charge during a
            session is unchanged). Grid dropped from 3 to 2 columns so the
            remaining two stats stay centered instead of leaving a gap. */}
        <div className="grid grid-cols-2 gap-2 mb-5">
          {[
            // displayRating is only ever null/undefined when there are zero
            // reviews (see the fallback above) — in that case this shows
            // "New" instead of stringifying null/undefined into the literal
            // text "null", which is what used to render here for every
            // brand-new chatter before their first review.
            displayRating != null
              ? { label: t(displayReviewsCount === 1 ? 'expertProfile.review_one' : 'expertProfile.review_many', { n: displayReviewsCount }), value: displayRating.toFixed(1), star: true }
              : { label: t('expertProfile.noReviewsYet'), value: t('expertProfile.new'), star: false },
            { label: t('expertProfile.sessions'), value: `${expert.sessions >= 1000 ? (expert.sessions/1000).toFixed(1)+'k+' : expert.sessions}` },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center py-3 rounded-2xl"
              style={{ background:'var(--surface-1)', border:'1px solid var(--surface-1)' }}>
              <div className="flex items-center gap-0.5">
                {s.star && <span className="text-[#F5C542] text-sm">★</span>}
                <span className="text-[var(--text-primary)] font-semibold text-base">{s.value}</span>
              </div>
              <span className="text-[var(--text-dim)] text-[10px] mt-0.5 text-center leading-tight">{s.label}</span>
            </div>
          ))}
        </div>

        <h3 className="text-[var(--text-primary)] text-sm font-medium mb-2">{t('expertProfile.specializations')}</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {expert.tags.map(tag => (
            <span key={tag} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs text-[var(--text-muted)]"
              style={{ background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.3)' }}>
              <CategoryIcon category={tag} size={14} />
              {tag}
            </span>
          ))}
        </div>

        <h3 className="text-[var(--text-primary)] text-sm font-medium mb-2">{t('expertProfile.about')}</h3>
        <p className="text-[var(--text-muted)] text-xs leading-relaxed mb-5">{expert.bio}</p>

        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[var(--text-primary)] text-sm font-medium">{t('expertProfile.reviews')}</h3>
        </div>
        <div className="flex flex-col gap-2.5 pb-4">
          {loadingReviews && (
            <p className="text-[var(--text-dim)] text-xs text-center py-4">{t('expertProfile.loadingReviews')}</p>
          )}
          {!loadingReviews && reviews.length === 0 && (
            <p className="text-[var(--text-dim)] text-xs text-center py-4">{t('expertProfile.beFirstReview')}</p>
          )}
          {reviews.map(r => (
            <div key={r.id} className="p-3 rounded-2xl"
              style={{ background:'var(--surface-1)', border:'1px solid var(--surface-1)' }}>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[var(--text-primary)] text-xs font-medium">{r.userName}</p>
                <span className="text-[var(--text-dim)] text-[10px]">{r.createdAt}</span>
              </div>
              <div className="flex gap-0.5 mb-1.5">
                {[1,2,3,4,5].map(i => <span key={i} className="text-[11px]" style={{ color: i<=r.rating ? '#F5C542' : 'var(--bg-elevated)' }}>★</span>)}
              </div>
              {r.comment && <p className="text-[var(--text-muted)] text-xs">{r.comment}</p>}
            </div>
          ))}
        </div>
      </div>

      {/* CTA
          BUG FIX (reported: "маштаб" — the button and the "first 3 minutes
          free" line under it were getting cut off / crowded by the
          system gesture bar on Android): this bar had `pb-5` (a fixed
          1.25rem) and no real device safe-area accounted for, unlike
          bottom-nav.tsx / live-chat-screen.tsx / low-balance-modal.tsx,
          which all already add `env(safe-area-inset-bottom)` on top of
          their own padding — same fix applied here for consistency. */}
      <div className="px-4 pt-3 flex-shrink-0"
        style={{ borderTop:'1px solid var(--surface-1)', background:'var(--bg-void)', paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* Price suffix removed from this button at your request. Flagging
            since it's the last thing shown before a paid, per-minute-billed
            session starts: with no price visible anywhere on this screen
            now, worth double-checking this doesn't create a "why was I
            charged $X" support/dispute risk — the low-balance mid-chat
            modal (live-chat-screen.tsx) still discloses the real rate, but
            that's after the session has already started. */}
        <button onClick={onStartChat}
          className="w-full py-4 rounded-2xl text-white font-semibold text-base active:scale-95 transition-transform"
          style={{ background:'linear-gradient(135deg,#7C3AED,#D946EF)', boxShadow:'0 8px 32px rgba(217,70,239,0.4)' }}>
          {t('expertProfile.startConsultation')}
        </button>
        {freeTrialAvailable && (
          <p className="text-[var(--text-dim)] text-xs text-center mt-2">{t('expertProfile.first3MinFree')}</p>
        )}
      </div>
    </div>
  )
}