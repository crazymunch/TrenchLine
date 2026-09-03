import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * The campaign authorization matrix.
 *
 * This route had no authorization of any kind. Each group below is an
 * operation that any caller on the internet could perform, signed in or not.
 */

const db = {
  campaign: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn() },
  campaignMember: { findFirst: vi.fn() },
  territoryNode: { findUnique: vi.fn(), update: vi.fn() },
  warband: { findUnique: vi.fn() },
  user: { upsert: vi.fn() },
};
vi.mock('@/lib/prisma', () => ({ prisma: db }));

const getServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));

process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.TRENCHLINE_ADMIN_EMAILS = 'ops@example.org';

const { GET, POST } = await import('../route');

const ALICE = { id: 'alice', email: 'alice@example.org' };
const BOB = { id: 'bob', email: 'bob@example.org' };

const signedInAs = (user: { id: string; email: string } | null) =>
  getServerSession.mockResolvedValue(user ? { user } : null);

const get = async (query = '') => {
  const res = await GET({ url: `http://localhost/api/campaigns${query}` } as never);
  return { status: res.status, body: await res.json() };
};

const post = async (body: unknown) => {
  const res = await POST({
    headers: { get: () => null },
    text: async () => JSON.stringify(body),
  } as never);
  return { status: res.status, body: await res.json() };
};

beforeEach(() => {
  Object.values(db).forEach((m) => Object.values(m).forEach((f) => f.mockReset()));
  getServerSession.mockReset();
  db.campaign.findMany.mockResolvedValue([]);
});

/*
  `GET` with no selector returned the ten most recent campaigns on the server —
  members, territories and match history — to anybody.
*/
describe('listing campaigns', () => {
  it('refuses a signed-out caller', async () => {
    signedInAs(null);
    expect((await get()).status).toBe(401);
    expect(db.campaign.findMany).not.toHaveBeenCalled();
  });

  it('returns only campaigns the caller runs or plays in', async () => {
    signedInAs(ALICE);
    await get();
    expect(db.campaign.findMany.mock.calls[0][0].where).toEqual({
      OR: [{ adminId: 'alice' }, { members: { some: { userId: 'alice' } } }],
    });
  });
});

/*
  `GET ?id=` returned any campaign in full to any caller.
*/
describe('reading one campaign', () => {
  it('refuses a signed-out caller', async () => {
    signedInAs(null);
    expect((await get('?id=c1')).status).toBe(401);
  });

  it('is a 404 — not a 403 — for a campaign the caller is not in', async () => {
    // A 403 confirms the campaign exists, which is what an enumerator wants.
    signedInAs(BOB);
    db.campaign.findUnique.mockResolvedValue({ id: 'c1', adminId: 'alice', members: [] });
    const { status } = await get('?id=c1');
    expect(status).toBe(404);
  });

  it('is a 404 for a campaign that does not exist', async () => {
    signedInAs(BOB);
    db.campaign.findUnique.mockResolvedValue(null);
    expect((await get('?id=nope')).status).toBe(404);
  });

  it('lets a member read it', async () => {
    signedInAs(BOB);
    db.campaign.findUnique
      .mockResolvedValueOnce({ id: 'c1', adminId: 'alice', members: [{ id: 'm1' }] })
      .mockResolvedValueOnce({ id: 'c1', name: 'Campaign', members: [], territories: [], matches: [] });
    expect((await get('?id=c1')).status).toBe(200);
  });

  it('lets the campaign admin read it', async () => {
    signedInAs(ALICE);
    db.campaign.findUnique
      .mockResolvedValueOnce({ id: 'c1', adminId: 'alice', members: [] })
      .mockResolvedValueOnce({ id: 'c1', name: 'Campaign', members: [], territories: [], matches: [] });
    expect((await get('?id=c1')).status).toBe(200);
  });
});

