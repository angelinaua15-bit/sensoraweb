'use client'

// FILE PATH: components/screens/review-screen.tsx
import { useState } from 'react'
import AvatarBubble from '@/components/avatar-bubble'
import type { Expert } from '@/lib/data'
import { useLanguage } from '@/components/language-provider'

interface Props {
  expert: Expert
  userId?: string | null
  userName?: string
  onDone: () => void
}

// Submitting really POSTs to /api/reviews and persists a real row — this
// used to call onDone() straight away with zero backend call, so no review
// ever survived a page reload. "Skip" still just navigates on, since
// skipping means the person deliberately chose not to leave one.
export default function ReviewScreen({ expert, userId, userName, onDone }: Props) {
  const { t } = useLanguage()
  const quick = [t('review.tag.accurate'), t('review.tag.listener'), t('review.tag.practical'), t('review.tag.positive'), t('review.tag.recommend')]
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleTag = (tag: string) => setTags(prev => prev.includes(tag) ? prev.filter(x => x !== tag) : [...prev, tag])

  const active = hover || rating

  const labels = [t('review.label.poor'), t('review.label.fair'), t('review.label.good'), t('review.label.excellent'), t('review.label.amazing')]

  const submit = async () => {
    if (rating === 0 || !userId) {
      onDone()
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expertId: expert.id, userId, userName, rating, comment, tags }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || t('review.saveError'))
      }
      onDone()
    } catch (e: any) {
      setError(e.message || t('review.saveErrorRetry'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto flex flex-col px-6 pt-8 pb-10"
      style={{ background: 'linear-gradient(180deg,var(--bg-void) 0%,var(--bg-deep) 100%)' }}>

      {/* Expert summary */}
      <div className="flex items-center justify-between p-3.5 rounded-2xl mb-7"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
        <div className="flex items-center gap-3">
          <AvatarBubble initials={expert.avatar} size={48} photoUrl={expert.avatarUrl} />
          <div>
            <p className="text-[var(--text-primary)] text-sm font-medium">{expert.name}</p>
            <p className="text-[var(--text-dim)] text-xs">{expert.specialty.join(' • ')}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[#D946EF] text-sm font-semibold">{t('review.completed')}</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center">
        <p className="text-[var(--text-muted)] text-xs mb-1.5 tracking-widest">{t('review.yourRating')}</p>
        <h2 className="font-serif text-2xl text-[var(--text-primary)] mb-2 text-center">{t('review.howWas')}</h2>
        {active > 0 && (
          <p className="text-[#D946EF] text-sm mb-5 font-medium">{labels[active - 1]}</p>
        )}
        {active === 0 && <div className="mb-5 h-5" />}

        {/* Stars */}
        <div className="flex gap-4 mb-6">
          {[1,2,3,4,5].map(s => (
            <button key={s}
              onMouseEnter={() => setHover(s)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setRating(s)}
              className="transition-transform active:scale-90"
              style={{ transform: active >= s ? 'scale(1.1)' : 'scale(1)' }}>
              <svg width="38" height="38" viewBox="0 0 24 24"
                fill={active >= s ? '#F5C542' : 'none'}
                stroke={active >= s ? '#F5C542' : 'var(--bg-elevated)'}
                strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </button>
          ))}
        </div>

        {/* Quick tags */}
        {rating > 0 && (
          <>
            <div className="flex flex-wrap gap-2 justify-center mb-4">
              {quick.map(tag => {
                const on = tags.includes(tag)
                return (
                  <button key={tag} onClick={() => toggleTag(tag)}
                    className="px-3 py-1.5 rounded-full text-xs transition-all"
                    style={{
                      background: on ? 'rgba(217,70,239,0.2)' : 'var(--surface-1)',
                      border: `1px solid ${on ? 'rgba(217,70,239,0.5)' : 'var(--surface-2)'}`,
                      color: on ? '#D946EF' : 'var(--text-muted)',
                    }}>
                    {tag}
                  </button>
                )
              })}
            </div>

            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder={t('review.commentPlaceholder')}
              rows={3}
              className="w-full px-4 py-3 rounded-2xl text-sm text-[var(--text-primary)] placeholder:text-[var(--text-dim)] outline-none resize-none"
              style={{ background: 'var(--surface-1)', border: '1px solid rgba(124,58,237,0.3)' }} />
          </>
        )}

        {error && <p className="text-[#EF4444] text-xs mt-3 text-center">{error}</p>}
      </div>

      <div className="flex flex-col gap-3 mt-6">
        <button onClick={submit} disabled={submitting}
          className="w-full py-4 rounded-2xl font-semibold text-base active:scale-95 transition-transform disabled:opacity-70"
          style={rating > 0
            ? { background: 'linear-gradient(135deg,#7C3AED,#D946EF)', color: '#fff', boxShadow: '0 8px 32px rgba(217,70,239,0.4)' }
            : { background: 'rgba(124,58,237,0.2)', color: 'var(--text-muted)', border: '1px solid rgba(124,58,237,0.3)' }
          }>
          {submitting ? t('review.saving') : rating > 0 ? t('review.submit') : t('review.rateIt')}
        </button>
        <button onClick={onDone} disabled={submitting} className="text-[var(--text-dim)] text-sm text-center py-1 disabled:opacity-50">
          {t('review.skip')}
        </button>
      </div>
    </div>
  )
}