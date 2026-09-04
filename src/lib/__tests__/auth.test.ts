import { describe, it, expect, beforeEach, vi } from 'vitest';
import bcrypt from 'bcryptjs';

/**
 * The credentials sign-in path.
 *
 * Every case below was a way into an account before this suite existed, and
 * the repository had no test that imported `src/lib/auth.ts` at all — so the
 * whole of the account boundary was unverified while 392 tests passed.
 *
 * The chain these close, end to end and without a credential at any step:
 *
 *   1. A signed-out `POST /api/custom-rules` upserted a user
 *      `commander@trenchline.org` with no password.
 *   2. That address was in a hard-coded `ADMIN_EMAILS` in `auth.ts`.
 *   3. `authorize` skipped the password check for an account with no password
 *      hash, and skipped it again when the request omitted the password field.
 *
 * Anyone could therefore create an admin account and then sign into it.
 */

const findUnique = vi.fn();
vi.mock('@/lib/prisma', () => ({ prisma: { user: { findUnique: (...a: unknown[]) => findUnique(...a) } } }));

// The module throws without one, which is the point of SEC-02 and is asserted
// in its own suite below. Set explicitly, as a test environment must.
process.env.NEXTAUTH_SECRET = 'test-secret';

const { authOptions, isUserAdmin, verifyCredentials, MIN_PASSWORD_LENGTH } = await import('../auth');

type Credentials = Record<string, string> | undefined;
const authorize = (credentials: Credentials) => verifyCredentials(credentials);

const PASSWORD = 'correct-horse-battery';
let hash: string;

beforeEach(async () => {
  hash ??= await bcrypt.hash(PASSWORD, 10);
  findUnique.mockReset();
  delete process.env.TRENCHLINE_ADMIN_EMAILS;
});

const user = (over: Record<string, unknown> = {}) => ({
  id: 'u1', email: 'player@example.org', name: 'Player', image: null, password: hash, ...over,
});

/*
  `CredentialsProvider(...)` returns an object whose OWN `authorize` is a stub —
  `authorize: () => null` — with the real configuration stashed under `.options`
  for NextAuth to merge at request time. A suite that reached for
  `provider.authorize` would call that stub, receive `null`, and pass every
  "rejects a bad credential" assertion below while proving nothing.

  So the tests call `verifyCredentials` directly, and this asserts that it is
  what the provider is actually wired to.
*/
describe('the provider wiring', () => {
  /*
    Delegation, not identity.

    `authorize` is a thin wrapper now rather than `verifyCredentials` itself,
    because NextAuth passes the REQUEST as its second argument and the sign-in
    rate limit needs the caller's address from it. So the assertion is that the
    wrapper reaches the real verifier AND hands the request through — which is
    a stronger claim than the equality it replaces, and covers the thing the
    limit depends on.
  */
  const credentialsProvider = () =>
    authOptions.providers.find((p) => p.id === 'credentials') as unknown as {
      options?: { authorize?: (c: unknown, r: unknown) => Promise<unknown> };
    };

  it('reaches verifyCredentials, and passes the request through', async () => {
    findUnique.mockResolvedValue(user());
    const authorizeFn = credentialsProvider().options?.authorize;
    expect(typeof authorizeFn).toBe('function');

    const req = { headers: new Headers({ 'x-forwarded-for': '198.51.100.7' }) };
    await expect(authorizeFn!({ email: 'player@example.org', password: PASSWORD }, req))
      .resolves.toMatchObject({ id: 'u1', email: 'player@example.org' });

    // The real verifier ran: it is the only thing that reads the user record.
    expect(findUnique).toHaveBeenCalled();
  });

  it('is not a stub that answers null to everything', async () => {
    /*
      The failure this whole section exists to catch. `CredentialsProvider(...)`
      returns an object whose own `authorize` is `() => null`, so a suite
      reaching for the wrong one passes every "rejects a bad credential"
      assertion while proving nothing.
    */
    findUnique.mockResolvedValue(user());
    const authorizeFn = credentialsProvider().options?.authorize;
    await expect(authorizeFn!({ email: 'player@example.org', password: PASSWORD }, {}))
      .resolves.not.toBeNull();
  });
});

