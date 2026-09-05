/**
 * What the campaign indicator says, and when.
 *
 * The states are the point. The app kept campaigns in two places and told the
 * player nothing about either — `syncCampaignToCloud` swallowed every failure
 * and returned `void` — so "the campaign is backed up" and "the request never
 * left the building" looked identical from the outside. Each case here is one
 * of those outcomes, and each asserts the queue as well as the label: an
 * indicator that says the right thing while dropping the work is worse than no
 * indicator at all.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useStore } from '../useStore';
import { campaignOutbox } from '@/services/campaignSync';
import type { Campaign, TerritoryNode } from '@/types/campaign';

const fetchCampaignFromCloud = vi.fn();

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return {
    ...actual,
    storage: { ...actual.storage, saveCampaign: vi.fn(), fetchCampaignFromCloud: (id: string) => fetchCampaignFromCloud(id) },
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
  id: 'terr-1', name: 'Contested Ridge', type: "No Man's Land",
  perk: '', description: 'A ridge.', version: 4,
};

const seed = (cloudId?: string) => {
  useStore.setState((s) => ({
    campaignSync: { kind: 'local-only' },
    campaign: {
      ...s.campaign,
      id: 'camp-local', cloudId,
      name: 'Sync Crusade', version: 7,
      territories: [TERRITORY], chronicleLogs: [],
    } as Campaign,
  }));
};

/** A queued edit, made the way the app makes one. */
const anEdit = (perk = 'Ours by right') => {
  useStore.getState().setTerritoryPerk('terr-1', perk);
  return campaignOutbox.pending()[0];
};

const sync = () => useStore.getState().syncCampaignWithCloud();
const httpFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('window', {
    localStorage: memoryStorage(),
    crypto: { randomUUID: () => `uuid-${Math.random().toString(36).slice(2)}` },
  });
  vi.stubGlobal('fetch', httpFetch);
  fetchCampaignFromCloud.mockReset();
  httpFetch.mockReset();
  seed('camp-cloud');
});

afterEach(() => { vi.unstubAllGlobals(); });

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body }) as unknown as Response;

describe('the campaign sync indicator', () => {
  it('says local-only, and asks the server nothing, without a cloud identity', async () => {
    seed(undefined);
    await sync();

    expect(useStore.getState().campaignSync).toEqual({ kind: 'local-only' });
    expect(fetchCampaignFromCloud).not.toHaveBeenCalled();
    expect(httpFetch).not.toHaveBeenCalled();
  });

  it('does not push when the fetch fails', async () => {
    /*
      The rule the protocol turns on. A device that pushes without having read
      overwrites a newer cloud copy with an older one, and a fetch that cannot
      be made is not permission to write — it is the absence of the information
      the push needed.
    */
    anEdit();
    fetchCampaignFromCloud.mockResolvedValue({ ok: false, reason: 'offline', detail: 'no signal' });

    await sync();

    expect(httpFetch).not.toHaveBeenCalled();
    expect(useStore.getState().campaignSync).toEqual({
      kind: 'error', reason: 'offline', detail: 'no signal', pending: 1,
    });
    // Still queued: "the server was not reached" is not an answer.
    expect(campaignOutbox.pending()).toHaveLength(1);
  });

  it('says backed up once the server has taken everything', async () => {
    const op = anEdit();
    fetchCampaignFromCloud.mockResolvedValue({ ok: true, data: { id: 'camp-cloud', version: 7 } });
    httpFetch.mockResolvedValue(ok({ applied: [op.opId], skipped: [], conflicts: [] }));

    await sync();

    expect(useStore.getState().campaignSync).toMatchObject({ kind: 'synced' });
    expect(campaignOutbox.pending()).toEqual([]);
  });

  it('treats a skipped operation as the retry working', async () => {
    const op = anEdit();
    fetchCampaignFromCloud.mockResolvedValue({ ok: true, data: { id: 'camp-cloud', version: 7 } });
    httpFetch.mockResolvedValue(ok({ applied: [], skipped: [op.opId], conflicts: [] }));

    await sync();

    expect(useStore.getState().campaignSync).toMatchObject({ kind: 'synced' });
    expect(campaignOutbox.pending()).toEqual([]);
  });

  it('keeps the work queued when the server errors', async () => {
    anEdit();
    fetchCampaignFromCloud.mockResolvedValue({ ok: true, data: { id: 'camp-cloud', version: 7 } });
    httpFetch.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) } as unknown as Response);

    await sync();

    expect(useStore.getState().campaignSync).toEqual({
      kind: 'error', reason: 'server', detail: 'The server returned 500.', pending: 1,
    });
    expect(campaignOutbox.pending()).toHaveLength(1);
  });

  it('keeps saying offline when another edit is made', async () => {
    /* "2 to upload" in place of "Offline" says the upload is merely waiting,
       when the app already knows the server could not be reached. */
    anEdit();
    fetchCampaignFromCloud.mockResolvedValue({ ok: false, reason: 'offline', detail: 'no signal' });
    await sync();

    useStore.getState().setTerritoryPerk('terr-1', 'And another');

    expect(useStore.getState().campaignSync).toMatchObject({ kind: 'error', reason: 'offline' });
    expect(campaignOutbox.pending()).toHaveLength(2);
  });

  it('asks the player to sign in again on a rejected session', async () => {
    anEdit();
    fetchCampaignFromCloud.mockResolvedValue({ ok: true, data: { id: 'camp-cloud', version: 7 } });
    httpFetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) } as unknown as Response);

    await sync();

    expect(useStore.getState().campaignSync).toMatchObject({ kind: 'error', reason: 'unauthenticated' });
    expect(campaignOutbox.pending()).toHaveLength(1);
  });

  it('shows a conflict rather than merging it', async () => {
    const op = anEdit('Ours by right');
    fetchCampaignFromCloud.mockResolvedValue({ ok: true, data: { id: 'camp-cloud', version: 7 } });
    httpFetch.mockResolvedValue(ok({
      applied: [], skipped: [],
      conflicts: [{
        opId: op.opId,
        server: {
          version: 9, perk: 'Theirs by right', perkSource: 'campaign',
          controlledByWarbandId: null, controlledByPlayerName: null,
        },
      }],
    }));

    await sync();

    const state = useStore.getState();
    expect(state.campaignSync).toMatchObject({ kind: 'conflict', pending: 1 });
    /* Left queued. Clearing it would lose the edit the player has to decide
       about, and the local copy still shows what they typed. */
    expect(campaignOutbox.pending()).toHaveLength(1);
    expect(state.campaign.territories[0].perk).toBe('Ours by right');
  });
});

