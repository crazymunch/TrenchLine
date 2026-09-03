import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Bug reports.
 *
 * These lived in a module-level array. Every one of the following was true at
 * once, and each has a test below:
 *
 *   - they vanished on restart and differed between server instances;
 *   - they silently capped at 100, dropping the oldest with no notice;
 *   - **anyone** could read all of them, unauthenticated, reporter addresses
 *     and descriptions included;
 *   - attribution fell back to `body.userEmail`, so it was whatever the
 *     submitter typed;
 *   - `POST {}` was a **500**, because the handler logged
 *     `report.description.slice(0, 50)` without checking the field existed;
 *   - and that 500 returned `err?.message`.
 */

const db = { bugReport: { create: vi.fn(), findMany: vi.fn() } };
vi.mock('@/lib/prisma', () => ({ prisma: db }));

const getServerSession = vi.fn();
vi.mock('next-auth', () => ({ getServerSession: (...a: unknown[]) => getServerSession(...a) }));

process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.TRENCHLINE_ADMIN_EMAILS = 'ops@example.org';

const { GET, POST } = await import('../route');

const ALICE = { id: 'alice', email: 'alice@example.org' };
const ADMIN = { id: 'ops', email: 'ops@example.org' };

const signedInAs = (user: { id: string; email: string } | null) =>
  getServerSession.mockResolvedValue(user ? { user } : null);

const post = async (body: unknown) => {
  const res = await POST({
    headers: { get: () => null }, text: async () => JSON.stringify(body),
  } as never);
  return { status: res.status, body: await res.json() };
};

const get = async (query = '') => {
  const res = await GET({ url: `http://localhost/api/bug-reports${query}` } as never);
  return { status: res.status, body: await res.json() };
};

const REPORT = { description: 'The dice roller shows five dice and rolls four.' };

beforeEach(() => {
  Object.values(db).forEach((m) => Object.values(m).forEach((f) => f.mockReset()));
  getServerSession.mockReset();
  db.bugReport.create.mockResolvedValue({ id: 'bug1', createdAt: new Date('2026-01-01') });
  db.bugReport.findMany.mockResolvedValue([]);
});

describe('listing reports', () => {
  it('refuses an unauthenticated caller', async () => {
    signedInAs(null);
    expect((await get()).status).toBe(401);
    expect(db.bugReport.findMany).not.toHaveBeenCalled();
  });

  it('refuses an ordinary signed-in user', async () => {
    signedInAs(ALICE);
    expect((await get()).status).toBe(403);
    expect(db.bugReport.findMany).not.toHaveBeenCalled();
  });

  it('allows an admin', async () => {
    signedInAs(ADMIN);
    expect((await get()).status).toBe(200);
  });

  it('bounds the page', async () => {
    signedInAs(ADMIN);
    await get('?limit=9999');
    expect(db.bugReport.findMany.mock.calls[0][0].take).toBe(100);
  });
});

