import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { integrationDbUrl } from '@/lib/integrationDb';

/**
 * Spending an invite code, against a real migrated Postgres.
 *
 * SYNC-4. The code has had a generator worth guessing at (75 bits, Crockford
 * base32), a preview endpoint and a rate limit since AUTH-3 — and nothing that
 * consumed it. An organiser could publish a campaign and hand out a code that
 * did nothing.
 *
 * The assertions are mostly about what a join must NOT do, because a join is a
 * write on somebody else's campaign performed by a stranger holding a string:
 *
 *   - it must not accept a warband that is not the caller's;
 *   - it must not take the warband's name or faction from the request body;
 *   - it must not answer "wrong code" and "code exists but that failed"
 *     differently, which would help a prober;
 *   - the retry must not make a second membership, and a second WARBAND must
 *     not quietly become one.
 *
 * Skipped without `DATABASE_URL`, like the other integration suites.
 */
/* Not DATABASE_URL: that is the application's database and may be
   production. See `lib/integrationDb.ts` — this throws on a remote host
   rather than skipping, so a misconfiguration interrupts. */
const url = integrationDbUrl();
const describeDb = url ? describe : describe.skip;

const prisma = new PrismaClient({ datasources: { db: { url: url ?? 'postgresql://unused' } } });

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next-auth', () => ({ getServerSession: () => session }));

process.env.NEXTAUTH_SECRET = 'test-secret';

interface TestUser { id?: string; email: string; isAdmin?: boolean }
let session: { user: TestUser } | null = null;
const as = (user: TestUser | null) => { session = user ? { user } : null; };

const { POST } = await import('../route');
const { resetRateLimits } = await import('@/lib/api/rateLimit');

const post = async (body: unknown) => {
  const res = await POST({
    headers: { get: () => null }, text: async () => JSON.stringify(body),
  } as never);
  return { status: res.status, body: await res.json() };
};

const DOMAIN = '@join.test';

let alice: { id: string; email: string };
let bob: { id: string; email: string };
let code: string;
let campaignId: string;
let bobsWarband: string;

