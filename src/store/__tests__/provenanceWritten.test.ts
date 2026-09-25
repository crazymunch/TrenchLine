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
    /*
      No game, because this seed is in no campaign (review round 2 item 2).
      `campaignGameOf` answers 1 for such a warband — the right Threshold to
      field to, and an invented fact to write down. A standalone warband's fifth
      battle is not "game 1", so the field is absent and the label says nothing
      about it.
    */
    expect(skill.source).toEqual({ kind: 'advancement', roll: '7' });
    expect(provenanceLabel(skill)).toBe('Advancement Roll · rolled 7');
    expect(provenanceLabel(skill)).not.toMatch(/game/);
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
    records: {
      injury: true, scar: { name: 'Leg Wound', roll: '31' },
      /* The die that was thrown, and the row it landed on — two facts, kept
         apart (review round 2 item 3). */
      roll: '52', row: '41-63',
    },
    ...over,
  });

  it('marks the scar with the step, the throw and the row', () => {
    apply([hurt()]);
    const scar = unitAfter().scars![0];
    expect(scar.source).toEqual({ kind: 'trauma', roll: '52', row: '41-63' });
    /* The THROW is what it reports, because that is what happened. Round 1 put
       the row's range in `roll`, so this read "rolled 41-63". */
    expect(provenanceLabel(scar)).toBe('Trauma Step · rolled 52');
    expect(provenanceLabel(scar)).not.toMatch(/41-63/);
  });

  it('a result with no throw behind it records the row, and says "row"', () => {
    apply([hurt({ records: { injury: true, scar: { name: 'Leg Wound' }, row: '31' } })]);
    const scar = unitAfter().scars![0];
    expect(scar.source).toEqual({ kind: 'trauma', row: '31' });
    expect(provenanceLabel(scar)).toBe('Trauma Step · row 31');
    expect(provenanceLabel(scar)).not.toMatch(/rolled/);
  });

  it('marks the injury too, in `injuryRecords` beside `injuries`', () => {
    apply([hurt()]);
    const u = unitAfter();
    /* `injuries` stays the authority on WHICH injuries the model carries — it
       is what every other reader and every roster file uses. */
    expect(u.injuries).toEqual(['Leg Wound']);
    expect(u.injuryRecords).toEqual([
      { name: 'Leg Wound', source: { kind: 'trauma', roll: '52', row: '41-63' } },
    ]);
  });

  it('records no roll where the row did not carry one, rather than inventing it', () => {
    /* A match recorded before the wizard carried the row, or a row the build
       could not identify. The kind and the game are still true. */
    apply([hurt({ records: { injury: true, scar: { name: 'Leg Wound' } } })]);
    expect(unitAfter().scars![0].source).toEqual({ kind: 'trauma' });
    expect(provenanceLabel(unitAfter().scars![0])).toBe('Trauma Step');
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
      kind: 'exploration', location: 'Ransacked Alchemist Workshop',
    });
  });

  it('and shows up in the sheet’s review of what the Warband holds', () => {
    apply([], [], { discovered: 'Pot of Manna', text: 'Add 10 Ducats…' });
    const held = holdingsOf(after()).find((h) => h.name === 'Pot of Manna')!;
    expect(held.kind).toBe('reward');
    expect(provenanceLabel({ source: held.source }))
      .toBe('Exploration · Pot of Manna');
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

describe('round 2 item 1: a Skill uses a roll only if its record states one', () => {
  /*
    Round 1 had this backwards — one roll per Skill by any route — which is the
    mistake `advancement.ts` warns against in as many words: a Patron grants
    Skills, so do some Glory Items and `65 Bitter Lessons`, so counting Skills
    cancels rolls the model earned. The rule is the record: a 2D6 total stated
    on the entry, or nothing.
  */
  it('the wizard’s Skill increments the count, because it states its roll', () => {
    expect(unitAfter().advancementRolls ?? 0).toBe(0);
    apply([], [{
      unitId: 'u1', name: 'Bloodlust', table: 'melee', roll: 7,
      substitution: 'none', description: 'The model may re-roll…',
    }]);
    expect(unitAfter().advancementRolls).toBe(1);
    expect(unitAfter().skills![0].source).toMatchObject({ kind: 'advancement', roll: '7' });
  });

  it('a hand-entered Skill with a stated 2D6 total consumes one', () => {
    useStore.getState().addUnitSkill(WB, 'u1', {
      name: 'Point Blank', category: 'ranged',
      source: { kind: 'manual', game: 2, roll: '9' },
    });
    expect(unitAfter().advancementRolls).toBe(1);
    expect(provenanceLabel(unitAfter().skills![0]))
      .toBe('Recorded by hand · game 2 · rolled 9');
  });

  it('a hand-entered Patron Skill leaves the count alone', () => {
    /*
      The case the inverted rule broke. A Patron's Skill costs no Advancement
      Roll, so a model that holds one and has rolled nothing is owed every roll
      its Experience has earned.
    */
    useStore.getState().addUnitSkill(WB, 'u1', {
      name: 'Gate of Sublime Wisdom', category: 'patron',
      source: { kind: 'manual', game: 2 },
    });
    expect(unitAfter().advancementRolls ?? 0).toBe(0);
    expect(provenanceLabel(unitAfter().skills![0])).toBe('Recorded by hand · game 2');
  });

  it('a Skill with no record at all states nothing, and costs nothing', () => {
    useStore.getState().addUnitSkill(WB, 'u1', { name: 'Point Blank', category: 'ranged' });
    expect(unitAfter().advancementRolls ?? 0).toBe(0);
  });

  it('removing a Skill that consumed a roll gives that roll back', () => {
    /* Otherwise a mis-tap and an undo costs the model an Advancement Roll for
       good: a count that only ever climbs turns a correction into a penalty. */
    useStore.getState().addUnitSkill(WB, 'u1', {
      name: 'Point Blank', category: 'ranged', source: { kind: 'manual', roll: '9' },
    });
    expect(unitAfter().advancementRolls).toBe(1);
    useStore.getState().removeUnitSkill(WB, 'u1', 'Point Blank');
    expect(unitAfter().advancementRolls).toBe(0);
  });

  it('and removing one that consumed none refunds none', () => {
    useStore.getState().addUnitSkill(WB, 'u1', {
      name: 'Gate of Sublime Wisdom', category: 'patron', source: { kind: 'manual' },
    });
    useStore.getState().addUnitSkill(WB, 'u1', {
      name: 'Point Blank', category: 'ranged', source: { kind: 'manual', roll: '9' },
    });
    expect(unitAfter().advancementRolls).toBe(1);
    useStore.getState().removeUnitSkill(WB, 'u1', 'Gate of Sublime Wisdom');
    expect(unitAfter().advancementRolls).toBe(1);
  });

  it('never below zero, on a roster whose count was already behind', () => {
    useStore.getState().removeUnitSkill(WB, 'u1', 'nothing-by-that-name');
    expect(unitAfter().advancementRolls ?? 0).toBe(0);
  });
});

describe('round 2 item 2: the game is recorded where the app can name it', () => {
  /*
    Absence is only right when the app genuinely cannot say. The other half of
    the rule is that a Warband which IS a member of the loaded campaign records
    the game — otherwise "never invent" would have quietly become "never record",
    and the provenance would say less than it knows.

    The campaign is built by spreading the store's own default rather than by
    writing a literal: `applyPostBattleResults` reads members, matches and the
    leaderboard, and a hand-made stub is a second definition of a campaign's
    shape that goes stale the moment that shape changes.
  */
  const CAMP = 'camp-1';

  const loaded = (id: string, currentGame: number, member: boolean) => {
    const base = useStore.getState().campaign!;
    return {
      ...base,
      id,
      currentGame,
      members: member
        ? [{ ...(base.members?.[0] ?? {}), warbandId: WB, warbandName: 'The Faithful' }]
        : [],
    } as never;
  };

  const rollASkill = () => apply([], [{
    unitId: 'u1', name: 'Bloodlust', table: 'melee', roll: 7,
    substitution: 'none', description: 'The model may re-roll…',
  }]);

  it('records it for a member of the campaign that is loaded', () => {
    useStore.setState({
      warbands: [{ ...seed(), campaignId: CAMP } as unknown as Warband],
      activeWarbandId: WB,
      campaign: loaded(CAMP, 5, true),
    });
    rollASkill();
    const skill = unitAfter().skills![0];
    expect(skill.source).toEqual({ kind: 'advancement', game: 5, roll: '7' });
    expect(provenanceLabel(skill)).toBe('Advancement Roll · game 5 · rolled 7');
  });

  it('records none when the loaded campaign is a DIFFERENT campaign', () => {
    /*
      The case `campaignGameOf`'s fallback hides: the warband belongs to one
      campaign and another is open, so the function answers 1 and the record
      would claim the warband's first game.
    */
    useStore.setState({
      warbands: [{ ...seed(), campaignId: CAMP } as unknown as Warband],
      activeWarbandId: WB,
      campaign: loaded('a-different-campaign', 9, false),
    });
    rollASkill();
    expect(unitAfter().skills![0].source).toEqual({ kind: 'advancement', roll: '7' });
  });
});
