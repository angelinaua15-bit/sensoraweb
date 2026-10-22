// Main Sensora app (mobile app + all API routes). Override with the
// MAIN_APP_URL env var on Vercel if it ever moves.
const MAIN_APP = (process.env.MAIN_APP_URL || 'https://sensora.space').replace(/\/$/, '')

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // ADDED (code audit): no security headers were set anywhere — no
  // middleware.ts and nothing here. Worth having regardless of whether a
  // real payment processor is connected right now (see CHANGES.md — LiqPay
  // is currently pulled out, demo mode), since the app displays real
  // wallet/balance data — blocking the app from being framed by another
  // site and adding the standard hardening headers is cheap insurance.
  // Deliberately no CSP here: this app doesn't inline any 3rd-party
  // scripts/styles today, but a hand-written CSP risks silently breaking
  // something (fonts, etc.) without a real test pass first — safer to add
  // narrowly-scoped headers now and layer in a CSP later once it's been
  // tested against every page.
  // ── sensoraweb (desktop/tablet copy) ──────────────────────────────────────
  // This repo has NO backend and NO secret keys. Every /api/* call is proxied
  // to the main app at sensora.space, so accounts, minutes, chats, payments and
  // the database are exactly the same as in the mobile app. Referral links and
  // the CRM also live on the main app.
  async rewrites() {
    return [
      { source: '/api/:path*', destination: `${MAIN_APP}/api/:path*` },
      { source: '/r/:code', destination: `${MAIN_APP}/r/:code` },
    ]
  },
  async redirects() {
    return [
      { source: '/crm', destination: `${MAIN_APP}/crm`, permanent: false },
      { source: '/crm/:path*', destination: `${MAIN_APP}/crm/:path*`, permanent: false },
    ]
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ]
  },
}

export default nextConfig