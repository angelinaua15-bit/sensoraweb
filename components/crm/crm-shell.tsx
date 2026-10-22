'use client'

// FILE PATH: components/crm/crm-shell.tsx
import { ReactNode } from 'react'
import ThemeToggle from '@/components/theme-toggle'
import LanguageToggle from '@/components/language-toggle'

export interface CrmNavItem {
  id: string
  label: string
  icon: ReactNode
}

interface Props {
  brand: string
  roleLabel: string
  navItems: CrmNavItem[]
  activeId: string
  onNavigate: (id: string) => void
  headerTitle: string
  headerSubtitle?: string
  headerRight?: ReactNode
  children: ReactNode
}

export default function CrmShell({ brand, roleLabel, navItems, activeId, onNavigate, headerTitle, headerSubtitle, headerRight, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: 'var(--bg-void)' }}>
      {/* Sidebar */}
      <aside className="w-full md:w-60 flex-shrink-0 flex flex-col py-3 md:py-6 px-4"
        style={{ background: 'var(--bg-deep)', borderRight: '1px solid var(--surface-1)' }}>
        <div className="flex items-center gap-2 px-2 mb-3 md:mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/sensora-mark.png" alt="Sensora" style={{ height: 30, width: 'auto' }} />
          <div>
            <p className="text-[var(--text-primary)] font-serif text-sm tracking-[0.2em] leading-none">{brand}</p>
            <p className="text-[var(--text-dim)] text-[10px] mt-0.5">{roleLabel}</p>
          </div>
        </div>

        <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible">
          {navItems.map(item => {
            const active = item.id === activeId
            return (
              <button key={item.id} onClick={() => onNavigate(item.id)}
                className="flex items-center gap-2 md:gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all whitespace-nowrap flex-shrink-0"
                style={{
                  background: active ? 'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(217,70,239,0.15))' : 'transparent',
                  color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                  border: active ? '1px solid rgba(217,70,239,0.3)' : '1px solid transparent',
                }}>
                <span className="flex-shrink-0" style={{ color: active ? '#D946EF' : 'var(--text-dim)' }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="md:mt-auto pt-3 md:pt-6 flex flex-row flex-wrap md:flex-col items-center md:items-stretch gap-2 md:gap-3">
          <ThemeToggle className="w-full justify-center" />
          <LanguageToggle className="w-full justify-center" />
          <a href="/" className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-[var(--text-dim)] hover:text-[var(--text-muted)] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            Back to app
          </a>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-3 px-4 md:px-8 py-4 md:py-6" style={{ borderBottom: '1px solid var(--surface-1)' }}>
          <div>
            <h1 className="text-[var(--text-primary)] text-2xl font-serif font-light">{headerTitle}</h1>
            {headerSubtitle && <p className="text-[var(--text-dim)] text-sm mt-1">{headerSubtitle}</p>}
          </div>
          {headerRight}
        </header>
        <div className="px-4 md:px-8 py-4 md:py-6 max-w-6xl">
          {children}
        </div>
      </main>
    </div>
  )
}