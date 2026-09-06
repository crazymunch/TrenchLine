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

/**
 * The session, as `getServerSession` would hand it over.
 *
 * `id` is optional and `isAdmin` is separate from the address on purpose:
 * those are the two shapes the warband routes used to get wrong. The `jwt`
 * callback revokes a session by deleting `token.sub`, which leaves a session
 * object carrying an email and no id; and it resolves `isAdmin` from
 * `User.role`, which can disagree with `TRENCHLINE_ADMIN_EMAILS`.
 */
interface TestUser { id?: string; email: string; isAdmin?: boolean }
let session: { user: TestUser } | null = null;
const as = (user: TestUser | null) => { session = user ? { user } : null; };

const { GET: campaignsGET, POST: campaignsPOST } = await import('../campaigns/route');
const { POST: rulesPOST, DELETE: rulesDELETE } = await import('../custom-rules/route');
const { POST: warbandsPOST, DELETE: warbandsDELETE } = await import('../warbands/route');

const deleteWarband = async (id: string) => {
  const res = await warbandsDELETE({ url: `http://localhost/api/warbands?id=${id}` } as never);
  return { status: res.status, body: await res.json() };
};

/*
  Identical in shape to `post` now, and kept only because the warband handler
  takes no query string.

  It used to differ: the warband route read its body with `req.json()` while
  the campaign and custom-rule routes went through `parse.ts` and read
  `req.text()` — so this fixture offered `json()` and that one offered
  `text()`. That inconsistency WAS the defect: `req.json()` parses before
  anyone can object to the size, so the 512 KB cap every other write path
  enforces did not apply to a roster, whose `units` and `armoryStash` are Json
  columns with no ceiling of their own. Both go through `readJson` now.
*/
const saveWarband = async (body: unknown) => {
  const res = await warbandsPOST({
    headers: { get: () => null }, text: async () => JSON.stringify(body),
  } as never);
  return { status: res.status, body: await res.json() };
};

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

  /**
   * The two holes Codex found in `POST` and `DELETE /api/warbands`.
   *
   * `GET` was migrated onto `policy.ts` when that module was written; these
   * two were not, and kept the pre-AUTH-1 code. Both tests fail against it —
   * the first with a 200 and a deleted roster, the second with a 200 and
   * somebody else's roster deleted.
   */
  describe('a session the server has already revoked', () => {
    /*
      What revocation looks like from a handler's side.

      `jwt` deletes `token.sub` when `User.sessionEpoch` no longer matches,
      which is what makes a password reset actually remove whoever else was in
      the account. The email is NOT deleted with it — nothing needs it to be,
      because an id is what identifies a caller. The old handlers looked the
      address up and put the identity back.
    */
    const revoked = (user: { email: string }) => as({ email: user.email });

    it('cannot delete a roster', async () => {
      revoked(alice);
      expect((await deleteWarband(aliceWarband)).status).toBe(401);
      expect(await prisma.warband.findUnique({ where: { id: aliceWarband } })).not.toBeNull();
    });

    it('cannot save a roster', async () => {
      revoked(alice);
      const { status } = await saveWarband({
        id: aliceWarband, name: 'Renamed', factionId: 'new-antioch',
      });
      expect(status).toBe(401);
    });

    it('cannot mint an account for an address that has none', async () => {
      /*
        The worse half. `POST` did not merely look the address up — it
        `upsert`ed, so a session carrying an address with no user behind it
        created one and filed a roster under it.
      */
      as({ email: 'ghost@ownership.test' });
      const { status } = await saveWarband({
        name: 'Ghost Warband', factionId: 'new-antioch',
      });
      expect(status).toBe(401);
      expect(await prisma.user.findUnique({ where: { email: 'ghost@ownership.test' } }))
        .toBeNull();
    });
  });

  describe('an administrator whose grant was revoked', () => {
    /*
      `adminRole.ts` is the one place that decides, and an explicit
      `roleGrantedAt` beats the configured email list — that is the whole point
      of persisting the grant. The old handlers asked `isUserAdmin(email)`
      instead, so a demotion did nothing on the two routes that write and
      delete other people's rosters, and the persisted grant was decorative
      exactly where it mattered.

      The session below says what the `jwt` callback would say about a demoted
      user: `isAdmin: false`. The address is still listed.
    */
    beforeEach(() => { process.env.TRENCHLINE_ADMIN_EMAILS = 'alice@ownership.test'; });
    afterAll(() => { delete process.env.TRENCHLINE_ADMIN_EMAILS; });

    it('cannot delete another player’s roster', async () => {
      as({ id: alice.id, email: alice.email, isAdmin: false });
      expect((await deleteWarband(bobWarband)).status).toBe(403);
      expect(await prisma.warband.findUnique({ where: { id: bobWarband } })).not.toBeNull();
    });

    it('cannot overwrite another player’s roster', async () => {
      as({ id: alice.id, email: alice.email, isAdmin: false });
      const { status } = await saveWarband({
        id: bobWarband, name: 'Taken', factionId: 'new-antioch',
      });
      expect(status).toBe(403);
      expect((await prisma.warband.findUnique({ where: { id: bobWarband } }))?.name)
        .toBe('Bob Warband');
    });

    it('still reaches its own', async () => {
      // The demotion removes borrowed authority, not the account.
      as({ id: alice.id, email: alice.email, isAdmin: false });
      expect((await deleteWarband(aliceWarband)).status).toBe(200);
    });
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

    /*
      The roster body cap.

      `units` and `armoryStash` are Json columns with no ceiling of their own,
      so until this route went through `readJson` the only bound on a roster
      body was the host's. A field-level limit would not have helped: those run
      after the parse, and the parse is the work being bounded.
    */
    it('refuses an oversized roster before parsing it', async () => {
      as(alice);
      const res = await saveWarband({
        name: 'Too Much', factionId: 'new-antioch',
        units: [{ lore: 'x'.repeat(600 * 1024) }],
      });
      expect(res.status).toBe(413);
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
