import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { MIN_PASSWORD_LENGTH } from '@/lib/auth';
import { sendVerification, notifyExistingAccount } from '@/lib/accountMail';
import { limitAccountRoute } from '@/lib/api/rateLimit';

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
 * is what the verification mail does.
 */
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const MAX_EMAIL = 254;
const MAX_NAME = 80;
/** bcrypt only reads the first 72 bytes; a longer password is a wasted DoS. */
const MAX_PASSWORD = 72;

/**
 * The one thing this endpoint ever says on success.
 *
 * Worded so it is true whether an account was created, an existing one was
 * left alone, or the address belongs to a Google sign-in.
 */
const ACCEPTED =
  'If that address can be registered, a confirmation link is on its way. '
  + 'Check your inbox to finish setting up the account.';

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

  /*
    Counted AFTER the shape checks and BEFORE the database.

    After, so a malformed body cannot spend a real caller's allowance. Before,
    so the expensive half — a lookup, a bcrypt hash and a mail — is what the
    limit actually protects. Keyed on IP and on IP+address together, never the
    address alone: see `rateLimit.ts`.
  */
  const limited = limitAccountRoute('register', req.headers, email);
  if (limited) return limited;

  const name = typeof rawName === 'string' && rawName.trim()
    ? rawName.trim().slice(0, MAX_NAME)
    : email.split('@')[0];

  /*
    ONE ANSWER, whatever is true.

    This used to return 409 for an address that already had an account. A
    distinct status is a membership oracle whatever the body says: anyone could
    walk a list of addresses through here and learn which have accounts. The
    old comment said so and accepted it, because closing it needs somewhere
    else to put the real outcome.

    That somewhere is the verification mail, which only the address owner
    receives, so the four cases below now differ ONLY in what is sent:

      new address        create the account, send a verification link
      already registered create nothing, send "someone tried to register"
      OAuth-only         create nothing, send "you already sign in with Google"
      already verified   create nothing, send the same as above

    Every one of them answers 202 with the same body. A caller learns nothing;
    the person holding the address learns everything.
  */
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true, password: true, emailVerified: true },
  });

  if (!existing) {
    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: await bcrypt.hash(password, 10),
        /*
          `emailVerified` stays null. Nothing here proves the registrant owns
          the address, so nothing claims it does; the link below is what
          writes it.
        */
      },
      select: { id: true, email: true },
    });
    await sendVerification(user.id, user.email!);
  } else if (!existing.emailVerified) {
    /*
      An unverified account, registered again. Re-sending is right: the first
      link may never have arrived, and the address owner is the only one who
      can act on the second. The stored password is NOT replaced — that would
      let anyone with the address change the credential on an account they do
      not own.
    */
    await sendVerification(existing.id, email);
  } else {
    await notifyExistingAccount(email, Boolean(existing.password));
  }

  /*
    No session is issued, and no user is returned. The client signs in through
    the same path as every other sign-in, so there is exactly one way to obtain
    a session and one place that decides whether to.

    202, not 201: what this promises is that the request was accepted and a
    message sent, which is true in every branch. 201 would claim a resource was
    created, and in three of the four branches nothing was.
  */
  return NextResponse.json({ ok: true, message: ACCEPTED }, { status: 202 });
}
