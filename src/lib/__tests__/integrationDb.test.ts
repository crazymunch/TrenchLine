/**
 * The guard that stops `npm test` writing to production.
 *
 * The nine integration suites read `process.env.DATABASE_URL` and ran against
 * whatever it pointed at. In this project's development environment that is
 * production Neon, and several of those suites end with a `deleteMany`.
 * Nothing had gone wrong only because the sandbox cannot open TCP 5432 — a
 * network accident standing in for a safety rule.
 */
import { describe, it, expect } from 'vitest';

import {
  integrationDbUrl, hasIntegrationDb, RemoteTestDatabaseError,
} from '../integrationDb';

const env = (v?: string) =>
  (v === undefined ? {} : { TRENCHLINE_TEST_DATABASE_URL: v }) as NodeJS.ProcessEnv;

describe('choosing a test database', () => {
  it('returns null when none is configured, so the suites skip', () => {
    expect(integrationDbUrl(env())).toBeNull();
    expect(hasIntegrationDb(env())).toBe(false);
  });

  it('treats an empty or blank value as unset', () => {
    expect(integrationDbUrl(env(''))).toBeNull();
    expect(integrationDbUrl(env('   '))).toBeNull();
  });

  it('accepts a local database', () => {
    for (const host of ['localhost', '127.0.0.1', 'postgres', 'db', 'host.docker.internal']) {
      const url = `postgresql://user:pass@${host}:5432/trenchline_test`;
      expect(integrationDbUrl(env(url)), host).toBe(url);
    }
  });

  it('accepts the CI service container by name', () => {
    // .github/workflows/ci.yml runs Postgres as a service on localhost.
    const url = 'postgresql://postgres:postgres@localhost:5432/trenchline_ci';
    expect(integrationDbUrl(env(url))).toBe(url);
  });
});

describe('refusing a remote database', () => {
  it('THROWS rather than skipping, because skipping would hide the mistake', () => {
    /*
      The distinction this file exists for. "No database" and "a database you
      must not write to" are different situations, and if they both quietly
      skip, a developer who has pointed this at a server never finds out.
    */
    const remote = 'postgresql://u:p@ep-lucky-boat-123.aws.neon.tech:5432/neondb';
    expect(() => integrationDbUrl(env(remote))).toThrow(RemoteTestDatabaseError);
    expect(() => hasIntegrationDb(env(remote))).toThrow(RemoteTestDatabaseError);
  });

  it('names the host in the message, so the fix is obvious', () => {
    try {
      integrationDbUrl(env('postgresql://u:p@db.example.com:5432/x'));
      throw new Error('should have thrown');
    } catch (e) {
      expect((e as Error).message).toContain('db.example.com');
      expect((e as Error).message).toContain('docs/DATABASE.md');
    }
  });

  it('fails closed on a host it has not been told is local', () => {
    // An allowlist, not a denylist: a denylist of known production hostnames
    // fails open the first time infrastructure changes.
    for (const host of ['staging-db', '10.0.0.5', 'my-postgres.internal', 'neon.tech']) {
      expect(() => integrationDbUrl(env(`postgresql://u:p@${host}/d`)), host)
        .toThrow(RemoteTestDatabaseError);
    }
  });

  it('refuses a value it cannot parse rather than guessing', () => {
    expect(() => integrationDbUrl(env('not a url'))).toThrow(RemoteTestDatabaseError);
  });

  it('is not case-sensitive about the host', () => {
    expect(integrationDbUrl(env('postgresql://u:p@LOCALHOST:5432/d')))
      .toBe('postgresql://u:p@LOCALHOST:5432/d');
  });
});

describe('what it deliberately does not read', () => {
  it('ignores DATABASE_URL entirely', () => {
    /*
      THE point. DATABASE_URL is the application's database and may be
      production; it is what the migration script uses. A test must never
      reach it by default, which is why the test address has its own name
      rather than a fallback chain.
    */
    const e = {
      DATABASE_URL: 'postgresql://u:p@ep-lucky-boat-123.aws.neon.tech:5432/neondb',
    } as unknown as NodeJS.ProcessEnv;
    expect(integrationDbUrl(e)).toBeNull();
    expect(hasIntegrationDb(e)).toBe(false);
  });
});