describe('signing in', () => {
  it('accepts the right password', async () => {
    findUnique.mockResolvedValue(user());
    await expect(authorize({ email: 'player@example.org', password: PASSWORD }))
      .resolves.toMatchObject({ id: 'u1', email: 'player@example.org' });
  });

  it('normalises the email it looks up', async () => {
    findUnique.mockResolvedValue(user());
    await authorize({ email: '  Player@Example.ORG ', password: PASSWORD });
    expect(findUnique).toHaveBeenCalledWith({ where: { email: 'player@example.org' } });
  });

  it('rejects the wrong password', async () => {
    findUnique.mockResolvedValue(user());
    await expect(authorize({ email: 'player@example.org', password: 'wrong' }))
      .resolves.toBeNull();
  });

  /*
    The bypass. `authorize` guarded its password check with
    `credentials.password && user.password`, so omitting the field skipped the
    check entirely and signed you in as whoever owned the address.
  */
  it('rejects a request with no password at all', async () => {
    findUnique.mockResolvedValue(user());
    for (const credentials of [
      { email: 'player@example.org' },
      { email: 'player@example.org', password: '' },
      undefined,
    ]) {
      await expect(authorize(credentials as Credentials), JSON.stringify(credentials))
        .resolves.toBeNull();
    }
  });

  it('rejects an unknown email', async () => {
    findUnique.mockResolvedValue(null);
    await expect(authorize({ email: 'nobody@example.org', password: PASSWORD }))
      .resolves.toBeNull();
  });

  /*
    A Google account stores `password: null`. The same guard let anyone who
    knew the address enter an OAuth-only account through the password form.
  */
  it('rejects an OAuth-only account through the credentials form', async () => {
    findUnique.mockResolvedValue(user({ password: null }));
    await expect(authorize({ email: 'player@example.org', password: 'anything' }))
      .resolves.toBeNull();
    await expect(authorize({ email: 'player@example.org', password: '' }))
      .resolves.toBeNull();
  });
});

/*
  Sign-in used to create accounts, storing `password: null` when none was
  supplied — which the cases above then let anyone else sign into. Registration
  is `POST /api/auth/register` now, and this path only ever reads.
*/
describe('signing in never writes', () => {
  it('does not create an account for an unknown email', async () => {
    findUnique.mockResolvedValue(null);
    const prisma = (await import('@/lib/prisma')).prisma as unknown as Record<string, unknown>;
    expect(Object.keys(prisma.user as object)).toEqual(['findUnique']);
    await expect(authorize({ email: 'new@example.org', password: PASSWORD }))
      .resolves.toBeNull();
  });
});

/*
  Returning early for an address with no account makes the sign-in form an
  oracle for which addresses are registered. All three failing outcomes do the
  same bcrypt work.
*/
describe('user enumeration', () => {
  it('takes comparable time whether or not the account exists', async () => {
    const time = async (fn: () => Promise<unknown>) => {
      const t = performance.now();
      await fn();
      return performance.now() - t;
    };

    findUnique.mockResolvedValue(user());
    const present = await time(() => authorize({ email: 'player@example.org', password: 'wrong' }));

    findUnique.mockResolvedValue(null);
    const absent = await time(() => authorize({ email: 'nobody@example.org', password: 'wrong' }));

    // Same order of magnitude: both run one bcrypt compare at cost 10. A
    // returned-early path is hundreds of times faster, not merely faster.
    expect(absent).toBeGreaterThan(present / 10);
  });
});

describe('the admin role', () => {
  it('is granted by configuration, not by whoever asks', () => {
    process.env.TRENCHLINE_ADMIN_EMAILS = 'boss@example.org';
    expect(isUserAdmin('boss@example.org')).toBe(true);
    expect(isUserAdmin('BOSS@Example.org ')).toBe(true);
    expect(isUserAdmin('player@example.org')).toBe(false);
    expect(isUserAdmin(null)).toBe(false);
    expect(isUserAdmin(undefined)).toBe(false);
    expect(isUserAdmin('')).toBe(false);
  });

  /*
    Step 2 of the takeover chain. `commander@trenchline.org` is the identity
    the signed-out API routes wrote to, so an anonymous request could bring the
    account into existence. It must never be an admin address again.
  */
  it('does not grant admin to the shared anonymous identity', () => {
    expect(isUserAdmin('commander@trenchline.org')).toBe(false);
    process.env.TRENCHLINE_ADMIN_EMAILS = 'boss@example.org';
    expect(isUserAdmin('commander@trenchline.org')).toBe(false);
  });

  it('lets the environment replace the default entirely', () => {
    expect(isUserAdmin('crazymunch@gmail.com')).toBe(true);
    process.env.TRENCHLINE_ADMIN_EMAILS = 'someone-else@example.org';
    expect(isUserAdmin('crazymunch@gmail.com')).toBe(false);
  });
});

/*
  The session callback used to fall back to `isUserAdmin(session.user.email)`
  when the token carried no role, so a session could claim an authority its
  token never granted. It now reads the token and nothing else.
*/
describe('the session callback', () => {
  const session = authOptions.callbacks!.session!;
  const base = { user: { email: 'player@example.org' }, expires: '' };

  it('takes isAdmin from the token', async () => {
    const out = await session({
      session: structuredClone(base), token: { sub: 'u1', isAdmin: true },
    } as never) as { user: Record<string, unknown> };
    expect(out.user.isAdmin).toBe(true);
    expect(out.user.role).toBe('ADMIN');
    expect(out.user.id).toBe('u1');
  });

  it('does not promote a session whose token is not admin', async () => {
    process.env.TRENCHLINE_ADMIN_EMAILS = 'player@example.org';
    const out = await session({
      session: structuredClone(base), token: { sub: 'u1', isAdmin: false },
    } as never) as { user: Record<string, unknown> };
    expect(out.user.isAdmin).toBe(false);
    expect(out.user.role).toBe('USER');
  });
});

