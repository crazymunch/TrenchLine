/**
 * Who moves the campaign on to its next game.
 *
 * FD-09a / RR-17. The number had **two** writers — `applyPostBattleResults`
 * and `logCampaignMatch`, each adding one — and it is campaign-wide: every
 * Warband's Threshold Value and Exploration Dice band is read from it through
 * `campaignGameOf`, and `docs/CAMPAIGN-SYNC.md`'s authority table gives it to
 * the organiser.
 *
 * So three things went wrong at once. A member finishing their own post-battle
 * moved everybody's campaign on. Two members each committing game 1 left the
 * counter reading 3. And neither writer queued a `campaign.settings` op, so
 * the value never reached the cloud and the next adoption put the server's
 * back — which meant the one number the app could not agree on was the one
 * everything else was measured against.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import { useStore } from '../useStore';
import { campaignOutbox, type CampaignOp } from '@/services/campaignSync';
import type { Warband } from '@/types/warband';
import type { Campaign } from '@/types/campaign';

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

const CAMP = 'camp-1';

const member = (n: number) => ({
  id: `m${n}`, playerName: `Player ${n}`, warbandId: `wb${n}`,
  warbandName: `Warband ${n}`, factionId: 'new-antioch',
  wins: 0, losses: 0, draws: 0, glory: 0, territories: [],
});

const campaign = (members: number, over: Partial<Campaign> = {}): Campaign => ({
  id: CAMP, cloudId: 'cloud-1',
  name: 'The Crusade', inviteCode: 'TRENCH-AAA111', adminName: 'Commander',
  status: 'active', currentTurn: 1, maxWarbandDucats: 700, gloryVictoryThreshold: 25,
  members: Array.from({ length: members }, (_, i) => member(i + 1)),
  territories: [], matches: [], chronicleLogs: [],
  version: 4,
  ...over,
} as unknown as Campaign);

const warband = (n: number, over: Partial<Warband> = {}): Warband => ({
  id: `wb${n}`, name: `Warband ${n}`, factionId: 'new-antioch',
  campaignId: CAMP, ducatLimit: 700, treasuryDucats: 0, gloryPoints: 0,
  units: [], armoryStash: [], snapshots: [],
  ...over,
} as unknown as Warband);

const state = () => useStore.getState();
const turn = () => state().campaign.currentTurn;
/* The outbox is the module's, not a field on the campaign. */
const settingsOps = () => campaignOutbox.pending()
  .filter((op: CampaignOp) => op.kind === 'campaign.settings');

const commitPostBattle = () =>
  state().applyPostBattleResults(
    'sc-1', 'Bridgehead', 'Victory', 1, 50,
    [], [], { unitIds: [], misses: 0 }, [], false, 'narrative',
  );

beforeEach(() => {
  vi.stubGlobal('window', {
    localStorage: memoryStorage(),
    crypto: { randomUUID: () => `uuid-${Math.random().toString(36).slice(2)}` },
  });
  useStore.setState({
    campaignSync: { kind: 'local-only' } as never,
    campaign: campaign(2),
    warbands: [warband(1), warband(2)],
    activeWarbandId: 'wb1',
  });
});

afterEach(() => { vi.unstubAllGlobals(); });

describe('a member’s own post-battle', () => {
  it('leaves the campaign on the game it was on', () => {
    commitPostBattle();
    expect(turn()).toBe(1);
  });

  it('queues no settings op — the turn is not a member’s to send', () => {
    commitPostBattle();
    expect(settingsOps()).toEqual([]);
  });

  it('does not move it twice when two members each commit game 1', () => {
    /*
      The shape of the original defect: each commit added one, so a two-player
      group finished their first game on "turn 3" and every Threshold and
      Exploration band jumped two games with them.
    */
    commitPostBattle();
    useStore.setState({ activeWarbandId: 'wb2' });
    commitPostBattle();
    expect(turn()).toBe(1);
  });

  it('records which game it was, so the campaign can tell who has played', () => {
    commitPostBattle();
    const snap = state().warbands.find((w) => w.id === 'wb1')!.snapshots!.at(-1)!;
    expect(snap.type).toBe('post_battle');
    expect(snap.campaignGame).toBe(1);
  });
});