/*
  An invite code is a capability that travels through channels nobody here
  controls, so what it unlocks is a preview and not the campaign.
*/
describe('an invite code', () => {
  it('returns a preview without requiring a session', async () => {
    signedInAs(null);
    db.campaign.findUnique.mockResolvedValue({ id: 'c1', name: 'Campaign', status: 'active' });
    const { status } = await get('?code=TRENCH-ABC');
    expect(status).toBe(200);
  });

  it('does not include members, territories or match history', async () => {
    signedInAs(null);
    db.campaign.findUnique.mockResolvedValue({ id: 'c1', name: 'Campaign' });
    await get('?code=TRENCH-ABC');
    const select = db.campaign.findUnique.mock.calls[0][0].select;
    expect(select.members).toBeUndefined();
    expect(select.territories).toBeUndefined();
    expect(select.matches).toBeUndefined();
    expect(select._count).toBeDefined();
  });

  it('is a 404 for a code that matches nothing', async () => {
    signedInAs(null);
    db.campaign.findUnique.mockResolvedValue(null);
    expect((await get('?code=TRENCH-NOPE')).status).toBe(404);
  });
});

describe('creating a campaign', () => {
  it('refuses a signed-out caller, and creates no shared user', async () => {
    signedInAs(null);
    expect((await post({ action: 'create', name: 'Mine' })).status).toBe(401);
    expect(db.user.upsert).not.toHaveBeenCalled();
    expect(db.campaign.create).not.toHaveBeenCalled();
  });

  it('makes the creator the campaign admin', async () => {
    signedInAs(ALICE);
    db.campaign.create.mockResolvedValue({ id: 'c1' });
    const { status } = await post({ action: 'create', name: 'Mine' });
    expect(status).toBe(201);
    expect(db.campaign.create.mock.calls[0][0].data.adminId).toBe('alice');
  });

  /*
    `TRENCH-${1000 + Math.random() * 9000}` is nine thousand possibilities from
    a generator that is not for anything security-bearing. That is not a guess,
    it is a loop.
  */
  it('issues an invite code worth guessing at', async () => {
    signedInAs(ALICE);
    db.campaign.create.mockResolvedValue({ id: 'c1' });
    const codes = new Set<string>();
    for (let i = 0; i < 25; i++) {
      await post({ action: 'create' });
      codes.add(db.campaign.create.mock.calls.at(-1)![0].data.inviteCode);
    }
    expect(codes.size).toBe(25);
    for (const code of codes) {
      expect(code).toMatch(/^TRENCH-[0-9A-HJKMNP-TV-Z]{15}$/);
    }
  });

  it('keeps a deliberate zero rather than substituting a default', async () => {
    // `maxWarbandDucats || 700` turned a deliberate 0 into 700.
    signedInAs(ALICE);
    db.campaign.create.mockResolvedValue({ id: 'c1' });
    await post({ action: 'create', maxWarbandDucats: 0, gloryVictoryThreshold: 0 });
    const { data } = db.campaign.create.mock.calls[0][0];
    expect(data.maxWarbandDucats).toBe(0);
    expect(data.gloryVictoryThreshold).toBe(0);
  });
});

