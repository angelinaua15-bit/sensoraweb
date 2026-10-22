'use client'

// FILE PATH: components/theme-provider.tsx
// Light/dark theme, following the same pattern as LanguageProvider (a
// device-level UI preference persisted in localStorage, not a Supabase
// round trip). Three real modes:
//   'light' / 'dark' — explicit, always wins.
//   'system'          — follows the OS/browser's prefers-color-scheme, and
//                        keeps following it live if the person changes
//                        their system setting while the app is open.
// The *resolved* theme ('light' | 'dark' — never 'system') is written to
// `document.documentElement.dataset.theme`, which is what app/globals.css's
// `[data-theme="light"]` selector actually keys off. See app/layout.tsx for
// the small inline script that sets this attribute before first paint, so
// there's no flash of the wrong theme on load.
import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
type ResolvedTheme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'sensora_theme'

interface ThemeContextValue {
  theme: ThemeMode
  resolvedTheme: ResolvedTheme
  setTheme: (t: ThemeMode) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function systemPrefersLight(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  return window.matchMedia('(prefers-color-scheme: light)').matches
}

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return systemPrefersLight() ? 'light' : 'dark'
  return mode
}

function applyToDocument(resolved: ResolvedTheme) {
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Real default is 'dark' (unchanged app default) — the inline
  // anti-flash script in app/layout.tsx already applied whatever was
  // actually saved/system-preferred before React even mounts, this state
  // just needs to catch up to match what's already on screen.
  const [theme, setThemeState] = useState<ThemeMode>('dark')
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark')

  useEffect(() => {
    let stored: string | null = null
    try { stored = localStorage.getItem(THEME_STORAGE_KEY) } catch { /* localStorage unavailable */ }
    const initial: ThemeMode = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system'
    setThemeState(initial)
    const r = resolve(initial)
    setResolvedTheme(r)
    applyToDocument(r)
  }, [])

  // While in 'system' mode, keep following the OS setting live.
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => {
      const r = resolve('system')
      setResolvedTheme(r)
      applyToDocument(r)
    }
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((t: ThemeMode) => {
    setThemeState(t)
    const r = resolve(t)
    setResolvedTheme(r)
    applyToDocument(r)
    try { localStorage.setItem(THEME_STORAGE_KEY, t) } catch { /* non-fatal */ }
  }, [])

  const value = useMemo(() => ({ theme, resolvedTheme, setTheme }), [theme, resolvedTheme, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Rendered outside <ThemeProvider> (shouldn't happen once wired into
    // app/layout.tsx) — fall back to dark rather than crash the screen.
    return { theme: 'dark', resolvedTheme: 'dark', setTheme: () => {} }
  }
  return ctx
}