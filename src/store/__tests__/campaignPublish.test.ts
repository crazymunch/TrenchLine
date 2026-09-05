/**
 * Giving a campaign a cloud identity.
 *
 * SYNC-2. `createCampaign` mints `camp-<timestamp>` locally and always has —
 * not an id the API would recognise — so every campaign in the app was local,
 * the outbox had nowhere to push, and the indicator said "On this device"
 * forever.
 *
 * The id is minted by the CLIENT, and everything worth testing here follows
 * from one consequence of that: the id has to be saved BEFORE the request goes
 * out. Publishing sends the campaign and its whole map in one POST, and if the
 * response is lost the next attempt must name the same campaign or it makes a
 * second one. Minting after a successful response makes every failure
 * ambiguous — the client cannot ask "did that land?", only try again and hope.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStore } from '../useStore';
import type { Campaign, TerritoryNode } from '@/types/campaign';

const publishCampaignToCloud = vi.fn();
const saveCampaign = vi.fn();
/* A campaign that already has an identity goes down the SYNC path, which
   fetches first. Answered so those cases test the branch rather than crash. */
const fetchCampaignFromCloud = vi.fn();

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return {
    ...actual,
    storage: {
      ...actual.storage,
      saveCampaign: (c: Campaign) => saveCampaign(c),
      publishCampaignToCloud: (c: Campaign, id: string) => publishCampaignToCloud(c, id),
      fetchCampaignFromCloud: (id: string) => fetchCampaignFromCloud(id),
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

const TERRITORY: TerritoryNode = {
  id: 'cf-the-bone-mill', name: 'The Bone Mill', type: 'Special Zone',
  perk: 'Outpost Bonus: +1 Exploration die.', perkSource: 'published',
  description: 'A mill that grinds what the guns leave.',
};

const seed = (cloudId?: string) => {
  useStore.setState((s) => ({
    campaignSync: { kind: 'local-only' },
    campaign: {
      ...s.campaign,
      id: 'camp-local', cloudId,
      name: 'The Long Retreat',
      framework: 'carcass-front',
      inviteCode: 'TRENCH-LOCALPLACEHOLDER',
      territories: [TERRITORY],
      chronicleLogs: [],
    } as Campaign,
  }));
};

const publish = () => useStore.getState().publishCampaignToCloud();
const MINTED = '11111111-2222-4333-8444-555555555555';

beforeEach(() => {
  vi.stubGlobal('window', { localStorage: memoryStorage() });
  vi.stubGlobal('crypto', { randomUUID: () => MINTED });
  publishCampaignToCloud.mockReset();
  saveCampaign.mockReset();
  fetchCampaignFromCloud.mockReset();
  fetchCampaignFromCloud.mockResolvedValue({ ok: true, data: { id: 'already-a-cloud-id', version: 1 } });
  seed(undefined);
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('publishing a campaign', () => {
  it('mints an id and sends the campaign under it', async () => {
    publishCampaignToCloud.mockResolvedValue({
      ok: true, data: { id: MINTED, inviteCode: 'TRENCH-ABCDEFGHJKMNPQR', alreadyPublished: false },
    });

    await publish();

    expect(publishCampaignToCloud).toHaveBeenCalledTimes(1);
    expect(publishCampaignToCloud.mock.calls[0][1]).toBe(MINTED);
    expect(useStore.getState().campaign.cloudId).toBe(MINTED);
    expect(useStore.getState().campaignSync.kind).toBe('synced');
  });

  it('saves the id BEFORE the request, not after', async () => {
    /*
      The property the whole design rests on. Asserted by looking at what was
      already persisted at the moment the request was made, because "saved
      afterwards" and "saved beforehand" are indistinguishable once a
      successful call has returned.
    */
    let cloudIdAtRequestTime: string | undefined = 'not called';
    publishCampaignToCloud.mockImplementation(async () => {
      cloudIdAtRequestTime = useStore.getState().campaign.cloudId;
      return { ok: true, data: { id: MINTED, inviteCode: 'TRENCH-ABCDEFGHJKMNPQR', alreadyPublished: false } };
    });

    await publish();

    expect(cloudIdAtRequestTime).toBe(MINTED);
    // And written through to storage, not only to the in-memory store: a tab
    // that closes mid-request must still know what it claimed.
    const saved = saveCampaign.mock.calls.map((c) => (c[0] as Campaign).cloudId);
    expect(saved[0]).toBe(MINTED);
  });

  it('keeps the id when the request fails, so the retry names the same campaign', async () => {
    /*
      Dropping it here is what would let a retry mint a second campaign — the
      one failure nothing can repair afterwards.
    */
    publishCampaignToCloud.mockResolvedValue({ ok: false, reason: 'offline', detail: 'no signal' });

    await publish();

    expect(useStore.getState().campaign.cloudId).toBe(MINTED);
    expect(useStore.getState().campaignSync).toEqual({
      kind: 'error', reason: 'offline', detail: 'no signal', pending: 0,
    });
  });

  it('retries under the same id rather than minting a new one', async () => {
    publishCampaignToCloud.mockResolvedValueOnce({ ok: false, reason: 'server', detail: 'HTTP 500' });
    await publish();

    publishCampaignToCloud.mockResolvedValueOnce({
      ok: true, data: { id: MINTED, inviteCode: 'TRENCH-ABCDEFGHJKMNPQR', alreadyPublished: true },
    });
    // A campaign that now HAS a cloudId goes down the sync path, which is the
    // same endpoint and the same id — never a second publish.
    await publish();

    expect(useStore.getState().campaign.cloudId).toBe(MINTED);
    expect(publishCampaignToCloud).toHaveBeenCalledTimes(1);
  });

  it('takes the invite code from the server', async () => {
    // Server-owned, per the authority table in docs/CAMPAIGN-SYNC.md: a client
    // that could write its own invite code could hand out entry to a campaign.
    publishCampaignToCloud.mockResolvedValue({
      ok: true, data: { id: MINTED, inviteCode: 'TRENCH-REALCODEFROMSRV', alreadyPublished: false },
    });

    await publish();

    expect(useStore.getState().campaign.inviteCode).toBe('TRENCH-REALCODEFROMSRV');
  });

  it('says what it is doing while it does it', async () => {
    // Its own state rather than `syncing`: publishing sends the whole map, and
    // a player who just pressed a button should see that it started.
    let duringRequest = '';
    publishCampaignToCloud.mockImplementation(async () => {
      duringRequest = useStore.getState().campaignSync.kind;
      return { ok: true, data: { id: MINTED, inviteCode: 'TRENCH-ABCDEFGHJKMNPQR', alreadyPublished: false } };
    });

    await publish();
    expect(duringRequest).toBe('publishing');
  });

  it('does not publish a campaign that already has an identity', async () => {
    seed('already-a-cloud-id');
    await publish();
    expect(publishCampaignToCloud).not.toHaveBeenCalled();
  });

  it('fails loudly rather than mint a weak id', async () => {
    /*
      `crypto.randomUUID` needs a secure context. Falling back to `Math.random`
      would publish under something guessable, and a guessable client-supplied
      primary key is one another client can aim at — the case the route answers
      with a 409.
    */
    vi.stubGlobal('crypto', {});
    await publish();

    expect(publishCampaignToCloud).not.toHaveBeenCalled();
    expect(useStore.getState().campaign.cloudId).toBeUndefined();
    expect(useStore.getState().campaignSync.kind).toBe('error');
  });
});
