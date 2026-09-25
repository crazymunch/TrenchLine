import { describe, it, expect, afterEach } from 'vitest';
import {
  requireEnv, missingEnv, missingAdvisory, envReport, adminEmails,
} from '../env';

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
  /*
    ADM-1. The module used to hold the maintainer's personal address as
    `DEFAULT_ADMIN_EMAILS`, three lines below a comment calling the list
    "deliberately empty by default". A built-in default grants authority from
    source code: a deployment cannot revoke it without a release, and every
    fork inherits the grant.
  */
  it('is empty when unconfigured — there is no built-in administrator', () => {
    delete process.env.TRENCHLINE_ADMIN_EMAILS;
    expect(adminEmails()).toEqual([]);
  });

  /*
    The strongest form of the rule, and the one that survives a refactor: not
    "the old address is gone" but "no address at all is baked in". A test
    naming one address passes the moment somebody substitutes another.
  */
  it('bakes in no address whatsoever', () => {
    for (const value of [undefined, '', '   ', ',', ' , , ']) {
      if (value === undefined) delete process.env.TRENCHLINE_ADMIN_EMAILS;
      else process.env.TRENCHLINE_ADMIN_EMAILS = value;
      expect(adminEmails(), JSON.stringify(value)).toEqual([]);
    }
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

  it('is exactly what the environment lists, in order', () => {
    process.env.TRENCHLINE_ADMIN_EMAILS = 'ops@example.org, second@example.org';
    expect(adminEmails()).toEqual(['ops@example.org', 'second@example.org']);
  });

  it('normalises case and stray whitespace', () => {
    process.env.TRENCHLINE_ADMIN_EMAILS = '  OPS@Example.ORG ,, ';
    expect(adminEmails()).toEqual(['ops@example.org']);
  });
});

/*
  ADM-1's other half. `missingEnv` was written so "a fresh deployment learns
  about all of them at once rather than one restart at a time" and had no
  caller anywhere in the app; an advisory variable has no moment of use to
  throw at, so with nothing reporting it the deployment finds out when a
  person cannot reach a screen. `src/instrumentation.ts` is the caller.
*/
describe('the startup report', () => {
  it('names an unset administrator list, and says what it is for', () => {
    process.env.NEXTAUTH_SECRET = 'a-real-secret';
    delete process.env.TRENCHLINE_ADMIN_EMAILS;

    const report = envReport();
    expect(report).toHaveLength(1);
    expect(report[0]).toMatch(/^TRENCHLINE_ADMIN_EMAILS is not set\./);
    expect(report[0]).toMatch(/the deployment has no administrator/);
  });

  it('reports a missing secret and a missing admin list together', () => {
    delete process.env.NEXTAUTH_SECRET;
    delete process.env.TRENCHLINE_ADMIN_EMAILS;
    expect(envReport().map((line) => line.split(' ')[0]))
      .toEqual(['NEXTAUTH_SECRET', 'TRENCHLINE_ADMIN_EMAILS']);
  });

  it('says nothing when the environment is whole', () => {
    process.env.NEXTAUTH_SECRET = 'a-real-secret';
    process.env.TRENCHLINE_ADMIN_EMAILS = 'ops@example.org';
    expect(envReport()).toEqual([]);
  });

  /*
    The advisory list is advisory: a deployment with no administrator serves
    every other request correctly, so nothing here may throw or be counted
    among the variables the server refuses to start without.
  */
  it('does not make the admin list required', () => {
    delete process.env.TRENCHLINE_ADMIN_EMAILS;
    expect(missingEnv()).not.toContain('TRENCHLINE_ADMIN_EMAILS');
    expect(missingAdvisory()).toEqual(['TRENCHLINE_ADMIN_EMAILS']);
  });
});
