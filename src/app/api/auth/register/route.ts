import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth';

/**
 * Create an account.
 *
 * Registration used to be a side effect of signing in: `authorize` created a
 * user for any email it did not recognise, and stored `password: null` when
 * none was supplied. That made "create an account" and "prove you own an
 * account" the same request, and the same code path could not do both safely —
 * so it did neither, and an email address alone was enough to get in.
 *
 * They are separate decisions and this is the one that writes.
 */

/**
 * A shape check, not a deliverability check.
 *
 * Deliberately loose: the address is an identifier here, and a regex that
 * tries to be RFC-complete rejects real addresses. Proving the address works
 * is what an email verification step is for, and this application does not
 * have one yet — see the note on `emailVerified` below.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_EMAIL = 254;
const MAX_NAME = 80;
/** bcrypt only reads the first 72 bytes; a longer password is a wasted DoS. */
const MAX_PASSWORD = 72;

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Expected a JSON object.' }, { status: 400 });
  }

  const { email: rawEmail, password, name: rawName } = body as Record<string, unknown>;

  if (typeof rawEmail !== 'string' || typeof password !== 'string') {
    return NextResponse.json(
      { error: 'An email and a password are required.' }, { status: 400 });
  }

  const email = rawEmail.toLowerCase().trim();
  if (email.length > MAX_EMAIL || !EMAIL.test(email)) {
    return NextResponse.json({ error: 'That email address is not valid.' }, { status: 400 });
  }

  if (password.length < MIN_PASSWORD_LENGTH || password.length > MAX_PASSWORD) {
    return NextResponse.json(
      { error: `A password must be between ${MIN_PASSWORD_LENGTH} and ${MAX_PASSWORD} characters.` },
      { status: 400 });
  }

  const name = typeof rawName === 'string' && rawName.trim()
    ? rawName.trim().slice(0, MAX_NAME)
    : email.split('@')[0];

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    /*
      A neutral message — and an honest note about what it does not achieve.

      "That address is already registered" is a membership oracle: it lets
      anyone walk a list of addresses through this endpoint and learn which
      ones have accounts here. The wording below avoids confirming it.

      **The 409 still confirms it.** A distinct status for the duplicate case
      is an oracle whatever the body says, and the only way to close that is to
      answer every registration identically and move the real outcome into an
      email that only the address owner receives. This application has no
      mailer, so it cannot do that yet, and pretending otherwise by returning
      201 here would tell a genuine user their account was created when it was
      not.

      So the enumeration is accepted, deliberately, and written down: it is
      bounded by rate limiting rather than removed, and email verification is
      what actually closes it.
    */
    return NextResponse.json(
      { error: 'That account could not be created. Try signing in instead.' },
      { status: 409 });
  }

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: await bcrypt.hash(password, 10),
      /*
        `emailVerified` stays null. Nothing here proves the registrant owns the
        address, so nothing should claim it does — and a later verification
        step has somewhere truthful to write.
      */
    },
    select: { id: true, email: true, name: true },
  });

  /*
    No session is issued. The client signs in with the credentials it just
    chose, through the same path as every other sign-in, so there is exactly
    one way to obtain a session and one place that decides whether to.
  */
  return NextResponse.json({ user }, { status: 201 });
}
