/**
 * The one route that talks to somebody else's server.
 *
 * What is asserted here is the contract CI-1 states: only the id is sent,
 * nothing is cached, and every way the fetch can go wrong is an error the
 * user sees **with the upstream status in it** (rule 2). There is no cached
 * copy and no partial warband to fall back to, and a route that quietly
 * returned one would be the `githubSync` fabrication wearing a new hat.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { POST } from '../import/trench-companion/route';
import { resetRateLimits } from '@/lib/api/rateLimit';

/** The parts of a `NextRequest` this route reads. */
const request = (body: unknown) => ({
  headers: new Headers({ 'content-type': 'application/json' }),
  text: async () => JSON.stringify(body),
} as never);

const call = async (body: unknown) => {
  const res = await POST(request(body));
  return { status: res.status, body: await res.json(), headers: res.headers };
};

const upstream = (init: { status?: number; body?: string }) => {
  const seen: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    seen.push(String(url));
    return new Response(init.body ?? '', { status: init.status ?? 200 });
  });
  return seen;
};

const WARBAND = JSON.stringify({ name: 'Spuds', models: [] });

beforeEach(() => {
  vi.unstubAllGlobals();
  resetRateLimits();
});

describe('POST /api/import/trench-companion', () => {
  it('sends only the id, to their endpoint, with the cache off', async () => {
    const seen = upstream({ body: JSON.stringify({ warband_data: WARBAND }) });
    const res = await call({ ref: 'https://trench-companion.com/warband/detail/505410' });

    expect(res.status).toBe(200);
    expect(seen).toEqual([
      'https://synod.trench-companion.com/wp-json/synod/v1/warband/505410',
    ]);
    expect(res.headers.get('cache-control')).toBe('no-store');
  });

  it('hands the envelope back exactly as it arrived', async () => {
    upstream({ body: JSON.stringify({ warband_id: 505410, warband_data: WARBAND }) });
    const res = await call({ ref: '505410' });
    expect(res.body).toEqual({ warband_id: 505410, warband_data: WARBAND });
  });

  it('refuses a link that is not a share link, without calling anybody', async () => {
    const seen = upstream({ body: '{}' });
    const res = await call({ ref: 'https://example.com/warband/detail/1' });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('example.com');
    expect(seen).toEqual([]);
  });

  it('passes the upstream status through on a non-200', async () => {
    upstream({ status: 404, body: 'gone' });
    const res = await call({ ref: '505410' });
    expect(res.status).toBe(502);
    expect(res.body.error).toContain('HTTP 404');
    expect(res.body.error).toContain('505410');
  });

  it('refuses a 200 whose body is not JSON', async () => {
    upstream({ body: '<!doctype html>' });
    const res = await call({ ref: '505410' });
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/was not JSON/);
  });

  it('refuses a 200 with no warband_data', async () => {
    upstream({ body: JSON.stringify({ warband_id: 505410 }) });
    const res = await call({ ref: '505410' });
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/no warband_data/);
  });

  it('refuses a warband_data that is not itself JSON', async () => {
    upstream({ body: JSON.stringify({ warband_data: 'not json' }) });
    const res = await call({ ref: '505410' });
    expect(res.status).toBe(502);
    expect(res.body.error).toMatch(/warband_data is not JSON/);
  });

  it('does not follow a redirect, wherever it points', async () => {
    /* Following one would send this server to an address the user could never
       reach themselves. A 3xx is reported with its status instead. */
    const seen: string[] = [];
    vi.stubGlobal('fetch', async (url: string, init: RequestInit) => {
      seen.push(`${url} redirect=${init.redirect}`);
      return new Response('', { status: 302, headers: { location: 'http://169.254.169.254/' } });
    });
    const res = await call({ ref: '505410' });
    expect(res.status).toBe(502);
    expect(res.body.error).toContain('HTTP 302');
    expect(seen).toEqual([
      'https://synod.trench-companion.com/wp-json/synod/v1/warband/505410 redirect=manual',
    ]);
  });

  it('says why when their host cannot be reached', async () => {
    vi.stubGlobal('fetch', async () => { throw new Error('The operation timed out'); });
    const res = await call({ ref: '505410' });
    expect(res.status).toBe(502);
    expect(res.body.error).toContain('The operation timed out');
  });

  it('rejects a body that is not one', async () => {
    const seen = upstream({ body: '{}' });
    expect((await call({})).status).toBe(400);
    expect((await call({ ref: '505410', extra: 1 })).status).toBe(400);
    expect(seen).toEqual([]);
  });

  it('is rate limited, so it cannot be turned into a crawl of their site', async () => {
    upstream({ body: JSON.stringify({ warband_data: WARBAND }) });
    const statuses: number[] = [];
    for (let i = 0; i < 25; i += 1) statuses.push((await call({ ref: '505410' })).status);
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
  });
});