describe('the jwt callback', () => {
  const jwt = authOptions.callbacks!.jwt!;

  /*
    Resolution is BY USER ID, against the persisted role, on every refresh.

    It used to be by the token's email against `TRENCHLINE_ADMIN_EMAILS`. The
    grant is `User.role` now — `src/lib/adminRole.ts` — and the email list only
    still answers for a user nobody has decided about yet. By id, so an address
    change confers and removes nothing.
  */
  const asUser = (row: unknown) => findUnique.mockResolvedValue(row);

  it('resolves the role on every call, so a revoked grant takes effect', async () => {
    asUser({ email: 'boss@example.org', role: 'ADMIN', roleGrantedAt: new Date() });
    const promoted = await jwt({ token: { sub: 'u1', email: 'boss@example.org' } } as never);
    expect(promoted.isAdmin).toBe(true);

    asUser({ email: 'boss@example.org', role: 'USER', roleGrantedAt: new Date() });
    const demoted = await jwt({ token: { sub: 'u1', email: 'boss@example.org', isAdmin: true } } as never);
    expect(demoted.isAdmin).toBe(false);
    expect(demoted.role).toBe('USER');
  });

  it('falls back to the configured list only for a user nobody has decided about', async () => {
    process.env.TRENCHLINE_ADMIN_EMAILS = 'boss@example.org';
    asUser({ email: 'boss@example.org', role: 'USER', roleGrantedAt: null });
    expect((await jwt({ token: { sub: 'u1' } } as never)).isAdmin).toBe(true);

    asUser({ email: 'player@example.org', role: 'USER', roleGrantedAt: null });
    expect((await jwt({ token: { sub: 'u2' } } as never)).isAdmin).toBe(false);
  });

  it('does not follow the address on the token', async () => {
    /*
      The token can carry any email; the role comes from the row the id names.
      Putting a listed address on a token must not confer anything.
    */
    process.env.TRENCHLINE_ADMIN_EMAILS = 'boss@example.org';
    asUser({ email: 'player@example.org', role: 'USER', roleGrantedAt: null });
    const out = await jwt({ token: { sub: 'u2', email: 'boss@example.org' } } as never);
    expect(out.isAdmin).toBe(false);
  });

  it('is nobody when the user record has gone', async () => {
    // A deleted account must not keep authority through a token that outlives it.
    asUser(null);
    expect((await jwt({ token: { sub: 'deleted' } } as never)).isAdmin).toBe(false);
  });

  it('fails closed when the lookup throws', async () => {
    /*
      This runs on every authenticated request. A database blip must not grant
      authority — and must not throw the caller out of their session either.
    */
    findUnique.mockRejectedValue(new Error('connection reset'));
    const out = await jwt({ token: { sub: 'u1' } } as never);
    expect(out.isAdmin).toBe(false);
    expect(out.role).toBe('USER');
  });

  it('ignores an isAdmin claim already on the token', async () => {
    process.env.TRENCHLINE_ADMIN_EMAILS = 'boss@example.org';
    findUnique.mockResolvedValue({ email: 'player@example.org', role: 'USER', roleGrantedAt: null });
    const out = await jwt({ token: { sub: 'u2', email: 'player@example.org', isAdmin: true, role: 'ADMIN' } } as never);
    expect(out.isAdmin).toBe(false);
    expect(out.role).toBe('USER');
  });
});

/*
  `secret` is a getter, and that is the difference between a server that fails
  closed and one that will not build.

  Evaluated eagerly, `requireEnv` ran when this module was first imported — and
  `next build` imports every route module to collect page data, so a build
  machine without the secret could not produce a bundle at all. Vercel's
  preview deployments legitimately have no runtime secrets, and every one of
  them failed. The build signs nothing; only serving a request does.
*/
describe('the session secret', () => {
  it('is a getter, so importing this module does not read it', () => {
    // The mechanism, asserted directly: a plain value would have been
    // evaluated when this file imported `../auth` at the top, with no secret
    // set at that moment for a build machine.
    const descriptor = Object.getOwnPropertyDescriptor(authOptions, 'secret');
    expect(descriptor?.get, 'secret must be lazily evaluated').toBeTypeOf('function');
    expect(descriptor?.value).toBeUndefined();
  });

  it('is read, and required, when it is actually needed', async () => {
    const before = process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    expect(() => authOptions.secret).toThrow(/NEXTAUTH_SECRET is not set/);

    process.env.NEXTAUTH_SECRET = 'a-real-secret';
    expect(authOptions.secret).toBe('a-real-secret');
    process.env.NEXTAUTH_SECRET = before;
  });
});

describe('the password policy', () => {
  it('is long enough to be worth hashing', () => {
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(8);
  });
});
