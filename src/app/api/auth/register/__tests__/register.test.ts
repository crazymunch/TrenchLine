import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Registration.
 *
 * It used to be a side effect of signing in: `authorize` created a user for
 * any email it did not recognise and stored `password: null` when none was
 * supplied — which the sign-in bypass then let anyone else enter. Creating an
 * account and proving you own one are separate decisions, and this is the one
 * that writes.
 */

const findUnique = vi.fn();
const create = vi.fn();
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => findUnique(...a),
      create: (...a: unknown[]) => create(...a),
    },
  },
}));

process.env.NEXTAUTH_SECRET = 'test-secret';

const { POST } = await import('../route');
const { MIN_PASSWORD_LENGTH } = await import('@/lib/auth');

const GOOD = 'a-long-enough-password';

/** The handler only ever calls `req.json()`. */
const post = async (body: unknown) => {
  const req = {
    json: async () => {
      if (body === Symbol.for('malformed')) throw new SyntaxError('bad json');
      return body;
    },
  };
  const res = await POST(req as never);
  return { status: res.status, body: await res.json() };
};

beforeEach(() => {
  findUnique.mockReset().mockResolvedValue(null);
  create.mockReset().mockImplementation(async ({ data, select }: never) => ({
    id: 'u1', email: (data as Record<string, string>).email,
    name: (data as Record<string, string>).name, select,
  }));
});

describe('creating an account', () => {
  it('stores a hashed password, never the password', async () => {
    const { status } = await post({ email: 'new@example.org', password: GOOD, name: 'Player' });
    expect(status).toBe(201);

    const { data } = create.mock.calls[0][0];
    expect(data.email).toBe('new@example.org');
    expect(data.name).toBe('Player');
    expect(data.password).not.toBe(GOOD);
    expect(data.password).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it('never returns the password hash', async () => {
    const { body } = await post({ email: 'new@example.org', password: GOOD });
    expect(JSON.stringify(body)).not.toMatch(/\$2[aby]\$/);
    expect(create.mock.calls[0][0].select).toEqual({ id: true, email: true, name: true });
  });

  it('normalises the email and defaults the name from it', async () => {
    await post({ email: '  New@Example.ORG ', password: GOOD });
    expect(create.mock.calls[0][0].data.email).toBe('new@example.org');
    expect(create.mock.calls[0][0].data.name).toBe('new');
  });

  /*
    Nothing here proves the registrant owns the address, so nothing claims it
    does — and a later verification step has somewhere truthful to write.
  */
  it('does not claim the email is verified', async () => {
    await post({ email: 'new@example.org', password: GOOD });
    expect(create.mock.calls[0][0].data.emailVerified).toBeUndefined();
  });

  /*
    Registration must not mint a session. One code path decides whether a
    caller gets one, and it is the sign-in path, which checks a password.
  */
  it('issues no session and no token', async () => {
    const { body } = await post({ email: 'new@example.org', password: GOOD });
    expect(Object.keys(body)).toEqual(['user']);
    expect(JSON.stringify(body)).not.toMatch(/token|session|secret/i);
  });
});

describe('rejected input', () => {
  it('rejects a malformed body without reaching the database', async () => {
    const { status } = await post(Symbol.for('malformed'));
    expect(status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects a body that is not an object', async () => {
    for (const body of [null, 'a string', 42, []]) {
      const { status } = await post(body);
      expect(status, JSON.stringify(body)).toBe(400);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it('requires both an email and a password, as strings', async () => {
    for (const body of [
      {},
      { email: 'new@example.org' },
      { password: GOOD },
      { email: 'new@example.org', password: null },
      { email: 123, password: GOOD },
      { email: 'new@example.org', password: { length: 99 } },
    ]) {
      const { status } = await post(body);
      expect(status, JSON.stringify(body)).toBe(400);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it('rejects an address that is not shaped like one', async () => {
    for (const email of ['no-at-sign', 'a@b', 'a b@example.org', '@example.org', `${'x'.repeat(250)}@e.org`]) {
      const { status } = await post({ email, password: GOOD });
      expect(status, email).toBe(400);
    }
    expect(create).not.toHaveBeenCalled();
  });

  it('enforces the password policy at both ends', async () => {
    const short = 'x'.repeat(MIN_PASSWORD_LENGTH - 1);
    expect((await post({ email: 'new@example.org', password: short })).status).toBe(400);
    // bcrypt reads only the first 72 bytes, so a longer one is wasted work an
    // attacker chooses the size of.
    expect((await post({ email: 'new@example.org', password: 'x'.repeat(73) })).status).toBe(400);
    expect(create).not.toHaveBeenCalled();
  });

  it('caps the stored name rather than rejecting a long one', async () => {
    await post({ email: 'new@example.org', password: GOOD, name: 'n'.repeat(500) });
    expect(create.mock.calls[0][0].data.name.length).toBeLessThanOrEqual(80);
  });
});

/*
  Registration is enumerable, and the route says so rather than pretending
  otherwise: a distinct 409 for the duplicate case is a membership oracle
  whatever the body says. Closing it properly means answering every
  registration identically and moving the outcome into an email only the
  address owner receives, and this application has no mailer — returning 201
  here instead would tell a genuine user their account was created when it was
  not. The wording still avoids confirming anything the status has not already
  given away.
*/
describe('an address that already exists', () => {
  it('does not spell out that the address is taken', async () => {
    findUnique.mockResolvedValue({ id: 'existing' });
    const { status, body } = await post({ email: 'taken@example.org', password: GOOD });
    expect(status).toBe(409);
    expect(body.error).not.toMatch(/already registered|address is taken|that email/i);
    expect(create).not.toHaveBeenCalled();
  });

  it('never overwrites the existing account', async () => {
    findUnique.mockResolvedValue({ id: 'existing', password: 'their-hash' });
    await post({ email: 'taken@example.org', password: GOOD });
    expect(create).not.toHaveBeenCalled();
  });
});
