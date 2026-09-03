import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * The public Warband Directory, and the admin read that used to write.
 *
 * The directory is a deliberate feature. What it disclosed was not: it
 * selected the owner's `email` and returned the complete roster — every unit,
 * the armoury stash, private notes, lore, patron, the chronicle log, campaign
 * snapshots, the owner's user id and the sync timestamps — for every roster
 * that had ever synced to the cloud, because there was no way to say no.
 */

const db = {
  warband: { findMany: vi.fn(), updateMany: vi.fn(), findUnique: vi.fn() },
  user: { findUnique: vi.fn() },
};
vi.mock('@/lib/prisma', () => ({ prisma: db }));

const getServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));

process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.TRENCHLINE_ADMIN_EMAILS = 'ops@example.org';

const { GET } = await import('../route');

const ALICE = { id: 'alice', email: 'alice@example.org' };
const ADMIN = { id: 'ops', email: 'ops@example.org' };

const signedInAs = (user: { id: string; email: string } | null) =>
  getServerSession.mockResolvedValue(user ? { user } : null);

const get = async (query = '') => {
  const res = await GET({ url: `http://localhost/api/warbands${query}` } as never);
  return { status: res.status, body: await res.json() };
};

/** A row as the public select returns it. */
const row = (over: Record<string, unknown> = {}) => ({
  id: 'wb1',
  name: 'The Third Lancers',
  factionId: 'new-antioch',
  ducatLimit: 700,
  gloryPoints: 12,
  units: [{ id: 'u1' }, { id: 'u2' }],
  notes: JSON.stringify({
    rawNotes: 'A private note nobody else should read.',
    motto: 'For the Meta-Christ',
    lore: 'Secret backstory',
    patron: 'Temporal Lord',
    chronicleLog: ['game 1'],
    snapshots: [{ at: 'then' }],
    editedAt: '2026-01-01T00:00:00.000Z',
  }),
  createdAt: new Date('2026-01-01'),
  user: { name: 'Alice' },
  ...over,
});

beforeEach(() => {
  Object.values(db).forEach((m) => Object.values(m).forEach((f) => f.mockReset()));
  getServerSession.mockReset();
  db.warband.findMany.mockResolvedValue([]);
});

describe('what the directory discloses', () => {
  beforeEach(() => { signedInAs(null); db.warband.findMany.mockResolvedValue([row()]); });

  it('never returns an email address, anywhere in the response', async () => {
    const { body } = await get('?all=true');
    expect(JSON.stringify(body)).not.toMatch(/@/);
  });

  it('never selects the owner’s email from the database', async () => {
    await get('?all=true');
    const select = db.warband.findMany.mock.calls[0][0].select;
    expect(select.user.select).toEqual({ name: true });
    expect(select.user.select.email).toBeUndefined();
  });

  /*
    An allowlist rather than a broad select with sensitive keys deleted after.
    A projection that starts narrow cannot drift into disclosure; one that
    starts wide and subtracts does, the first time a field is added to the
    model and nobody remembers this file exists.
  */
  it('returns exactly the allowed keys and no others', async () => {
    const { body } = await get('?all=true');
    expect(Object.keys(body.warbands[0]).sort()).toEqual([
      'createdAt', 'creatorName', 'ducatLimit', 'factionId',
      'gloryPoints', 'id', 'modelCount', 'motto', 'name',
    ]);
  });

  it('withholds the private roster content it used to publish', async () => {
    const { body } = await get('?all=true');
    const text = JSON.stringify(body);
    for (const secret of [
      'A private note nobody else should read.',
      'Secret backstory', 'Temporal Lord', 'game 1', 'then',
    ]) {
      expect(text, secret).not.toContain(secret);
    }
    const wb = body.warbands[0];
    expect(wb.units).toBeUndefined();
    expect(wb.armoryStash).toBeUndefined();
    expect(wb.creatorId).toBeUndefined();
    expect(wb.editedAt).toBeUndefined();
    // A count is the useful part of the roster without being the roster.
    expect(wb.modelCount).toBe(2);
  });

  /*
    `creatorName` fell back to `wb.user.email` when the owner had no display
    name — publishing an email address as a byline.
  */
  it('falls back to a neutral name, never to an email', async () => {
    db.warband.findMany.mockResolvedValue([row({ user: { name: null } })]);
    const { body } = await get('?all=true');
    expect(body.warbands[0].creatorName).toBe('Crusade Commander');
  });
});

