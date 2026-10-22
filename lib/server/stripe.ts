// FILE PATH: lib/server/stripe.ts
// Real payment processing — replaces the Wise pay-by-link + webhook system
// entirely (your call: "повністю замінити Wise"). Wise is gone specifically
// because a manual pay-by-link has no reliable payer identity, which forced
// the old system into amount-based guessing (see the deleted
// findAutoConfirmMatch in lib/server/db.ts) that could go "ambiguous" and
// fall back to a human. Stripe Checkout doesn't have that problem: every
// Checkout Session carries this app's own topupRequestId in its metadata,
// so the webhook below always knows exactly which pending request a payment
// belongs to — no guessing, ever.
//
// Uses Stripe's hosted Checkout (redirect flow), not Stripe.js/Elements —
// your choice ("Stripe Checkout, рекомендую"). That means this file never
// touches card data directly; Stripe's own page collects it. This module
// only ever runs server-side (imports the Node Stripe SDK, needs the secret
// key) — never import this from a client component.
import Stripe from 'stripe'

function requireSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error(
      'STRIPE_SECRET_KEY is not set in .env.local — paste the real secret key from the Stripe Dashboard for the Poland-registered company account (Altair Solutions Sp. z o.o.), Developers → API keys. Use a sk_test_... key first to test the whole flow before switching to sk_live_....',
    )
  }
  return key
}

let cachedClient: Stripe | null = null
function stripeClient(): Stripe {
  if (!cachedClient) {
    cachedClient = new Stripe(requireSecretKey())
  }
  return cachedClient
}

export interface CreateCheckoutSessionParams {
  topupRequestId: string
  userId: string
  userName: string
  packageId: string
  priceUsd: number
  minutes: number
  successUrl: string
  cancelUrl: string
}

// Builds the line item inline with price_data instead of referencing a
// pre-created Stripe Product/Price — deliberately, so this works the moment
// real API keys are pasted in, without also requiring you to go create 4
// matching Products in the Stripe Dashboard first and keep their price IDs
// in sync with lib/minute-packages.ts by hand.
export async function createCheckoutSession(params: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session> {
  const stripe = stripeClient()
  return stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: params.userId,
    // topupRequestId is the ONLY thing the webhook trusts to know which row
    // to resolve — see app/api/webhooks/stripe/route.ts. Everything else in
    // the session (amount, package) is for Stripe's own receipt/display.
    metadata: {
      topupRequestId: params.topupRequestId,
      userId: params.userId,
      packageId: params.packageId,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          // USD (2026-09-07, reverted from EUR — your explicit call): the
          // client is charged this exact round dollar figure; Stripe
          // converts it to the account's EUR settlement currency on payout,
          // same as it would for any other cross-currency card charge. The
          // company nets slightly less than a EUR-native charge would after
          // Stripe's conversion spread — accepted trade-off for prices that
          // look like $29.99 instead of €25.99.
          currency: 'usd',
          unit_amount: Math.round(params.priceUsd * 100),
          product_data: {
            name: `Sensora — ${params.minutes} consultation minutes`,
            description: `Minute package ${params.packageId} (${params.userName})`,
          },
        },
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  }, {
    // BUG FIX (code audit): without an idempotency key, a lost/slow response
    // from this exact call (network blip, timeout) followed by a retry for
    // the same pending topup request could create two separate live Checkout
    // Sessions for one purchase — Stripe would happily let a customer
    // complete both. topupRequestId is unique per pending request (minted
    // once by createStripeTopupRequest), so reusing it here makes any retry
    // of *this* request return the original Session instead of a new one.
    idempotencyKey: `checkout-${params.topupRequestId}`,
  })
}

// Read-only status check used by the public app/payment-success page (via
// app/api/wallet/minute-package/checkout/status/route.ts) so that page can
// say something honest about whether Stripe actually shows the session as
// paid, instead of trusting the query string alone. Deliberately returns
// only a boolean to the client — never the full session object, which can
// contain the customer's email/address.
export async function isCheckoutSessionPaid(sessionId: string): Promise<boolean> {
  const stripe = stripeClient()
  const session = await stripe.checkout.sessions.retrieve(sessionId)
  return session.payment_status === 'paid'
}

