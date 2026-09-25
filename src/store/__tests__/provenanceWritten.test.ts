/**
 * Where the app says a record came from, when the app is the one that made it.
 *
 * FD-12 item 2 gave every Skill, injury, scar and reward a `source`, and review
 * round 1 finding C found that **nothing in the app ever wrote one**: the
 * post-battle sequence set a Skill's `roll` and no source, so a Skill the
 * Promotions step had just rolled read back as "Imported · rolled 9" — the one
 * entry on the roster the app knows the most about, reported as the one it knows
 * the least about. The Trauma Step wrote no source at all, and an Exploration
 * find never reached the Warband's record of what it holds.
 *
 * This drives the real store action, because the bug was that the writers did
 * not write it — a projection test cannot see that.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import { holdingsOf, provenanceLabel } from '@/rules/provenance';
import type { Warband, ActiveUnit } from '@/types/warband';
import type { CasualtyRecord } from '@/types/campaign';
import type { SkillLearned } from '@/rules/advancement';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return {
    ...actual,
    storage: { ...actual.storage, saveCampaign: vi.fn(), getBattles: () => [], addBattle: () => [] },
  };
});

const WB = 'wb-prov';

const unit = (over: Partial<ActiveUnit> = {}): ActiveUnit => ({
  id: 'u1',
  customName: 'Sister Mercy',
  baseProfileId: 'p1',
  profileSnapshot: { name: 'Trench Pilgrim', category: 'Elite', elite: true },
  equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
  xp: 3,
  advancements: [],
  injuries: [], deeds: [], isDead: false,
  totalCost: 40, currentWounds: 0, maxWounds: 1, bloodMarkers: 0,
  status: 'Active', hasActedThisTurn: false,
  ...over,
} as unknown as ActiveUnit);

const seed = (): Warband => ({
  id: WB, name: 'The Faithful', factionId: 'trench-pilgrims',
  ducatLimit: 1000, treasuryDucats: 0, gloryPoints: 0,
  armoryStash: [], units: [unit()], snapshots: [],
} as unknown as Warband);

const apply = (
  casualties: CasualtyRecord[] = [],
  skills: SkillLearned[] = [],
  exploration?: { discovered?: string; text?: string },
) => useStore.getState().applyPostBattleResults(
  'sc-1', 'Bridgehead', 'Victory', 0, 0,
  casualties, skills, { unitIds: [], misses: 0 }, [], false, 'narrative',
  /* narrativeReport, mvpUnitName, opponentWarbandName, notableMoments,
     battleId — none of which this suite is about. */
  undefined, undefined, undefined, undefined, undefined,
  exploration,
);

const after = () => useStore.getState().warbands.find((w) => w.id === WB)!;
const unitAfter = () => after().units.find((u) => u.id === 'u1')!;

beforeEach(() => {
  useStore.setState({ warbands: [seed()], activeWarbandId: WB });
});

describe('the Advancement Roll writes its own provenance', () => {
  it('says the step, the game and the 2D6 total', () => {
    apply([], [{
      unitId: 'u1', name: 'Bloodlust', table: 'melee', roll: 7,
      substitution: 'none', description: 'The model may re-roll…',
    }]);

    const skill = unitAfter().skills![0];
    expect(skill.source).toEqual({ kind: 'advancement', game: 1, roll: '7' });
    expect(provenanceLabel(skill)).toBe('Advancement Roll · game 1 · rolled 7');
    /* And emphatically not the answer it used to give. */
    expect(provenanceLabel(skill)).not.toMatch(/Imported/);
  });
});