describe('taking the campaign’s copy', () => {
  const conflictOn = async (server: unknown) => {
    const op = anEdit('Ours by right');
    fetchCampaignFromCloud.mockResolvedValue({ ok: true, data: { id: 'camp-cloud', version: 7 } });
    httpFetch.mockResolvedValue(ok({ applied: [], skipped: [], conflicts: [{ opId: op.opId, server }] }));
    await sync();
    return op;
  };

  it('adopts the server’s value and clears the operation together', async () => {
    /*
      Both, or neither. Dropping the operation without adopting the value would
      leave the player looking at their own text with nothing queued to send
      it — a silent divergence, which is what this protocol exists to remove.
    */
    await conflictOn({
      version: 9, perk: 'Theirs by right', perkSource: 'campaign',
      controlledByWarbandId: 'wb-2', controlledByPlayerName: 'Someone Else',
    });

    useStore.getState().discardCampaignConflicts();

    const t = useStore.getState().campaign.territories[0];
    expect(t.perk).toBe('Theirs by right');
    expect(t.version).toBe(9);
    expect(t.controlledByPlayerName).toBe('Someone Else');
    expect(campaignOutbox.pending()).toEqual([]);
    expect(useStore.getState().campaignSync).toMatchObject({ kind: 'synced' });
  });

  it('resolves nothing it cannot read', async () => {
    /* A payload this version does not understand is not a value to adopt.
       Clearing the operation anyway would drop the edit for nothing. */
    await conflictOn({ somethingElse: true });

    useStore.getState().discardCampaignConflicts();

    expect(campaignOutbox.pending()).toHaveLength(1);
    expect(useStore.getState().campaignSync).toMatchObject({ kind: 'conflict' });
    expect(useStore.getState().campaign.territories[0].perk).toBe('Ours by right');
  });

  it('leaves a conflict on screen when a later edit is made', async () => {
    await conflictOn({
      version: 9, perk: 'Theirs by right', perkSource: 'campaign',
      controlledByWarbandId: null, controlledByPlayerName: null,
    });

    useStore.getState().setTerritoryPerk('terr-1', 'Mine again');

    /* A count would erase the only place the app says something needs
       deciding, and the conflicted operation is still queued and still
       counted in the next push. */
    expect(useStore.getState().campaignSync).toMatchObject({ kind: 'conflict' });
    expect(campaignOutbox.pending()).toHaveLength(2);
  });
});
