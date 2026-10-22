// FILE PATH: app/contacts/page.tsx
// Public "who runs this service" page — reachable at sensora.space/contacts.
// LiqPay's site checklist (and most payment providers) expect a public
// contact point and a description of what the site sells. The legal-entity
// fields (BUSINESS_LEGAL_NAME, BUSINESS_TAX_ID_LABEL, BUSINESS_ADDRESS in
// lib/legal-content.ts) were placeholders when this file was first written;
// FIX (2026-09-10): they have since been filled in with real, bank-verified
// values (this comment was stale and claimed they were still placeholders —
// caught during a legal-accuracy review). Cookie Policy Section 9 and
// Privacy Policy's "Who operates Sensora" now show the same values too.
import Link from 'next/link'
import { SUPPORT_EMAIL, BUSINESS_LEGAL_NAME, BUSINESS_TAX_ID_LABEL, BUSINESS_ADDRESS } from '@/lib/legal-content'

export const metadata = {
  title: 'Contact — Sensora',
  description: 'Contact information for the Sensora esoteric consultations platform.',
}

export default function ContactsPage() {
  return (
    <div className="h-dvh overflow-y-auto sensora-bg">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link href="/" className="text-[#9D5FF5] text-xs underline">
          ← Back to Sensora
        </Link>
        <h1 className="text-[var(--text-primary)] text-2xl font-serif mt-4 mb-1">Contact</h1>
        <p className="text-[var(--text-dim)] text-[11px] mb-8">Sensora — live astrology, numerology, Tarot and compatibility consultations.</p>

        <div className="flex flex-col gap-6 pb-16">
          <div>
            <h2 className="text-[var(--text-primary)] text-sm font-medium mb-2">Support</h2>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">
              Email: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[#9D5FF5] underline">{SUPPORT_EMAIL}</a>
            </p>
          </div>

          <div>
            <h2 className="text-[var(--text-primary)] text-sm font-medium mb-2">Operated by</h2>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">{BUSINESS_LEGAL_NAME}</p>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">{BUSINESS_TAX_ID_LABEL}</p>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed">{BUSINESS_ADDRESS}</p>
          </div>

          <div>
            <h2 className="text-[var(--text-primary)] text-sm font-medium mb-2">More information</h2>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed flex flex-col gap-1">
              <Link href="/terms" className="text-[#9D5FF5] underline w-fit">Terms of Use</Link>
              <Link href="/privacy" className="text-[#9D5FF5] underline w-fit">Privacy Policy</Link>
              <Link href="/refund" className="text-[#9D5FF5] underline w-fit">Refund Policy</Link>
              <Link href="/cookies" className="text-[#9D5FF5] underline w-fit">Cookie Policy</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}