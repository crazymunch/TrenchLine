/**
 * The store's campaign edits reach the outbox.
 *
 * The protocol and both queues exist; this is the part that makes them do
 * anything — every mutation that changes a syncable field queues exactly one
 * operation, stating the version it was made against.
 *
 * The case worth writing down is the one that does NOT queue. Anonymous local
 * use is supported everywhere it was, and a campaign with no cloud identity
 * has no id the server would recognise: queueing for it would fill the outbox
 * with operations that can never be acknowledged, so the queue would grow for
 * the life of the install and never drain.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStore } from '../useStore';
import { campaignOutbox, type CampaignOp } from '@/services/campaignSync';
import type { Campaign, TerritoryNode } from '@/types/campaign';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

const memoryStorage = () => {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
  };
};

const TERRITORY: TerritoryNode = {
  id: 'terr-1', name: 'Contested Ridge', type: "No Man's Land",
  perk: '', description: 'A ridge.', version: 4,
};

const PUBLISHED: TerritoryNode = {
  id: 'terr-published', name: 'Kurd Dagh', type: 'Special Zone',
  perk: 'A Warband holding this Zone may re-roll one Promotion roll.',
  perkSource: 'published', description: 'A published zone.', version: 2,
};

const seed = (cloudId: string) => {
  useStore.setState((s) => ({
    campaignSync: { kind: 'local-only' },
    campaign: {
      ...s.campaign,
      id: 'camp-local', cloudId: cloudId || undefined,
      name: 'Sync Crusade', version: 7,
      houseRules: undefined,
      territories: [TERRITORY, PUBLISHED],
      chronicleLogs: [],
    } as Campaign,
  }));
};

const queued = (): CampaignOp[] => campaignOutbox.pending();

beforeEach(() => {
  vi.stubGlobal('window', {
    localStorage: memoryStorage(),
    crypto: { randomUUID: () => `uuid-${Math.random().toString(36).slice(2)}` },
  });
  seed('camp-1');
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('a campaign edit with a cloud identity', () => {
  it('queues the perk against the territory’s own version', () => {
    useStore.getState().setTerritoryPerk('terr-1', 'Ours by right');

    expect(queued()).toHaveLength(1);
    const op = queued()[0];
    expect(op.kind).toBe('territory.perk');
    /* The CLOUD id, not the local one. `id` is minted `camp-<timestamp>` and
       is not something the server would recognise. */
    expect(op.campaignId).toBe('camp-1');
    /* The territory's version, not the campaign's — they move independently,
       and using the wrong one turns every edit into a conflict. */
    expect(op.baseVersion).toBe(4);
    expect((op as Extract<CampaignOp, { kind: 'territory.perk' }>).data.perk).toBe('Ours by right');
  });

  it('queues a claim without the player name', () => {
    /* The server reads it from the membership it has already verified. Sending
       it would be a second source for a field that decides attribution. */
    useStore.getState().claimTerritory('terr-1', 'wb-1', 'Someone Else');

    const op = queued()[0] as Extract<CampaignOp, { kind: 'territory.claim' }>;
    expect(op.kind).toBe('territory.claim');
    expect(op.data).toEqual({ warbandId: 'wb-1' });
    expect(JSON.stringify(op)).not.toMatch(/Someone Else/);
  });

  it('queues a house rule against the campaign’s version', () => {
    useStore.getState().setCampaignHouseRule('reinforcementsKeepExploration', true);

    const op = queued()[0] as Extract<CampaignOp, { kind: 'campaign.settings' }>;
    expect(op.kind).toBe('campaign.settings');
    expect(op.baseVersion).toBe(7);
    expect(op.data.houseRules).toEqual({ reinforcementsKeepExploration: true });
  });

  it('queues two edits to one territory as two operations, chained', () => {
    useStore.getState().setTerritoryPerk('terr-1', 'First');
    useStore.getState().setTerritoryPerk('terr-1', 'Second');
    expect(queued()).toHaveLength(2);
    expect(new Set(queued().map((o) => o.opId)).size).toBe(2);

    /*
      The second states the version the first will leave behind. An applied
      operation puts the entity at exactly `baseVersion + 1` — that is the
      update's own `where` — so if both claimed 4 the second would conflict
      with the first: this device disagreeing with itself over an edit nobody
      else touched.
    */
    expect(queued().map((o) => o.baseVersion)).toEqual([4, 5]);
    expect(useStore.getState().campaign.territories[0].version).toBe(6);
  });

  it('shows the queue on the indicator without waiting for a push', () => {
    useStore.getState().setTerritoryPerk('terr-1', 'Ours by right');
    expect(useStore.getState().campaignSync).toEqual({ kind: 'pending', count: 1 });
  });

  it('queues nothing for a refused edit', () => {
    /*
      A published perk is writable by nobody, and the store already refuses it.
      An operation queued for a refusal would be sent, rejected, and stay in
      the queue forever — a refused edit must not become a permanent retry.
    */
    expect(useStore.getState().setTerritoryPerk('terr-published', 'Mine now')).toBe(false);
    expect(queued()).toEqual([]);
  });
});

describe('a campaign with no cloud identity', () => {
  beforeEach(() => { seed(''); });

  it('leaves the indicator saying so', () => {
    useStore.getState().setTerritoryPerk('terr-1', 'Local only');
    expect(useStore.getState().campaignSync).toEqual({ kind: 'local-only' });
  });

  it('changes locally and queues nothing', () => {
    useStore.getState().setTerritoryPerk('terr-1', 'Local only');

    expect(useStore.getState().campaign.territories[0].perk).toBe('Local only');
    /* Anonymous local use is supported. It simply does not sync — and an
       operation that can never be acknowledged would never leave the queue. */
    expect(queued()).toEqual([]);
  });

  it('does not queue a house rule either', () => {
    useStore.getState().setCampaignHouseRule('reinforcementsKeepExploration', true);
    expect(queued()).toEqual([]);
  });
});
