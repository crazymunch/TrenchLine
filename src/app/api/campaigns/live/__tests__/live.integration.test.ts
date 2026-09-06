import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';

/**
 * The live match mirror, against a real migrated Postgres.
 *
 * LIVE-1. The design is in `docs/LIVE-MODE.md`; what these prove is the half
 * that makes it safe rather than the half that makes it work, because a live
 * match is a row one person writes and several people read:
 *
 *   - only the host writes, and the host is the session rather than the body;
 *   - only the campaign's members read, and a match id is not a ticket;
 *   - a snapshot is last-write-wins ON PURPOSE, which is the one place the
 *     campaign protocol's answer would be wrong;
 *   - the ETag actually spares a watcher the body.
 *
 * Skipped without `DATABASE_URL`, like the other integration suites.
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

const { PUT, GET, DELETE } = await import('../route');

const put = async (body: unknown) => {
  const res = await PUT({
    headers: { get: () => null }, text: async () => JSON.stringify(body),
  } as never);
  return { status: res.status, body: await res.json() };
};

const get = async (query: string, headers: Record<string, string> = {}) => {
  const res = await GET({
    url: `http://localhost/api/campaigns/live?${query}`,
    headers: new Headers(headers),
  } as never);
  return {
    status: res.status,
    etag: res.headers.get('ETag'),
    body: res.status === 304 ? null : await res.json(),
  };
};

const del = async (id: string) => {
  const res = await DELETE({ url: `http://localhost/api/campaigns/live?id=${id}` } as never);
  return { status: res.status, body: await res.json() };
};

const DOMAIN = '@live.test';
const board = (wounds: number) => ({ playTurn: 2, units: [{ id: 'u1', currentWounds: wounds }] });

let host: { id: string; email: string };
let watcher: { id: string; email: string };
let stranger: { id: string; email: string };
let campaignId: string;
let matchId: string;

describeDb('the live match mirror', () => {
  beforeAll(async () => { await prisma.$connect(); });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    const [h, w, s] = await Promise.all([
      prisma.user.create({ data: { email: `host${DOMAIN}`, name: 'Host' } }),
      prisma.user.create({ data: { email: `watcher${DOMAIN}`, name: 'Watcher' } }),
      prisma.user.create({ data: { email: `stranger${DOMAIN}`, name: 'Stranger' } }),
    ]);
    host = { id: h.id, email: h.email! };
    watcher = { id: w.id, email: w.email! };
    stranger = { id: s.id, email: s.email! };

    const campaign = await prisma.campaign.create({
      data: { name: 'Live Crusade', inviteCode: `TRENCH-LIVE${Date.now()}`, adminId: host.id },
    });
    campaignId = campaign.id;

    // The watcher is a member; the stranger is not.
    const wb = await prisma.warband.create({
      data: { name: 'W', factionId: 'new-antioch', userId: watcher.id },
    });
    await prisma.campaignMember.create({
      data: {
        campaignId, userId: watcher.id, warbandId: wb.id,
        playerName: 'Watcher', warbandName: 'W', factionId: 'new-antioch',
      },
    });

    matchId = randomUUID();
    as(host);
  });

  const start = () => put({ matchId, campaignId, state: board(3) });

  it('refuses a signed-out caller', async () => {
    as(null);
    expect((await start()).status).toBe(401);
    expect((await get(`id=${matchId}`)).status).toBe(401);
  });

  it('starts a match and names the host from the session', async () => {
    const { status, body } = await start();
    expect(status).toBe(201);
    expect(body.match.revision).toBe(1);

    const row = await prisma.liveMatch.findUnique({ where: { id: matchId } });
    expect(row!.hostId).toBe(host.id);
    expect(row!.campaignId).toBe(campaignId);
  });

  it('will not take the host from the body', async () => {
    // A body that could name the host could hand a stranger the only writable
    // seat at the table. `.strict()` rejects the key outright.
    const { status } = await put({ matchId, campaignId, state: board(3), hostId: stranger.id });
    expect(status).toBe(400);
    expect(await prisma.liveMatch.count({ where: { id: matchId } })).toBe(0);
  });

  it('refuses a caller who is not in the campaign', async () => {
    as(stranger);
    // 404, not 403: distinguishing them would confirm the campaign exists.
    expect((await start()).status).toBe(404);
  });

  describe('once it is running', () => {
    beforeEach(async () => { await start(); });

    it('takes the newest snapshot, last write wins', async () => {
      /*
        The one place the campaign protocol's answer would be wrong. There is a
        single writer, so two snapshots in flight are the same device's — the
        later one is the truth, and refusing it over a stale `baseRevision`
        would freeze the board behind a dialogue nobody can answer mid-game.
      */
      const second = await put({ matchId, campaignId, state: board(1), baseRevision: 0 });
      expect(second.status).toBe(200);
      expect(second.body.match.revision).toBe(2);

      const row = await prisma.liveMatch.findUnique({ where: { id: matchId } });
      expect((row!.state as { units: { currentWounds: number }[] }).units[0].currentWounds).toBe(1);
    });

    it('lets a member watch it', async () => {
      as(watcher);
      const { status, body } = await get(`id=${matchId}`);
      expect(status).toBe(200);
      expect(body.match.state.units[0].currentWounds).toBe(3);
    });

    it('does not let a member write it', async () => {
      as(watcher);
      const { status } = await put({ matchId, campaignId, state: board(0) });
      expect(status).toBe(403);
      // And the board is untouched.
      const row = await prisma.liveMatch.findUnique({ where: { id: matchId } });
      expect(row!.revision).toBe(1);
    });

    it('does not let a non-member read it', async () => {
      as(stranger);
      expect((await get(`id=${matchId}`)).status).toBe(404);
    });

    it('spares a watcher the body when nothing has changed', async () => {
      as(watcher);
      const first = await get(`id=${matchId}`);
      expect(first.etag).toBe('W/"1"');

      // The whole reason polling is affordable.
      const again = await get(`id=${matchId}`, { 'if-none-match': first.etag! });
      expect(again.status).toBe(304);
      expect(again.body).toBeNull();

      // And a moved board is served again under a new tag.
      as(host);
      await put({ matchId, campaignId, state: board(2) });
      as(watcher);
      const moved = await get(`id=${matchId}`, { 'if-none-match': first.etag! });
      expect(moved.status).toBe(200);
      expect(moved.etag).toBe('W/"2"');
    });

    it('lists what is live in the campaign, with a name and no address', async () => {
      as(watcher);
      const { status, body } = await get(`campaignId=${campaignId}`);
      expect(status).toBe(200);
      expect(body.matches).toHaveLength(1);
      expect(body.matches[0].hostName).toBe('Host');
      expect(JSON.stringify(body)).not.toContain(DOMAIN);
      // A listing is not a board: no state until you open one.
      expect(body.matches[0].state).toBeUndefined();
    });

    it('refuses a body larger than a board could be', async () => {
      const { status } = await put({
        matchId, campaignId, state: { blob: 'x'.repeat(70 * 1024) },
      });
      expect(status).toBe(400);
      const row = await prisma.liveMatch.findUnique({ where: { id: matchId } });
      expect(row!.revision, 'an oversized snapshot was written').toBe(1);
    });

    it('is the host’s to end, and nobody else’s', async () => {
      as(watcher);
      expect((await del(matchId)).status).toBe(403);

      as(host);
      expect((await del(matchId)).status).toBe(200);
      expect(await prisma.liveMatch.count({ where: { id: matchId } })).toBe(0);
    });

    it('cannot be moved to another campaign', async () => {
      // A match id carried into a different campaign would take its watchers
      // with it.
      const other = await prisma.campaign.create({
        data: { name: 'Elsewhere', inviteCode: `TRENCH-ELSE${Date.now()}`, adminId: host.id },
      });
      const { status } = await put({ matchId, campaignId: other.id, state: board(1) });
      expect(status).toBe(409);
      await prisma.campaign.delete({ where: { id: other.id } });
    });
  });

  it('goes when the campaign goes', async () => {
    await start();
    await prisma.campaign.delete({ where: { id: campaignId } });
    // Cascade, so a deleted campaign leaves no orphan board behind.
    expect(await prisma.liveMatch.count({ where: { id: matchId } })).toBe(0);
  });
});
