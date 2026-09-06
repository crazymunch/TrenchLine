import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Registration, verification and password reset, end to end.
 *
 * The property under test is that a CALLER learns nothing about who has an
 * account: every registration answers identically, every reset request answers
 * identically, and every bad token answers identically. What differs is only
 * what lands in the mailbox, which is why the fake transport below records
 * messages — asserting on those is how the behaviour is checked without the
 * response revealing it.
 */

const url = process.env.DATABASE_URL;
const describeDb = url ? describe : describe.skip;
const prisma = new PrismaClient({ datasources: { db: { url: url ?? 'postgresql://unused' } } });

/** The fake mail adapter AUTH-2 asks for. Captures, never sends. */
const sent: { to: string; subject: string; text: string }[] = [];
vi.mock('@/lib/mail', () => ({
  mailer: () => ({ name: 'fake', async send(m: never) { sent.push(m); } }),
  authRequiresVerification: () => true,
  resetMailWarning: () => {},
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'https://trenchline.test';

const { resetRateLimits } = await import('@/lib/api/rateLimit');
const { POST: register } = await import('../register/route');
const { POST: verify } = await import('../verify/route');
const { POST: reset } = await import('../reset/route');
const { verifyCredentials } = await import('@/lib/auth');

const call = async (handler: (r: never) => Promise<Response>, body: unknown) => {
  /*
    `text`, not `json`, and headers as a real request has them.

    The routes rate-limit on the caller's address, so a fixture without headers
    exercises a path a browser never takes — and since these routes went
    through `readJson`, the body is READ AS TEXT so it can be measured before
    it is parsed. A stub offering only `json()` makes every assertion a 500
    that looks like a failing check and is not one.
  */
  const res = await handler({
    text: async () => JSON.stringify(body),
    headers: new Headers({ 'x-forwarded-for': '203.0.113.1' }),
  } as never);
  return { status: res.status, body: await res.json() as Record<string, unknown> };
};

const DOMAIN = '@flows.test';
const PASSWORD = 'a-long-enough-password';
const linkIn = (text: string) => /token=([\w-]+)/.exec(text)?.[1] ?? '';

describeDb('account flows', () => {
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    await prisma.$disconnect();
  });
  beforeEach(async () => {
    /* Every request here comes from the same absent address; without this the
       suite spends its own bucket and later tests measure the limiter. */
    resetRateLimits();
    sent.length = 0;
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
  });

  /*
    The body cap, on all three.

    These routes called `req.json()` until now, which parses before anyone can
    object to the size — so the 512 KB ceiling every other write path enforces
    did not apply to them. Field-level limits are not a substitute: they run
    AFTER the parse, so the work of parsing a body of a caller's choosing had
    already been done by the time one of them said no.

    Asserted on all three rather than one, because the point is that no write
    path is left outside `readJson`.
  */
  describe('the body cap', () => {
    const oversized = { email: `x${DOMAIN}`, password: 'x'.repeat(600 * 1024) };

    it('refuses an oversized body before parsing it', async () => {
      const res = await call(register, oversized);
      expect(res.status).toBe(413);
    });

    it('refuses one on the reset route too', async () => {
      expect((await call(reset, oversized)).status).toBe(413);
    });

    it('and on verify', async () => {
      expect((await call(verify, oversized)).status).toBe(413);
    });

    it('still accepts a body of a realistic size', async () => {
      // The guard on the guard: a cap that refused everything would pass all
      // three assertions above and break the application.
      const res = await call(register, { email: `sized${DOMAIN}`, password: PASSWORD });
      expect(res.status).toBe(202);
    });
  });

  describe('registration', () => {
    it('answers a new address and an existing one identically', async () => {
      /*
        The oracle this closes. A 409 for the duplicate case let anyone walk a
        list of addresses through the endpoint and learn which had accounts —
        the old code documented that and accepted it.
      */
      const fresh = await call(register, { email: `new${DOMAIN}`, password: PASSWORD });
      await prisma.user.create({
        data: { email: `taken${DOMAIN}`, password: await bcrypt.hash(PASSWORD, 4), emailVerified: new Date() },
      });
      const taken = await call(register, { email: `taken${DOMAIN}`, password: PASSWORD });

      expect(fresh.status).toBe(202);
      expect(taken.status).toBe(taken.status);
      expect(taken.status).toBe(fresh.status);
      expect(taken.body).toEqual(fresh.body);
    });

    it('and identically again for an OAuth-only account', async () => {
      await prisma.user.create({ data: { email: `google${DOMAIN}`, emailVerified: new Date() } });
      const oauth = await call(register, { email: `google${DOMAIN}`, password: PASSWORD });
      const fresh = await call(register, { email: `new2${DOMAIN}`, password: PASSWORD });

      expect(oauth.status).toBe(fresh.status);
      expect(oauth.body).toEqual(fresh.body);
    });

    it('creates the account only for a new address', async () => {
      await call(register, { email: `new${DOMAIN}`, password: PASSWORD });
      const created = await prisma.user.findUnique({ where: { email: `new${DOMAIN}` } });
      expect(created).not.toBeNull();
      expect(created!.emailVerified, 'nothing has proved the address yet').toBeNull();
    });

    it('never replaces the password on an account that already exists', async () => {
      /*
        Otherwise anyone knowing an address could overwrite the credential on
        an account they do not own, just by registering it again.
      */
      const original = await bcrypt.hash('the-real-password', 4);
      await prisma.user.create({ data: { email: `taken${DOMAIN}`, password: original } });
      await call(register, { email: `taken${DOMAIN}`, password: 'attackers-password' });

      const after = await prisma.user.findUnique({ where: { email: `taken${DOMAIN}` } });
      expect(after!.password).toBe(original);
    });

    it('tells the address owner, which is where the truth goes', async () => {
      await prisma.user.create({
        data: { email: `taken${DOMAIN}`, password: await bcrypt.hash(PASSWORD, 4), emailVerified: new Date() },
      });
      await call(register, { email: `taken${DOMAIN}`, password: PASSWORD });

      expect(sent).toHaveLength(1);
      expect(sent[0].to).toBe(`taken${DOMAIN}`);
      expect(sent[0].subject).toMatch(/tried to register/i);
    });
  });

  describe('verification', () => {
    it('is required before a credentials sign-in, and enough after one', async () => {
      await call(register, { email: `new${DOMAIN}`, password: PASSWORD });
      expect(await verifyCredentials({ email: `new${DOMAIN}`, password: PASSWORD }),
        'unverified must not sign in').toBeNull();

      const token = linkIn(sent[0].text);
      expect((await call(verify, { token })).status).toBe(200);

      expect(await verifyCredentials({ email: `new${DOMAIN}`, password: PASSWORD }),
        'verified may sign in').not.toBeNull();
    });

    it('refuses a spent link, an expired one and a made-up one alike', async () => {
      await call(register, { email: `new${DOMAIN}`, password: PASSWORD });
      const token = linkIn(sent[0].text);
      await call(verify, { token });

      const replay = await call(verify, { token });
      const nonsense = await call(verify, { token: 'never-issued' });
      expect(replay.status).toBe(400);
      expect(nonsense.status).toBe(replay.status);
      expect(nonsense.body).toEqual(replay.body);
    });

    it('refuses a reset token, so one link cannot do the other job', async () => {
      const u = await prisma.user.create({
        data: { email: `r${DOMAIN}`, password: await bcrypt.hash(PASSWORD, 4) },
      });
      await call(reset, { email: `r${DOMAIN}` });
      const resetToken = linkIn(sent[0].text);

      expect((await call(verify, { token: resetToken })).status).toBe(400);
      const still = await prisma.user.findUnique({ where: { id: u.id } });
      expect(still!.emailVerified).toBeNull();
    });
  });

  describe('password reset', () => {
    it('answers the same for an account, no account, and an OAuth-only one', async () => {
      await prisma.user.create({
        data: { email: `has${DOMAIN}`, password: await bcrypt.hash(PASSWORD, 4) },
      });
      await prisma.user.create({ data: { email: `google${DOMAIN}` } });

      const has = await call(reset, { email: `has${DOMAIN}` });
      const none = await call(reset, { email: `nobody${DOMAIN}` });
      const oauth = await call(reset, { email: `google${DOMAIN}` });

      expect(none.status).toBe(has.status);
      expect(none.body).toEqual(has.body);
      expect(oauth.status).toBe(has.status);
      expect(oauth.body).toEqual(has.body);
    });

    it('sends a link only to an account that has a password', async () => {
      /*
        An OAuth-only account has nothing to reset, and issuing a link would
        let a reset CREATE a password on an account whose owner never chose
        one — a way in that bypasses Google entirely.
      */
      await prisma.user.create({ data: { email: `google${DOMAIN}` } });
      await call(reset, { email: `google${DOMAIN}` });
      await call(reset, { email: `nobody${DOMAIN}` });
      expect(sent).toHaveLength(0);
    });

    it('changes the password, proves the address, and revokes the sessions', async () => {
      const u = await prisma.user.create({
        data: { email: `has${DOMAIN}`, password: await bcrypt.hash(PASSWORD, 4) },
      });
      await call(reset, { email: `has${DOMAIN}` });
      const token = linkIn(sent[0].text);

      expect((await call(reset, { token, password: 'a-brand-new-password' })).status).toBe(200);

      const after = await prisma.user.findUnique({ where: { id: u.id } });
      expect(await bcrypt.compare('a-brand-new-password', after!.password!)).toBe(true);
      expect(after!.emailVerified, 'resetting proves the address').not.toBeNull();
      expect(after!.sessionEpoch, 'the old JWTs are revoked').toBe(u.sessionEpoch + 1);
    });

    it('will not spend the same link twice', async () => {
      await prisma.user.create({
        data: { email: `has${DOMAIN}`, password: await bcrypt.hash(PASSWORD, 4) },
      });
      await call(reset, { email: `has${DOMAIN}` });
      const token = linkIn(sent[0].text);

      await call(reset, { token, password: 'first-new-password' });
      const second = await call(reset, { token, password: 'second-new-password' });
      expect(second.status).toBe(400);
    });

    it('refuses a verification token', async () => {
      await call(register, { email: `new${DOMAIN}`, password: PASSWORD });
      const verifyToken = linkIn(sent[0].text);
      expect((await call(reset, { token: verifyToken, password: 'a-new-password' })).status)
        .toBe(400);
    });

    it('refuses a password that is too short, before spending the link', async () => {
      await prisma.user.create({
        data: { email: `has${DOMAIN}`, password: await bcrypt.hash(PASSWORD, 4) },
      });
      await call(reset, { email: `has${DOMAIN}` });
      const token = linkIn(sent[0].text);

      expect((await call(reset, { token, password: 'short' })).status).toBe(400);
      // The link survives, so a typo does not cost the user their only link.
      expect((await call(reset, { token, password: 'a-good-long-password' })).status).toBe(200);
    });
  });
});