describe('the organiser starting the next game', () => {
  it('moves it on by exactly one', () => {
    expect(state().advanceCampaignGame()).toBe(true);
    expect(turn()).toBe(2);
  });

  it('queues exactly one settings op, carrying the new number', () => {
    state().advanceCampaignGame();
    expect(settingsOps()).toHaveLength(1);
    expect(settingsOps()[0].data).toEqual({ currentTurn: 2 });
    // Against the version this was decided on, which is what the server
    // resolves conflicts by.
    expect(settingsOps()[0].baseVersion).toBe(4);
  });

  it('never sends `currentGame`, which the database has no column for', () => {
    state().advanceCampaignGame();
    expect(settingsOps()[0].data).not.toHaveProperty('currentGame');
  });

  it('says so in the chronicle, because it changes every Warband’s Threshold', () => {
    state().advanceCampaignGame();
    expect(state().campaign.chronicleLogs[0].text).toMatch(/Game 2 begins/);
  });

  it('queues nothing for a campaign the server has never heard of', () => {
    /*
      The documented shape of `queueOp`: a campaign with no `cloudId` has no
      id the server would recognise, so queueing for it would fill the outbox
      with operations that can never be acknowledged. The game still moves
      locally, which is all a local-only campaign needs.
    */
    useStore.setState({ campaign: { ...campaign(2), cloudId: undefined } as never });
    expect(state().advanceCampaignGame()).toBe(true);
    expect(turn()).toBe(2);
    expect(settingsOps()).toEqual([]);
  });

  it('refuses when there is no campaign to write to', () => {
    useStore.setState({ campaign: { ...campaign(1), id: '' } as never });
    expect(state().advanceCampaignGame()).toBe(false);
  });
});

describe('whether everyone has played this game', () => {
  const played = (n: number, game: number) => warband(n, {
    snapshots: [{
      id: `s${n}`, timestamp: '2026-01-01T00:00:00Z', label: 'Post-Battle',
      type: 'post_battle', campaignGame: game, ducatCost: 0,
      treasuryDucats: 0, gloryPoints: 0, unitCount: 0, units: [],
    }],
  } as unknown as Partial<Warband>);

  it('is false while one member has not', () => {
    useStore.setState({ warbands: [played(1, 1), warband(2)] });
    expect(state().everyMemberPlayedThisGame()).toBe(false);
  });

  it('is true once both have, for THIS game', () => {
    useStore.setState({ warbands: [played(1, 1), played(2, 1)] });
    expect(state().everyMemberPlayedThisGame()).toBe(true);
  });

  it('does not count a snapshot from an earlier game', () => {
    useStore.setState({
      campaign: campaign(2, { currentTurn: 3 }),
      warbands: [played(1, 3), played(2, 2)],
    });
    expect(state().everyMemberPlayedThisGame()).toBe(false);
  });

  it('does not count a snapshot written before this field existed', () => {
    /*
      Read strictly on purpose: an old snapshot is not evidence for the
      current game, so an existing campaign waits for a fresh post-battle
      rather than advancing the moment this ships.
    */
    const legacy = warband(1, {
      snapshots: [{
        id: 's-old', timestamp: '2026-01-01T00:00:00Z', label: 'Post-Battle',
        type: 'post_battle', ducatCost: 0, treasuryDucats: 0,
        gloryPoints: 0, unitCount: 0, units: [],
      }],
    } as unknown as Partial<Warband>);
    useStore.setState({ warbands: [legacy, played(2, 1)] });
    expect(state().everyMemberPlayedThisGame()).toBe(false);
  });

  it('is false for a member whose warband this device does not hold', () => {
    useStore.setState({ warbands: [played(1, 1)] });
    expect(state().everyMemberPlayedThisGame()).toBe(false);
  });
});

describe('a campaign of one', () => {
  beforeEach(() => {
    useStore.setState({
      campaign: campaign(1),
      warbands: [warband(1)],
      activeWarbandId: 'wb1',
    });
  });

  it('moves itself on when its only member commits a post-battle', async () => {
    commitPostBattle();
    // The advance is queued as a microtask, after the commit has landed.
    await Promise.resolve();
    expect(turn()).toBe(2);
    expect(settingsOps()).toHaveLength(1);
  });
});
