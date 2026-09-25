/**
 * robots.txt and sitemap.xml agree with each other.
 *
 * The failure worth guarding is not a typo — it is the two files drifting
 * apart. A sitemap that lists a path robots.txt disallows is a file
 * contradicting itself; crawlers report it and nobody reads the report.
 *
 * And the one path that must never be listed anywhere: `/roster/[id]` is one
 * person's warband, and a sitemap is the only place in this app that would
 * cheerfully publish a list of them.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import robots from '../robots';
import sitemap from '../sitemap';

const ORIGIN = 'https://example.test';
let saved: string | undefined;
beforeAll(() => {
  saved = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = ORIGIN;
});
afterAll(() => {
  if (saved === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
  else process.env.NEXT_PUBLIC_SITE_URL = saved;
});

const rules = () => {
  const r = robots().rules;
  return Array.isArray(r) ? r[0] : r;
};
const asList = (v: string | string[] | undefined) =>
  (v === undefined ? [] : Array.isArray(v) ? v : [v]);

describe('robots.txt', () => {
  it('keeps crawlers out of the API', () => {
    expect(asList(rules().disallow)).toContain('/api/');
  });

  it('keeps them out of every route that holds a warband', () => {
    const disallowed = asList(rules().disallow);
    for (const path of ['/roster', '/play', '/campaign', '/directory', '/customizer']) {
      expect(disallowed, `${path} is crawlable`).toContain(path);
    }
  });

  it('keeps them out of the share page, which is a capability URL', () => {
    /*
      SH-1. `/w/<token>` is readable by whoever holds the token, so an indexed
      one outlives the share and "Stop sharing" cannot take back a search result.
      This is the third mechanism for that rule — the page's `noindex` metadata
      and the `X-Robots-Tag` header in `next.config.mjs` are the other two — and
      the weakest of the three, which is why all three are asserted.
    */
    expect(asList(rules().disallow)).toContain('/w/');
  });

  it('leaves the documents crawlable', () => {
    /*
      The reason these three are ALLOWED rather than merely not disallowed.

      trenchline.app was flagged as a deceptive page. Nothing was compromised;
      what the site had was the profile — a new domain, a password form, a
      Google button, and no crawlable page saying who ran it. Disallowing
      /privacy to tidy up the sitemap would recreate exactly that, so the
      allowance is asserted rather than assumed.
    */
    const disallowed = asList(rules().disallow);
    const allowed = asList(rules().allow);
    for (const path of ['/about', '/privacy', '/terms']) {
      expect(disallowed, `${path} is blocked from crawlers`).not.toContain(path);
      expect(allowed, `${path} is not explicitly allowed`).toContain(path);
    }
  });

  it('points at a sitemap on this origin', () => {
    expect(robots().sitemap).toBe(`${ORIGIN}/sitemap.xml`);
  });
});

describe('sitemap.xml', () => {
  it('lists the front door', () => {
    expect(sitemap().map((e) => e.url)).toContain(ORIGIN);
  });

  it('lists the three documents', () => {
    const urls = sitemap().map((e) => e.url);
    for (const path of ['/about', '/privacy', '/terms']) {
      expect(urls, `${path} is missing from the sitemap`).toContain(`${ORIGIN}${path}`);
    }
  });

  it('lists nothing robots.txt disallows', () => {
    const disallowed = asList(rules().disallow);
    for (const entry of sitemap()) {
      const path = entry.url.slice(ORIGIN.length) || '/';
      for (const bad of disallowed) {
        expect(
          path.startsWith(bad) && bad !== '/',
          `${path} is in the sitemap AND disallowed by robots.txt`,
        ).toBe(false);
      }
    }
  });

  it('never publishes a warband URL', () => {
    for (const entry of sitemap()) expect(entry.url).not.toMatch(/\/roster\//);
  });

  it('claims no lastModified it cannot support', () => {
    // The only honest value here is the deploy time, which marks every page as
    // changed on every push — a signal a crawler learns to ignore.
    for (const entry of sitemap()) expect(entry.lastModified).toBeUndefined();
  });
});