// Verifies the raw webhook body against the Stripe-Signature header using
// the endpoint's real signing secret — the same "never trust an unsigned
// POST" principle the old Wise webhook used. Throws on failure; the caller
// (app/api/webhooks/stripe/route.ts) is expected to catch and 400/401.
export function verifyStripeWebhookEvent(rawBody: string, signatureHeader: string | null): Stripe.Event {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    throw new Error(
      'STRIPE_WEBHOOK_SECRET is not set — register the webhook endpoint first (admin → Top-ups → "Set up Stripe webhook"), then paste the whsec_... value it shows you into .env.local.',
    )
  }
  if (!signatureHeader) throw new Error('Missing Stripe-Signature header')
  const stripe = stripeClient()
  return stripe.webhooks.constructEvent(rawBody, signatureHeader, secret)
}

const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'checkout.session.completed',
  'checkout.session.async_payment_succeeded',
  'checkout.session.async_payment_failed',
]

// Same "one product, one price_data line item, metadata carries our own id"
// pattern as createCheckoutSession above, for the Personal Tarot Spread
// Video product (a flat $50 fee, not a wallet top-up — see
// lib/personal-reading.ts). Kept as a separate function rather than
// generalizing createCheckoutSession, because the two products resolve
// completely differently on the webhook side: a topup credits wallet
// minutes, a personal reading just flips payment_status to 'paid' so staff
// can see and record it — conflating the two metadata shapes would make the
// webhook's dispatch logic (see app/api/webhooks/stripe/route.ts) harder to
// read for no real benefit.
export interface CreatePersonalReadingCheckoutParams {
  personalReadingId: string
  userId: string
  userName: string
  priceUsd: number
  successUrl: string
  cancelUrl: string
}

export async function createPersonalReadingCheckoutSession(
  params: CreatePersonalReadingCheckoutParams,
): Promise<Stripe.Checkout.Session> {
  const stripe = stripeClient()
  return stripe.checkout.sessions.create({
    mode: 'payment',
    client_reference_id: params.userId,
    // personalReadingId (not topupRequestId) is what the webhook looks for
    // to tell these two products apart — see resolveFromSession in
    // app/api/webhooks/stripe/route.ts.
    metadata: {
      personalReadingId: params.personalReadingId,
      userId: params.userId,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(params.priceUsd * 100),
          product_data: {
            name: 'Sensora — Personal Tarot Spread Video',
            description: `Personal reading request (${params.userName})`,
          },
        },
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  }, {
    // Same idempotency reasoning as createCheckoutSession — personalReadingId
    // is minted once per pending request, so a retried call returns the
    // original Session instead of creating a second live one.
    idempotencyKey: `personal-reading-checkout-${params.personalReadingId}`,
  })
}

export async function listWebhookEndpoints(): Promise<Stripe.WebhookEndpoint[]> {
  const stripe = stripeClient()
  const result = await stripe.webhookEndpoints.list({ limit: 20 })
  return result.data
}

// Real, one-time self-serve setup (mirrors the Wise webhook self-registration
// panel this replaces) — creates a live webhook endpoint pointed at this
// deployment's /api/webhooks/stripe. Stripe only ever returns the signing
// secret (`.secret`, a whsec_... value) at the moment of creation — it
// cannot be retrieved again afterward, which is why the admin panel calling
// this has to show it once and tell you to copy it immediately.
export async function createWebhookEndpoint(callbackUrl: string): Promise<Stripe.WebhookEndpoint> {
  const stripe = stripeClient()
  return stripe.webhookEndpoints.create({
    url: callbackUrl,
    enabled_events: WEBHOOK_EVENTS,
    description: 'Sensora — minute-package top-ups (auto-managed)',
  })
}