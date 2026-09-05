import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';

/**
 * Campaign sync, against a real migrated Postgres.
 *
 * `docs/CAMPAIGN-SYNC.md` lists the cases this has to pass and calls none of
 * them optional. They are the ones a mock cannot answer: whether the version
 * comparison actually races correctly, whether the idempotency record and the
 * write really are atomic, and whether the policy holds once there are rows.
 *
 * Skipped when `DATABASE_URL` is unset, so the fast suite stays fast. CI sets
 * it.
 */

const url = process.env.DATABASE_URL;
const describeDb = url ? describe : describe.skip;

const prisma = new PrismaClient({ datasources: { db: { url: url ?? 'postgresql://unused' } } });

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('next-auth', () => ({ getServerSession: () => session }));

process.env.NEXTAUTH_SECRET = 'test-secret';

let session: { user: { id: string; email: string } } | null = null;
const as = (user: { id: string; email: string } | null) => { session = user ? { user } : null; };

const { POST: syncPOST } = await import('../sync/route');

let opCounter = 0;
const opId = () => `op-${++opCounter}`;

const sync = async (body: unknown) => {
  const res = await syncPOST({
    headers: { get: () => null }, text: async () => JSON.stringify(body),
  } as never);
  return { status: res.status, body: await res.json() };
};

let organiser: { id: string; email: string };
let member: { id: string; email: string };
let stranger: { id: string; email: string };
let campaignId: string;
let territoryId: string;
let publishedId: string;
let memberWarband: string;
let strangerWarband: string;

