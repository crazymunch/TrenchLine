import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * SH-1: the share token, and the page it opens.
 *
 * > A shared warband renders at its token; the same warband after "Stop sharing"
 * > is 404; a warband never shared is 404 for any token; the page carries
 * > `noindex`.
 *
 * The first three are properties of the LOADER — `loadSharedWarband` returns the
 * roster or null, and the page turns null into `notFound()` — so they are tested
 * where the decision is made. The fourth is asserted twice: in the page's
 * metadata and in the header `next.config.mjs` sets, because two mechanisms for
 * one rule was the deliberate choice and a test that only knew about one would
 * let the other rot.
 *
 * Prisma is mocked, as in `directory.test.ts`: what is under test is the
 * authorisation and the shape of the answer, not the database.
 */

const db = {
  warband: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
};
vi.mock('@/lib/prisma', () => ({ prisma: db }));

const getServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));

process.env.NEXTAUTH_SECRET = 'test-secret';

const { GET, POST, DELETE } = await import('../[id]/share/route');
const { loadSharedWarband } = await import('@/lib/api/warbandLoader');

const OWNER = { id: 'owner-1', email: 'owner@example.org' };
const STRANGER = { id: 'stranger-1', email: 'stranger@example.org' };
const ADMIN_NOT_OWNER = { id: 'ops-1', email: 'ops@example.org' };

const signedInAs = (user: { id: string; email: string } | null) =>
  getServerSession.mockResolvedValue(user ? { user } : null);

const params = (id: string) => ({ params: Promise.resolve({ id }) });

const call = async (
  handler: (r: Request, c: { params: Promise<{ id: string }> }) => Promise<Response>,
  id = 'wb1',
) => {
  const res = await handler({} as Request, params(id));
  return { status: res.status, body: await res.json() };
};

/** A row as the loader's include returns it. */
const row = (over: Record<string, unknown> = {}) => ({
  id: 'wb1',
  name: 'Al-Qarn Rihla',
  factionId: 'iron-sultanate',
  ducatLimit: 1440,
  treasuryDucats: 0,
  gloryPoints: 13,
  units: [{ id: 'u1' }],
  armoryStash: [],
  visibility: 'PRIVATE',
  notes: JSON.stringify({
    rawNotes: '',
    patron: 'Sublime Gate',
    variantId: 'the-house-of-wisdom',
    campaignRules: ['Book of Golems'],
    rewards: [{ name: 'Book of Golems', group: 'Exploration Rewards' }],
    editedAt: '2026-09-20T00:00:00Z',
  }),
  userId: OWNER.id,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-09-20T00:00:00Z'),
  user: { id: OWNER.id, name: 'Nick' },
  campaignMembers: [],
  shareToken: null as string | null,
  ...over,
});

beforeEach(() => {
  db.warband.findUnique.mockReset();
  db.warband.update.mockReset();
  db.warband.updateMany.mockReset();
  getServerSession.mockReset();
});

/* --------------------------------------------------------- the token API --- */

describe('only the owner decides that a roster is shared', () => {
  it('a signed-out caller is refused', async () => {
    signedInAs(null);
    expect((await call(POST)).status).toBe(401);
  });

  it('somebody else’s roster is refused, and nothing is written', async () => {
    /* 403 for a roster that exists and is not yours, 404 for one that does not
       exist. The bodies are identical (`http.ts`), so neither describes it. */
    signedInAs(STRANGER);
    db.warband.findUnique.mockResolvedValue({ id: 'wb1', userId: OWNER.id });
    expect((await call(POST)).status).toBe(403);
    expect(db.warband.update).not.toHaveBeenCalled();
    expect(db.warband.updateMany).not.toHaveBeenCalled();
  });

  it('an ADMIN who does not own the roster is refused too, on all three', async () => {
    /*
      Review round 1, finding B. `requireOwnedWarband` lets `actor.isAdmin`
      through — right for an operator repairing a roster, wrong here: sharing
      PUBLISHES a roster, and that is the owner's decision alone. An admin
      signed in as somebody else got 200 and a fresh token for a roster they did
      not own, and the owner was never told.

      All three handlers, because a bypass on the read is a bypass on the link.
    */
    for (const handler of [GET, POST, DELETE]) {
      db.warband.findUnique.mockReset();
      db.warband.update.mockReset();
      db.warband.updateMany.mockReset();
      /* An admin session: `isAdmin` is resolved from the persisted role and
         carried on the session, which is what `currentActor` reads. */
      getServerSession.mockResolvedValue({ user: { ...ADMIN_NOT_OWNER, isAdmin: true } });
      db.warband.findUnique.mockResolvedValue({ id: 'wb1', userId: OWNER.id });

      const { status, body } = await call(handler);
      expect(status, `${handler.name} let an admin through`).toBe(403);
      expect(body.error).toMatch(/owner/i);
      expect(db.warband.update).not.toHaveBeenCalled();
      expect(db.warband.updateMany).not.toHaveBeenCalled();
    }
  });

  it('a roster the cloud has never seen is a 404, which is what "local only" means', async () => {
    /*
      The builder turns this into "this roster has not reached the cloud yet". The
      refusal is the SERVER's, not a guess the client makes from a local flag.
    */
    signedInAs(OWNER);
    db.warband.findUnique.mockResolvedValue(null);
    expect((await call(POST)).status).toBe(404);
  });
});

