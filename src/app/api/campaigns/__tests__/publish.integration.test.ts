import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { integrationDbUrl } from '@/lib/integrationDb';

/**
 * Publishing a campaign, against a real migrated Postgres.
 *
 * SYNC-2: `createCampaign` mints `camp-<timestamp>` locally, which is not an
 * id the API would recognise, so every campaign in the app was local and the
 * outbox had nowhere to push. `action: 'publish'` is the one call that gives a
 * campaign a cloud identity — under an id the CLIENT mints.
 *
 * A client-supplied primary key is the whole design and the whole risk, so
 * these are mostly about the second part:
 *
 *   - the retry it exists to make safe must not create a second campaign, and
 *     must not overwrite the first;
 *   - an id aimed at somebody else's campaign must reveal nothing;
 *   - the map must arrive as the client holds it, keyed so a later operation
 *     can name a territory without the client keeping a mapping.
 *
 * Skipped without `DATABASE_URL`, like the other integration suites. CI sets it.
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

const post = async (body: unknown) => {
  const res = await POST({
    headers: { get: () => null }, text: async () => JSON.stringify(body),
  } as never);
  return { status: res.status, body: await res.json() };
};

/** A campaign as this app makes one: a framework, house rules, its own map. */
const publishBody = (cloudId: string, over: Record<string, unknown> = {}) => ({
  action: 'publish',
  cloudId,
  name: 'The Long Retreat',
  framework: 'carcass-front',
  houseRules: { reinforcementsKeepExploration: true },
  currentTurn: 3,
  maxWarbandDucats: 900,
  gloryVictoryThreshold: 30,
  territories: [
    { localId: 'cf-the-bone-mill', name: 'The Bone Mill', type: 'Special Zone',
      perk: 'Outpost Bonus: +1 Exploration die.', perkSource: 'published',
      description: 'A mill that grinds what the guns leave.' },
    { localId: 'cf-drowned-battery', name: 'Drowned Battery', type: 'Special Zone',
      perk: '', description: 'Guns silted to the muzzle.' },
  ],
  ...over,
});

let alice: { id: string; email: string };
let bob: { id: string; email: string };

