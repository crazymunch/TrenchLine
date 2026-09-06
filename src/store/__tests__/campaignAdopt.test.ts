/**
 * Adopting a campaign the server holds.
 *
 * SYNC-5. Campaign sync was push-only, so a player who spent an invite code
 * (SYNC-4) got a real membership and a device that never showed them the
 * campaign.
 *
 * Adopting is DESTRUCTIVE by construction — the store holds one campaign — so
 * what these prove is mostly about the failure and replacement edges rather
 * than the happy path:
 *
 *   - a failed pull changes nothing at all, because a half-adopted campaign
 *     (the id swapped, the map still the old one) is the state hardest to
 *     notice and hardest to undo;
 *   - the old campaign's queued operations are dropped, because they name a
 *     campaign this device no longer holds and pushing them later would apply
 *     one campaign's edit to another.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStore } from '../useStore';
import { campaignOutbox } from '@/services/campaignSync';
import type { Campaign } from '@/types/campaign';

const pullCampaignFromCloud = vi.fn();
const saveCampaign = vi.fn();

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return {
    ...actual,
    storage: {
      ...actual.storage,
      saveCampaign: (c: Campaign) => saveCampaign(c),
      pullCampaignFromCloud: (id: string) => pullCampaignFromCloud(id),
    },
  };
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

const OLD = 'aaaaaaaa-1111-4111-8111-111111111111';
const NEW = 'bbbbbbbb-2222-4222-8222-222222222222';

/** The campaign this device is holding before the pull. */
const seed = (cloudId?: string) => {
  useStore.setState((s) => ({
    campaignSync: { kind: 'local-only' },
    campaign: {
      ...s.campaign,
      id: 'camp-local', cloudId,
      name: 'The Campaign Already Here',
      territories: [], members: [], matches: [], chronicleLogs: [],
    } as Campaign,
  }));
};

/** What the server's copy maps to. */
const arriving = (): Campaign => ({
  id: NEW, cloudId: NEW,
  name: 'The Long Retreat',
  inviteCode: 'TRENCH-ABCDEFGHJKMNPQR',
  adminName: 'Aurelia of the Wall',
  status: 'active',
  framework: 'carcass-front',
  currentTurn: 4,
  version: 7,
  maxWarbandDucats: 900,
  gloryVictoryThreshold: 30,
  members: [], matches: [], territories: [], chronicleLogs: [],
});

const adopt = (id: string) => useStore.getState().adoptCampaignFromCloud(id);

const queueAgainst = (campaignId: string, opId: string) => {
  campaignOutbox.add({
    kind: 'territory.perk', opId, campaignId,
    entityId: 'cf-the-bone-mill', baseVersion: 1, data: { perk: 'Ours' },
  });
};

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: memoryStorage() });
  pullCampaignFromCloud.mockReset();
  saveCampaign.mockReset();
  campaignOutbox.clear(campaignOutbox.forCampaign(OLD).map((o) => o.opId));
  campaignOutbox.clear(campaignOutbox.forCampaign(NEW).map((o) => o.opId));
  seed(OLD);
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('adopting a campaign from the cloud', () => {
  it('replaces the campaign on this device and saves it', async () => {
    pullCampaignFromCloud.mockResolvedValue({ ok: true, data: arriving() });

    expect(await adopt(NEW)).toBe(true);

    const c = useStore.getState().campaign;
    expect(c.cloudId).toBe(NEW);
    expect(c.name).toBe('The Long Retreat');
    expect(c.version).toBe(7);
    expect(saveCampaign).toHaveBeenCalledTimes(1);
    expect(saveCampaign.mock.calls[0][0].cloudId).toBe(NEW);
    expect(useStore.getState().campaignSync.kind).toBe('synced');
  });

  it('changes nothing when the pull fails', async () => {
    pullCampaignFromCloud.mockResolvedValue({
      ok: false, reason: 'server', detail: 'HTTP 500',
    });

    expect(await adopt(NEW)).toBe(false);

    const c = useStore.getState().campaign;
    expect(c.cloudId, 'the id was swapped before the campaign arrived').toBe(OLD);
    expect(c.name).toBe('The Campaign Already Here');
    expect(saveCampaign, 'a failed pull wrote to storage').not.toHaveBeenCalled();
    expect(useStore.getState().campaignSync.kind).toBe('error');
  });

  it('says so rather than throwing when the caller is not a member', async () => {
    // The server answers 404 for a campaign the caller may not see, which
    // `request` reports as a `server` failure. It must reach the UI as one.
    pullCampaignFromCloud.mockResolvedValue({
      ok: false, reason: 'server', detail: 'Not found.',
    });
    expect(await adopt(NEW)).toBe(false);
    const sync = useStore.getState().campaignSync;
    expect(sync.kind).toBe('error');
    expect(sync.kind === 'error' && sync.detail).toBe('Not found.');
  });

  describe('the outbox', () => {
    it('drops operations queued against the campaign being replaced', async () => {
      queueAgainst(OLD, 'op-old-1');
      queueAgainst(OLD, 'op-old-2');
      pullCampaignFromCloud.mockResolvedValue({ ok: true, data: arriving() });

      await adopt(NEW);

      /* They name a campaign this device no longer holds. Pushing them later
         would apply one campaign's edit to whichever was loaded. */
      expect(campaignOutbox.forCampaign(OLD)).toHaveLength(0);
    });

    it('keeps them when the pull fails', async () => {
      queueAgainst(OLD, 'op-old-3');
      pullCampaignFromCloud.mockResolvedValue({ ok: false, reason: 'offline', detail: 'no signal' });

      await adopt(NEW);

      // Nothing was replaced, so nothing queued against it is stale.
      expect(campaignOutbox.forCampaign(OLD)).toHaveLength(1);
    });

    it('keeps them when re-adopting the SAME campaign', async () => {
      // A refresh of the campaign already held is not a replacement, and its
      // unpushed edits are still about the campaign that is still here.
      seed(NEW);
      queueAgainst(NEW, 'op-same-1');
      pullCampaignFromCloud.mockResolvedValue({ ok: true, data: arriving() });

      await adopt(NEW);

      expect(campaignOutbox.forCampaign(NEW)).toHaveLength(1);
    });

    it('leaves a purely local campaign’s queue alone, because it has none', async () => {
      seed(undefined);
      pullCampaignFromCloud.mockResolvedValue({ ok: true, data: arriving() });
      // No cloudId means nothing was ever queued for it — the outbox is keyed
      // by cloud id — so there is nothing to clear and no key to guess at.
      expect(await adopt(NEW)).toBe(true);
      expect(useStore.getState().campaign.cloudId).toBe(NEW);
    });
  });
});
