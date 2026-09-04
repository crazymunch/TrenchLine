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
    /*
      202, not 201. This endpoint no longer says whether a resource was
      created: three of its four branches create nothing, and answering
      differently is the membership oracle the flow was changed to close.
    */
    const { status } = await post({ email: 'new@example.org', password: GOOD, name: 'Player' });
    expect(status).toBe(202);

    const { data } = create.mock.calls[0][0];
    expect(data.email).toBe('new@example.org');
    expect(data.name).toBe('Player');
    expect(data.password).not.toBe(GOOD);
    expect(data.password).toMatch(/^\$2[aby]\$\d{2}\$/);
  });

  it('never returns the password hash', async () => {
    const { body } = await post({ email: 'new@example.org', password: GOOD });
    expect(JSON.stringify(body)).not.toMatch(/\$2[aby]\$/);
    expect(create.mock.calls[0][0].select).toEqual({ id: true, email: true });
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
  it('issues no session and no token, and returns no user', async () => {
    /*
      The user is gone from the body too. Returning one for the created case
      and not for the others would put the oracle back in the shape of the
      response rather than its status.
    */
    const { body } = await post({ email: 'new@example.org', password: GOOD });
    expect(Object.keys(body).sort()).toEqual(['message', 'ok']);
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
  Registration used to be enumerable and said so: a distinct 409 for the
  duplicate case is a membership oracle whatever the body says, and the old
  code documented that and accepted it because closing it needs somewhere else
  to put the real outcome.

  That somewhere is the verification mail. Every branch now answers 202 with
  the same body, and the four cases differ only in what is sent to the address.
  `accountFlows.integration.test.ts` proves that against a real database and a
  fake transport; these prove the route itself does not branch.
*/
describe('an address that already exists', () => {
  it('answers exactly as it does for a new address', async () => {
    findUnique.mockResolvedValue({ id: 'existing', emailVerified: new Date() });
    const taken = await post({ email: 'taken@example.org', password: GOOD });

    findUnique.mockResolvedValue(null);
    const fresh = await post({ email: 'new@example.org', password: GOOD });

    expect(taken.status).toBe(fresh.status);
    expect(taken.body).toEqual(fresh.body);
  });

  it('does not spell out that the address is taken', async () => {
    findUnique.mockResolvedValue({ id: 'existing', emailVerified: new Date() });
    const { status, body } = await post({ email: 'taken@example.org', password: GOOD });
    expect(status).toBe(202);
    expect(JSON.stringify(body)).not.toMatch(/already registered|address is taken|exists/i);
    expect(create).not.toHaveBeenCalled();
  });

  it('never overwrites the existing account', async () => {
    findUnique.mockResolvedValue({ id: 'existing', password: 'their-hash', emailVerified: new Date() });
    await post({ email: 'taken@example.org', password: GOOD });
    expect(create).not.toHaveBeenCalled();
  });
});
