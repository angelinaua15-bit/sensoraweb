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
  // The old client web dashboard (/crm/client) was replaced by the full web
  // version of the app — anyone with an old link lands in the app instead.
  async redirects() {
    return [{ source: '/crm/client', destination: '/', permanent: false }]
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