describeDb('joining a campaign with an invite code', () => {
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    resetRateLimits();
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    const a = await prisma.user.create({ data: { email: `alice${DOMAIN}`, name: 'Alice' } });
    const b = await prisma.user.create({ data: { email: `bob${DOMAIN}`, name: 'Bob' } });
    alice = { id: a.id, email: a.email! };
    bob = { id: b.id, email: b.email! };

    // Alice runs a campaign; Bob has a warband and the code.
    as(alice);
    const created = await post({ action: 'create', name: "Alice's Crusade" });
    campaignId = created.body.campaign.id;
    code = created.body.campaign.inviteCode;

    const wb = await prisma.warband.create({
      data: { name: 'The Bone Choir', factionId: 'heretic-legions', userId: bob.id },
    });
    bobsWarband = wb.id;
    as(bob);
  });

  const join = (over: Record<string, unknown> = {}) =>
    post({ action: 'join', inviteCode: code, warbandId: bobsWarband, ...over });

  it('refuses a signed-out caller', async () => {
    as(null);
    expect((await join()).status).toBe(401);
  });

  it('puts the warband in the campaign', async () => {
    const { status, body } = await join();
    expect(status).toBe(201);
    expect(body.alreadyMember).toBe(false);

    const member = await prisma.campaignMember.findFirst({
      where: { campaignId, userId: bob.id },
    });
    expect(member).not.toBeNull();
    expect(member!.warbandId).toBe(bobsWarband);
    // Read off the warband row, not the request.
    expect(member!.warbandName).toBe('The Bone Choir');
    expect(member!.factionId).toBe('heretic-legions');
    // And the joiner can now see the campaign in full.
    expect(body.campaign.id).toBe(campaignId);
    expect(Array.isArray(body.campaign.members)).toBe(true);
  });

  it('will not take the warband name or faction from the body', async () => {
    // A member who could type these could field a Heretic roster listed as
    // New Antioch, which is the campaign table lying to everyone in it.
    const { status } = await post({
      action: 'join', inviteCode: code, warbandId: bobsWarband,
      warbandName: 'Something Else', factionId: 'new-antioch',
    });
    // `.strict()` rejects the unknown keys outright rather than ignoring them.
    expect(status).toBe(400);
    expect(await prisma.campaignMember.count({ where: { campaignId } })).toBe(0);
  });

  it('takes a chosen player name, and defaults to the account', async () => {
    await join({ playerName: 'The Choirmaster' });
    let member = await prisma.campaignMember.findFirst({ where: { campaignId, userId: bob.id } });
    expect(member!.playerName).toBe('The Choirmaster');

    await prisma.campaignMember.deleteMany({ where: { campaignId } });
    await join();
    member = await prisma.campaignMember.findFirst({ where: { campaignId, userId: bob.id } });
    // Not the whole address: the campaign table is shown to everyone in it.
    expect(member!.playerName).toBe('bob');
    expect(member!.playerName).not.toContain('@');
  });

  it('refuses a warband that is not the caller’s', async () => {
    const hers = await prisma.warband.create({
      data: { name: 'Not Yours', factionId: 'new-antioch', userId: alice.id },
    });
    /*
      403, which is `requireOwnedWarband`'s answer and not this route's
      invention. The 404-not-403 rule the campaign reads follow exists because
      an invite CODE is short enough to guess; a warband id is a cuid the
      caller can only have got from their own client, so there is no
      enumeration to protect against and "that is not yours" is the honest
      status. Asserted so a later change to the shared policy is visible here.
    */
    const { status } = await join({ warbandId: hers.id });
    expect(status).toBe(403);
    expect(await prisma.campaignMember.count({ where: { campaignId } })).toBe(0);
  });

  it('answers an unknown code the way the preview does', async () => {
    const { status, body } = await join({ inviteCode: 'TRENCH-000000000000000' });
    expect(status).toBe(404);
    // Same words, so the two cannot be told apart by a prober.
    expect(body.error).toBe('No campaign has that invite code.');
  });

  it('survives the retry without making a second membership', async () => {
    const first = await join();
    expect(first.status).toBe(201);
    const second = await join();
    expect(second.status).toBe(200);
    expect(second.body.alreadyMember).toBe(true);
    expect(await prisma.campaignMember.count({ where: { campaignId, userId: bob.id } })).toBe(1);
  });

  it('refuses a second warband from the same player', async () => {
    await join();
    const other = await prisma.warband.create({
      data: { name: 'The Second Choir', factionId: 'black-grail', userId: bob.id },
    });
    const { status, body } = await join({ warbandId: other.id });
    expect(status).toBe(409);
    expect(body.error).toMatch(/already have a warband/i);
    expect(await prisma.campaignMember.count({ where: { campaignId, userId: bob.id } })).toBe(1);
  });

  it('lets a second player in on the same code', async () => {
    await join();
    const c = await prisma.user.create({ data: { email: `carol${DOMAIN}`, name: 'Carol' } });
    const hers = await prisma.warband.create({
      data: { name: 'The Ash Company', factionId: 'new-antioch', userId: c.id },
    });
    as({ id: c.id, email: c.email! });
    const { status } = await post({ action: 'join', inviteCode: code, warbandId: hers.id });
    expect(status).toBe(201);
    expect(await prisma.campaignMember.count({ where: { campaignId } })).toBe(2);
  });

  it('rate-limits the guessing', async () => {
    // The bucket allows 20 in 15 minutes; a join is a code guess with a side
    // effect, so it must not be the cheaper way to walk 75 bits.
    let sawLimit = false;
    for (let i = 0; i < 25; i++) {
      const { status } = await join({ inviteCode: `TRENCH-BADCODE${i}` });
      if (status === 429) { sawLimit = true; break; }
    }
    expect(sawLimit, 'the join endpoint never rate-limited').toBe(true);
  });
});
