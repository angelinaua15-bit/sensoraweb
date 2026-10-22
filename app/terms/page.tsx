// FILE PATH: app/terms/page.tsx
// Public, crawlable Terms of Use — reachable at sensora.space/terms without
// signing in.
// REPLACED 2026-09-11: renders the final, lawyer-approved Terms of Use
// (TERMS_OF_USE_SECTIONS in lib/legal-content.ts — English translation of
// the Ukrainian original in SENSORA_FINAL_Terms_UA_11-09-2026.docx / the
// combined legal pack, at Angelina's request since the site's audience
// (Section 1.5: US/Canada) and UI are English; see the translation note at
// the top of lib/legal-content.ts). The minute-package pricing table
// (Section 10) is rendered here from the real MINUTE_PACKAGES data
// (lib/minute-packages.ts) rather than a hand-copied table, so it can never
// drift out of sync with what checkout actually charges.
import Link from 'next/link'
import { TERMS_OF_USE_SECTIONS, TERMS_OF_USE_UPDATED } from '@/lib/legal-content'
import { MINUTE_PACKAGES } from '@/lib/minute-packages'

export const metadata = {
  title: 'Terms of Use — Sensora',
  description: 'Terms of Use for the Sensora esoteric consultations platform.',
}

export default function TermsPage() {
  // Render sections up to and including "10. ..." then the real pricing
  // table, then the rest — same anchoring pattern as the Cookie Policy page.
  const tableIndex = TERMS_OF_USE_SECTIONS.findIndex(s => s.heading.startsWith('10.'))
  const before = TERMS_OF_USE_SECTIONS.slice(0, tableIndex + 1)
  const after = TERMS_OF_USE_SECTIONS.slice(tableIndex + 1)

  const renderSection = (section: (typeof TERMS_OF_USE_SECTIONS)[number]) => (
    <div key={section.heading}>
      <h2 className="text-[var(--text-primary)] text-sm font-medium mb-2">{section.heading}</h2>
      <div className="flex flex-col gap-2">
        {section.body.map((paragraph, i) => (
          <p key={i} className="text-[var(--text-muted)] text-sm leading-relaxed">{paragraph}</p>
        ))}
      </div>
    </div>
  )

  return (
    <div className="h-dvh overflow-y-auto sensora-bg">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link href="/" className="text-[#9D5FF5] text-xs underline">
          ← Back to Sensora
        </Link>
        <h1 className="text-[var(--text-primary)] text-2xl font-serif mt-4 mb-1">Terms of Use</h1>
        <p className="text-[var(--text-dim)] text-[11px] mb-8">Last updated: {TERMS_OF_USE_UPDATED}</p>
        <div className="flex flex-col gap-6 pb-16">
          {before.map(renderSection)}

          <div className="overflow-x-auto rounded-xl border border-[var(--surface-1)]">
            <table className="w-full min-w-[480px] text-left border-collapse">
              <thead>
                <tr className="bg-[var(--surface-1)]">
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-[var(--text-primary)]">Price</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-[var(--text-primary)]">Base minutes</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-[var(--text-primary)]">Bonus minutes</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-[var(--text-primary)]">Total</th>
                </tr>
              </thead>
              <tbody>
                {MINUTE_PACKAGES.map((pkg, i) => (
                  <tr key={pkg.id} className={i % 2 === 1 ? 'bg-[rgba(255,255,255,0.02)]' : undefined}>
                    <td className="px-3 py-2.5 text-[12px] text-[var(--text-primary)] align-top whitespace-nowrap">${pkg.priceUsd.toFixed(2)}</td>
                    <td className="px-3 py-2.5 text-[12px] text-[var(--text-muted)] align-top">{pkg.baseMinutes}</td>
                    <td className="px-3 py-2.5 text-[12px] text-[var(--text-muted)] align-top">{pkg.bonusMinutes}</td>
                    <td className="px-3 py-2.5 text-[12px] text-[var(--text-muted)] align-top">{pkg.baseMinutes + pkg.bonusMinutes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {after.map(renderSection)}

          <div>
            <h3 className="text-[var(--text-primary)] text-xs font-medium mb-2">Related policies</h3>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed flex flex-col gap-1">
              <Link href="/privacy" className="text-[#9D5FF5] underline w-fit">Privacy Policy</Link>
              <Link href="/cookies" className="text-[#9D5FF5] underline w-fit">Cookie Policy</Link>
              <Link href="/contacts" className="text-[#9D5FF5] underline w-fit">Contact &amp; company registration details</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
