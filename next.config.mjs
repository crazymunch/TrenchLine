/**
 * Response headers.
 *
 * There were none. Not weak ones — the repository defined no Content Security
 * Policy, no framing protection, no MIME-sniff protection, no referrer policy
 * and no permissions policy, so every one of them was whatever the host
 * happened to send.
 *
 * These are defence in depth and nothing more. They do not fix an
 * authorization hole and they are not a substitute for one being fixed; they
 * reduce what a bug that does exist can be turned into.
 *
 * HSTS is deliberately NOT set here. It belongs at the TLS terminator, it is
 * effectively irreversible for the length of its max-age, and setting it from
 * application code on a domain that might still serve something over HTTP is
 * how a subdomain becomes unreachable.
 */

/**
 * The Content Security Policy.
 *
 * `'unsafe-inline'` for styles, and `'unsafe-eval'` in development, are both
 * Next.js requirements rather than choices: the framework inlines critical CSS,
 * and React Refresh needs eval. `'unsafe-inline'` for scripts is NOT here —
 * Next emits its bootstrap with a nonce or a hash, and allowing inline scripts
 * would give up most of what a CSP is for.
 *
 * Fonts are self-hosted through `next/font`, so no font CDN needs to be
 * allowed and no third party learns the IP address of everyone who opens the
 * app.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
  // Next inlines critical CSS; there is no way to avoid this one today.
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
  "font-src 'self' data:",
  // Same-origin API only. Sync talks to this app and nothing else.
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: csp },
  // Belt and braces with `frame-ancestors`, for anything that predates CSP.
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // A cross-origin request carries the origin and nothing more, so a warband
  // id or an invite code in a path never reaches a third party's logs.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    // This app needs none of these; saying so stops an embedded anything
    // asking for them on its behalf.
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /*
    The build lints.

    `eslint: { ignoreDuringBuilds: true }` read like a backlog being deferred.
    It was not: there was no ESLint config and no ESLint dependency, so the
    flag suppressed a linter that did not exist, and the build had never once
    checked anything. Turning it on found four handlers wired to nothing —
    including a bug reporter with no send button and a Chronicle with no save —
    and two hooks called after an early return.

    See eslint.config.mjs for which rules are errors and why.
  */
  typescript: {
    ignoreBuildErrors: false,
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default nextConfig;
