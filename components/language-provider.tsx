'use client'

// FILE PATH: components/language-provider.tsx
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { translate, DEFAULT_LOCALE, LOCALE_STORAGE_KEY, type Locale } from '@/lib/i18n'

interface LanguageContextValue {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: string, vars?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

// Wraps the whole app (see app/layout.tsx) so any component can call
// useLanguage() to read/change the language. Persisted in localStorage — a
// device-level UI preference, same category as a theme choice, not
// something that needs a Supabase round trip.
export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
      if (stored === 'en' || stored === 'es') setLocaleState(stored)
    } catch { /* localStorage unavailable — stay on the default locale */ }
  }, [])

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l)
    try { localStorage.setItem(LOCALE_STORAGE_KEY, l) } catch { /* non-fatal */ }
  }, [])

  const t = useCallback((key: string, vars?: Record<string, string | number>) => translate(locale, key, vars), [locale])

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    // A component rendered outside <LanguageProvider> (shouldn't happen once
    // it's wired into app/layout.tsx) — fall back to English rather than
    // crash the screen.
    return { locale: DEFAULT_LOCALE, setLocale: () => {}, t: (key, vars) => translate(DEFAULT_LOCALE, key, vars) }
  }
  return ctx
}