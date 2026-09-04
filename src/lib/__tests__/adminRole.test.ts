/**
 * Who is an administrator, and what the answer is derived from.
 *
 * Authority used to come from an ADDRESS — a constant list in `auth.ts`, then
 * `TRENCHLINE_ADMIN_EMAILS`. That closed the takeover chain but left the grant
 * attached to a mutable field, with no record of who granted it or when, and
 * revocable only by a deploy.
 *
 * These cover the precedence during the migration window, which is where the
 * mistakes are: reading both sources in the wrong order makes a revocation
 * decorative, and reading only the new one breaks a deployment that has not
 * been backfilled.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const ADMINS = 'boss@trenchline.test, OldAdmin@Trenchline.Test';

vi.mock('../env', () => ({
  adminEmails: () => process.env.TRENCHLINE_ADMIN_EMAILS
    ? process.env.TRENCHLINE_ADMIN_EMAILS.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean)
    : [],
  requireEnv: () => 'test',
}));
vi.mock('../prisma', () => ({ prisma: { user: { findUnique: vi.fn() } } }));

import { isAdminUser, emailGrantsAdmin } from '../adminRole';

const GRANTED = new Date('2026-01-01T00:00:00Z');

beforeEach(() => { process.env.TRENCHLINE_ADMIN_EMAILS = ADMINS; });
afterEach(() => { delete process.env.TRENCHLINE_ADMIN_EMAILS; });

describe('a user whose role has been set explicitly', () => {
  it('is an administrator when the database says ADMIN', () => {
    expect(isAdminUser({ email: 'nobody@trenchline.test', role: 'ADMIN', roleGrantedAt: GRANTED }))
      .toBe(true);
  });

  it('is NOT an administrator when revoked, even with the address still listed', () => {
    /*
      The point of persisting the grant. If the environment list could override
      a revocation, demoting someone would do nothing until a deploy removed
      their address too — and the persisted grant would be decorative.
    */
    expect(isAdminUser({ email: 'boss@trenchline.test', role: 'USER', roleGrantedAt: GRANTED }))
      .toBe(false);
  });
});

describe('a user nobody has decided about yet', () => {
  it('is still judged by the configured list, so a deployment keeps working', () => {
    // MIGRATE, not CONTRACT: the fallback goes in a later release, alone.
    expect(isAdminUser({ email: 'boss@trenchline.test', role: 'USER', roleGrantedAt: null }))
      .toBe(true);
  });

  it('and is nobody when the address is not on it', () => {
    expect(isAdminUser({ email: 'stranger@trenchline.test', role: 'USER', roleGrantedAt: null }))
      .toBe(false);
  });

  it('matches the list case-insensitively, as an address comparison must', () => {
    expect(isAdminUser({ email: 'OLDADMIN@trenchline.test', role: 'USER', roleGrantedAt: null }))
      .toBe(true);
  });
});

describe('the configured list itself', () => {
  it('grants nothing when it is unset — no default administrator', () => {
    delete process.env.TRENCHLINE_ADMIN_EMAILS;
    expect(emailGrantsAdmin('boss@trenchline.test')).toBe(false);
    expect(isAdminUser({ email: 'boss@trenchline.test', role: 'USER', roleGrantedAt: null }))
      .toBe(false);
  });

  it('grants nothing when it is empty', () => {
    process.env.TRENCHLINE_ADMIN_EMAILS = '';
    expect(emailGrantsAdmin('boss@trenchline.test')).toBe(false);
  });

  it('never grants to the identity the signed-out routes used to share', () => {
    /*
      `commander@trenchline.org` was the shared anonymous identity and the
      second half of the takeover chain. It must never be an address that
      carries authority, so it is not in any default — there is no default.
    */
    process.env.TRENCHLINE_ADMIN_EMAILS = ADMINS;
    expect(emailGrantsAdmin('commander@trenchline.org')).toBe(false);
  });
});

describe('a caller with no user at all', () => {
  it('is not an administrator', () => {
    expect(isAdminUser(null)).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
    expect(isAdminUser({ email: null, role: 'ADMIN', roleGrantedAt: null })).toBe(false);
  });

  it('and an ADMIN role with no address is still honoured when it was granted', () => {
    // The grant is on the user, not on the address; an OAuth account without a
    // readable address is still whoever the database says it is.
    expect(isAdminUser({ email: null, role: 'ADMIN', roleGrantedAt: GRANTED })).toBe(true);
  });
});
