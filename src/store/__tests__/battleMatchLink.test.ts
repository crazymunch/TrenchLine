/**
 * The two records of one game, joined.
 *
 * RR-23. Play Mode writes a scored `BattleRecord` to the Chronicle;
 * `applyPostBattleResults` writes a typed `MatchRecord` to the campaign. The
 * Campaign Hub reads the second, the Chronicle the first, and they never agreed
 * about the result — because one was measured off Victory Points and the other
 * typed into a box that defaulted to Victory (RR-22).
 *
 * `BattleRecord.campaignMatchId` was built to join them. It is declared on the
 * type, carried in the cloud sync payload, accepted by the battles API schema
 * and taken as an option by `battleFromMatch` — and **no caller had ever passed
 * it**, so every battle in every Chronicle had the field absent. A link nothing
 * populates is indistinguishable from no link at all.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import { storage } from '@/services/storage';
import type { Warband } from '@/types/warband';
import type { BattleRecord } from '@/types/battle';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  /* An in-memory Chronicle: the real one is localStorage, which is not the
     thing under test here. */
  let battles: BattleRecord[] = [];
  return {
    ...actual,
    storage: {
      ...actual.storage,
      saveCampaign: vi.fn(),
      getBattles: () => battles,
      addBattle: (b: BattleRecord) => {
        battles = [...battles.filter((x) => x.id !== b.id), b];
        return battles;
      },
      __reset: (seeded: BattleRecord[]) => { battles = [...seeded]; },
    },
  };
});

const WB = 'wb-link';

const seed = (): Warband => ({
  id: WB,
  name: 'The Recorded',
  factionId: 'new-antioch',
  ducatLimit: 1000,
  treasuryDucats: 0,
  gloryPoints: 0,
  armoryStash: [],
  units: [],
  snapshots: [],
} as unknown as Warband);

const battle = (over: Partial<BattleRecord> = {}): BattleRecord => ({
  version: 1,
  id: 'battle-99',
  endedAt: '2026-09-19T21:00:00.000Z',
  scenarioId: 'sc-1',
  scenarioName: 'Bridgehead',
  turns: 4,
  sides: [],
  deeds: [],
  ...over,
});

const apply = (battleId?: string, mvpUnitName?: string) =>
  useStore.getState().applyPostBattleResults(
    'sc-1', 'Bridgehead', 'Victory', 0, 100,
    [], [], [], false, 'narrative',
    undefined, mvpUnitName, undefined, undefined, battleId,
  );

const chronicle = () => storage.getBattles();

beforeEach(() => {
  (storage as unknown as { __reset: (b: BattleRecord[]) => void }).__reset([battle()]);
  useStore.setState({ warbands: [seed()], activeWarbandId: WB });
});

describe('linking the battle to the match it produced', () => {
  it('stamps the Chronicle record with the new MatchRecord id', () => {
    expect(chronicle()[0].campaignMatchId).toBeUndefined();

    apply('battle-99');

    const linked = chronicle().find((b) => b.id === 'battle-99')!;
    expect(linked.campaignMatchId).toBeDefined();

    // And it is the id of the match this step actually created, not a new one.
    const match = useStore.getState().campaign.matches[0];
    expect(linked.campaignMatchId).toBe(match.id);
  });

  it('updates the one record rather than adding a second', () => {
    // `addBattle` replaces by id. A link that appended would double every
    // battle in the Chronicle.
    apply('battle-99');
    expect(chronicle().filter((b) => b.id === 'battle-99')).toHaveLength(1);
    expect(chronicle()).toHaveLength(1);
  });

  it('keeps everything else on the record', () => {
    /*
      The battle is written BEFORE the wizard opens and may already have been
      pushed to the cloud, so this is a read-modify-write of the stored record
      rather than a fresh one built from what the wizard happens to hold.
    */
    apply('battle-99');
    const linked = chronicle().find((b) => b.id === 'battle-99')!;
    expect(linked.scenarioName).toBe('Bridgehead');
    expect(linked.turns).toBe(4);
    expect(linked.endedAt).toBe('2026-09-19T21:00:00.000Z');
  });
});

describe('when there is nothing to link', () => {
  it('leaves the Chronicle alone with no battle id', () => {
    // A post-battle opened outside Play Mode has no battle behind it.
    apply(undefined);
    expect(chronicle()[0].campaignMatchId).toBeUndefined();
    expect(chronicle()).toHaveLength(1);
  });

  it('does not invent a record for a battle id the Chronicle does not hold', () => {
    /*
      Rule 2. A battle deleted between the match and the commit is a missing
      record, not a reason to write a stub that would then sync to the cloud as
      if it were a real game.
    */
    apply('battle-that-is-gone');
    expect(chronicle()).toHaveLength(1);
    expect(chronicle()[0].id).toBe('battle-99');
    expect(chronicle()[0].campaignMatchId).toBeUndefined();
  });
});

describe('the Match MVP writes no Deed onto the model', () => {
  /*
    RR-24. "Match MVP (Awards Heroic Deed)" prepended
    `Match MVP: <scenario> (<result>)` to the chosen model's Deeds. The game
    has Glorious Deeds — taken from the scenario's own list and worth 1 Glory
    each — and no MVP and no Heroic Deed. So a mechanic the game does not have
    wrote a Deed the game does not have onto the roster, beside the real ones.

    It matched by a two-way substring on the name, which is its own defect:
    any two models whose names contain one another both matched.
  */
  const unit = (id: string, customName: string) => ({
    id,
    customName,
    baseProfileId: 'p1',
    profileSnapshot: { name: 'Trench Pilgrim', category: 'Elite', elite: true },
    equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
    xp: 0, advancements: [], injuries: [], deeds: ['First Blood'], isDead: false,
    totalCost: 40, currentWounds: 0, maxWounds: 1, bloodMarkers: 0,
    status: 'Active', hasActedThisTurn: false,
  });

  const withUnits = () => {
    useStore.setState({
      warbands: [{ ...seed(), units: [unit('u1', 'Anselm'), unit('u2', 'Brother Anselm')] } as unknown as Warband],
      activeWarbandId: WB,
    });
  };

  const deedsOf = (id: string) => useStore.getState().warbands
    .find((w) => w.id === WB)!.units.find((u) => u.id === id)!.deeds;

  it('leaves the chosen model’s Deeds exactly as they were', () => {
    withUnits();
    apply(undefined, 'Anselm');
    expect(deedsOf('u1')).toEqual(['First Blood']);
  });

  it('no longer writes the same fabricated Deed onto two models', () => {
    /*
      The substring match ran both ways, so "Anselm" matched "Brother Anselm"
      and "Brother Anselm" matched "Anselm". Naming a model after another
      earned the other one an MVP it was never given.
    */
    withUnits();
    apply(undefined, 'Anselm');
    expect(deedsOf('u2')).toEqual(['First Blood']);
  });

  it('still records the MVP on the match, where a narrative note belongs', () => {
    withUnits();
    apply(undefined, 'Anselm');
    expect(useStore.getState().campaign.matches[0].mvpUnitName).toBe('Anselm');
  });
});
