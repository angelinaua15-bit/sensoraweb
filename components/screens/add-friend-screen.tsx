'use client'

// FILE PATH: components/screens/add-friend-screen.tsx
import { useEffect, useState, useCallback } from 'react'
import { ZODIAC_SIGNS } from '@/lib/data'
import { getCompatibility } from '@/lib/astro-calc'
import { useLanguage } from '@/components/language-provider'
import ReferralCard from '@/components/referral-card'
import BirthDateSelect from '@/components/ui/birth-date-select'

interface Friend {
  id: string
  name: string
  zodiacSignId?: string
  birthDate?: string
  birthTime?: string
  birthPlace?: string
}

interface Props {
  userId?: string | null
  userName?: string
  mySignId: string
  onBack: () => void
}

// "Get to know your friends better!" — a real, persisted friends list (not a
// local-only array): every friend added here is written to Supabase via
// /api/friends, so it's still there next time the app opens. Compatibility
// for each friend reuses the same elemental-pairing calculation as "My
// relationships" on the Today screen (lib/astro-calc.ts) — one real
// calculation, used everywhere, not two different fake numbers.
export default function AddFriendScreen({ userId, userName, mySignId, onBack }: Props) {
  const { t } = useLanguage()
  const [friends, setFriends] = useState<Friend[] | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [signId, setSignId] = useState('aries')
  const [birthDate, setBirthDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/friends?userId=${encodeURIComponent(userId ?? 'u1')}`)
      const data = await res.json()
      if (res.ok) setFriends(data.friends)
      else setFriends([])
    } catch {
      setFriends([])
    }
  }, [userId])

  useEffect(() => { load() }, [load])

  const addFriend = useCallback(async () => {
    if (!name.trim()) {
      setError(t('addFriend.enterName'))
      return
    }
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/friends', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId ?? 'u1', name: name.trim(), zodiacSignId: signId, birthDate: birthDate || undefined }),
      })
      const data = await res.json()
      if (res.ok) {
        setFriends(prev => [data.friend, ...(prev ?? [])])
        setName('')
        setBirthDate('')
        setSignId('aries')
        setShowForm(false)
      } else {
        setError(data.error ?? t('addFriend.saveError'))
      }
    } catch {
      setError(t('common.networkError'))
    } finally {
      setSaving(false)
    }
  }, [userId, name, signId, birthDate])

  const removeFriend = useCallback(async (friendId: string) => {
    setFriends(prev => (prev ?? []).filter(f => f.id !== friendId))
    try {
      await fetch(`/api/friends?userId=${encodeURIComponent(userId ?? 'u1')}&friendId=${encodeURIComponent(friendId)}`, { method: 'DELETE' })
    } catch { /* the row already disappeared from view; a stale delete isn't worth re-adding it */ }
  }, [userId])

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex items-center gap-3 px-4 py-4 flex-shrink-0">
        <button onClick={onBack}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
        </button>
        <div>
          <h2 className="text-[var(--text-primary)] text-base font-medium">{t('addFriend.title')}</h2>
          <p className="text-[var(--text-dim)] text-xs">{t('addFriend.subtitle')}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        {/* Same entry point (the "+" in the zodiac carousel) surfaces both
            adding a friend and the invite/referral program — reachable
            through this one screen instead of being buried separately. */}
        <div className="mb-4"><ReferralCard userId={userId} userName={userName} /></div>

        {/* BUG FIX (same family as the Readings-screen gradient cards: fixed
            dark hex faded into var(--bg-elevated) — near-white in light
            theme — under theme-variable text meant for a light surface).
            Fixed gradient + fixed light text/icon backdrop. */}
        <button
          onClick={() => setShowForm(v => !v)}
          className="w-full rounded-2xl p-4 mb-4 flex items-center gap-3 text-left active:scale-[0.98] transition-transform"
          style={{ background: 'linear-gradient(135deg,#4C1D95,#6D28D9)', border: '1px solid rgba(217,70,239,0.25)' }}
        >
          <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-lg font-semibold text-white" style={{ background: 'rgba(255,255,255,0.18)' }}>+</span>
          <div>
            <p className="text-white text-sm font-semibold">{t('addFriend.addFriend')}</p>
            <p className="text-[#D9C6FF] text-[11px]">{t('addFriend.addFriendHint')}</p>
          </div>
        </button>

        {showForm && (
          <div className="rounded-2xl p-4 mb-4 flex flex-col gap-3 screen-enter" style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }}>
            <div>
              <label className="text-[var(--text-dim)] text-[11px] block mb-1">{t('addFriend.name')}</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={t('addFriend.namePlaceholder')}
                className="w-full rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }} />
            </div>
            <div>
              <label className="text-[var(--text-dim)] text-[11px] block mb-1">{t('addFriend.zodiacSign')}</label>
              <div className="grid grid-cols-6 gap-1.5">
                {ZODIAC_SIGNS.map(z => (
                  <button key={z.id} type="button" onClick={() => setSignId(z.id)}
                    className="aspect-square rounded-xl flex items-center justify-center text-base"
                    style={{ background: signId === z.id ? 'linear-gradient(135deg,#7C3AED,#D946EF)' : 'var(--surface-1)', color: signId === z.id ? '#fff' : 'var(--text-muted)' }}>
                    {z.symbol}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-[var(--text-dim)] text-[11px] block mb-1">{t('addFriend.dobOptional')}</label>
              <BirthDateSelect value={birthDate} onChange={setBirthDate} />
            </div>
            {error && <p className="text-[#EF4444] text-xs">{error}</p>}
            <button onClick={addFriend} disabled={saving}
              className="w-full py-3 rounded-full text-white text-xs font-semibold active:scale-95 transition-transform disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
              {saving ? t('common.saving') : t('addFriend.saveFriend')}
            </button>
          </div>
        )}

        {friends === null ? (
          <p className="text-[var(--text-dim)] text-sm text-center py-10">{t('common.loading')}</p>
        ) : friends.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            {/* REAL PHOTO (your call: "більше реальних фото... по всій апці
                щоб оживити") — flat 🌙 emoji replaced with the same
                full-moon Unsplash photo already used elsewhere (practice
                modal, discover article), reused for consistency. */}
            <div className="w-16 h-16 rounded-full overflow-hidden" style={{ border: '1.5px solid rgba(217,70,239,0.4)' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1507502707541-f369a3b18502?auto=format&fit=crop&w=150&q=80" alt=""
                className="w-full h-full object-cover" />
            </div>
            <p className="text-[var(--text-muted)] text-sm">{t('addFriend.noFriends')}</p>
            <p className="text-[var(--text-dim)] text-xs">{t('addFriend.noFriendsHint')}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {friends.map(f => {
              const sign = ZODIAC_SIGNS.find(z => z.id === f.zodiacSignId)
              const compat = getCompatibility(mySignId, f.zodiacSignId ?? 'aries')
              return (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
                  <span className="w-11 h-11 rounded-full flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
                    {sign?.symbol ?? '✨'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-medium truncate">{f.name}</p>
                    <p className="text-[var(--text-dim)] text-[11px]">{sign?.name ?? t('addFriend.unknownSign')}{f.birthDate ? ` · ${f.birthDate}` : ''}</p>
                  </div>
                  <span className="text-xs font-semibold flex-shrink-0" style={{ color: compat.score >= 75 ? '#22C55E' : compat.score >= 55 ? '#F5C542' : '#EF4444' }}>
                    {compat.score}%
                  </span>
                  <button onClick={() => removeFriend(f.id)} className="text-[var(--text-dim)] flex-shrink-0" aria-label={t('addFriend.remove')}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}