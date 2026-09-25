/**
 * Which warband a pasted link means.
 *
 * The one decision `parseTrenchCompanionRef` makes, and the reason it is its
 * own module: the route, the import screen and this test all have to agree on
 * it, and a link that is half-recognised is how somebody imports a different
 * warband than the one they pasted.
 */
import { describe, it, expect } from 'vitest';
import { parseTrenchCompanionRef, trenchCompanionUrl } from '../trenchCompanion';

const ok = (input: string) => {
  const r = parseTrenchCompanionRef(input);
  expect(r.ok).toBe(true);
  return r.ok ? r.id : '';
};

const refused = (input: string) => {
  const r = parseTrenchCompanionRef(input);
  expect(r.ok).toBe(false);
  return r.ok ? '' : r.reason;
};

describe('parseTrenchCompanionRef', () => {
  it('takes a bare id', () => {
    expect(ok('225201')).toBe('225201');
    expect(ok('  225201  ')).toBe('225201');
  });

  it('takes a share link, with or without a scheme or a query', () => {
    expect(ok('https://trench-companion.com/warband/detail/225201')).toBe('225201');
    expect(ok('trench-companion.com/warband/detail/225201')).toBe('225201');
    expect(ok('https://trench-companion.com/warband/detail/225201?from=chat')).toBe('225201');
    expect(ok('https://www.trench-companion.com/warband/detail/225201')).toBe('225201');
  });

  it('refuses a link to somebody else\'s host, naming it', () => {
    expect(refused('https://example.com/warband/detail/225201')).toContain('example.com');
  });

  it('refuses a Trench Companion link that is not a warband', () => {
    expect(refused('https://trench-companion.com/about')).toMatch(/not a warband share link/);
  });

  it('refuses another /detail/ page on their own host, id and all', () => {
    /* `/campaign/detail/4412` used to yield the id 4412, and the route would
       then fetch WARBAND 4412 — a different object belonging to somebody
       else. The path is matched whole, not sniffed for a `detail` segment. */
    expect(refused('https://trench-companion.com/campaign/detail/4412'))
      .toMatch(/not a warband share link/);
    expect(refused('https://trench-companion.com/homebrew/detail/9'))
      .toMatch(/not a warband share link/);
  });

  it('refuses a warband path with anything extra on it', () => {
    expect(refused('https://trench-companion.com/warband/detail/225201/edit'))
      .toMatch(/not a warband share link/);
    expect(refused('https://trench-companion.com/x/warband/detail/225201'))
      .toMatch(/not a warband share link/);
  });

  it('refuses a subdomain that is not their site proper', () => {
    expect(refused('https://evil.trench-companion.com/warband/detail/225201'))
      .toMatch(/not trench-companion\.com/);
  });

  it('refuses an empty field', () => {
    expect(refused('   ')).toMatch(/share link/);
  });

  it('refuses something that is neither', () => {
    expect(refused('the one with the flies')).toMatch(/neither a warband id nor a link/);
  });

  it('cannot be steered at another path or host', () => {
    /* The id becomes a path segment, so `/` and `.` must never reach it. A
       traversal is not a valid id, and is refused rather than encoded. */
    const refusal =
      /neither a warband id nor a link|not a warband share link|not trench-companion\.com/;
    expect(refused('../../wp-json/synod/v1/user/1')).toMatch(refusal);
    expect(refused('225201/../../admin')).toMatch(refusal);
    expect(refused('https://trench-companion.com/warband/detail/225201/../../x')).toMatch(refusal);
  });
});

describe('trenchCompanionUrl', () => {
  it('builds the endpoint their share page is served from', () => {
    expect(trenchCompanionUrl('225201'))
      .toBe('https://synod.trench-companion.com/wp-json/synod/v1/warband/225201');
  });
});
