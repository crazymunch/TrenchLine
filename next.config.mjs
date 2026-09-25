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
 * ## Why `script-src` allows inline, and what it would take not to
 *
 * The first version of this policy had `script-src 'self'` with no
 * `'unsafe-inline'`, on the assumption that Next emits its bootstrap with a
 * nonce. **It does not, by default.** A production build of this app emits
 * seven inline `<script>` blocks per page carrying the App Router's flight
 * payload (`self.__next_f.push(...)`), and `'self'` blocks every one of them —
 * so the page rendered, never hydrated, and every interactive element was
 * dead. The E2E suite caught it by hanging.
 *
 * Nonces are possible and they cost something specific: they require
 * `middleware.ts` to generate one per request and rewrite the header, which
 * makes **every route dynamic** and gives up the static prerendering this app
 * currently gets for its Codex and campaign pages. That is a real
 * architectural change and it does not belong in a security pass — bolting it
 * on here would trade a measurable regression for a marginal gain.
 *
 * So `'unsafe-inline'` is here, deliberately and with its cost understood: it
 * is the part of a CSP that stops reflected-XSS payloads executing, and this
 * policy does not have it. Everything else it does have is real and none of it
 * depends on that: `frame-ancestors 'none'` stops clickjacking, `object-src
 * 'none'` kills plugin vectors, `base-uri 'self'` stops base-tag injection
 * redirecting every relative URL, `form-action 'self'` stops a form posting
 * credentials elsewhere, and `connect-src 'self'` stops exfiltration to a
 * third party.
 *
 * To tighten it later: add `middleware.ts` generating a per-request nonce,
 * emit `script-src 'self' 'nonce-...' 'strict-dynamic'`, accept dynamic
 * rendering, and re-run the E2E suite — which is what proves the app still
 * hydrates.
 *
 * `'unsafe-inline'` for styles and `'unsafe-eval'` in development are Next
 * requirements rather than choices: the framework inlines critical CSS, and
 * React Refresh needs eval.
 *
 * Fonts are self-hosted through `next/font`, so no font CDN needs to be
 * allowed and no third party learns the IP address of everyone who opens the
 * app.
 */
const csp = [
  "default-src 'self'",
  // See the note above: NOT a rubber stamp, and not removable without a nonce.
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : ''}`,
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
    return [
      { source: '/:path*', headers: securityHeaders },
      /*
        SH-1: the public share page is not for search engines.

        > `/w/<token>` renders the Roster Sheet from FD-12 read only, with no
        > builder controls, no session required, and a `noindex` header.

        A header rather than only a `<meta>` tag, and the reason is what the
        page is: a capability URL. A crawler that reached one would put a
        roster somebody shared with four friends into a search index that
        outlives the share — and a `meta` tag in the HTML only helps for a
        crawler that renders the HTML. `X-Robots-Tag` also covers the
        request that never becomes a rendered page.

        The page sets `robots: noindex` in its metadata as well. Two
        mechanisms for one rule, because the cost of the redundancy is a
        line of config and the cost of missing it is somebody else's roster
        on Google.
      */
      {
        source: '/w/:token*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }],
      },
    ];
  },
};

export default nextConfig;
