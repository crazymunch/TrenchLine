import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';

/**
 * The two pages worth landing on from a search.
 *
 * Deliberately short. A sitemap is a claim that these URLs are worth
 * indexing, and the other five app routes are a tool holding one person's
 * warband — see the reasoning in `robots.ts`. Listing them here while
 * disallowing them there would be the file contradicting itself, which is a
 * thing crawlers report and nobody reads.
 *
 * `/roster/[id]` is not here and must never be: it is per-user, and a sitemap
 * is the one place in this app that would happily publish a list of them.
 *
 * No `lastModified`. The honest value is the deploy time, which would mark
 * every page as changed on every push whether or not it did — and a
 * `lastModified` that is always today is one a crawler learns to ignore.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return [
    { url: base, changeFrequency: 'monthly', priority: 1 },
    { url: `${base}/codex`, changeFrequency: 'monthly', priority: 0.6 },
  ];
}
