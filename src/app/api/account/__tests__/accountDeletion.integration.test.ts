import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

/**
 * Deleting an account, against a real migrated Postgres.
 *
 * A mocked Prisma cannot prove any of what matters here. The whole behaviour
 * is `onDelete` on seven relations — whether a warband, a membership, a
 * campaign and its territory map actually go, and whether a bug report
 * actually stays with its reporter unlinked. That is the database's answer,
 * not the handler's, so this suite needs the database.
 *
 * Skipped without `DATABASE_URL`, like the ownership suite. CI sets it.
 */

const url = process.env.DATABASE_URL;
const describeDb = url ? describe : describe.skip;

const prisma = new PrismaClient({ datasources: { db: { url: url ?? 'postgresql://unused' } } });

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next-auth', () => ({ getServerSession: () => session }));

process.env.NEXTAUTH_SECRET = 'test-secret';

interface TestUser { id?: string; email: string; isAdmin?: boolean }
let session: { user: TestUser } | null = null;
const as = (user: TestUser | null) => { session = user ? { user } : null; };

const { GET, DELETE } = await import('../route');
const { CONFIRMATION } = await import('@/lib/accountDeletion');

const DOMAIN = '@deletion.test';

// `headers` as well as `text`: `parse.ts` measures the body against
// content-length before reading it, so a stub without headers makes every
// assertion a 500 that looks like a failing check and is not one.
const del = async (body: unknown) => {
  const res = await DELETE({
    headers: { get: () => null }, text: async () => JSON.stringify(body),
  } as never);
  return { status: res.status, body: await res.json() };
};

const summary = async () => {
  const res = await GET();
  return { status: res.status, body: await res.json() };
};

/** A user with an id, since every assertion here is about their rows. */
const makeUser = (email: string) =>
  prisma.user.create({ data: { email: `${email}${DOMAIN}`, name: email } });

describeDb('deleting your own account', () => {
  let owner: { id: string; email: string | null };
  let other: { id: string; email: string | null };

  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    owner = await makeUser('owner');
    other = await makeUser('other');
    as({ id: owner.id, email: owner.email! });
  });

  it('refuses a signed-out caller', async () => {
    as(null);
    expect((await summary()).status).toBe(401);
    expect((await del({ confirm: CONFIRMATION })).status).toBe(401);
  });

  it('refuses without the typed confirmation', async () => {
    expect((await del({})).status).toBe(400);
    // Case matters: "delete" is what you type dismissing a dialog.
    expect((await del({ confirm: 'delete' })).status).toBe(400);
    expect(await prisma.user.findUnique({ where: { id: owner.id } })).not.toBeNull();
  });

  it('reports what would go, before anything goes', async () => {
    await prisma.warband.create({
      data: { name: 'A', factionId: 'f', userId: owner.id },
    });
    const { status, body } = await summary();
    expect(status).toBe(200);
    expect(body.summary.warbands).toBe(1);
    expect(body.summary.email).toBe(owner.email);
    // A summary is a read. The account is still there.
    expect(await prisma.user.findUnique({ where: { id: owner.id } })).not.toBeNull();
  });

  it('takes the account and everything hanging off it', async () => {
    const wb = await prisma.warband.create({
      data: { name: 'Doomed', factionId: 'f', userId: owner.id },
    });
    await prisma.customRuleOverride.create({
      data: { userId: owner.id, ruleType: 'unit', ruleId: 'r', name: 'n', data: {} },
    });

    const { status } = await del({ confirm: CONFIRMATION });
    expect(status).toBe(200);

    expect(await prisma.user.findUnique({ where: { id: owner.id } })).toBeNull();
    expect(await prisma.warband.findUnique({ where: { id: wb.id } })).toBeNull();
    expect(await prisma.customRuleOverride.count({ where: { userId: owner.id } })).toBe(0);
    // Somebody else's account is untouched.
    expect(await prisma.user.findUnique({ where: { id: other.id } })).not.toBeNull();
  });

  it('keeps a bug report, without the reporter', async () => {
    const report = await prisma.bugReport.create({
      data: { title: 't', description: 'd', severity: 'low', reporterId: owner.id },
    });

    await del({ confirm: CONFIRMATION });

    const kept = await prisma.bugReport.findUnique({ where: { id: report.id } });
    expect(kept, 'the report was deleted with its reporter').not.toBeNull();
    expect(kept!.reporterId, 'the report still names its reporter').toBeNull();
  });

  /*
    The consequence that is not the account holder's alone. Campaign.adminId
    cascades, so an organiser's deletion takes the campaign and everyone's
    membership of it — which is why the route makes them confirm the count.
  */
  describe('a campaign the account runs', () => {
    let campaignId: string;

    beforeEach(async () => {
      const wb = await prisma.warband.create({
        data: { name: 'W', factionId: 'f', userId: other.id },
      });
      const campaign = await prisma.campaign.create({
        data: { name: 'The Rihla', inviteCode: `c${Date.now()}`, adminId: owner.id },
      });
      campaignId = campaign.id;
      await prisma.campaignMember.create({
        data: {
          campaignId, userId: other.id, warbandId: wb.id,
          playerName: 'Other', warbandName: 'W', factionId: 'f',
        },
      });
    });

    it('is counted, with the other players in it', async () => {
      const { body } = await summary();
      expect(body.summary.administeredCampaigns).toEqual([
        { name: 'The Rihla', otherMembers: 1 },
      ]);
    });

    it('blocks the delete until the count is acknowledged', async () => {
      const refused = await del({ confirm: CONFIRMATION });
      expect(refused.status).toBe(400);
      // `true` is what a client sends by accident. It is not an acknowledgement.
      expect((await del({ confirm: CONFIRMATION, acknowledgeCampaigns: true })).status).toBe(400);
      expect(await prisma.campaign.findUnique({ where: { id: campaignId } })).not.toBeNull();
    });

    it('goes, with its members, once it is', async () => {
      const { status } = await del({ confirm: CONFIRMATION, acknowledgeCampaigns: 1 });
      expect(status).toBe(200);
      expect(await prisma.campaign.findUnique({ where: { id: campaignId } })).toBeNull();
      expect(await prisma.campaignMember.count({ where: { campaignId } })).toBe(0);
      // The other player's own account survives losing the campaign.
      expect(await prisma.user.findUnique({ where: { id: other.id } })).not.toBeNull();
    });
  });

  it('does not count the organiser as one of the other players', async () => {
    const wb = await prisma.warband.create({
      data: { name: 'Mine', factionId: 'f', userId: owner.id },
    });
    const campaign = await prisma.campaign.create({
      data: { name: 'Solo', inviteCode: `s${Date.now()}`, adminId: owner.id },
    });
    await prisma.campaignMember.create({
      data: {
        campaignId: campaign.id, userId: owner.id, warbandId: wb.id,
        playerName: 'Me', warbandName: 'Mine', factionId: 'f',
      },
    });

    const { body } = await summary();
    expect(body.summary.administeredCampaigns).toEqual([{ name: 'Solo', otherMembers: 0 }]);
  });
});
