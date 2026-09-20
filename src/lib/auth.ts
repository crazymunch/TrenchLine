import { NextAuthOptions } from 'next-auth';
import { PrismaAdapter } from '@next-auth/prisma-adapter';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { prisma } from './prisma';
import { requireEnv } from './env';
import { isAdminUserId, emailGrantsAdmin } from './adminRole';
import { authRequiresVerification } from './mail';
import { consume, clientIp } from './api/rateLimit';
import bcrypt from 'bcryptjs';

/**
 * Who may hold the admin role.
 *
 * Configured by `TRENCHLINE_ADMIN_EMAILS`, which replaces the default list
 * outright when it is set. It used to be a constant in this file listing
 * `crazymunch@gmail.com` and `commander@trenchline.org`, which was the second
 * half of an unauthenticated admin takeover:
 *
 *   1. `POST /api/custom-rules` and `POST /api/campaigns` upserted a user
 *      `commander@trenchline.org` for any SIGNED-OUT caller, with no password.
 *   2. That address was on this list, so the account was an admin.
 *   3. `authorize` below did not require a password from an account that had
 *      none, so anyone could then sign in as it.
 *
 * No step of that needed a credential. The account also shipped in
 * `prisma/seed.ts`, so on a seeded database step 1 was unnecessary. That seed
 * is deleted (FD-14 AI-2), which stops new databases acquiring the row but
 * does not remove it from one that already ran it — production still holds it,
 * with no password, no admin role and nothing filed under it.
 *
 * All three steps are closed. `commander@trenchline.org` is off the list for
 * good — it is the identity the signed-out routes shared, so it must never be
 * an address that carries authority. The remaining default is the maintainer's
 * own address, which a deployment can replace or drop entirely; a persisted,
 * auditable role on the user record is what finally retires this.
 */
export function isUserAdmin(email?: string | null): boolean {
  return emailGrantsAdmin(email);
}

/**
 * A real bcrypt hash of a value nobody knows, compared against when there is
 * no account to compare against.
 *
 * Not a secret and not used to authenticate anything: it exists so that a
 * sign-in attempt for an address with no account costs the same time as one
 * for an address with an account. Returning early instead turns the sign-in
 * form into an oracle that says which email addresses are registered.
 */
const ABSENT_USER_HASH = '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';

/**
 * The minimum password this application will store.
 *
 * Length only. A composition rule ("one capital, one symbol") makes passwords
 * harder to remember and easier to guess, and this is a hobby roster app whose
 * threat model is opportunistic credential stuffing rather than a targeted
 * attacker.
 */
export const MIN_PASSWORD_LENGTH = 10;

/**
 * Verify an email and password against a stored hash. Nothing else.
 *
 * A named export rather than an inline `authorize`, so that it can be tested
 * directly: `CredentialsProvider(...)` returns an object whose own `authorize`
 * is a stub — `authorize: () => null` — with the real configuration stashed
 * under `.options` for NextAuth to merge at request time. A test that reached
 * for `provider.authorize` would call the stub, get `null`, and pass every
 * "rejects a bad credential" assertion while proving nothing at all.
 *
 * What this used to do, and why each part of it was a way in:
 *
 *   - **It required only an email.** The password check was guarded by
 *     `credentials.password && user.password`, so omitting the password field
 *     skipped it entirely and signed you in as whoever owned that address.
 *   - **It signed in accounts that have no password.** A Google account stores
 *     `password: null`, so the same guard let anyone who knew the address
 *     enter an OAuth-only account through this form.
 *   - **It created accounts.** A sign-in for an unknown address created one,
 *     with `password: null` when none was supplied — which the first two
 *     points then let anyone else enter.
 *
 * Registration now lives at `POST /api/auth/register`, which is a separate
 * decision with its own validation. Signing in only ever reads.
 */
export async function verifyCredentials(
  credentials: Record<string, string> | undefined,
  req?: { headers?: Headers | Record<string, string | string[] | undefined> },
): Promise<{ id: string; name: string | null; email: string | null; image: string | null } | null> {
  const email = credentials?.email?.toLowerCase().trim();
  const password = credentials?.password;

  // Both are required. A missing password is a failed sign-in, never a reason
  // to skip the check.
  if (!email || !password) return null;

  /*
    Rate-limited before the password is compared.

    This is the endpoint an attacker walks a password list through, and bcrypt
    makes each attempt expensive for the SERVER as well as the attacker — so an
    unlimited sign-in is a CPU exhaustion surface as much as a guessing one.

    Two buckets, both on the IP: one for the address alone, one for the address
    paired with the caller. Never on the address by itself — a bucket a
    stranger can fill is a way to lock a real user out of their own account.

    NextAuth hands `authorize` a request-like object whose headers may be a
    plain record rather than a `Headers`, so both are accepted. A caller with
    no headers at all — a direct unit-test call — is limited by a constant key
    rather than skipped, so the limit cannot be dodged by omitting them.
  */
  const headers = toHeaders(req?.headers);
  const ip = clientIp(headers);
  if (!consume('signIn', ip).ok) return null;
  if (!consume('signIn', ip, email).ok) return null;

  const user = await prisma.user.findUnique({ where: { email } });

  /*
    Compare against a dummy hash when there is no account, or when the account
    has no password, so that all three outcomes take the same time. Then fail.
    The comparison's result is deliberately discarded.
  */
  if (!user?.password) {
    await bcrypt.compare(password, ABSENT_USER_HASH);
    return null;
  }

  if (!(await bcrypt.compare(password, user.password))) return null;

  /*
    The password is right. Is the address proved?

    Checked AFTER the password, on purpose. Checked before, this endpoint would
    answer differently for a registered-but-unverified address than for one
    with no account at all — the same membership oracle registration was
    changed to close, moved one route over.

    Only where the deployment can actually send mail. `authRequiresVerification`
    is tied to the transport for the reason in `mail.ts`: demanding proof that
    nobody can produce locks every account out, including the maintainer's.

    OAUTH IS UNTOUCHED. This function is the credentials path only. Google owns
    that proof for a Google account, and NextAuth's adapter writes
    `emailVerified` itself — so an OAuth user is not asked to prove twice.
  */
  if (!user.emailVerified && authRequiresVerification()) return null;

  return { id: user.id, name: user.name, email: user.email, image: user.image };
}