/*
  Every cloud-synced roster was automatically public. Visibility defaults to
  PRIVATE and the migration backfills every existing row to it: nobody opted
  in to the old behaviour, so backfilling to PUBLIC would preserve exactly the
  non-consensual publication this fixes.
*/
describe('who appears in the directory', () => {
  it('asks only for rosters whose owner published them', async () => {
    signedInAs(null);
    await get('?all=true');
    expect(db.warband.findMany.mock.calls[0][0].where).toEqual({ visibility: 'PUBLIC' });
  });

  it('does not widen for an admin', async () => {
    // An operator's convenience is not a reason for the public projection to
    // carry more than it says it does.
    signedInAs(ADMIN);
    await get('?all=true');
    expect(db.warband.findMany.mock.calls[0][0].where).toEqual({ visibility: 'PUBLIC' });
  });
});

describe('pagination', () => {
  it('bounds the page, so one request does not grow with the table', async () => {
    signedInAs(null);
    await get('?all=true');
    expect(db.warband.findMany.mock.calls[0][0].take).toBe(25); // 24 + 1 lookahead

    await get('?all=true&limit=500');
    expect(db.warband.findMany.mock.calls[1][0].take).toBe(61); // capped at 60 + 1
  });

  it('orders deterministically, so a cursor cannot skip or repeat a row', async () => {
    signedInAs(null);
    await get('?all=true');
    expect(db.warband.findMany.mock.calls[0][0].orderBy)
      .toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
  });

  it('returns a cursor only when there is another page', async () => {
    signedInAs(null);
    db.warband.findMany.mockResolvedValue([row()]);
    expect((await get('?all=true')).body.nextCursor).toBeNull();

    db.warband.findMany.mockResolvedValue(
      Array.from({ length: 25 }, (_, i) => row({ id: `wb${i}` })),
    );
    const { body } = await get('?all=true');
    expect(body.warbands).toHaveLength(24);
    expect(body.nextCursor).toBe('wb23');
  });
});

/*
  API-04. Every admin GET reassigned any row whose id or name matched a seed
  substring — `Al-Qarn`, `Bayt al-Nahas` — so a read changed data, and a real
  user's similarly named roster was silently claimed by an admin.
*/
describe('the read that used to write', () => {
  it('does not mutate ownership, for an admin or anyone else', async () => {
    for (const who of [ADMIN, ALICE, null]) {
      signedInAs(who);
      await get();
      await get('?all=true');
      expect(db.warband.updateMany, String(who?.email)).not.toHaveBeenCalled();
    }
  });
});

describe('"my warbands"', () => {
  it('gives a signed-out caller an empty list, never the table', async () => {
    signedInAs(null);
    const { body } = await get();
    expect(body.warbands).toEqual([]);
    expect(db.warband.findMany).not.toHaveBeenCalled();
  });

  it('scopes to the caller', async () => {
    signedInAs(ALICE);
    await get();
    expect(db.warband.findMany.mock.calls[0][0].where).toEqual({ userId: 'alice' });
  });

  it('still returns the full roster to its owner, so a restore works', async () => {
    signedInAs(ALICE);
    db.warband.findMany.mockResolvedValue([{
      ...row(), userId: 'alice', treasuryDucats: 45, armoryStash: [], visibility: 'PRIVATE',
      updatedAt: new Date('2026-02-01'), campaignMembers: [],
      user: { id: 'alice', name: 'Alice' },
    }]);
    const { body } = await get();
    const wb = body.warbands[0];
    expect(wb.units).toHaveLength(2);
    expect(wb.notes).toBe('A private note nobody else should read.');
    expect(wb.lore).toBe('Secret backstory');
    expect(wb.editedAt).toBe('2026-01-01T00:00:00.000Z');
    expect(wb.visibility).toBe('PRIVATE');
  });
});
