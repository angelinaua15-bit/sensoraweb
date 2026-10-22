'use client'

// FILE PATH: components/theme-toggle.tsx
// Three-way Light / Dark / System segmented control — the one place the
// person actually changes components/theme-provider.tsx's ThemeMode.
// Reused as-is in both the client app's Settings screen and the CRM shell
// sidebar, since both share the same ThemeProvider/localStorage key (one
// Next.js app, one root layout — see app/layout.tsx).
import { useTheme, type ThemeMode } from '@/components/theme-provider'

interface Props {
  className?: string
  labels?: { light: string; dark: string; system: string }
}

const DEFAULT_LABELS = { light: 'Light', dark: 'Dark', system: 'System' }

export default function ThemeToggle({ className = '', labels = DEFAULT_LABELS }: Props) {
  const { theme, setTheme } = useTheme()

  const options: { id: ThemeMode; label: string; icon: JSX.Element }[] = [
    {
      id: 'light', label: labels.light,
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>,
    },
    {
      id: 'dark', label: labels.dark,
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" /></svg>,
    },
    {
      id: 'system', label: labels.system,
      icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="13" rx="2" /><path d="M8 21h8M12 17v4" /></svg>,
    },
  ]

  return (
    <div
      className={`inline-flex items-center gap-0.5 p-1 rounded-full ${className}`}
      style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-2)' }}
      role="radiogroup"
      aria-label="Theme"
    >
      {options.map(opt => {
        const active = theme === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(opt.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={{
              background: active ? 'linear-gradient(135deg,#7C3AED,#D946EF)' : 'transparent',
              color: active ? '#fff' : 'var(--text-dim)',
            }}
          >
            {opt.icon}
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}