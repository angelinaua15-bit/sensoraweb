'use client'

// FILE PATH: components/screens/palm-reading-screen.tsx
// The real destination behind the Fortune Wheel's "Palmistry reading"
// segment. Uploads the photo to /api/palm-reading, which sends it to a real
// vision-capable AI (Anthropic's Messages API) and returns what it actually
// sees — never a canned response regardless of the photo. If
// ANTHROPIC_API_KEY isn't set on the server, the API returns a clear error
// and this screen shows that honestly instead of faking a reading.
import { useState, useRef, useEffect } from 'react'
// Real vector art (same library used elsewhere in the app) for the
// pre-upload placeholder — this screen previously had nothing but a bare
// emoji glyph on a flat dashed box before a photo was chosen.
import { NebulaOrbArt } from '@/components/magic-art'
import { useLanguage } from '@/components/language-provider'

interface Props {
  onBack: () => void
  // 2026-09-10: palm reading used to be free and uncapped, spending real
  // Anthropic API money with no limit. First 3 reads are still free; after
  // that /api/palm-reading charges the wallet and returns 402 if the
  // balance is too low — onTopup sends the person to top up, same pattern
  // live-chat-screen.tsx uses for its own low-balance dead end.
  onTopup: () => void
}

export default function PalmReadingScreen({ onBack, onTopup }: Props) {
  const { t } = useLanguage()
  const [preview, setPreview] = useState<string | null>(null)
  const [base64, setBase64] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<string | null>(null)
  const [reading, setReading] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [needsTopup, setNeedsTopup] = useState(false)
  const [freeUsesRemaining, setFreeUsesRemaining] = useState<number | null>(null)
  const [price, setPrice] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch the person's current free-use/price status up front so they know
  // before analyzing whether this read is free or will charge their wallet
  // — rather than finding out only after a 402 comes back.
  useEffect(() => {
    let cancelled = false
    fetch('/api/palm-reading')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return
        setFreeUsesRemaining(data.freeUsesRemaining ?? null)
        setPrice(data.price ?? null)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setReading(null)
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPreview(dataUrl)
      const [, b64] = dataUrl.split(',')
      setBase64(b64 ?? null)
      setMediaType(file.type)
    }
    reader.readAsDataURL(file)
  }

  const analyze = async () => {
    if (!base64 || !mediaType) return
    setLoading(true)
    setError(null)
    setReading(null)
    setNeedsTopup(false)
    try {
      const res = await fetch('/api/palm-reading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mediaType }),
      })
      const data = await res.json()
      if (res.status === 402 && data.needsTopup) {
        setNeedsTopup(true)
        if (typeof data.price === 'number') setPrice(data.price)
        return
      }
      if (!res.ok) throw new Error(data.error || t('palm.readError'))
      setReading(data.reading)
      if (typeof data.freeUsesRemaining === 'number') setFreeUsesRemaining(data.freeUsesRemaining)
    } catch (e: any) {
      setError(e.message || t('palm.somethingWrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full sensora-bg">
      <div className="flex items-center gap-2.5 px-4 py-3 flex-shrink-0" style={{ borderBottom: '1px solid var(--surface-1)' }}>
        <button onClick={onBack} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'var(--surface-1)' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
        </button>
        <p className="text-[var(--text-primary)] text-sm font-medium">{t('palm.title')}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col items-center">
        <div className="w-full aspect-square max-w-xs rounded-3xl flex items-center justify-center mb-5 overflow-hidden"
          style={{ background: 'var(--surface-1)', border: '1px dashed var(--surface-3)' }}>
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={t('palm.altText')} className="w-full h-full object-cover" />
          ) : (
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
              {/* REAL PHOTO (your call: "більше реальних фото... по всій
                  апці щоб оживити") — flat 🖐️ emoji placeholder replaced
                  with a real open-palm photo so the upload prompt shows
                  an actual example of what to photograph, dimmed under
                  the existing NebulaOrbArt glow instead of a floating
                  emoji over it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="https://images.unsplash.com/photo-1599659593072-10de2e109486?auto=format&fit=crop&w=400&q=80" alt=""
                className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.45 }} />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ opacity: 0.6 }}>
                <NebulaOrbArt size={180} />
              </div>
            </div>
          )}
        </div>

        {freeUsesRemaining !== null && (
          <p className="text-[var(--text-muted)] text-[11px] mb-3 text-center">
            {freeUsesRemaining > 0
              ? t(freeUsesRemaining === 1 ? 'palm.freeLeft_one' : 'palm.freeLeft_many', { n: freeUsesRemaining })
              : price !== null
                ? t('palm.freeUsedWithPrice', { price: price.toFixed(2) })
                : t('palm.freeUsed')}
          </p>
        )}

        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={onFileChange} className="hidden" />
        <div className="flex gap-2 w-full mb-4">
          <button onClick={() => fileInputRef.current?.click()}
            className="flex-1 px-4 py-3 rounded-full text-white text-sm font-medium"
            style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.4)' }}>
            {preview ? t('palm.differentPhoto') : t('palm.takeOrUpload')}
          </button>
          {preview && (
            <button onClick={analyze} disabled={loading}
              className="flex-1 px-4 py-3 rounded-full text-white text-sm font-semibold disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
              {loading
                ? t('palm.reading')
                : freeUsesRemaining === 0 && price !== null
                  ? t('palm.analyzePrice', { price: price.toFixed(2) })
                  : t('palm.analyzeMyPalm')}
            </button>
          )}
        </div>

        {needsTopup && (
          <div className="w-full p-4 rounded-2xl mb-4" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <p className="text-[var(--text-primary)] text-xs font-medium mb-1">{t('palm.freeUsedUpTitle')}</p>
            <p className="text-[var(--text-muted)] text-[11px] leading-relaxed mb-3">
              {price !== null ? t('palm.costsNow', { price: price.toFixed(2) }) : t('palm.balanceTooLow')} {t('palm.topUpToContinue')}
            </p>
            <button onClick={onTopup}
              className="w-full px-4 py-2.5 rounded-full text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg,#7C3AED,#D946EF)' }}>
              {t('palm.topUpWallet')}
            </button>
          </div>
        )}

        {error && (
          <div className="w-full p-4 rounded-2xl mb-4" style={{ background: 'rgba(245,197,66,0.08)', border: '1px solid rgba(245,197,66,0.25)' }}>
            <p className="text-[#F5C542] text-xs font-medium mb-1">⚠️ {t('palm.couldNotComplete')}</p>
            <p className="text-[var(--text-muted)] text-[11px] leading-relaxed">{error}</p>
          </div>
        )}

        {reading && (
          <div className="w-full p-4 rounded-2xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-1)' }}>
            <p className="text-[var(--text-accent-soft)] text-xs font-medium mb-2">✨ {t('palm.yourReading')}</p>
            <p className="text-[var(--text-muted)] text-xs leading-relaxed whitespace-pre-line">{reading}</p>
          </div>
        )}
      </div>
    </div>
  )
}