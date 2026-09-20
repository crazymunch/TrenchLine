/**
 * The post-battle links itself to the SIDE that ran it.
 *
 * FD-09b / RR-27. `BattleRecord.campaignMatchId` was one id for the whole
 * battle, so a second side's post-battle had nowhere to be recorded — and
 * nothing could tell whether it had been run at all. The Hub's unresolved
 * list and Play Mode's "another side fought this game" both read that link,
 * so if the commit does not write it the offer never stops appearing and the
 * same post-battle is committed twice.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import { storage } from '@/services/storage';
import { BATTLE_VERSION, unresolvedSides, type BattleRecord } from '@/types/battle';
import type { Warband } from '@/types/warband';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  let battles: BattleRecord[] = [];
  return {
    ...actual,
    storage: {
      ...actual.storage,
      saveCampaign: vi.fn(),
      getBattles: () => battles,
      addBattle: (b: BattleRecord) => { battles = [...battles.filter((x) => x.id !== b.id), b]; },
      __seed: (b: BattleRecord[]) => { battles = b; },
    },
  };
});

const seedBattles = (b: BattleRecord[]) =>
  (storage as unknown as { __seed: (x: BattleRecord[]) => void }).__seed(b);

const warband = (id: string): Warband => ({
  id, name: `Warband ${id}`, factionId: 'new-antioch', campaignId: 'camp-1',
  ducatLimit: 700, treasuryDucats: 0, gloryPoints: 0,
  units: [], armoryStash: [], snapshots: [],
} as unknown as Warband);

const BATTLE: BattleRecord = {
  version: BATTLE_VERSION, id: 'b1', endedAt: '2026-01-01T00:00:00Z',
  scenarioId: 'sc-1', scenarioName: 'Bridgehead', turns: 4,
  sides: [
    { id: 'wb1', name: 'Warband wb1', factionId: 'new-antioch', wasPlaceholder: false, vp: 3, turnScores: {} },
    { id: 'wb2', name: 'Warband wb2', factionId: 'new-antioch', wasPlaceholder: false, vp: 1, turnScores: {} },
  ],
  deeds: [],
};

const commitFor = (activeId: string) => {
  useStore.setState({ activeWarbandId: activeId });
  useStore.getState().applyPostBattleResults(
    'sc-1', 'Bridgehead', 'Victory', 0, 50,
    [], [], { unitIds: [], misses: 0 }, [], false, 'narrative',
    undefined, undefined, undefined, undefined, 'b1',
  );
};

const stored = () => storage.getBattles().find((b) => b.id === 'b1')!;

beforeEach(() => {
  seedBattles([structuredClone(BATTLE)]);
  useStore.setState({
    warbands: [warband('wb1'), warband('wb2')],
    activeWarbandId: 'wb1',
    campaign: { id: 'camp-1', currentTurn: 1, members: [], chronicleLogs: [], matches: [], territories: [] } as never,
  });
});

describe('committing one side’s post-battle', () => {
  it('writes the match id onto that side', () => {
    commitFor('wb1');
    const sides = stored().sides;
    expect(sides[0].campaignMatchId).toBeTruthy();
    expect(sides[1].campaignMatchId).toBeUndefined();
  });

  it('leaves the other side owing one', () => {
    commitFor('wb1');
    expect(unresolvedSides(stored()).map((s) => s.id)).toEqual(['wb2']);
  });

  it('resolves the battle once both sides have committed', () => {
    commitFor('wb1');
    commitFor('wb2');
    const sides = stored().sides;
    expect(sides[0].campaignMatchId).toBeTruthy();
    expect(sides[1].campaignMatchId).toBeTruthy();
    // Two post-battles, two records — not one overwriting the other.
    expect(sides[0].campaignMatchId).not.toBe(sides[1].campaignMatchId);
    expect(unresolvedSides(stored())).toEqual([]);
  });

  it('still fills the legacy whole-battle field, for readers that have it', () => {
    commitFor('wb1');
    expect(stored().campaignMatchId).toBe(stored().sides[0].campaignMatchId);
  });

  it('does not let the second commit overwrite the legacy field', () => {
    /*
      It reads as the PRIMARY side's. Moving it would make an old reader
      attribute the first side's post-battle to the second.
    */
    commitFor('wb1');
    const first = stored().campaignMatchId;
    commitFor('wb2');
    expect(stored().campaignMatchId).toBe(first);
  });
});