describe('sharing, and stopping', () => {
  it('reports an unshared roster as unshared, with no token and no path', async () => {
    signedInAs(OWNER);
    db.warband.findUnique
      .mockResolvedValueOnce({ id: 'wb1', userId: OWNER.id })   // the policy check
      .mockResolvedValueOnce({ shareToken: null });             // the read
    expect(await call(GET)).toEqual({
      status: 200, body: { shared: false, token: null, path: null },
    });
  });

  /**
   * A stand-in for the column's own `WHERE shareToken IS NULL`.
   *
   * `updateMany` writes only while the column is still null and reports how
   * many rows it changed; the read afterwards returns whatever stuck. Modelling
   * it this way is what lets the two-taps test below be a real race rather than
   * two calls in a row.
   */
  const conditionalColumn = () => {
    let token: string | null = null;
    db.warband.updateMany.mockImplementation(
      async ({ where, data }: { where: { shareToken: null }; data: { shareToken: string } }) => {
        if (where.shareToken !== null || token !== null) return { count: 0 };
        token = data.shareToken;
        return { count: 1 };
      });
    db.warband.findUnique.mockImplementation(async ({ select }: { select?: Record<string, boolean> }) =>
      (select && 'userId' in select
        ? { id: 'wb1', userId: OWNER.id }
        : { shareToken: token }));
    return { read: () => token };
  };

  it('mints a token and returns the path, not an absolute URL', async () => {
    signedInAs(OWNER);
    conditionalColumn();

    const { status, body } = await call(POST);
    expect(status).toBe(200);
    expect(body.shared).toBe(true);
    expect(body.path).toBe(`/w/${body.token}`);
    /*
      The origin belongs to whoever is serving the page — a preview deployment, a
      local run, the site — so the server hands back a path and the browser
      assembles the link.
    */
    expect(body.path).not.toMatch(/^https?:/);
  });

  it('the token is random, and is not the warband id or anything derived from it', async () => {
    const mint = async () => {
      signedInAs(OWNER);
      db.warband.updateMany.mockReset();
      db.warband.findUnique.mockReset();
      conditionalColumn();
      return (await call(POST)).body.token as string;
    };

    const a = await mint();
    const b = await mint();
    expect(a).not.toBe(b);
    /*
      `warbandCode(id)` is derived from the id and is printed in the builder for
      anybody to read out. A token derived the same way would make every roster
      in the database publicly readable the moment one person shared theirs.
    */
    expect(a).not.toContain('wb1');
    /* 24 random bytes, base64url: long enough that guessing is not an attack. */
    expect(a).toMatch(/^[A-Za-z0-9_-]{30,}$/);
  });

  it('sharing twice keeps the same link', async () => {
    /* Re-minting would break a link the player had already sent, and they would
       have no way to know: the old URL would 404 with nothing to say why. */
    signedInAs(OWNER);
    db.warband.updateMany.mockResolvedValue({ count: 0 });
    db.warband.findUnique.mockImplementation(async ({ select }: { select?: Record<string, boolean> }) =>
      (select && 'userId' in select
        ? { id: 'wb1', userId: OWNER.id }
        : { shareToken: 'already-minted' }));

    expect(await call(POST)).toEqual({
      status: 200,
      body: { shared: true, token: 'already-minted', path: '/w/already-minted' },
    });
    /* The conditional write matched no row, because the column is not null. */
    expect(db.warband.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'wb1', shareToken: null } }));
  });

  it('two Share taps at once mint ONE token, and both get the live one', async () => {
    /*
      Review round 1, finding M. A read-then-write got this wrong: both reads
      saw `null`, both wrote, the second overwrote the first — and the first
      response handed the player a link that was already dead.

      The write is conditional (`updateMany` where the column is still null), so
      whichever call loses updates no rows; both then read the row back and both
      return the token that actually stuck.
    */
    signedInAs(OWNER);
    const column = conditionalColumn();

    const [a, b] = await Promise.all([call(POST), call(POST)]);

    expect(db.warband.updateMany).toHaveBeenCalledTimes(2);
    /* One token in the column, and it is the one both callers were given. */
    expect(a.body.token).toBe(column.read());
    expect(b.body.token).toBe(column.read());
    expect(a.body.token).toBe(b.body.token);
    expect(a.body.path).toBe(`/w/${column.read()}`);
  });

  it('stopping sharing nulls the column, which is what breaks the old link', async () => {
    signedInAs(OWNER);
    db.warband.findUnique.mockResolvedValue({ id: 'wb1', userId: OWNER.id });
    db.warband.update.mockResolvedValue({ shareToken: null });

    expect(await call(DELETE)).toEqual({
      status: 200, body: { shared: false, token: null, path: null },
    });
    expect(db.warband.update).toHaveBeenCalledWith({
      where: { id: 'wb1' }, data: { shareToken: null },
    });
  });
});

