/**
 * The origin this deployment is served from.
 *
 * Needed by exactly two things, and both of them break quietly if it is wrong:
 * `sitemap.xml`, whose entries must be absolute URLs, and the `Sitemap:` line
 * in `robots.txt`. A sitemap full of `http://localhost:3000` is not a broken
 * sitemap — it is a sitemap Google reads, believes, and finds nothing at, and
 * nothing in the app would ever say so.
 *
 * So there is **no default**. Three real sources, in the order they should be
 * believed, and an exception if none of them is set:
 *
 * 1. `NEXT_PUBLIC_SITE_URL` — set it when the canonical public origin differs
 *    from where auth runs, which is the only case the other two get wrong.
 * 2. `NEXTAUTH_URL` — the origin NextAuth already builds its callbacks
 *    against, so on a correctly configured deployment it is the same string.
 * 3. `VERCEL_PROJECT_PRODUCTION_URL` — Vercel's *production* domain. Note this
 *    is NOT `VERCEL_URL`, which is the per-deployment preview host: publishing
 *    that in a sitemap advertises a URL that changes on every push.
 *
 * Thrown rather than defaulted for the same reason `env.ts` throws on a
 * missing `NEXTAUTH_SECRET`: a placeholder turns a configuration mistake into
 * a silent one, and this particular mistake is invisible until a search engine
 * has already indexed the wrong thing.
 */
const SOURCES = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXTAUTH_URL',
  'VERCEL_PROJECT_PRODUCTION_URL',
] as const;

/** `https://example.com` — scheme included, no trailing slash. */
export function siteUrl(): string {
  for (const key of SOURCES) {
    const raw = process.env[key]?.trim();
    if (!raw) continue;
    // Vercel supplies a bare host; the other two are full URLs.
    const withScheme = /^https?:\/\//.test(raw) ? raw : `https://${raw}`;
    return withScheme.replace(/\/+$/, '');
  }

  throw new Error(
    'No site origin is configured, so robots.txt and sitemap.xml cannot name '
    + `one. Set any of ${SOURCES.join(', ')} to the public origin this `
    + 'deployment is served from,'
    + ' e.g. NEXT_PUBLIC_SITE_URL=https://trenchline.app. '
    + 'See docs/DEPLOYMENT.md.',
  );
}
