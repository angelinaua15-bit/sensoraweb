'use client'

// FILE PATH: components/phone-frame.tsx
import { ReactNode } from 'react'

interface PhoneFrameProps {
  children: ReactNode
  label?: string
  labelNum?: string
}

export function PhoneFrame({ children, label, labelNum }: PhoneFrameProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className="relative w-[320px] h-[640px] rounded-[40px] overflow-hidden"
        style={{
          background: 'var(--bg-void)',
          border: '2px solid var(--surface-3)',
          boxShadow: '0 0 0 6px var(--surface-1), 0 32px 64px rgba(0,0,0,0.6)',
        }}
      >
        {/* Dynamic Island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 w-28 h-7 bg-black rounded-full" />
        {/* Screen content */}
        <div className="phone-screen absolute inset-0 pt-12">
          {children}
        </div>
      </div>
      {label && (
        <p className="text-[var(--text-muted)] text-sm font-sans">
          {labelNum && <span className="text-[var(--text-dim)] mr-1">{labelNum} ·</span>}
          {label}
        </p>
      )}
    </div>
  )
}