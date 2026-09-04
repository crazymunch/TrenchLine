import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { AuthTokenPurpose } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Single-use, expiring tokens for email verification and password reset.
 *
 * The RAW token is never stored. What goes in the database is a SHA-256 of it,
 * so a read of that table — a backup, a log, a replica someone reached — does
 * not hand anyone the ability to verify an address or take an account. The raw
 * value exists in exactly two places: the mail that was sent, and the link in
 * the user's hands.
 *
 * SHA-256 rather than bcrypt, deliberately. A bcrypt work factor exists to slow
 * an attacker guessing a LOW-ENTROPY secret; these are 32 random bytes, which
 * is not guessable at any work factor, and the lookup is on the hash so it has
 * to be a fast, deterministic digest to be an indexed read at all.
 */

/** 32 bytes of randomness. Not a guessable space at any rate limit. */
const TOKEN_BYTES = 32;

/**
 * How long each kind of token lives.
 *
 * A reset is shorter than a verification because it is the more dangerous of
 * the two: a verification link that leaks confirms an address, a reset link
 * that leaks takes the account.
 */
export const TOKEN_TTL_MS: Record<AuthTokenPurpose, number> = {
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,
  PASSWORD_RESET: 60 * 60 * 1000,
};

export const hashToken = (raw: string): string =>
  createHash('sha256').update(raw).digest('hex');

/**
 * Issue a token, returning the RAW value — the only time it exists.
 *
 * Any unspent token of the same purpose for the same user is spent first, so a
 * second "resend" invalidates the first link. Two live reset links for one
 * account doubles the window without giving the user anything.
 */
export async function issueToken(
  userId: string,
  purpose: AuthTokenPurpose,
  now = new Date(),
): Promise<string> {
  await prisma.authToken.updateMany({
    where: { userId, purpose, usedAt: null },
    data: { usedAt: now },
  });

  const raw = randomBytes(TOKEN_BYTES).toString('base64url');
  await prisma.authToken.create({
    data: {
      userId,
      purpose,
      tokenHash: hashToken(raw),
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MS[purpose]),
    },
  });
  return raw;
}

export type ConsumeResult =
  | { ok: true; userId: string }
  | { ok: false; reason: 'unknown' | 'used' | 'expired' | 'wrong-purpose' };

/**
 * Spend a token, once.
 *
 * The row is marked spent inside the same conditional update that finds it, so
 * two requests arriving together cannot both succeed: the second updates zero
 * rows. Marked rather than deleted, so a replayed link is distinguishable from
 * one that never existed — which is what makes `used` a separate reason here,
 * even though the caller shows the same thing for all four.
 */
export async function consumeToken(
  raw: string,
  purpose: AuthTokenPurpose,
  now = new Date(),
): Promise<ConsumeResult> {
  if (!raw) return { ok: false, reason: 'unknown' };

  const row = await prisma.authToken.findUnique({
    where: { tokenHash: hashToken(raw) },
    select: { id: true, userId: true, purpose: true, expiresAt: true, usedAt: true },
  });

  if (!row) return { ok: false, reason: 'unknown' };
  if (row.purpose !== purpose) return { ok: false, reason: 'wrong-purpose' };
  if (row.usedAt) return { ok: false, reason: 'used' };
  if (row.expiresAt <= now) return { ok: false, reason: 'expired' };

  const spent = await prisma.authToken.updateMany({
    where: { id: row.id, usedAt: null },
    data: { usedAt: now },
  });
  // Lost the race: another request spent it between the read and the write.
  if (spent.count !== 1) return { ok: false, reason: 'used' };

  return { ok: true, userId: row.userId };
}

/**
 * Compare two tokens without leaking where they differ.
 *
 * Not used by `consumeToken`, which looks up by digest and so compares nothing
 * — but a caller that already holds both values should use this rather than
 * `===`.
 */
export function tokensMatch(a: string, b: string): boolean {
  const x = Buffer.from(hashToken(a), 'hex');
  const y = Buffer.from(hashToken(b), 'hex');
  return x.length === y.length && timingSafeEqual(x, y);
}