describeDb('publishing a campaign', () => {
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => { await prisma.$disconnect(); });

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: '@publish.test' } } });
    const a = await prisma.user.create({ data: { email: 'alice@publish.test', name: 'Alice' } });
    const b = await prisma.user.create({ data: { email: 'bob@publish.test', name: 'Bob' } });
    alice = { id: a.id, email: a.email! };
    bob = { id: b.id, email: b.email! };
    as(alice);
  });

  it('creates the campaign under the id the client minted', async () => {
    const cloudId = randomUUID();
    const { status, body } = await post(publishBody(cloudId));

    expect(status).toBe(201);
    expect(body.campaign.id).toBe(cloudId);
    expect(body.alreadyPublished).toBe(false);

    const row = await prisma.campaign.findUnique({ where: { id: cloudId } });
    expect(row?.adminId, 'the admin is the session, not the body').toBe(alice.id);
    expect(row?.framework).toBe('carcass-front');
    expect(row?.currentTurn).toBe(3);
    expect(row?.houseRules).toEqual({ reinforcementsKeepExploration: true });
  });

  it('stores the map as the client holds it, keyed by the local id', async () => {
    /*
      `localId` is what lets a later `territory.perk` operation name a
      territory without the client keeping a server-id mapping. It is not the
      primary key because `cf-<slug>` is derived from a published zone name
      and is the same string in every campaign that uses that map.
    */
    const cloudId = randomUUID();
    await post(publishBody(cloudId));

    const rows = await prisma.territoryNode.findMany({
      where: { campaignId: cloudId }, orderBy: { localId: 'asc' },
    });
    expect(rows.map((t) => t.localId)).toEqual(['cf-drowned-battery', 'cf-the-bone-mill']);
    expect(rows.map((t) => t.name)).toEqual(['Drowned Battery', 'The Bone Mill']);
    // The published Outpost Bonus survives, and says it is the book's.
    expect(rows[1].perk).toMatch(/Outpost Bonus/);
    expect(rows[1].perkSource).toBe('published');
  });

  it('does not add territories of its own', async () => {
    /*
      A published campaign has the map it has; topping it up would be the app
      inventing part of somebody's campaign.

      This note used to read "`action: 'create'` builds four fixed territories
      the app has never used" — the contrast being that `publish` did not do
      what `create` did. `create` no longer builds any either (FD-14 AI-2), so
      the two agree now and the assertion below stands for both: what is
      created is what the client sent, and nothing else.
    */
    const cloudId = randomUUID();
    await post(publishBody(cloudId));
    expect(await prisma.territoryNode.count({ where: { campaignId: cloudId } })).toBe(2);
  });

  it('issues the invite code itself', async () => {
    // Server-owned, per the authority table: a client that could write its own
    // invite code could hand out entry to a campaign.
    const cloudId = randomUUID();
    const { body } = await post(publishBody(cloudId, { inviteCode: 'TRENCH-MINE' } as never));
    // An unknown key is a 400 before it reaches Prisma — `.strict()`.
    expect(body.error, 'an unknown key was accepted').toBeDefined();

    const ok = await post(publishBody(randomUUID()));
    expect(ok.body.campaign.inviteCode).toMatch(/^TRENCH-[0-9A-HJKMNP-TV-Z]{15}$/);
  });

  describe('the retry the client-minted id exists to make safe', () => {
    it('returns the existing campaign rather than a second one', async () => {
      const cloudId = randomUUID();
      const first = await post(publishBody(cloudId));
      expect(first.status).toBe(201);

      const retry = await post(publishBody(cloudId));
      expect(retry.status).toBe(200);
      expect(retry.body.alreadyPublished).toBe(true);
      expect(retry.body.campaign.id).toBe(cloudId);

      expect(await prisma.campaign.count({ where: { adminId: alice.id } })).toBe(1);
    });

    it('does not overwrite what happened between the two attempts', async () => {
      /*
        The failure a naive retry causes. The first publish landed and its
        response was lost; the organiser then renamed the campaign and took a
        turn. A retry that re-wrote the row would undo both — "last writer
        wins" arriving through the one door the protocol did not guard.
      */
      const cloudId = randomUUID();
      await post(publishBody(cloudId));
      await prisma.campaign.update({
        where: { id: cloudId },
        data: { name: 'Renamed After Publishing', currentTurn: 9 },
      });

      const retry = await post(publishBody(cloudId));
      expect(retry.status).toBe(200);

      const row = await prisma.campaign.findUnique({ where: { id: cloudId } });
      expect(row?.name).toBe('Renamed After Publishing');
      expect(row?.currentTurn).toBe(9);
    });

    it('does not duplicate the map either', async () => {
      const cloudId = randomUUID();
      await post(publishBody(cloudId));
      await post(publishBody(cloudId));
      expect(await prisma.territoryNode.count({ where: { campaignId: cloudId } })).toBe(2);
    });
  });

  describe('an id aimed at somebody else', () => {
    it('is refused, and says only that the id is taken', async () => {
      const cloudId = randomUUID();
      await post(publishBody(cloudId));

      as(bob);
      const { status, body } = await post(publishBody(cloudId, { name: "Bob's Attempt" }));
      expect(status).toBe(409);
      /*
        Nothing about whose it is. A guessed uuid that came back with a
        campaign name, a member count or a 403-vs-404 distinction would be a
        membership oracle; the campaign routes answer "not yours" with 404 for
        the same reason.
      */
      expect(JSON.stringify(body)).not.toMatch(/Alice|Long Retreat|alice@/i);
    });

    it('leaves the original untouched', async () => {
      const cloudId = randomUUID();
      await post(publishBody(cloudId));

      as(bob);
      await post(publishBody(cloudId, { name: "Bob's Attempt" }));

      const row = await prisma.campaign.findUnique({ where: { id: cloudId } });
      expect(row?.adminId).toBe(alice.id);
      expect(row?.name).toBe('The Long Retreat');
    });
  });

  describe('what it refuses', () => {
    it('refuses a signed-out caller', async () => {
      as(null);
      const { status } = await post(publishBody(randomUUID()));
      expect(status).toBe(401);
    });

    it('refuses an id that is not a uuid', async () => {
      // The local `camp-<timestamp>` is guessable, and a guessable
      // client-supplied primary key is one another client can aim at.
      const { status } = await post(publishBody('camp-1757068800000'));
      expect(status).toBe(400);
    });

    it('refuses two territories sharing a local id', async () => {
      /*
        The unique index is the real guarantee; the handler checks first so
        this comes back as a 400 naming the problem rather than a 500 from a
        constraint the caller cannot see.
      */
      const { status, body } = await post(publishBody(randomUUID(), {
        territories: [
          { localId: 'cf-twice', name: 'One', type: 'Zone', perk: '', description: '' },
          { localId: 'cf-twice', name: 'Two', type: 'Zone', perk: '', description: '' },
        ],
      }));
      expect(status).toBe(400);
      expect(body.error).toMatch(/local id/i);
    });

    it('refuses a map larger than any the books publish', async () => {
      // 64: twice the largest printed map (Carcass Front's 32 Special Zones).
      const territories = Array.from({ length: 65 }, (_, i) => ({
        localId: `z-${i}`, name: `Zone ${i}`, type: 'Zone', perk: '', description: '',
      }));
      const { status } = await post(publishBody(randomUUID(), { territories }));
      expect(status).toBe(400);
    });
  });
});
