import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { consumeToken } from '@/lib/authTokens';
import { limitAccountRoute } from '@/lib/api/rateLimit';

/**
 * Confirm an address from the link in a verification mail.
 *
 * The link is the proof. Nothing else about the request is trusted: it carries
 * no session, and the token names the user rather than the caller doing so.
 */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Expected a JSON body.' }, { status: 400 });
  }

  const token = (body as { token?: unknown })?.token;
  if (typeof token !== 'string' || !token) {
    return NextResponse.json({ error: 'A token is required.' }, { status: 400 });
  }

  /* By IP alone: the caller holding a link may not be the account's owner. */
  const limited = limitAccountRoute('register', req.headers, null);
  if (limited) return limited;

  const result = await consumeToken(token, 'EMAIL_VERIFICATION');
  if (!result.ok) {
    /*
      One message for all four reasons — unknown, spent, expired, wrong
      purpose. Telling them apart tells someone holding a stolen link which
      kind of stolen it is, and tells someone guessing whether they are close.

      `consumeToken` still distinguishes them internally, so a future
      operational log can say which without the response doing so.
    */
    return NextResponse.json(
      { error: 'That link is no longer valid. Request a new one.' },
      { status: 400 });
  }

  /*
    Idempotent on the user: verifying an already-verified address is not an
    error, and the timestamp is only written once so it keeps meaning "when
    this address was first proved".
  */
  await prisma.user.updateMany({
    where: { id: result.userId, emailVerified: null },
    data: { emailVerified: new Date() },
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