describe('filing a report', () => {
  it('is stored, not held in memory', async () => {
    signedInAs(null);
    expect((await post(REPORT)).status).toBe(201);
    expect(db.bugReport.create).toHaveBeenCalledOnce();
  });

  /*
    Anonymous reporting is kept — a player who hits a bug before signing in is
    exactly the person whose report is worth having — but "anonymous" now means
    a null reporter rather than a name the submitter chose.
  */
  it('takes the reporter from the session, never from the body', async () => {
    signedInAs(ALICE);
    await post({ ...REPORT, userEmail: 'someone.else@example.org' });
    expect(db.bugReport.create.mock.calls[0][0].data.reporterId).toBe('alice');

    signedInAs(null);
    await post({ ...REPORT, userEmail: 'ops@example.org' });
    expect(db.bugReport.create.mock.calls[1][0].data.reporterId).toBeNull();
  });

  it('returns a receipt, not the stored report', async () => {
    signedInAs(ALICE);
    const { body } = await post(REPORT);
    // The old handler returned everything it had built, including the
    // attribution it had just accepted from the caller — confirming a spoof
    // back to whoever sent it.
    expect(Object.keys(body).sort()).toEqual(['id', 'receivedAt']);
    expect(JSON.stringify(body)).not.toMatch(/@/);
  });

  /*
    `POST {}` used to be a 500: the handler logged
    `report.description.slice(0, 50)` with no check that the field was there.
  */
  it('is a 400 for a missing description, not a 500', async () => {
    signedInAs(null);
    for (const body of [{}, { description: '' }, { description: 42 }, { description: null }]) {
      const { status } = await post(body);
      expect(status, JSON.stringify(body)).toBe(400);
    }
    expect(db.bugReport.create).not.toHaveBeenCalled();
  });

  it('never returns an exception message', async () => {
    signedInAs(null);
    db.bugReport.create.mockRejectedValue(new Error('relation "BugReport" does not exist'));
    const { status, body } = await post(REPORT);
    expect(status).toBe(500);
    // Prisma's message names tables, columns and constraints. A caller who can
    // provoke a query error should not get a description of the schema.
    expect(JSON.stringify(body)).not.toMatch(/relation|BugReport|does not exist/);
  });
});

/*
  The report modal collects real diagnostic context. A report without the
  viewport, the view and the ruleset version is one nobody can act on — so it
  is kept, as named bounded fields rather than a spread of whatever arrived.
*/
describe('the diagnostic context', () => {
  it('is kept, and recorded with the report', async () => {
    signedInAs(ALICE);
    await post({
      ...REPORT,
      category: 'Combat & Live Dice',
      deviceType: 'phone',
      screenResolution: '375x667',
      currentView: 'play',
      rulesetVersion: '1.0.2',
    });
    const { data } = db.bugReport.create.mock.calls[0][0];
    expect(data.description).toContain('The dice roller shows five dice');
    expect(data.description).toContain('deviceType: phone');
    expect(data.description).toContain('screenResolution: 375x667');
    expect(data.area).toBe('Combat & Live Dice');
  });

  it('does not record a submitter-chosen email among it', async () => {
    signedInAs(null);
    await post({ ...REPORT, userEmail: 'forged@example.org' });
    expect(JSON.stringify(db.bugReport.create.mock.calls[0][0].data))
      .not.toContain('forged@example.org');
  });

  it('bounds each field rather than storing whatever length arrives', async () => {
    signedInAs(null);
    expect((await post({ ...REPORT, description: 'x'.repeat(9_000) })).status).toBe(400);
    expect((await post({ ...REPORT, deviceType: 'x'.repeat(100) })).status).toBe(400);
  });
});

/*
  The modal used to submit its display text as the severity — `Minor /
  Visual`, `Critical / Blocking`. It sends the stored value now, but a tab that
  was already open still sends the old ones, and rejecting a bug report over a
  label is a bug report lost.
*/
describe('severity', () => {
  it('accepts the stored values', async () => {
    signedInAs(null);
    for (const severity of ['low', 'medium', 'high', 'critical']) {
      expect((await post({ ...REPORT, severity })).status, severity).toBe(201);
    }
  });

  it('maps the labels an older client sends', async () => {
    signedInAs(null);
    await post({ ...REPORT, severity: 'Critical / Blocking' });
    expect(db.bugReport.create.mock.calls[0][0].data.severity).toBe('critical');
    await post({ ...REPORT, severity: 'Minor / Visual' });
    expect(db.bugReport.create.mock.calls[1][0].data.severity).toBe('low');
  });

  it('still rejects a value that is neither', async () => {
    // Mapped explicitly rather than coerced with a fallback, so this does not
    // quietly become "accept anything".
    signedInAs(null);
    expect((await post({ ...REPORT, severity: 'apocalyptic' })).status).toBe(400);
  });
});
