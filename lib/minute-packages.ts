// FILE PATH: lib/minute-packages.ts
// Plain shared data — deliberately NOT under lib/server/, so it can be
// imported from both client components (premium-modal.tsx, for display) and
// server routes (for crediting), unlike lib/server/db.ts which pulls in
// Supabase access.
//
// Real, confirmed numbers (KING KONG LAB Telegram thread), replacing the old
// 3-tier "unlimited" Premium subscription. History of how these get paid
// for: Stripe (Ukraine-linked account, no valid payout country) → Wise pay
// by link (real, but no webhook, no payer identity, manual admin
// confirmation) → NOW: Stripe again, this time via a Poland-registered
// company account (Altair Solutions Sp. z o.o.), which does have a
// supported payout country. See CHANGES.md for the removal/re-add notes on
// both switches.
//
// CURRENCY: USD → EUR (2026-08-28) → back to USD (2026-09-07, your explicit
// call). The EUR round trip was so the Checkout price currency matched
// Stripe's EUR settlement account; you decided the recognizable round
// dollar figures matter more for how the pricing looks to clients than the
// small FX spread Stripe itself takes converting USD → EUR on payout — that
// conversion is Stripe's job now, same as it is for any card charged in a
// different currency than the customer's own. Back to the original numbers:
//   $29.99, $59.99, $119.99, $239.99
// This does NOT change FIXED_PRICE_PER_MIN or wallet-balance accounting in
// lib/server/db.ts (explicit decision: package sticker price only, internal
// per-minute economy stays as-is) — resolveTopupRequest credits the wallet
// by minutes × FIXED_PRICE_PER_MIN regardless of what currency the package
// was actually purchased in, so this rename is safe in isolation.
//
// No wiseLink/priceId field here anymore — real checkout
// (app/api/wallet/minute-package/checkout/route.ts) builds the Stripe
// Checkout Session's line item directly from baseMinutes/bonusMinutes/
// priceUsd below (see lib/server/stripe.ts createCheckoutSession), so this
// file stays the single source of truth for both price display and what a
// client is actually charged — nothing to keep in sync by hand in a
// separate Stripe Product.
// REMOVED (2026-09-08): mp_test was a temporary $1/1-minute entry used to
// prove the Stripe webhook auto-confirms a real payment end-to-end after the
// duplicate-endpoint/wrong-secret bug was fixed. Confirmed working — the
// 2026-09-07 test row in topup_requests shows resolved_by:
// 'stripe-webhook:auto' (a real Stripe webhook resolved it automatically,
// not a manual admin click) — so its job is done. Leaving a live $1 charge
// with no bonus minutes in the real package list would have been a genuine
// pre-launch defect (a real customer could buy it, confused about why it's
// there), so it's removed rather than left "to clean up later."
export const MINUTE_PACKAGES = [
  { id: 'mp15', baseMinutes: 15, bonusMinutes: 5, priceUsd: 29.99 },
  { id: 'mp30', baseMinutes: 30, bonusMinutes: 10, priceUsd: 59.99 },
  { id: 'mp60', baseMinutes: 60, bonusMinutes: 20, priceUsd: 119.99 },
  { id: 'mp120', baseMinutes: 120, bonusMinutes: 40, priceUsd: 239.99 },
] as const

export type MinutePackageId = typeof MINUTE_PACKAGES[number]['id']

// Mirrors FIXED_PRICE_PER_MIN in lib/server/db.ts (server-only, can't be
// imported client-side) — the real, fixed rate every consultation actually
// charges at, and what a new expert's price_per_min starts from. Duplicated
// here (this file is the one already shared between client components and
// server routes) rather than guessed at, so the home-screen wallet balance
// can show "≈X min" using the app's real rate instead of an invented one.
// If FIXED_PRICE_PER_MIN in lib/server/db.ts ever changes, update this too.
export const PRICE_PER_MIN_USD = 2.00

// Mirrors the `referrerReward = 0.1` default in redeemReferral()
// (lib/server/db.ts) — the real per-friend invite bonus, still flagged
// there as "an unconfirmed placeholder" pending a final number from you.
// At the $2/min rate above that's 3 seconds, not a fraction of a minute —
// too small to show as "0 min" (looks broken), so referral-card.tsx shows
// it in seconds instead. Keep this in sync with db.ts if the reward changes.
export const REFERRAL_BONUS_USD = 0.10