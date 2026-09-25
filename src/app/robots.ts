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
 *
 * `/about`, `/privacy` and `/terms` are allowed for a different reason: they
 * are how an automated reviewer — Safe Browsing among them — finds out who
 * runs this site and what it does with an address. A site whose only crawlable
 * pages are a sign-in form and a rules index looks like exactly what this one
 * was mistakenly flagged as. They must stay crawlable.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/codex', '/about', '/privacy', '/terms'],
      disallow: [
        '/api/',
        // The tool, with somebody's data in it.
        '/roster',
        '/play',
        '/campaign',
        '/directory',
        '/customizer',
        /*
          SH-1's share page. A capability URL — whoever holds the token reads the
          roster — so an indexed one outlives the share, and "Stop sharing" cannot
          take back a search result.

          The third mechanism for the same rule, after the page's `noindex`
          metadata and the `X-Robots-Tag` header in `next.config.mjs`. It is the
          weakest of the three (a crawler has to ask for this file, and a link
          shared in a chat may reach one that does not) and the cheapest, which is
          why all three are here.
        */
        '/w/',
      ],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
    host: siteUrl(),
  };
}
