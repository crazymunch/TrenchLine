import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { integrationDbUrl } from '@/lib/integrationDb';

/**
 * The persisted admin role, against a real migrated Postgres.
 *
 * `adminRole.test.ts` beside this proves the PRECEDENCE without a database.
 * This proves the parts only a database can answer: that the column exists
 * with the default the expand migration gave it, that a lookup by ID does not
 * follow the address, and that revocation takes effect on the next resolution
 * rather than when a session expires.
 *
 * Skipped without `DATABASE_URL`, like the ownership suite. CI sets it.
 */

/* Not DATABASE_URL: that is the application's database and may be
   production. See `lib/integrationDb.ts` — this throws on a remote host
   rather than skipping, so a misconfiguration interrupts. */
const url = integrationDbUrl();
const describeDb = url ? describe : describe.skip;

const prisma = new PrismaClient({ datasources: { db: { url: url ?? 'postgresql://unused' } } });
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('../prisma', () => ({ prisma }));

const { isAdminUserId } = await import('../adminRole');

const DOMAIN = '@role.test';
let listed: { id: string };
let unlisted: { id: string };

describeDb('the persisted admin role', () => {
  beforeAll(async () => {
    await prisma.$connect();
    process.env.TRENCHLINE_ADMIN_EMAILS = `listed${DOMAIN}`;
  });
  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    await prisma.$disconnect();
    delete process.env.TRENCHLINE_ADMIN_EMAILS;
  });

  beforeEach(async () => {
    await prisma.user.deleteMany({ where: { email: { endsWith: DOMAIN } } });
    listed = await prisma.user.create({ data: { email: `listed${DOMAIN}`, name: 'Listed' } });
    unlisted = await prisma.user.create({ data: { email: `unlisted${DOMAIN}`, name: 'Unlisted' } });
  });

  it('defaults every user to USER, with no grant recorded', async () => {
    // What the EXPAND migration has to give: a readable column on every
    // existing row without a backfill.
    const row = await prisma.user.findUnique({
      where: { id: unlisted.id },
      select: { role: true, roleGrantedAt: true, roleGrantedBy: true },
    });
    expect(row).toEqual({ role: 'USER', roleGrantedAt: null, roleGrantedBy: null });
  });

  it('falls back to the configured list only while nobody has decided', async () => {
    expect(await isAdminUserId(listed.id)).toBe(true);
    expect(await isAdminUserId(unlisted.id)).toBe(false);
  });

  it('honours a grant to someone the list has never heard of', async () => {
    await prisma.user.update({
      where: { id: unlisted.id },
      data: { role: 'ADMIN', roleGrantedAt: new Date(), roleGrantedBy: 'bootstrap' },
    });
    expect(await isAdminUserId(unlisted.id)).toBe(true);
  });

  it('honours a revocation of someone the list still names', async () => {
    /*
      The reason the grant is persisted at all. An environment list that could
      override this would make demotion wait for a deploy.
    */
    await prisma.user.update({
      where: { id: listed.id },
      data: { role: 'USER', roleGrantedAt: new Date(), roleGrantedBy: 'someone' },
    });
    expect(await isAdminUserId(listed.id)).toBe(false);
  });

  it('takes effect on the next resolution, not on the next sign-in', async () => {
    // The JWT callback calls this on every refresh, so a grant made now is
    // live on the user's next request.
    expect(await isAdminUserId(unlisted.id)).toBe(false);
    await prisma.user.update({
      where: { id: unlisted.id },
      data: { role: 'ADMIN', roleGrantedAt: new Date(), roleGrantedBy: 'bootstrap' },
    });
    expect(await isAdminUserId(unlisted.id)).toBe(true);
  });

  it('does not follow an address change', async () => {
    /*
      Resolution is by ID. Taking the listed address confers nothing, which is
      the whole reason authority stopped being derived from a mutable field.
    */
    await prisma.user.update({ where: { id: listed.id }, data: { email: `moved${DOMAIN}` } });
    await prisma.user.update({ where: { id: unlisted.id }, data: { email: `listed${DOMAIN}` } });

    expect(await isAdminUserId(listed.id), 'the old holder loses it with the address').toBe(false);
    expect(await isAdminUserId(unlisted.id), 'and the new holder gains only the fallback')
      .toBe(true);

    // But an explicit revocation on the new holder still wins.
    await prisma.user.update({
      where: { id: unlisted.id },
      data: { role: 'USER', roleGrantedAt: new Date(), roleGrantedBy: 'someone' },
    });
    expect(await isAdminUserId(unlisted.id)).toBe(false);
  });

  it('is nobody for a user id that no longer exists', async () => {
    // A deleted account must not keep authority through a token that outlives
    // it — the JWT carries the id, and this is what the id resolves to.
    const id = unlisted.id;
    await prisma.user.delete({ where: { id } });
    expect(await isAdminUserId(id)).toBe(false);
  });

  it('is nobody for no id at all', async () => {
    expect(await isAdminUserId(null)).toBe(false);
    expect(await isAdminUserId(undefined)).toBe(false);
    expect(await isAdminUserId('')).toBe(false);
  });
});
