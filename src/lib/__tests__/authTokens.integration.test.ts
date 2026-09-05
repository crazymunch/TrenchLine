import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { createHash } from 'node:crypto';

/**
 * Single-use, expiring tokens, against a real Postgres.
 *
 * The properties here are the ones a mocked Prisma cannot prove: that the raw
 * token is genuinely absent from the table, that spending is atomic under a
 * race, and that the unique index on the digest behaves as the lookup assumes.
 */

const url = process.env.DATABASE_URL;
const describeDb = url ? describe : describe.skip;
const prisma = new PrismaClient({ datasources: { db: { url: url ?? 'postgresql://unused' } } });
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('../prisma', () => ({ prisma }));

const { issueToken, consumeToken, hashToken, TOKEN_TTL_MS } = await import('../authTokens');

const DOMAIN = '@tokens.test';
let user: { id: string };
let other: { id: string };

describeDb('auth tokens', () => {
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    user = await prisma.user.create({ data: { email: `a${DOMAIN}` } });
    other = await prisma.user.create({ data: { email: `b${DOMAIN}` } });
  });

  it('never stores the raw token', async () => {
    /*
      The whole point of hashing at rest. A backup, a log or a replica someone
      reached must not hand over the ability to verify an address or take an
      account.
    */
    const raw = await issueToken(user.id, 'EMAIL_VERIFICATION');
    const rows = await prisma.authToken.findMany({ where: { userId: user.id } });

    expect(rows).toHaveLength(1);
    expect(rows[0].tokenHash).not.toBe(raw);
    expect(rows[0].tokenHash).toBe(createHash('sha256').update(raw).digest('hex'));
    expect(JSON.stringify(rows)).not.toContain(raw);
  });

  it('spends once, and a replay is refused', async () => {
    const raw = await issueToken(user.id, 'PASSWORD_RESET');
    expect(await consumeToken(raw, 'PASSWORD_RESET')).toEqual({ ok: true, userId: user.id });
    expect(await consumeToken(raw, 'PASSWORD_RESET')).toEqual({ ok: false, reason: 'used' });
  });

  it('cannot be spent twice by two requests arriving together', async () => {
    /*
      The conditional update is what makes this safe: the loser updates zero
      rows. A read-then-write would let both through.
    */
    const raw = await issueToken(user.id, 'PASSWORD_RESET');
    const [a, b] = await Promise.all([
      consumeToken(raw, 'PASSWORD_RESET'),
      consumeToken(raw, 'PASSWORD_RESET'),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
  });

  it('refuses an expired token', async () => {
    const raw = await issueToken(user.id, 'PASSWORD_RESET');
    const later = new Date(Date.now() + TOKEN_TTL_MS.PASSWORD_RESET + 1000);
    expect(await consumeToken(raw, 'PASSWORD_RESET', later))
      .toEqual({ ok: false, reason: 'expired' });
  });

  it('refuses a token issued for the other purpose', async () => {
    // A verification link must not reset a password, whatever route it reaches.
    const raw = await issueToken(user.id, 'EMAIL_VERIFICATION');
    expect(await consumeToken(raw, 'PASSWORD_RESET'))
      .toEqual({ ok: false, reason: 'wrong-purpose' });
  });

  it('refuses a token nobody issued', async () => {
    expect(await consumeToken('not-a-real-token', 'EMAIL_VERIFICATION'))
      .toEqual({ ok: false, reason: 'unknown' });
    expect(await consumeToken('', 'EMAIL_VERIFICATION'))
      .toEqual({ ok: false, reason: 'unknown' });
  });

  it('resolves to the user it was issued for, not the caller', async () => {
    const mine = await issueToken(user.id, 'PASSWORD_RESET');
    const theirs = await issueToken(other.id, 'PASSWORD_RESET');
    expect(await consumeToken(mine, 'PASSWORD_RESET')).toEqual({ ok: true, userId: user.id });
    expect(await consumeToken(theirs, 'PASSWORD_RESET')).toEqual({ ok: true, userId: other.id });
  });

  it('kills the previous unspent link when a new one is issued', async () => {
    // Two live reset links doubles the window and gives the user nothing.
    const first = await issueToken(user.id, 'PASSWORD_RESET');
    const second = await issueToken(user.id, 'PASSWORD_RESET');

    expect(await consumeToken(first, 'PASSWORD_RESET')).toEqual({ ok: false, reason: 'used' });
    expect(await consumeToken(second, 'PASSWORD_RESET')).toEqual({ ok: true, userId: user.id });
  });

  it('does not kill the other purpose’s link', async () => {
    const verify = await issueToken(user.id, 'EMAIL_VERIFICATION');
    await issueToken(user.id, 'PASSWORD_RESET');
    expect(await consumeToken(verify, 'EMAIL_VERIFICATION')).toEqual({ ok: true, userId: user.id });
  });

  it('goes with the user when the account is deleted', async () => {
    const raw = await issueToken(user.id, 'PASSWORD_RESET');
    await prisma.user.delete({ where: { id: user.id } });
    expect(await consumeToken(raw, 'PASSWORD_RESET')).toEqual({ ok: false, reason: 'unknown' });
  });

  it('hashes deterministically, so the lookup is an indexed read', () => {
    expect(hashToken('abc')).toBe(hashToken('abc'));
    expect(hashToken('abc')).not.toBe(hashToken('abd'));
    expect(hashToken('abc')).toHaveLength(64);
  });
});