describeDb('campaign sync, against a migrated database', () => {
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => { await prisma.$disconnect(); });

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@sync.test' } } });

    const [o, m, s] = await Promise.all([
      prisma.user.create({ data: { email: 'organiser@sync.test', name: 'Organiser' } }),
      prisma.user.create({ data: { email: 'member@sync.test', name: 'Member' } }),
      prisma.user.create({ data: { email: 'stranger@sync.test', name: 'Stranger' } }),
    ]);
    organiser = { id: o.id, email: o.email! };
    member = { id: m.id, email: m.email! };
    stranger = { id: s.id, email: s.email! };

    memberWarband = (await prisma.warband.create({
      data: { name: 'Member Warband', factionId: 'new-antioch', userId: member.id },
    })).id;
    strangerWarband = (await prisma.warband.create({
      data: { name: 'Stranger Warband', factionId: 'black-grail', userId: stranger.id },
    })).id;

    const campaign = await prisma.campaign.create({
      data: {
        name: 'Sync Crusade',
        inviteCode: `TRENCH-SYNC${Date.now()}`,
        adminId: organiser.id,
        territories: {
          create: [
            { name: 'Contested Ridge', type: "No Man's Land", perk: '', description: 'A ridge.' },
            {
              name: 'Kurd Dagh', type: 'Special Zone',
              perk: 'A Warband holding this Zone may re-roll one Promotion roll.',
              perkSource: 'published', description: 'A published zone.',
            },
          ],
        },
        members: {
          create: [{
            userId: member.id, warbandId: memberWarband,
            playerName: 'Member', warbandName: 'Member Warband', factionId: 'new-antioch',
          }],
        },
      },
      include: { territories: true },
    });
    campaignId = campaign.id;
    territoryId = campaign.territories.find((t) => t.perkSource !== 'published')!.id;
    publishedId = campaign.territories.find((t) => t.perkSource === 'published')!.id;
  });

  describe('the same operation delivered twice', () => {
    it('applies once and reports the repeat as skipped', async () => {
      /*
        The property the deleted fire-and-forget code lacked: it called create
        on every attempt, which is how one campaign became several. `skipped`
        is a SUCCESS — it means the server already had it.
      */
      as(organiser);
      const op = {
        kind: 'campaign.settings', opId: opId(), baseVersion: 1,
        data: { name: 'Renamed Once' },
      };

      const first = await sync({ campaignId, ops: [op] });
      const second = await sync({ campaignId, ops: [op] });

      expect(first.body.applied).toEqual([op.opId]);
      expect(second.body.skipped).toEqual([op.opId]);
      expect(second.body.applied).toEqual([]);

      const after = await prisma.campaign.findUnique({ where: { id: campaignId } });
      expect(after!.name).toBe('Renamed Once');
      // Applied once, so bumped once.
      expect(after!.version).toBe(2);
    });
  });

  describe('an operation id already used by a different campaign', () => {
    /*
      `CampaignSyncOp.opId` is the primary key GLOBALLY, not per campaign, and
      the route used to answer `skipped` to every violation of it without
      looking at what it collided with. So an id spent in one campaign made the
      next campaign's operation report as an already-applied retry.

      That is not a cosmetic wrong answer. `skipped` clears the client's outbox
      exactly as `applied` does (`campaignSync.ts`), so the edit was dropped on
      the device as well as never written on the server, and the sync reported
      success. Found by the Codex review.
    */
    const secondCampaign = async () => {
      const c = await prisma.campaign.create({
        data: {
          name: 'Other Crusade',
          inviteCode: `TRENCH-OTHER${Date.now()}`,
          adminId: organiser.id,
          territories: {
            create: [{ name: 'Other Ridge', type: "No Man's Land", perk: '', description: 'X.' }],
          },
        },
      });
      return c.id;
    };

    it('is a conflict, not a skip, and the edit is not lost', async () => {
      as(organiser);
      const reused = opId();

      const first = await sync({
        campaignId,
        ops: [{ kind: 'campaign.settings', opId: reused, baseVersion: 1, data: { name: 'First' } }],
      });
      expect(first.body.applied).toEqual([reused]);

      const other = await secondCampaign();
      const second = await sync({
        campaignId: other,
        ops: [{ kind: 'campaign.settings', opId: reused, baseVersion: 1, data: { name: 'Second' } }],
      });

      // Not acknowledged as done.
      expect(second.body.skipped).toEqual([]);
      expect(second.body.applied).toEqual([]);
      expect(second.body.conflicts).toHaveLength(1);
      expect(second.body.conflicts[0].opId).toBe(reused);
      expect(second.body.conflicts[0].reason).toBe('op-id-reused');

      // And nothing was written to the campaign that asked.
      const after = await prisma.campaign.findUnique({ where: { id: other } });
      expect(after!.name).toBe('Other Crusade');
      expect(after!.version).toBe(1);

      // The first campaign is untouched by the second attempt.
      expect((await prisma.campaign.findUnique({ where: { id: campaignId } }))!.name)
        .toBe('First');
    });

    it('still treats a genuine retry as a skip', async () => {
      // The behaviour the check must not break: same campaign, same kind, same
      // actor is a redelivery, and redelivery is what the primary key is for.
      as(organiser);
      const op = {
        kind: 'campaign.settings', opId: opId(), baseVersion: 1, data: { name: 'Once' },
      };
      expect((await sync({ campaignId, ops: [op] })).body.applied).toEqual([op.opId]);
      const again = await sync({ campaignId, ops: [op] });
      expect(again.body.skipped).toEqual([op.opId]);
      expect(again.body.conflicts).toEqual([]);
    });

    it('is a conflict when another member reuses the id', async () => {
      // A different actor sending the same id is never a redelivery.
      as(organiser);
      const reused = opId();
      await sync({
        campaignId,
        ops: [{ kind: 'campaign.settings', opId: reused, baseVersion: 1, data: { name: 'First' } }],
      });

      as(member);
      const theirs = await sync({
        campaignId,
        ops: [{
          kind: 'territory.claim', opId: reused, entityId: territoryId, baseVersion: 1,
          data: { warbandId: memberWarband },
        }],
      });
      expect(theirs.body.skipped).toEqual([]);
      expect(theirs.body.conflicts[0]?.reason).toBe('op-id-reused');

      const t = await prisma.territoryNode.findUnique({ where: { id: territoryId } });
      expect(t!.controlledByWarbandId).toBeNull();
    });
  });

  describe('two devices editing the same field', () => {
    it('refuses the second and hands back the server’s copy', async () => {
      as(organiser);
      await sync({
        campaignId,
        ops: [{ kind: 'campaign.settings', opId: opId(), baseVersion: 1, data: { name: 'First' } }],
      });

      /* The second device still believes version 1 — it made its edit before
         the first landed. Arrival order is not the question; the version the
         edit was made against is. */
      const stale = await sync({
        campaignId,
        ops: [{ kind: 'campaign.settings', opId: opId(), baseVersion: 1, data: { name: 'Second' } }],
      });

      expect(stale.body.applied).toEqual([]);
      expect(stale.body.conflicts).toHaveLength(1);
      expect(stale.body.conflicts[0].server.name).toBe('First');
      expect(stale.body.conflicts[0].server.version).toBe(2);

      expect((await prisma.campaign.findUnique({ where: { id: campaignId } }))!.name).toBe('First');
    });

    it('does not record a conflicted operation as applied', async () => {
      /*
        The worst failure this protocol can have. If a conflict committed its
        `CampaignSyncOp` row, the client's retry — after merging — would be
        skipped as a duplicate and the merged edit lost silently. So a conflict
        must roll the transaction back.
      */
      as(organiser);
      await sync({
        campaignId,
        ops: [{ kind: 'campaign.settings', opId: opId(), baseVersion: 1, data: { name: 'First' } }],
      });

      const retried = opId();
      const conflicted = await sync({
        campaignId,
        ops: [{ kind: 'campaign.settings', opId: retried, baseVersion: 1, data: { name: 'Loser' } }],
      });
      expect(conflicted.body.conflicts).toHaveLength(1);
      expect(await prisma.campaignSyncOp.findUnique({ where: { opId: retried } })).toBeNull();

      /* The same opId, re-sent against the version it now knows about, applies
         rather than being mistaken for a repeat. */
      const merged = await sync({
        campaignId,
        ops: [{ kind: 'campaign.settings', opId: retried, baseVersion: 2, data: { name: 'Merged' } }],
      });
      expect(merged.body.applied).toEqual([retried]);
      expect((await prisma.campaign.findUnique({ where: { id: campaignId } }))!.name).toBe('Merged');
    });
  });

  describe('two devices editing different fields', () => {
    it('takes both, because each was made against what it saw', async () => {
      as(organiser);
      const first = await sync({
        campaignId,
        ops: [{ kind: 'campaign.settings', opId: opId(), baseVersion: 1, data: { currentTurn: 4 } }],
      });
      expect(first.body.applied).toHaveLength(1);

      const second = await sync({
        campaignId,
        ops: [{ kind: 'campaign.settings', opId: opId(), baseVersion: 2, data: { maxWarbandDucats: 900 } }],
      });
      expect(second.body.applied).toHaveLength(1);

      const after = await prisma.campaign.findUnique({ where: { id: campaignId } });
      expect(after!.currentTurn).toBe(4);
      expect(after!.maxWarbandDucats).toBe(900);
      expect(after!.version).toBe(3);
    });
  });

  describe('who may do what', () => {
    it('refuses an organiser-only change attempted by a member', async () => {
      as(member);
      const res = await sync({
        campaignId,
        ops: [{ kind: 'campaign.settings', opId: opId(), baseVersion: 1, data: { name: 'Mine now' } }],
      });
      expect(res.status).toBe(403);
      expect((await prisma.campaign.findUnique({ where: { id: campaignId } }))!.name).toBe('Sync Crusade');
    });

    it('hides the campaign from a non-member behind a 404', async () => {
      // 403 would confirm it exists, which is what an invite-code prober wants.
      as(stranger);
      const res = await sync({
        campaignId,
        ops: [{ kind: 'territory.claim', opId: opId(), entityId: territoryId, baseVersion: 1, data: { warbandId: strangerWarband } }],
      });
      expect(res.status).toBe(404);
    });

    it('refuses a claim for a warband the caller does not own', async () => {
      as(member);
      const res = await sync({
        campaignId,
        ops: [{ kind: 'territory.claim', opId: opId(), entityId: territoryId, baseVersion: 1, data: { warbandId: strangerWarband } }],
      });
      expect(res.status).toBe(403);
    });

    it('refuses a claim for a warband that is not in this campaign', async () => {
      /* Ownership alone is not enough — the organiser owns their warband and
         has not fielded it here. */
      const organiserWarband = (await prisma.warband.create({
        data: { name: 'Organiser Warband', factionId: 'trench-pilgrims', userId: organiser.id },
      })).id;
      as(organiser);
      const res = await sync({
        campaignId,
        ops: [{ kind: 'territory.claim', opId: opId(), entityId: territoryId, baseVersion: 1, data: { warbandId: organiserWarband } }],
      });
      expect(res.status).toBe(403);
    });

    it('lets nobody overwrite a published perk, organiser included', async () => {
      /*
        The row of the authority table owned by nobody. Kurd Dagh carries the
        book's own Outpost Bonus; an organiser writing over it would put a
        house rule behind a published label.
      */
      as(organiser);
      const res = await sync({
        campaignId,
        ops: [{ kind: 'territory.perk', opId: opId(), entityId: publishedId, baseVersion: 1, data: { perk: 'Mine instead' } }],
      });
      expect(res.status).toBe(403);
      const after = await prisma.territoryNode.findUnique({ where: { id: publishedId } });
      expect(after!.perk).toMatch(/re-roll one Promotion roll/);
    });

    it('does not reach a territory belonging to another campaign', async () => {
      const other = await prisma.campaign.create({
        data: {
          name: 'Elsewhere', inviteCode: `TRENCH-OTHER${Date.now()}`, adminId: stranger.id,
          territories: { create: [{ name: 'Far Field', type: 'Trench Line', perk: '', description: 'x' }] },
        },
        include: { territories: true },
      });
      as(organiser);
      const res = await sync({
        campaignId,
        ops: [{ kind: 'territory.perk', opId: opId(), entityId: other.territories[0].id, baseVersion: 1, data: { perk: 'Reach' } }],
      });
      // Not found rather than forbidden: it tells a prober nothing.
      expect(res.status).toBe(404);
    });
  });

  describe('the writes themselves', () => {
    it('records a claim under the membership’s player name, not the body’s', async () => {
      as(member);
      const res = await sync({
        campaignId,
        ops: [{ kind: 'territory.claim', opId: opId(), entityId: territoryId, baseVersion: 1, data: { warbandId: memberWarband } }],
      });
      expect(res.body.applied).toHaveLength(1);

      const after = await prisma.territoryNode.findUnique({ where: { id: territoryId } });
      expect(after!.controlledByWarbandId).toBe(memberWarband);
      expect(after!.controlledByPlayerName).toBe('Member');
      expect(after!.version).toBe(2);
    });

    it('clears perkSource when the organiser empties the perk', async () => {
      as(organiser);
      await sync({
        campaignId,
        ops: [{ kind: 'territory.perk', opId: opId(), entityId: territoryId, baseVersion: 1, data: { perk: 'Ours' } }],
      });
      expect((await prisma.territoryNode.findUnique({ where: { id: territoryId } }))!.perkSource)
        .toBe('campaign');

      await sync({
        campaignId,
        ops: [{ kind: 'territory.perk', opId: opId(), entityId: territoryId, baseVersion: 2, data: { perk: '  ' } }],
      });
      /* Cleared, not left saying "campaign" over an empty string, which would
         render as a house rule with no text. */
      const after = await prisma.territoryNode.findUnique({ where: { id: territoryId } });
      expect(after!.perk).toBe('');
      expect(after!.perkSource).toBeNull();
    });

    it('applies a batch in order and reports each operation', async () => {
      as(organiser);
      const a = opId();
      const b = opId();
      const res = await sync({
        campaignId,
        ops: [
          { kind: 'campaign.settings', opId: a, baseVersion: 1, data: { currentTurn: 2 } },
          { kind: 'territory.perk', opId: b, entityId: territoryId, baseVersion: 1, data: { perk: 'Held' } },
        ],
      });
      expect(res.body.applied).toEqual([a, b]);
      expect(res.body.conflicts).toEqual([]);
    });

    it('has no operation that can write membership or the invite code', async () => {
      /*
        Server-owned fields. The enforcement is that no op KIND exists for
        them — a filter could be forgotten, a missing case cannot be used.
      */
      as(organiser);
      const res = await sync({
        campaignId,
        ops: [{ kind: 'campaign.settings', opId: opId(), baseVersion: 1, data: { inviteCode: 'TRENCH-MINE' } }],
      });
      expect(res.status).toBe(400);
    });
  });
});
