import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/siteUrl';

/**
 * The pages worth landing on from a search.
 *
 * Deliberately short. A sitemap is a claim that these URLs are worth
 * indexing, and the other five app routes are a tool holding one person's
 * warband — see the reasoning in `robots.ts`. Listing them here while
 * disallowing them there would be the file contradicting itself, which is a
 * thing crawlers report and nobody reads.
 *
 * The three documents are listed at a low priority. Nobody searches for them,
 * but a crawler that has been told this site is deceptive should be able to
 * find the pages that say who runs it without guessing the URLs.
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
    { url: `${base}/about`, changeFrequency: 'yearly', priority: 0.4 },
    { url: `${base}/privacy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
