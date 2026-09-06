import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { consumeToken } from '@/lib/authTokens';
import { sendPasswordReset } from '@/lib/accountMail';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth';
import { limitAccountRoute } from '@/lib/api/rateLimit';
import { handle } from '@/lib/api/http';
import { readJson } from '@/lib/api/parse';

/**
 * Password reset, both halves.
 *
 *   POST { email }            ask for a link
 *   POST { token, password }  spend it
 *
 * One route because they are one flow and the enumeration rule is the same for
 * both: the first answers identically whether or not the address has an
 * account, and the second identically for every way a token can be bad.
 */

const MAX_PASSWORD = 72;

/** The one thing the request half ever says. True in every branch. */
const REQUESTED =
  'If that address has an account with a password, a reset link is on its way.';

export async function POST(req: NextRequest) {
  /*
    The bounded reader, and `handle` so its refusal is a response. See the note
    on `auth/register`: `req.json()` parses before anyone can object to the
    size, and `readJson` measures first. `handle` turns `readJson`'s thrown
    refusal into a 413 rather than an unhandled 500, and retires the
    hand-written try/catch.
  */
  return handle('auth.reset', async () => {
  const body = await readJson(req);
  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Expected a JSON object.' }, { status: 400 });
  }

  const { email: rawEmail, token, password } = body as Record<string, unknown>;

  /*
    Both halves are limited, and the spend half is limited WITHOUT a subject.

    A token names the account, but the caller holding it may not own that
    account — that is the case being guarded. Keying the spend on the token's
    owner would let an attacker with one stolen link exhaust the real owner's
    allowance, so the spend is limited by IP alone: what needs slowing there is
    someone trying tokens, and they are all coming from somewhere.
  */
  const subject = typeof rawEmail === 'string' ? rawEmail : null;
  const limited = limitAccountRoute('reset', req.headers, token ? null : subject);
  if (limited) return limited;

  /* ---- spend a link ---- */
  if (typeof token === 'string' && token) {
    if (typeof password !== 'string'
        || password.length < MIN_PASSWORD_LENGTH
        || password.length > MAX_PASSWORD) {
      return NextResponse.json(
        { error: `A password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD} characters.` },
        { status: 400 });
    }

    const result = await consumeToken(token, 'PASSWORD_RESET');
    if (!result.ok) {
      // One message for unknown, spent, expired and wrong-purpose alike.
      return NextResponse.json(
        { error: 'That link is no longer valid. Request a new one.' },
        { status: 400 });
    }

    await prisma.user.update({
      where: { id: result.userId },
      data: {
        password: await bcrypt.hash(password, 10),
        /*
          Whoever reset it proved they hold the address, so the address is
          proved. An account that could reset but not sign in would be stuck.
        */
        emailVerified: new Date(),
        /*
          REVOKE this user's existing sessions.

          A reset is what you do when you think someone else is in your
          account, so leaving their JWT working until it expires defeats the
          point. Bumping the epoch invalidates only this user's tokens — the
          alternative, rotating NEXTAUTH_SECRET, signs out every account on the
          deployment to fix one.
        */
        sessionEpoch: { increment: 1 },
      },
    });

    /* Every other unspent reset link for this user dies with it. */
    await prisma.authToken.updateMany({
      where: { userId: result.userId, purpose: 'PASSWORD_RESET', usedAt: null },
      data: { usedAt: new Date() },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  }

  /* ---- ask for a link ---- */
  if (typeof rawEmail !== 'string') {
    return NextResponse.json(
      { error: 'An email address, or a token and a password, are required.' },
      { status: 400 });
  }

  const email = rawEmail.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, password: true },
  });

  /*
    Sent only to an account that has a password. An OAuth-only account has
    nothing to reset, and issuing one would let a reset link CREATE a password
    on an account whose owner never chose to have one — a way in that bypasses
    Google entirely.

    The response does not vary. A caller cannot tell any of this apart.
  */
  if (user?.password) await sendPasswordReset(user.id, email);

  return NextResponse.json({ ok: true, message: REQUESTED }, { status: 202 });
  });
}
