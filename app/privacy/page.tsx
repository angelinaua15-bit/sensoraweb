// FILE PATH: app/privacy/page.tsx
// Public, crawlable version of the Privacy Policy — reachable at
// sensora.space/privacy without signing in.
// REPLACED 2026-09-11: renders the final, lawyer-approved Privacy Policy
// (PRIVACY_POLICY_SECTIONS in lib/legal-content.ts — English translation of
// the Ukrainian original in SENSORA_FINAL_Privacy_UA_11-09-2026.docx / the
// combined legal pack, at Angelina's request; see the translation note at
// the top of lib/legal-content.ts). Same data also feeds the in-app
// registration consent modal (components/screens/registration-screen.tsx)
// and the Settings → Privacy Policy screen
// (components/screens/privacy-policy-screen.tsx) — all three now show this
// one, single, final text.
import Link from 'next/link'
import { PRIVACY_POLICY_SECTIONS, PRIVACY_POLICY_UPDATED } from '@/lib/legal-content'

export const metadata = {
  title: 'Privacy Policy — Sensora',
  description: 'Privacy Policy for the Sensora esoteric consultations platform.',
}

export default function PrivacyPage() {
  return (
    <div className="h-dvh overflow-y-auto sensora-bg">
      <div className="max-w-2xl mx-auto px-5 py-10">
        <Link href="/" className="text-[#9D5FF5] text-xs underline">
          ← Back to Sensora
        </Link>
        <h1 className="text-[var(--text-primary)] text-2xl font-serif mt-4 mb-1">Privacy Policy</h1>
        <p className="text-[var(--text-dim)] text-[11px] mb-8">Last updated: {PRIVACY_POLICY_UPDATED}</p>
        <div className="flex flex-col gap-6 pb-16">
          {PRIVACY_POLICY_SECTIONS.map(section => (
            <div key={section.heading}>
              <h2 className="text-[var(--text-primary)] text-sm font-medium mb-2">{section.heading}</h2>
              <div className="flex flex-col gap-2">
                {section.body.map((paragraph, i) => (
                  <p key={i} className="text-[var(--text-muted)] text-sm leading-relaxed">{paragraph}</p>
                ))}
              </div>
            </div>
          ))}

          {/* Added 2026-09-10, same accuracy review as the Cookie Policy's
              equivalent block — real clickable cross-links. */}
          <div>
            <h3 className="text-[var(--text-primary)] text-xs font-medium mb-2">Related policies</h3>
            <p className="text-[var(--text-muted)] text-sm leading-relaxed flex flex-col gap-1">
              <Link href="/cookies" className="text-[#9D5FF5] underline w-fit">Cookie Policy</Link>
              <Link href="/terms" className="text-[#9D5FF5] underline w-fit">Terms of Use</Link>
              <Link href="/contacts" className="text-[#9D5FF5] underline w-fit">Contact &amp; company registration details</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}