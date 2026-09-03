import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

/**
 * Ownership, against a real migrated Postgres.
 *
 * The unit suites beside each route mock Prisma, which proves the handler
 * asks the right question. This one proves the answer is right — that the
 * `where` clauses actually scope to a row's owner once there are rows, and
 * that the composite keys and unique constraints behave as the policy assumes.
 *
 * It is skipped when `DATABASE_URL` is not set, so the fast suite stays fast
 * and a contributor without a database still gets a green run. CI sets it.
 */

const url = process.env.DATABASE_URL;
const describeDb = url ? describe : describe.skip;

const prisma = new PrismaClient({ datasources: { db: { url: url ?? 'postgresql://unused' } } });

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next-auth', () => ({ getServerSession: () => session }));

process.env.NEXTAUTH_SECRET = 'test-secret';

let session: { user: { id: string; email: string } } | null = null;
const as = (user: { id: string; email: string } | null) => { session = user ? { user } : null; };

const { GET: campaignsGET, POST: campaignsPOST } = await import('../campaigns/route');
const { POST: rulesPOST, DELETE: rulesDELETE } = await import('../custom-rules/route');

const post = async (handler: (r: never) => Promise<Response>, body: unknown) => {
  const res = await handler({
    headers: { get: () => null }, text: async () => JSON.stringify(body),
  } as never);
  return { status: res.status, body: await res.json() };
};

const get = async (query = '') => {
  const res = await campaignsGET({ url: `http://localhost/api/campaigns${query}` } as never);
  return { status: res.status, body: await res.json() };
};

/** Two unrelated players, and a campaign that belongs to one of them. */
let alice: { id: string; email: string };
let bob: { id: string; email: string };
let aliceWarband: string;
let bobWarband: string;

describeDb('ownership, against a migrated database', () => {
  beforeAll(async () => {
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Users cascade to warbands, campaigns, members and overrides.
    await prisma.user.deleteMany({ where: { email: { endsWith: '@ownership.test' } } });

    const a = await prisma.user.create({
      data: { email: 'alice@ownership.test', name: 'Alice' },
    });
    const b = await prisma.user.create({
      data: { email: 'bob@ownership.test', name: 'Bob' },
    });
    alice = { id: a.id, email: a.email! };
    bob = { id: b.id, email: b.email! };

    aliceWarband = (await prisma.warband.create({
      data: { name: 'Alice Warband', factionId: 'new-antioch', userId: alice.id },
    })).id;
    bobWarband = (await prisma.warband.create({
      data: { name: 'Bob Warband', factionId: 'heretic-legion', userId: bob.id },
    })).id;
  });

  describe('campaigns', () => {
    const create = async (owner: typeof alice) => {
      as(owner);
      const { body } = await post(campaignsPOST, { action: 'create', name: 'Alice Campaign' });
      return body.campaign;
    };

    it('lists only the caller’s own', async () => {
      await create(alice);
      as(bob);
      expect((await get()).body.campaigns).toEqual([]);
      as(alice);
      expect((await get()).body.campaigns).toHaveLength(1);
    });

    it('hides a campaign the caller is not in behind a 404', async () => {
      const campaign = await create(alice);
      as(bob);
      expect((await get(`?id=${campaign.id}`)).status).toBe(404);
    });

    it('shows it to a member once they are one', async () => {
      const campaign = await create(alice);
      await prisma.campaignMember.create({
        data: {
          campaignId: campaign.id, userId: bob.id, warbandId: bobWarband,
          playerName: 'Bob', warbandName: 'Bob Warband', factionId: 'heretic-legion',
        },
      });
      as(bob);
      expect((await get(`?id=${campaign.id}`)).status).toBe(200);
    });

    /*
      The claim used to write any territory id for any caller. These are the
      four ways it can be wrong, against real rows.
    */
    it('refuses a territory claim from every direction it should', async () => {
      const campaign = await create(alice);
      const territory = (await prisma.territoryNode.findFirst({
        where: { campaignId: campaign.id },
      }))!;

      as(null);
      expect((await post(campaignsPOST,
        { action: 'claim_territory', territoryId: territory.id, warbandId: bobWarband })).status)
        .toBe(401);

      as(bob); // not a member
      expect((await post(campaignsPOST,
        { action: 'claim_territory', territoryId: territory.id, warbandId: bobWarband })).status)
        .toBe(404);

      await prisma.campaignMember.create({
        data: {
          campaignId: campaign.id, userId: bob.id, warbandId: bobWarband,
          playerName: 'Bob', warbandName: 'Bob Warband', factionId: 'heretic-legion',
        },
      });

      as(bob); // a member, but claiming with Alice's warband
      expect((await post(campaignsPOST,
        { action: 'claim_territory', territoryId: territory.id, warbandId: aliceWarband })).status)
        .toBe(403);

      as(bob); // a member, with their own warband, which IS in the campaign
      const ok = await post(campaignsPOST,
        { action: 'claim_territory', territoryId: territory.id, warbandId: bobWarband });
      expect(ok.status).toBe(200);

      const after = await prisma.territoryNode.findUnique({ where: { id: territory.id } });
      expect(after?.controlledByWarbandId).toBe(bobWarband);
      // Attributed from the membership row, not from anything the caller sent.
      expect(after?.controlledByPlayerName).toBe('Bob');
    });

    it('issues invite codes that are unique in the database', async () => {
      const a = await create(alice);
      const b = await create(alice);
      expect(a.inviteCode).not.toBe(b.inviteCode);
      expect(a.inviteCode).toMatch(/^TRENCH-[0-9A-HJKMNP-TV-Z]{15}$/);
    });
  });

  describe('custom rules', () => {
    const override = { ruleType: 'unit', ruleId: 'na-lieutenant', name: 'Mine', data: { cost: 90 } };

    it('keeps two users’ overrides of the same rule apart', async () => {
      as(alice);
      await post(rulesPOST, { ...override, name: 'Alice version' });
      as(bob);
      await post(rulesPOST, { ...override, name: 'Bob version' });

      // The composite key is (userId, ruleType, ruleId): two rows, not one
      // overwritten. This is the SEC-04 failure, checked where it happened.
      const rows = await prisma.customRuleOverride.findMany({
        where: { ruleId: 'na-lieutenant' }, orderBy: { name: 'asc' },
      });
      expect(rows.map((r) => r.name)).toEqual(['Alice version', 'Bob version']);
    });

    it('cannot delete another user’s override', async () => {
      as(alice);
      await post(rulesPOST, override);
      as(bob);
      expect((await post(rulesDELETE, { ruleType: 'unit', ruleId: 'na-lieutenant' })).status)
        .toBe(404);
      expect(await prisma.customRuleOverride.count({ where: { userId: alice.id } })).toBe(1);
    });

    it('creates no shared account for a signed-out write', async () => {
      as(null);
      expect((await post(rulesPOST, override)).status).toBe(401);
      expect(await prisma.user.findUnique({ where: { email: 'commander@trenchline.org' } }))
        .toBeNull();
    });
  });
});
