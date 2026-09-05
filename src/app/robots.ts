import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';

/**
 * What a crawler may index.
 *
 * The app has one page written for someone who has not been inside — `/` — and
 * six that are a tool with a person's warband in it. Indexing the second kind
 * is not a privacy control (nothing here is protected by being unlisted; the
 * API's ownership guards are what protect it) but it is wrong in every other
 * way: `/roster/wb-3f2a` is a URL with one reader, it 404s or redirects for
 * everyone else, and a search result leading to it is a bad result.
 *
 * `/api/` is disallowed for the same reason and one more: a crawler walking
 * the account routes is a crawler tripping the rate limiter that
 * `lib/api/rateLimit.ts` exists to run.
 *
 * `/codex` is the interesting judgement call and is ALLOWED. It carries no
 * warband — it is the published rules, searchable — so it is genuinely useful
 * to land on from a search, and it is the app's honest answer to somebody
 * looking up a keyword.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/codex'],
      disallow: [
        '/api/',
        // The tool, with somebody's data in it.
        '/roster',
        '/play',
        '/campaign',
        '/directory',
        '/customizer',
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