/* -------------------------------------------------------- the share page --- */

describe('what a share link resolves to', () => {
  it('a shared warband loads at its token, with every client-owned field', async () => {
    db.warband.findUnique.mockResolvedValue(row({ shareToken: 'tok-abc' }));
    const loaded = await loadSharedWarband('tok-abc');

    expect(db.warband.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { shareToken: 'tok-abc' } }));
    expect(loaded).toBeTruthy();
    expect(loaded!.name).toBe('Al-Qarn Rihla');
    /*
      The client-owned fields come back through `clientFieldsOf`, which is keyed
      by the one `CLIENT_OWNED` list and so is typed as a bag rather than as
      `Warband`. Read as a bag here, which is what the loader's contract actually
      is — the page casts once, in one place, and says so.
    */
    const client = loaded as unknown as Record<string, unknown>;
    /*
      The whole reason the loader is shared with the sync: these ride inside the
      `notes` JSON, and a page with its own reader would render a roster with no
      Variant, no Patron and no rewards — every number on it wrong in a way
      nobody would connect to the loader.
    */
    expect(client.patron).toBe('Sublime Gate');
    expect(client.variantId).toBe('the-house-of-wisdom');
    expect(client.campaignRules).toEqual(['Book of Golems']);
    expect(client.rewards).toEqual([{ name: 'Book of Golems', group: 'Exploration Rewards' }]);
    /* A display name, never the owner's address. */
    expect(loaded!.creatorName).toBe('Nick');
  });

  it('a token no row holds is null — the page answers 404, never an empty sheet', async () => {
    db.warband.findUnique.mockResolvedValue(null);
    expect(await loadSharedWarband('never-issued')).toBeNull();
  });

  it('a cleared token is null for the same reason, so "Stop sharing" is final', async () => {
    /*
      "Stop sharing" sets the column to NULL, so the old token matches no row.
      There is no state in which a stopped share still resolves — which is why
      the loader needs no "is it still shared" check of its own.
    */
    db.warband.findUnique.mockResolvedValue(null);
    expect(await loadSharedWarband('tok-abc')).toBeNull();
  });

  it('a warband never shared is not reachable by any token', async () => {
    /*
      Its column is NULL, and Postgres treats NULLs as distinct under the unique
      index — so an unshared roster answers to nothing, including the empty
      string, which is refused before the query.
    */
    db.warband.findUnique.mockResolvedValue(null);
    expect(await loadSharedWarband('anything')).toBeNull();

    db.warband.findUnique.mockReset();
    expect(await loadSharedWarband('')).toBeNull();
    expect(await loadSharedWarband(null)).toBeNull();
    expect(await loadSharedWarband(undefined)).toBeNull();
    /* And no query was made for a blank token: reading a missing parameter as
       "no filter" is how a missing parameter becomes a disclosure. */
    expect(db.warband.findUnique).not.toHaveBeenCalled();
  });
});

describe('the page is not for search engines', () => {
  it('its metadata says noindex, for a shared roster and for a missing one', async () => {
    const { generateMetadata } = await import('@/app/w/[token]/page');

    db.warband.findUnique.mockResolvedValue(row({ shareToken: 'tok-abc' }));
    const found = await generateMetadata({ params: Promise.resolve({ token: 'tok-abc' }) });
    expect(found.robots).toEqual({ index: false, follow: false, nocache: true });
    /* The title previews as something recognisable in a chat, and carries no
       player name and no roster contents. */
    expect(found.title).toBe('Al-Qarn Rihla — Warband Roster Sheet');
    expect(String(found.title)).not.toContain('Nick');

    db.warband.findUnique.mockResolvedValue(null);
    const missing = await generateMetadata({ params: Promise.resolve({ token: 'gone' }) });
    expect(missing.robots).toEqual({ index: false, follow: false, nocache: true });
  });

  it('and the response header says it too, for a crawler that renders nothing', async () => {
    const { default: config } = await import('../../../../../next.config.mjs');
    type Rule = { source: string; headers: { key: string; value: string }[] };
    const headers = await config.headers!() as unknown as Rule[];
    const rule = headers.find((h) => h.source.startsWith('/w/'));
    expect(rule, 'no /w/ header rule in next.config.mjs').toBeTruthy();
    expect(rule!.headers).toEqual([
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
    ]);
  });
});