/*
  The worst of it. `claim_territory` updated any territory ID with no session,
  no membership check, no campaign-admin check, and no verification that the
  warband being planted belonged to the caller or was in that campaign.
*/
describe('claiming a territory', () => {
  const claim = { action: 'claim_territory', territoryId: 't1', warbandId: 'w1' };

  const territoryIn = (campaignId: string) =>
    db.territoryNode.findUnique.mockResolvedValue({ id: 't1', campaignId });

  it('refuses a signed-out caller', async () => {
    signedInAs(null);
    territoryIn('c1');
    expect((await post(claim)).status).toBe(401);
    expect(db.territoryNode.update).not.toHaveBeenCalled();
  });

  it('refuses a signed-in caller who is not in the campaign', async () => {
    signedInAs(BOB);
    territoryIn('c1');
    db.campaign.findUnique.mockResolvedValue({ id: 'c1', adminId: 'alice', members: [] });
    expect((await post(claim)).status).toBe(404);
    expect(db.territoryNode.update).not.toHaveBeenCalled();
  });

  it('refuses a member claiming with a warband that is not theirs', async () => {
    signedInAs(BOB);
    territoryIn('c1');
    db.campaign.findUnique.mockResolvedValue({ id: 'c1', adminId: 'alice', members: [{ id: 'm1' }] });
    db.warband.findUnique.mockResolvedValue({ id: 'w1', userId: 'alice' });
    expect((await post(claim)).status).toBe(403);
    expect(db.territoryNode.update).not.toHaveBeenCalled();
  });

  it('refuses their own warband that is not in this campaign', async () => {
    signedInAs(BOB);
    territoryIn('c1');
    db.campaign.findUnique.mockResolvedValue({ id: 'c1', adminId: 'alice', members: [{ id: 'm1' }] });
    db.warband.findUnique.mockResolvedValue({ id: 'w1', userId: 'bob' });
    db.campaignMember.findFirst.mockResolvedValue(null);
    expect((await post(claim)).status).toBe(403);
    expect(db.territoryNode.update).not.toHaveBeenCalled();
  });

  it('is a 404 for a territory that does not exist', async () => {
    signedInAs(BOB);
    db.territoryNode.findUnique.mockResolvedValue(null);
    expect((await post(claim)).status).toBe(404);
  });

  it('allows a member claiming with their own warband in that campaign', async () => {
    signedInAs(BOB);
    territoryIn('c1');
    db.campaign.findUnique.mockResolvedValue({ id: 'c1', adminId: 'alice', members: [{ id: 'm1' }] });
    db.warband.findUnique.mockResolvedValue({ id: 'w1', userId: 'bob' });
    db.campaignMember.findFirst.mockResolvedValue({ id: 'm1', playerName: 'Bob' });
    db.territoryNode.update.mockResolvedValue({ id: 't1' });
    expect((await post(claim)).status).toBe(200);
  });

  /*
    `playerName` used to come from the body, so a claim could be attributed to
    anyone. It comes from the verified membership now.
  */
  it('attributes the claim to the membership, not to the request', async () => {
    signedInAs(BOB);
    territoryIn('c1');
    db.campaign.findUnique.mockResolvedValue({ id: 'c1', adminId: 'alice', members: [{ id: 'm1' }] });
    db.warband.findUnique.mockResolvedValue({ id: 'w1', userId: 'bob' });
    db.campaignMember.findFirst.mockResolvedValue({ id: 'm1', playerName: 'Bob' });
    db.territoryNode.update.mockResolvedValue({ id: 't1' });

    await post({ ...claim, playerName: 'The Emperor' });
    // An unknown key is rejected outright by the strict schema, so the claim
    // never reaches the database with a forged name.
    expect(db.territoryNode.update).not.toHaveBeenCalled();

    await post(claim);
    expect(db.territoryNode.update.mock.calls[0][0].data.controlledByPlayerName).toBe('Bob');
  });
});

describe('the request body', () => {
  it('rejects an unknown action', async () => {
    signedInAs(ALICE);
    expect((await post({ action: 'drop_tables' })).status).toBe(400);
  });

  it('rejects malformed JSON before touching the database', async () => {
    signedInAs(ALICE);
    const res = await POST({
      headers: { get: () => null }, text: async () => '{not json',
    } as never);
    expect(res.status).toBe(400);
    expect(db.campaign.create).not.toHaveBeenCalled();
  });

  it('rejects a body that is too large', async () => {
    signedInAs(ALICE);
    const res = await POST({
      headers: { get: (h: string) => (h === 'content-length' ? String(10 * 1024 * 1024) : null) },
      text: async () => '{}',
    } as never);
    expect(res.status).toBe(413);
  });

  it('rejects out-of-range and wrong-typed numbers', async () => {
    signedInAs(ALICE);
    for (const body of [
      { action: 'create', maxWarbandDucats: -1 },
      { action: 'create', maxWarbandDucats: 1e308 },
      { action: 'create', maxWarbandDucats: 1.5 },
      { action: 'create', maxWarbandDucats: '700' },
    ]) {
      expect((await post(body)).status, JSON.stringify(body)).toBe(400);
    }
    expect(db.campaign.create).not.toHaveBeenCalled();
  });
});