describe('the Trauma Step writes its own provenance', () => {
  const hurt = (over: Partial<CasualtyRecord> = {}): CasualtyRecord => ({
    unitId: 'u1',
    unitName: 'Sister Mercy',
    outcome: 'Leg Wound',
    isDead: false,
    records: { injury: true, scar: { name: 'Leg Wound', roll: '31' }, roll: '31' },
    ...over,
  });

  it('marks the scar with the step, the game and the row’s roll', () => {
    apply([hurt()]);
    const scar = unitAfter().scars![0];
    expect(scar.source).toEqual({ kind: 'trauma', game: 1, roll: '31' });
    expect(provenanceLabel(scar)).toBe('Trauma Step · game 1 · rolled 31');
  });

  it('marks the injury too, in `injuryRecords` beside `injuries`', () => {
    apply([hurt()]);
    const u = unitAfter();
    /* `injuries` stays the authority on WHICH injuries the model carries — it
       is what every other reader and every roster file uses. */
    expect(u.injuries).toEqual(['Leg Wound']);
    expect(u.injuryRecords).toEqual([
      { name: 'Leg Wound', source: { kind: 'trauma', game: 1, roll: '31' } },
    ]);
  });

  it('records no roll where the row did not carry one, rather than inventing it', () => {
    /* A match recorded before the wizard carried the row, or a row the build
       could not identify. The kind and the game are still true. */
    apply([hurt({ records: { injury: true, scar: { name: 'Leg Wound' } } })]);
    expect(unitAfter().scars![0].source).toEqual({ kind: 'trauma', game: 1 });
    expect(provenanceLabel(unitAfter().scars![0])).toBe('Trauma Step · game 1');
  });
});

describe('an Exploration find reaches the Warband’s record of what it holds', () => {
  it('lands in `rewards` with the Location’s own text and the game', () => {
    apply([], [], {
      discovered: 'Ransacked Alchemist Workshop',
      text: 'You gather some of the life-giving liquids…',
    });

    const reward = after().rewards!.find((r) => r.name === 'Ransacked Alchemist Workshop')!;
    expect(reward.group).toBe('Exploration Rewards');
    expect(reward.text).toBe('You gather some of the life-giving liquids…');
    expect(reward.source).toEqual({
      kind: 'exploration', game: 1, location: 'Ransacked Alchemist Workshop',
    });
  });

  it('and shows up in the sheet’s review of what the Warband holds', () => {
    apply([], [], { discovered: 'Pot of Manna', text: 'Add 10 Ducats…' });
    const held = holdingsOf(after()).find((h) => h.name === 'Pot of Manna')!;
    expect(held.kind).toBe('reward');
    expect(provenanceLabel({ source: held.source }))
      .toBe('Exploration · game 1 · Pot of Manna');
  });

  it('a Location already discovered is not recorded twice', () => {
    /*
      "You can discover a Location only once during the campaign; if you
      discover it again, treat the roll as a Pillaged result instead." A second
      record of it would say the Warband found it twice.
    */
    apply([], [], { discovered: 'Pot of Manna', text: 'Add 10 Ducats…' });
    apply([], [], { discovered: 'Pot of Manna', text: 'Add 10 Ducats…' });
    expect(after().rewards!.filter((r) => r.name === 'Pot of Manna')).toHaveLength(1);
  });

  it('a step that found nothing records nothing', () => {
    apply();
    expect(after().rewards ?? []).toEqual([]);
  });
});

describe('finding F: a Skill by any route uses an Advancement Roll', () => {
  it('the wizard’s Skill increments the count', () => {
    expect(unitAfter().advancementRolls ?? 0).toBe(0);
    apply([], [{
      unitId: 'u1', name: 'Bloodlust', table: 'melee', roll: 7,
      substitution: 'none', description: 'The model may re-roll…',
    }]);
    expect(unitAfter().advancementRolls).toBe(1);
  });

  it('and so does one typed in by hand', () => {
    useStore.getState().addUnitSkill(WB, 'u1', {
      name: 'Point Blank', category: 'ranged',
      source: { kind: 'manual', game: 2 },
    });
    expect(unitAfter().advancementRolls).toBe(1);
    expect(provenanceLabel(unitAfter().skills![0])).toBe('Recorded by hand · game 2');
  });

  it('removing a hand-entered Skill gives the roll back', () => {
    /* Otherwise a mis-tap and an undo costs the model an Advancement Roll for
       good: a count that only ever climbs turns a correction into a penalty. */
    useStore.getState().addUnitSkill(WB, 'u1', { name: 'Point Blank', category: 'ranged' });
    expect(unitAfter().advancementRolls).toBe(1);
    useStore.getState().removeUnitSkill(WB, 'u1', 'Point Blank');
    expect(unitAfter().advancementRolls).toBe(0);
  });

  it('never below zero, on a roster whose count was already behind', () => {
    useStore.getState().removeUnitSkill(WB, 'u1', 'nothing-by-that-name');
    expect(unitAfter().advancementRolls).toBe(0);
  });
});
