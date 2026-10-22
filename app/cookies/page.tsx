// FILE PATH: app/cookies/page.tsx
// Public, crawlable Cookie Policy — reachable at sensora.space/cookies
// without signing in.
// REPLACED 2026-09-11: renders the final, lawyer-approved Cookie Policy
// (COOKIE_POLICY_SECTIONS / COOKIE_TABLE in lib/legal-content.ts — English
// translation of the Ukrainian original in
// SENSORA_FINAL_LEGAL_PACK_UA_11-09-2026.docx, at Angelina's request since
// the site's audience and UI are English; see the translation note at the
// top of lib/legal-content.ts). The old drafting-stage version had a
// category badge (Strictly Necessary/Functional/Analytics) and a separate
// "categories we don't use" list — the final approved text doesn't use that
// structure, so both are removed here rather than kept as extra content the
// lawyer didn't write. Table columns match the approved document: Name /
// Type / Purpose / Duration / Note.
import Link from 'next/link'
import {
  COOKIE_POLICY_SECTIONS,
  COOKIE_POLICY_UPDATED,
  COOKIE_TABLE,
} from '@/lib/legal-content'

export const metadata = {
  title: 'Cookie Policy — Sensora',
  description: 'The complete list of cookies and local storage Sensora uses, and why.',
}

export default function CookiesPage() {
  // Render sections up to and including "3. ..." then the table, then the
  // remaining sections — keeps the table anchored right where the policy
  // text says "the table below".
  const tableIndex = COOKIE_POLICY_SECTIONS.findIndex(s => s.heading.startsWith('3.'))
  const before = COOKIE_POLICY_SECTIONS.slice(0, tableIndex + 1)
  const after = COOKIE_POLICY_SECTIONS.slice(tableIndex + 1)

  const renderSection = (section: (typeof COOKIE_POLICY_SECTIONS)[number]) => (
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
      <div className="max-w-3xl mx-auto px-5 py-10">
        <Link href="/" className="text-[#9D5FF5] text-xs underline">
          ← Back to Sensora
        </Link>
        <h1 className="text-[var(--text-primary)] text-2xl font-serif mt-4 mb-1">Cookie Policy</h1>
        <p className="text-[var(--text-dim)] text-[11px] mb-8">Last updated: {COOKIE_POLICY_UPDATED}</p>

        <div className="flex flex-col gap-6 pb-16">
          {before.map(renderSection)}

          {/* Structured table — exact, current list. */}
          <div className="overflow-x-auto rounded-xl border border-[var(--surface-1)]">
            <table className="w-full min-w-[720px] text-left border-collapse">
              <thead>
                <tr className="bg-[var(--surface-1)]">
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-[var(--text-primary)]">Name</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-[var(--text-primary)]">Type</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-[var(--text-primary)]">Purpose</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-[var(--text-primary)]">Duration</th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold text-[var(--text-primary)]">Note</th>
                </tr>
              </thead>
              <tbody>
                {COOKIE_TABLE.map((row, i) => (
                  <tr key={row.name} className={i % 2 === 1 ? 'bg-[rgba(255,255,255,0.02)]' : undefined}>
                    <td className="px-3 py-2.5 text-[12px] font-mono text-[var(--text-primary)] align-top whitespace-nowrap">{row.name}</td>
                    <td className="px-3 py-2.5 text-[12px] text-[var(--text-muted)] align-top whitespace-nowrap">{row.type}</td>
                    <td className="px-3 py-2.5 text-[12px] text-[var(--text-muted)] align-top">{row.purpose}</td>
                    <td className="px-3 py-2.5 text-[12px] text-[var(--text-muted)] align-top whitespace-nowrap">{row.duration}</td>
                    <td className="px-3 py-2.5 text-[12px] text-[var(--text-muted)] align-top">{row.note}</td>
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
              <Link href="/terms" className="text-[#9D5FF5] underline w-fit">Terms of Use</Link>
              <Link href="/contacts" className="text-[#9D5FF5] underline w-fit">Contact &amp; company registration details</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
