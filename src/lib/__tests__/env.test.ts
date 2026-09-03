import { describe, it, expect, afterEach } from 'vitest';
import { requireEnv, missingEnv, adminEmails } from '../env';

/**
 * Required server environment.
 *
 * `authOptions` used to fall back to a constant when `NEXTAUTH_SECRET` was
 * absent: `trenchline_grimdark_secret_salt_2026`, checked into this
 * repository. A deployment that forgot the variable therefore started
 * successfully and signed every session JWT with a key anyone could read off
 * GitHub — which is enough to forge a session for any account, including an
 * admin one.
 */

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

describe('a required variable', () => {
  it('is returned when set', () => {
    process.env.NEXTAUTH_SECRET = 'a-real-secret';
    expect(requireEnv('NEXTAUTH_SECRET')).toBe('a-real-secret');
  });

  it('throws when missing, rather than substituting a default', () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => requireEnv('NEXTAUTH_SECRET')).toThrow(/NEXTAUTH_SECRET is not set/);
  });

  /*
    An empty or whitespace value is a variable someone meant to set and did
    not. Treating it as present is how a deployment ends up signing sessions
    with the empty string.
  */
  it('treats an empty value as missing', () => {
    for (const value of ['', '   ']) {
      process.env.NEXTAUTH_SECRET = value;
      expect(() => requireEnv('NEXTAUTH_SECRET'), JSON.stringify(value)).toThrow();
      expect(missingEnv()).toContain('NEXTAUTH_SECRET');
    }
  });

  it('says what the variable is for, so the failure is actionable', () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => requireEnv('NEXTAUTH_SECRET'))
      .toThrow(/openssl rand -base64 32/);
  });

  it('reports everything missing at once', () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(missingEnv()).toEqual(['NEXTAUTH_SECRET']);
    process.env.NEXTAUTH_SECRET = 'set';
    expect(missingEnv()).toEqual([]);
  });
});

/*
  The published fallback must not come back, in this module or anywhere else.
  It is in the git history, so it is a known key for ever.
*/
describe('the retired fallback secret', () => {
  it('is not a value this module will ever return', () => {
    delete process.env.NEXTAUTH_SECRET;
    expect(() => requireEnv('NEXTAUTH_SECRET')).toThrow();
    expect(JSON.stringify(process.env)).not.toContain('trenchline_grimdark_secret_salt_2026');
  });
});

describe('the admin allowlist', () => {
  it('falls back to the maintainer’s address when unconfigured', () => {
    delete process.env.TRENCHLINE_ADMIN_EMAILS;
    expect(adminEmails()).toEqual(['crazymunch@gmail.com']);
  });

  /*
    `commander@trenchline.org` was on the old list AND was the identity the
    signed-out API routes wrote to, so an anonymous request could create the
    account and then sign into it as an admin. It must never be a default.
  */
  it('never defaults to the shared anonymous identity', () => {
    delete process.env.TRENCHLINE_ADMIN_EMAILS;
    expect(adminEmails()).not.toContain('commander@trenchline.org');
  });

  it('is replaced outright by the environment, not merged with it', () => {
    process.env.TRENCHLINE_ADMIN_EMAILS = 'ops@example.org, second@example.org';
    expect(adminEmails()).toEqual(['ops@example.org', 'second@example.org']);
    expect(adminEmails()).not.toContain('crazymunch@gmail.com');
  });

  it('normalises case and stray whitespace', () => {
    process.env.TRENCHLINE_ADMIN_EMAILS = '  OPS@Example.ORG ,, ';
    expect(adminEmails()).toEqual(['ops@example.org']);
  });
});
