/**
 * The Chronicle's cloud half, and the two rules it has to keep.
 *
 * 1. A failed read is a FAILURE, never an empty list. "The cloud has no
 *    battles for you" and "the cloud could not be reached" are different
 *    facts, and a view that cannot tell them apart will show the second as
 *    the first — which is `services/githubSync.ts` all over again.
 * 2. A record present in both copies is ONE battle. There is no merge to do
 *    beyond that, because a battle record is immutable.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  fetchCloudBattles, pushBattle, deleteCloudBattle, mergeBattles, isFromCloud,
  type CloudBattle,
} from '../battleSync';
import { BATTLE_VERSION, type BattleRecord } from '@/types/battle';

const record = (over: Partial<BattleRecord> = {}): BattleRecord => ({
  version: BATTLE_VERSION,
  id: 'btl-1',
  endedAt: '2026-09-19T21:30:00.000Z',
  scenarioId: 'brothers-in-arms',
  scenarioName: 'Brothers in Arms',
  turns: 4,
  sides: [{
    id: 'wb-sultanate', name: 'Bayt al-Nahas', factionId: 'iron-sultanate',
    wasPlaceholder: false, vp: 6, turnScores: {},
  }],
  deeds: [],
  ...over,
});

const cloud = (over: Partial<CloudBattle> = {}): CloudBattle => ({
  ...record(),
  cloud: { ownerName: 'A Commander', campaignId: null, visibility: 'CAMPAIGN' },
  ...over,
});

const respond = (status: number, body: unknown) =>
  vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });

beforeEach(() => { vi.stubGlobal('fetch', respond(200, { battles: [] })); });
afterEach(() => { vi.unstubAllGlobals(); });

describe('reading the cloud Chronicle', () => {
  it('returns the battles it was given', async () => {
    vi.stubGlobal('fetch', respond(200, {
      battles: [{ ...record({ id: 'btl-a' }), cloud: { ownerName: 'Bob', campaignId: 'c1', visibility: 'CAMPAIGN' } }],
    }));
    const res = await fetchCloudBattles();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.battles).toHaveLength(1);
    expect(res.battles[0].cloud.ownerName).toBe('Bob');
  });

  it('reports a network failure rather than an empty Chronicle', async () => {
    // THE rule. An empty list here reads as "you have fought no battles",
    // which is a lie the player cannot see through.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Failed to fetch')));
    const res = await fetchCloudBattles();
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure.kind).toBe('offline');
  });

  it('distinguishes signed out from refused from broken', async () => {
    for (const [status, kind] of [[401, 'signed-out'], [403, 'refused'], [500, 'refused']] as const) {
      vi.stubGlobal('fetch', respond(status, {}));
      const res = await fetchCloudBattles();
      expect(res.ok, `status ${status}`).toBe(false);
      if (res.ok) continue;
      expect(res.failure.kind, `status ${status}`).toBe(kind);
    }
  });

  it('drops a row it cannot read rather than rendering half a battle', async () => {
    /* `parseBattle` is the gate, and it runs on what the SERVER sent — the
       columns are not trusted. A row written by an older build is the case
       it exists for. */
    vi.stubGlobal('fetch', respond(200, {
      battles: [
        { ...record({ id: 'btl-good' }) },
        { version: 99, id: 'btl-future', sides: [{ id: 'x', name: 'y' }] },
        { ...record({ id: 'btl-sideless' }), sides: [] },
      ],
    }));
    const res = await fetchCloudBattles();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.battles.map((b) => b.id)).toEqual(['btl-good']);
  });

  it('never presents a missing display name as an account identifier', async () => {
    vi.stubGlobal('fetch', respond(200, {
      battles: [{ ...record(), cloud: { ownerName: '', campaignId: null, visibility: 'CAMPAIGN' } }],
    }));
    const res = await fetchCloudBattles();
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.battles[0].cloud.ownerName).toBe('Crusade Commander');
  });
});

describe('pushing a battle', () => {
  it('sends the record and reports that it was created', async () => {
    const f = respond(201, { created: true });
    vi.stubGlobal('fetch', f);

    const res = await pushBattle(record(), { campaignId: 'camp-1' });
    expect(res).toEqual({ ok: true, created: true });

    const [url, init] = f.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/battles');
    const sent = JSON.parse(String(init.body));
    expect(sent.id).toBe('btl-1');
    expect(sent.campaignId).toBe('camp-1');
    // `version` is the client's own envelope and the server stamps its own.
    expect('version' in sent).toBe(false);
  });

  it('says a repeat was not created, so a retry is not a second battle', async () => {
    vi.stubGlobal('fetch', respond(200, { created: false }));
    expect(await pushBattle(record())).toEqual({ ok: true, created: false });
  });

  it('fails loudly when the push does not land', async () => {
    // The local record is already written and is NOT removed by this. The
    // caller has to be able to say the copy did not go out.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no signal')));
    const res = await pushBattle(record());
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.failure).toEqual({ kind: 'offline', detail: 'no signal' });
  });

  it('omits the optional fields it does not have', async () => {
    const f = respond(201, { created: true });
    vi.stubGlobal('fetch', f);
    await pushBattle(record());
    const sent = JSON.parse(String((f.mock.calls[0][1] as RequestInit).body));
    expect('coalitionTotals' in sent).toBe(false);
    expect('weather' in sent).toBe(false);
    expect('campaignId' in sent).toBe(false);
  });
});

describe('forgetting a cloud battle', () => {
  it('names the battle in the query, encoded', async () => {
    const f = respond(200, { deleted: 'btl 1' });
    vi.stubGlobal('fetch', f);
    await deleteCloudBattle('btl 1');
    expect(f.mock.calls[0][0]).toBe('/api/battles?id=btl%201');
  });

  it('reports a refusal instead of pretending it worked', async () => {
    vi.stubGlobal('fetch', respond(403, {}));
    const res = await deleteCloudBattle('btl-1');
    expect(res.ok).toBe(false);
  });
});

describe('merging the two copies', () => {
  it('counts a battle in both places once', async () => {
    const merged = mergeBattles([record({ id: 'btl-1' })], [cloud({ id: 'btl-1' })]);
    expect(merged).toHaveLength(1);
  });

  it('keeps the local copy where both exist', () => {
    /* Not arbitrary: the recording device holds the record AS WRITTEN, while
       the cloud copy has been through a serialisation and a re-parse. */
    const merged = mergeBattles(
      [record({ id: 'btl-1', scenarioName: 'As written' })],
      [cloud({ id: 'btl-1', scenarioName: 'Round-tripped' })],
    );
    expect(merged[0].scenarioName).toBe('As written');
  });

  it('orders by when the match ended, not by where the record came from', () => {
    const merged = mergeBattles(
      [record({ id: 'local-old', endedAt: '2026-01-01T00:00:00.000Z' })],
      [cloud({ id: 'cloud-new', endedAt: '2026-09-01T00:00:00.000Z' })],
    );
    expect(merged.map((b) => b.id)).toEqual(['cloud-new', 'local-old']);
  });

  it('keeps a battle only one side has', () => {
    const merged = mergeBattles([record({ id: 'a' })], [cloud({ id: 'b' })]);
    expect(merged.map((b) => b.id).sort()).toEqual(['a', 'b']);
  });

  it('marks which merged records this device did not record', () => {
    const local = new Set(['a']);
    expect(isFromCloud(record({ id: 'a' }), local)).toBe(false);
    expect(isFromCloud(record({ id: 'b' }), local)).toBe(true);
  });
});
