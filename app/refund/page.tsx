// FILE PATH: app/refund/page.tsx
// Public, crawlable Refund Policy — reachable at sensora.space/refund
// without signing in.
// REPLACED 2026-09-11: the final lawyer-approved legal pack folds refund
// terms into Terms of Use Section 15 rather than keeping a separate Refund
// Policy document — the pack's own closing clause (Terms 24.5) lists only
// /terms, /privacy, /cookies and /contacts as the current public documents,
// not /refund. Rather than deleting this URL (something else may already
// link to it), this page now mirrors that same Section 15 text (English
// translation, same note as lib/legal-content.ts) and points to the full
// Terms for the rest.
import Link from 'next/link'
import { REFUND_POLICY_SECTIONS, REFUND_POLICY_UPDATED } from '@/lib/legal-content'

export const metadata = {
  title: 'Refund Policy — Sensora',
  description: 'Refund policy for Sensora wallet top-ups and minute packages.',
}

export default function RefundPage() {
  return (
    <div className="h-dvh overflow-y-auto sensora-bg">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link href="/" className="text-[#9D5FF5] text-xs underline">
          ← Back to Sensora
        </Link>
        <h1 className="text-[var(--text-primary)] text-2xl font-serif mt-4 mb-1">Refund Policy</h1>
        <p className="text-[var(--text-dim)] text-[11px] mb-8">Last updated: {REFUND_POLICY_UPDATED}</p>
        <div className="flex flex-col gap-6 pb-16">
          {REFUND_POLICY_SECTIONS.map(section => (
            <div key={section.heading}>
              <h2 className="text-[var(--text-primary)] text-sm font-medium mb-2">{section.heading}</h2>
              <div className="flex flex-col gap-2">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="text-[var(--text-muted)] text-sm leading-relaxed">{paragraph}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}