/**
 * NextAuth's request headers, as a `Headers`.
 *
 * The object handed to `authorize` is not a `NextRequest`: depending on the
 * runtime its `headers` is either a real `Headers` or a plain record. Both are
 * normalised here so the rate limiter has one shape to read.
 */
function toHeaders(
  raw: Headers | Record<string, string | string[] | undefined> | undefined,
): Headers {
  if (!raw) return new Headers();
  if (typeof (raw as Headers).get === 'function') return raw as Headers;

  const out = new Headers();
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') out.set(key, value);
    else if (Array.isArray(value) && value[0]) out.set(key, value[0]);
  }
  return out;
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/',
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email', placeholder: 'commander@example.org' },
        password: { label: 'Password', type: 'password' },
      },
      /*
        Both arguments. NextAuth passes the request second, and that is where
        the caller's address comes from for the rate limit above.
      */
      authorize: (credentials, req) => verifyCredentials(credentials, req as never),
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as { id?: string }).id = token.sub;
        /*
          Taken from the token and not recomputed from the session's email.

          The old version fell back to `isUserAdmin(session.user.email)` when
          the token carried no role, so the session could claim an authority
          the token never granted.
        */
        (session.user as { isAdmin?: boolean }).isAdmin = Boolean(token.isAdmin);
        (session.user as { role?: string }).role = token.isAdmin ? 'ADMIN' : 'USER';
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) token.sub = user.id;
      /*
        Resolved on every call rather than only at sign-in, so a revocation
        takes effect on the next request instead of when the last session
        happens to expire.

        Read from the USER RECORD now, by id, not from the token's email: the
        grant is `User.role` and the email list only still answers for a user
        nobody has decided about yet — see `adminRole.ts`. By id, so an address
        change confers and removes nothing, and a deleted account cannot keep
        authority through a token that outlives it.

        A lookup failure is not an admin. This runs on every authenticated
        request, so a database blip must fail closed rather than either
        granting authority or throwing the caller out of their session.
      */
      const userId = (user?.id ?? token.sub) as string | undefined;
      try {
        token.isAdmin = await isAdminUserId(userId);
      } catch {
        token.isAdmin = false;
      }
      token.role = token.isAdmin ? 'ADMIN' : 'USER';

      /*
        The session epoch, which is how one user's tokens are revoked.

        A password reset increments `User.sessionEpoch`. A token carrying an
        older one is refused here — so resetting a password because someone
        else is in the account actually removes them, instead of leaving their
        JWT working until it expires.

        The alternative, rotating `NEXTAUTH_SECRET`, signs out every account on
        the deployment to fix one.

        On a fresh sign-in the epoch is stamped. On a refresh it is compared;
        a mismatch clears the subject, which is what makes the session invalid
        rather than merely unprivileged. A lookup failure changes nothing —
        this runs on every request and must not sign people out over a blip.
      */
      try {
        if (userId) {
          const row = await prisma.user.findUnique({
            where: { id: userId }, select: { sessionEpoch: true },
          });
          if (!row) {
            delete token.sub;
          } else if (user) {
            token.epoch = row.sessionEpoch;
          } else if (token.epoch !== row.sessionEpoch) {
            delete token.sub;
            token.isAdmin = false;
            token.role = 'USER';
          }
        }
      } catch { /* Leave the token as it is; a blip is not a sign-out. */ }

      return token;
    },
  },
  /*
    No fallback. See `src/lib/env.ts`: the constant that used to sit here is in
    this repository's history, so any deployment that reached it was signing
    sessions with a published key.

    A GETTER, not a value, and the distinction is the difference between a
    server that fails closed and one that will not build.

    Evaluated eagerly, `requireEnv` runs when this module is first imported —
    and `next build` imports every route module to collect page data. So a
    build machine without the secret could not produce a bundle at all, which
    broke preview deployments that legitimately have no runtime secrets. The
    build does not sign anything; only serving a request does.

    Deferring it to the property read moves the failure to where the need is.
    NextAuth reads `secret` while handling a request, so a server missing it
    still refuses to serve — which is the whole point — and CI keeps proving
    that by setting one.
  */
  get secret() {
    return requireEnv('NEXTAUTH_SECRET');
  },
};
