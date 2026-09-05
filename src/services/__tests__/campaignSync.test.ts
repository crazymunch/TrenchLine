/**
 * The client outbox, keyed by operation.
 *
 * The warband outbox queues one entry per warband id, because a warband is
 * pushed whole and only its last state matters. A campaign is edited by
 * several people at once, so two edits to one territory are two facts rather
 * than one later state — a queue keyed by entity collapses them into a
 * last-writer-wins blob before the request is even made.
 *
 * The cases here are the client half of the list in docs/CAMPAIGN-SYNC.md: an
 * edit made offline then reconnected, a fetch that fails before a push, and
 * the same operation delivered twice.
 */
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { campaignOutbox, pushCampaignOps, newOpId, type CampaignOp } from '../campaignSync';

const op = (overrides: Partial<CampaignOp> = {}): CampaignOp => ({
  kind: 'campaign.settings',
  opId: newOpId(),
  campaignId: 'camp-1',
  baseVersion: 1,
  data: { name: 'Renamed' },
  ...overrides,
} as CampaignOp);

const territoryOp = (entityId: string, perk: string, baseVersion = 1): CampaignOp => ({
  kind: 'territory.perk',
  opId: newOpId(),
  campaignId: 'camp-1',
  entityId,
  baseVersion,
  data: { perk },
});

const respondWith = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);

/**
 * A minimal browser, stubbed rather than brought in.
 *
 * This suite runs under node — nothing else in the project needs a DOM, and
 * adding jsdom to test a `localStorage` read would be a dependency bought for
 * one file. Stubbing it also states plainly what the module actually requires
 * of a browser, which is a key-value store and a UUID.
 */
const memoryStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
  };
};

beforeEach(() => {
  vi.stubGlobal('window', {
    localStorage: memoryStorage(),
    crypto: { randomUUID: () => `uuid-${Math.random().toString(36).slice(2)}` },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('the campaign outbox', () => {
  it('keeps two edits to one territory as two operations', () => {
    /*
      The whole reason this is keyed by operation. Keyed by entity, the second
      would replace the first and one person's edit would vanish before the
      request was made.
    */
    campaignOutbox.add(territoryOp('terr-1', 'First rule'));
    campaignOutbox.add(territoryOp('terr-1', 'Second rule'));

    expect(campaignOutbox.size()).toBe(2);
    expect(campaignOutbox.pending().map((o) => (o as { data: { perk: string } }).data.perk))
      .toEqual(['First rule', 'Second rule']);
  });

  it('survives a reload', () => {
    // The queue is in localStorage precisely because a phone at a table sleeps,
    // and a queue a refresh empties drops the edits it exists to protect.
    const queued = op();
    campaignOutbox.add(queued);
    expect(campaignOutbox.pending().map((o) => o.opId)).toEqual([queued.opId]);
  });

  it('does not queue the same operation id twice', () => {
    const queued = op();
    campaignOutbox.add(queued);
    campaignOutbox.add(queued);
    expect(campaignOutbox.size()).toBe(1);
  });

  it('separates one campaign’s operations from another’s', () => {
    campaignOutbox.add(op());
    campaignOutbox.add(op({ campaignId: 'camp-2' }));
    expect(campaignOutbox.forCampaign('camp-1')).toHaveLength(1);
    expect(campaignOutbox.forCampaign('camp-2')).toHaveLength(1);
  });
});

describe('pushing', () => {
  it('refuses to push when the fetch before it failed', async () => {
    /*
      An offline device that pushes blind overwrites a newer cloud copy with an
      older one. A fetch that could not be made is not permission to write —
      it is the absence of what the push needed.
    */
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    campaignOutbox.add(op());

    const result = await pushCampaignOps('camp-1', { fetched: false });

    expect(result).toMatchObject({ ok: false, reason: 'offline' });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(campaignOutbox.size(), 'nothing was discarded').toBe(1);
  });

  it('clears applied and skipped, and keeps conflicts queued', async () => {
    const a = op();
    const b = op({ data: { currentTurn: 3 } });
    const c = op({ data: { currentTurn: 4 } });
    campaignOutbox.add(a); campaignOutbox.add(b); campaignOutbox.add(c);

    vi.stubGlobal('fetch', respondWith(200, {
      applied: [a.opId],
      /* A success: the server already had it. This is the retry working. */
      skipped: [b.opId],
      conflicts: [{ opId: c.opId, server: { version: 7, name: 'Theirs' } }],
    }));

    const result = await pushCampaignOps('camp-1', { fetched: true });

    expect(result).toMatchObject({ ok: true });
    if (!result.ok) throw new Error('unreachable');
    expect(result.conflicts[0].server).toEqual({ version: 7, name: 'Theirs' });

    /* The conflict stays queued: it is not resolved here, because merging two
       people's edits without asking is a wrong answer nobody sees. */
    expect(campaignOutbox.pending().map((o) => o.opId)).toEqual([c.opId]);
  });

  it('keeps everything queued when the server does not answer', async () => {
    campaignOutbox.add(op());
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));

    const result = await pushCampaignOps('camp-1', { fetched: true });

    expect(result).toMatchObject({ ok: false, reason: 'offline' });
    expect(campaignOutbox.size()).toBe(1);
  });

  it('keeps everything queued on a 500', async () => {
    /*
      The distinction that matters: "the server said no" and "the server was
      not reached" are different, and only the first is an answer. A 500 is the
      second wearing the clothes of the first.
    */
    campaignOutbox.add(op());
    vi.stubGlobal('fetch', respondWith(500, {}));

    const result = await pushCampaignOps('camp-1', { fetched: true });

    expect(result).toMatchObject({ ok: false, reason: 'server' });
    expect(campaignOutbox.size()).toBe(1);
  });

  it('reports a refusal as a refusal, not as an outage', async () => {
    campaignOutbox.add(op());
    vi.stubGlobal('fetch', respondWith(403, {}));

    const result = await pushCampaignOps('camp-1', { fetched: true });
    expect(result).toMatchObject({ ok: false, reason: 'auth' });
  });

  it('sends only the campaign asked for, and strips the id from each op', async () => {
    campaignOutbox.add(op());
    campaignOutbox.add(op({ campaignId: 'camp-2' }));
    const fetchMock = respondWith(200, { applied: [], skipped: [], conflicts: [] });
    vi.stubGlobal('fetch', fetchMock);

    await pushCampaignOps('camp-1', { fetched: true });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.campaignId).toBe('camp-1');
    expect(body.ops).toHaveLength(1);
    /* The endpoint takes the campaign once, at the top. An operation carrying
       its own would be a second place for the two to disagree. */
    expect(body.ops[0]).not.toHaveProperty('campaignId');
  });

  it('reuses the operation id across a retry', async () => {
    /*
      The property that makes a retry safe. An id minted per attempt would make
      every retry a new operation — which is the bug this protocol exists to
      prevent, and is how one campaign became several.
    */
    const queued = op();
    campaignOutbox.add(queued);

    vi.stubGlobal('fetch', respondWith(500, {}));
    await pushCampaignOps('camp-1', { fetched: true });

    const fetchMock = respondWith(200, { applied: [], skipped: [queued.opId], conflicts: [] });
    vi.stubGlobal('fetch', fetchMock);
    await pushCampaignOps('camp-1', { fetched: true });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.ops[0].opId).toBe(queued.opId);
    expect(campaignOutbox.size(), 'skipped clears it').toBe(0);
  });

  it('does nothing, successfully, with an empty queue', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const result = await pushCampaignOps('camp-1', { fetched: true });
    expect(result).toMatchObject({ ok: true, applied: [], conflicts: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
