/**
 * The one value robots.txt and sitemap.xml cannot get wrong quietly.
 *
 * A sitemap naming `http://localhost:3000` is not a broken sitemap. It is a
 * sitemap Google fetches, believes, and finds nothing at — and no part of the
 * running app would ever mention it. So `siteUrl()` has no default, and these
 * assert that it stays that way.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { siteUrl } from '../siteUrl';

const KEYS = ['NEXT_PUBLIC_SITE_URL', 'NEXTAUTH_URL', 'VERCEL_PROJECT_PRODUCTION_URL'] as const;

let saved: Record<string, string | undefined>;
beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe('siteUrl', () => {
  it('throws when nothing is configured, naming what to set', () => {
    expect(() => siteUrl()).toThrow(/NEXT_PUBLIC_SITE_URL/);
    expect(() => siteUrl()).toThrow(/NEXTAUTH_URL/);
  });

  it('prefers the explicit one', () => {
    process.env.NEXTAUTH_URL = 'https://auth.example';
    process.env.NEXT_PUBLIC_SITE_URL = 'https://canonical.example';
    expect(siteUrl()).toBe('https://canonical.example');
  });

  it('falls back to where auth already runs', () => {
    process.env.NEXTAUTH_URL = 'https://auth.example';
    expect(siteUrl()).toBe('https://auth.example');
  });

  it('takes Vercel’s production domain last, and adds the scheme it omits', () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = 'trenchline.app';
    expect(siteUrl()).toBe('https://trenchline.app');
  });

  it('never reads VERCEL_URL', () => {
    /*
      `VERCEL_URL` is the per-deployment preview host — a different string on
      every push. A sitemap built from it advertises URLs that stop existing,
      which is worse than no sitemap.
    */
    process.env.VERCEL_URL = 'trenchline-git-abc123.vercel.app';
    expect(() => siteUrl()).toThrow();
    delete process.env.VERCEL_URL;
  });

  it('drops a trailing slash, so nothing renders a double one', () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://trenchline.app/';
    expect(siteUrl()).toBe('https://trenchline.app');
  });

  it('treats whitespace as unset rather than as an origin', () => {
    process.env.NEXT_PUBLIC_SITE_URL = '   ';
    process.env.NEXTAUTH_URL = 'https://auth.example';
    expect(siteUrl()).toBe('https://auth.example');
  });
});
