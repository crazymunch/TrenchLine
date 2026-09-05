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

  it('points at a sitemap on this origin', () => {
    expect(robots().sitemap).toBe(`${ORIGIN}/sitemap.xml`);
  });
});

describe('sitemap.xml', () => {
  it('lists the front door', () => {
    expect(sitemap().map((e) => e.url)).toContain(ORIGIN);
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
