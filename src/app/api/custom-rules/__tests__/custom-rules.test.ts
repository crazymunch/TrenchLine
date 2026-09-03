import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Custom rule overrides.
 *
 * Every signed-out write used to be filed under one shared account —
 * `commander@trenchline.org`, upserted on demand — keyed by
 * `(userId, ruleType, ruleId)`, so unrelated anonymous visitors overwrote each
 * other's overrides.
 *
 * And that account was on the hard-coded admin list, so this endpoint is how a
 * stranger brought an admin account into existence with no password for the
 * sign-in bypass to walk into. The first test below is the one that matters.
 */

const db = {
  customRuleOverride: { findMany: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
  user: { upsert: vi.fn(), findUnique: vi.fn() },
};
vi.mock('@/lib/prisma', () => ({ prisma: db }));

const getServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));

process.env.NEXTAUTH_SECRET = 'test-secret';

const { GET, POST, DELETE } = await import('../route');

const ALICE = { id: 'alice', email: 'alice@example.org' };

const signedInAs = (user: { id: string; email: string } | null) =>
  getServerSession.mockResolvedValue(user ? { user } : null);

const send = async (
  handler: (r: never) => Promise<Response>,
  body: unknown,
) => {
  const res = await handler({
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  } as never);
  return { status: res.status, body: await res.json() };
};

const VALID = { ruleType: 'unit', ruleId: 'na-lieutenant', name: 'My Lieutenant', data: { cost: 90 } };

beforeEach(() => {
  Object.values(db).forEach((m) => Object.values(m).forEach((f) => f.mockReset()));
  getServerSession.mockReset();
  db.customRuleOverride.findMany.mockResolvedValue([]);
  db.customRuleOverride.upsert.mockResolvedValue({ id: 'o1' });
  db.customRuleOverride.deleteMany.mockResolvedValue({ count: 1 });
});

/*
  The step that seeded the admin takeover: an unauthenticated POST that
  created a user row.
*/
describe('the shared anonymous identity', () => {
  it('is never created, by any request', async () => {
    signedInAs(null);
    const { status } = await send(POST, VALID);
    expect(status).toBe(401);
    expect(db.user.upsert).not.toHaveBeenCalled();
    expect(db.customRuleOverride.upsert).not.toHaveBeenCalled();
  });

  it('is not created by a delete either', async () => {
    signedInAs(null);
    expect((await send(DELETE, { ruleType: 'unit', ruleId: 'x' })).status).toBe(401);
    expect(db.user.upsert).not.toHaveBeenCalled();
  });
});

describe('reading overrides', () => {
  it('gives a signed-out caller an empty list, not an error', async () => {
    // Anonymous customisation still works; it is local-only, as it is for
    // warbands. An empty cloud list is the truthful answer.
    signedInAs(null);
    const res = await GET({} as never);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ overrides: [] });
    expect(db.customRuleOverride.findMany).not.toHaveBeenCalled();
  });

  it('returns only the caller’s own', async () => {
    signedInAs(ALICE);
    await GET({} as never);
    expect(db.customRuleOverride.findMany.mock.calls[0][0].where).toEqual({ userId: 'alice' });
  });
});

describe('writing an override', () => {
  it('scopes the write to the acting user by the key itself', async () => {
    signedInAs(ALICE);
    expect((await send(POST, VALID)).status).toBe(200);
    const call = db.customRuleOverride.upsert.mock.calls[0][0];
    expect(call.where.userId_ruleType_ruleId.userId).toBe('alice');
    expect(call.create.userId).toBe('alice');
  });

  it('cannot be aimed at another user', async () => {
    // An unknown key is a 400 rather than something that reaches Prisma.
    signedInAs(ALICE);
    const { status } = await send(POST, { ...VALID, userId: 'bob' });
    expect(status).toBe(400);
    expect(db.customRuleOverride.upsert).not.toHaveBeenCalled();
  });

  it('requires a known rule type', async () => {
    signedInAs(ALICE);
    for (const ruleType of ['unit', 'weapon', 'armour', 'equipment']) {
      expect((await send(POST, { ...VALID, ruleType })).status, ruleType).toBe(200);
    }
    for (const ruleType of ['user', 'admin', '', 42, null]) {
      expect((await send(POST, { ...VALID, ruleType })).status, String(ruleType)).toBe(400);
    }
  });

  it('requires a name and a rule id', async () => {
    signedInAs(ALICE);
    for (const body of [
      { ...VALID, name: '' },
      { ...VALID, name: '   ' },
      { ...VALID, ruleId: '' },
      { ...VALID, name: 'x'.repeat(201) },
    ]) {
      expect((await send(POST, body)).status, JSON.stringify(body).slice(0, 60)).toBe(400);
    }
  });

  /*
    `data` mirrors whichever entry is overridden, so its shape is not pinned
    here — but it is bounded. An override is a patch to one entry, not a place
    to park a megabyte.
  */
  it('bounds the free-form data', async () => {
    signedInAs(ALICE);
    expect((await send(POST, { ...VALID, data: { note: 'x'.repeat(70_000) } })).status).toBe(400);
    expect((await send(POST, { ...VALID, data: { note: 'fine' } })).status).toBe(200);
  });
});

describe('deleting an override', () => {
  it('can only reach the caller’s own row', async () => {
    signedInAs(ALICE);
    expect((await send(DELETE, { ruleType: 'unit', ruleId: 'na-lieutenant' })).status).toBe(200);
    expect(db.customRuleOverride.deleteMany.mock.calls[0][0].where).toEqual({
      userId: 'alice', ruleType: 'unit', ruleId: 'na-lieutenant',
    });
  });

  it('is a 404 when the caller has no such override', async () => {
    signedInAs(ALICE);
    db.customRuleOverride.deleteMany.mockResolvedValue({ count: 0 });
    expect((await send(DELETE, { ruleType: 'unit', ruleId: 'someone-elses' })).status).toBe(404);
  });
});
