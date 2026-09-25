/**
 * What an Advancement Roll writes onto the model.
 *
 * RR-03 / RR-04 / FD-04b. The Promotions & Experience step offered every model
 * on the roster the same eight buttons — `+1 Melee`, `+1 Ranged`, `+1 Armour`,
 * `+1" Move` and four named Skills — and `applyPostBattleResults` pushed the
 * label of whichever was pressed onto `unit.advancements` as free text.
 *
 * Trench Crusade has no characteristic advances, three of those four Skills do
 * not exist, and a free-text string cannot tell a Skill a model rolled for
 * from one somebody typed. So the parameter carries the table and the 2D6
 * total now, and the result lands on `unit.skills`, which is the field that
 * records a Skill properly.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import type { Warband, ActiveUnit } from '@/types/warband';
import type { SkillLearned } from '@/rules/advancement';
import { statesAnAdvancementRoll } from '@/rules/provenance';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return {
    ...actual,
    storage: { ...actual.storage, saveCampaign: vi.fn(), getBattles: () => [], addBattle: () => [] },
  };
});

const WB = 'wb-skills';

const unit = (over: Partial<ActiveUnit> = {}): ActiveUnit => ({
  id: 'u1',
  customName: 'Sister Mercy',
  baseProfileId: 'p1',
  profileSnapshot: { name: 'Trench Pilgrim', category: 'Elite', elite: true },
  equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
  xp: 3,
  advancements: ['+1 Melee'],
  injuries: [], deeds: [], isDead: false,
  totalCost: 40, currentWounds: 0, maxWounds: 1, bloodMarkers: 0,
  status: 'Active', hasActedThisTurn: false,
  ...over,
} as unknown as ActiveUnit);

const seed = (units: ActiveUnit[]): Warband => ({
  id: WB, name: 'The Faithful', factionId: 'trench-pilgrims',
  ducatLimit: 1000, treasuryDucats: 0, gloryPoints: 0,
  armoryStash: [], units, snapshots: [],
} as unknown as Warband);

const learned = (over: Partial<SkillLearned> = {}): SkillLearned => ({
  unitId: 'u1',
  name: 'Bloodlust',
  table: 'melee',
  roll: 7,
  substitution: 'none',
  description: 'The model may re-roll…',
  ...over,
});

const apply = (skills: SkillLearned[]) =>
  useStore.getState().applyPostBattleResults(
    'sc-1', 'Bridgehead', 'Victory', 0, 0,
    [], skills, { unitIds: [], misses: 0 }, [], false, 'narrative',
  );

const unitAfter = (id = 'u1') => useStore.getState().warbands
  .find((w) => w.id === WB)!.units.find((u) => u.id === id)!;

beforeEach(() => {
  useStore.setState({ warbands: [seed([unit()])], activeWarbandId: WB });
});

describe('a Skill learned from an Advancement Roll', () => {
  it('lands on skills, with the table and the roll that produced it', () => {
    apply([learned()]);
    expect(unitAfter().skills).toEqual([
      {
        name: 'Bloodlust', category: 'melee', roll: '7',
        effect: 'The model may re-roll…',
        /*
          And where it came from (FD-12 item 2, review round 1 finding C).

          The app knows the most about this entry of any on the roster — which
          step, which game, which 2D6 total — and until this it recorded the
          least: a Skill the Promotions step had just rolled read back as
          "Imported · rolled 7", indistinguishable from a name that arrived in
          a file.
        */
        /* No game: this seed is in no campaign, and `campaignGameOf`'s 1 is a
           Threshold, not a history (review round 2 item 2). */
        source: { kind: 'advancement', roll: '7' },
      },
    ]);
  });

  it('counts the Advancement Roll it used, because it records it', () => {
    /*
      Round 2 item 1: the count is not one per Skill — it is one per Skill whose
      record STATES a roll. This writer is the case where that is unambiguous:
      the wizard rolled the dice, so it writes `advancement` with the 2D6 total,
      and `statesAnAdvancementRoll` reads it back off the entry rather than
      trusting the caller to have incremented anything.

      A Patron's Skill, a Glory Item's and `65 Bitter Lessons`'s state no roll
      and cost none — which is the half round 1 got backwards by counting the
      list's length.
    */
    expect(unitAfter().advancementRolls ?? 0).toBe(0);
    apply([learned()]);
    expect(unitAfter().advancementRolls).toBe(1);

    const written = unitAfter().skills![0];
    expect(written.source).toMatchObject({ kind: 'advancement', roll: '7' });
    expect(statesAnAdvancementRoll(written)).toBe(true);
  });

  it('does not write to the legacy advancements array', () => {
    /*
      That array is where `+1 Melee` came from. Nothing writes to it any more,
      and what is already in it stays: those strings are the player's own
      record of what they did, and clearing them is a data change, not a fix.
    */
    apply([learned()]);
    expect(unitAfter().advancements).toEqual(['+1 Melee']);
  });

  it('counts the roll as taken', () => {
    /*
      `advancementRolls` is what `advancementRollsDue` subtracts from the
      thresholds the model's Experience has passed. Without it the model is
      offered the same roll again on the next submission, for ever.
    */
    expect(unitAfter().advancementRolls).toBeUndefined();
    apply([learned()]);
    expect(unitAfter().advancementRolls).toBe(1);
  });

  it('adds to a count a model already carries, rather than resetting it', () => {
    useStore.setState({ warbands: [seed([unit({ advancementRolls: 2 })])], activeWarbandId: WB });
    apply([learned()]);
    expect(unitAfter().advancementRolls).toBe(3);
  });

  it('keeps Skills the model already had', () => {
    useStore.setState({
      warbands: [seed([unit({ skills: [{ name: 'Sprint', category: 'stealth' }] })])],
      activeWarbandId: WB,
    });
    apply([learned()]);
    expect(unitAfter().skills!.map((s) => s.name)).toEqual(['Sprint', 'Bloodlust']);
  });

  it('files a Patron Skill under the Patron, not under a table', () => {
    // A roll of 2 sends the player to their Patron's list. It has no table
    // roll of its own, so recording it as `melee 2` would be a lie about
    // where it came from.
    apply([learned({ table: 'patron', roll: 2, substitution: 'patron', name: 'Gift of the Iron Sultan' })]);
    expect(unitAfter().skills![0]).toMatchObject({ name: 'Gift of the Iron Sultan', category: 'Patron' });
  });

  it('takes two Skills for a model that was owed two rolls', () => {
    apply([learned(), learned({ name: 'Shadow Walker', table: 'stealth', roll: 9 })]);
    expect(unitAfter().skills!.map((s) => s.name)).toEqual(['Bloodlust', 'Shadow Walker']);
    expect(unitAfter().advancementRolls).toBe(2);
  });

  it('touches nobody when no rolls were made', () => {
    apply([]);
    expect(unitAfter().skills ?? []).toEqual([]);
    expect(unitAfter().advancementRolls).toBe(0);
  });

  it('leaves a model the list does not name alone', () => {
    useStore.setState({
      warbands: [seed([unit(), unit({ id: 'u2', customName: 'Brother Cyril' })])],
      activeWarbandId: WB,
    });
    apply([learned()]);
    expect(unitAfter('u2').skills ?? []).toEqual([]);
    expect(unitAfter('u2').advancementRolls).toBe(0);
  });
});

describe('the snapshot changelog says what was rolled', () => {
  const summary = () => useStore.getState().warbands
    .find((w) => w.id === WB)!.snapshots!.at(-1)!.changesSummary;

  it('names the Skill, the table and the total', () => {
    /*
      It used to read `Advancement: Sister Mercy learned +1 Melee`, which is
      not a thing that can happen in this game — and a player reading their
      own history had no way to tell it from something real.
    */
    apply([learned()]);
    expect(summary()).toContain('Advancement Roll: Sister Mercy learned Bloodlust (melee on 7)');
  });

  it('says the Patron’s list rather than naming a table it did not use', () => {
    apply([learned({ table: 'patron', roll: 2, substitution: 'patron', name: 'Gift of the Iron Sultan' })]);
    expect(summary().some((l) => l.includes("the Patron's list"))).toBe(true);
  });
});

describe('what a Promotion writes onto the model', () => {
  const troop = (over: Partial<ActiveUnit> = {}) => unit({
    id: 'u2',
    customName: 'Janissary Kerem',
    profileSnapshot: { name: 'Janissary', category: 'Trooper', elite: false },
    xp: 6,
    ...over,
  } as never);

  const promote = (ids: string[], misses = 0, experience: { unitId: string; earns: boolean; points?: number }[] = []) =>
    useStore.getState().applyPostBattleResults(
      'sc-1', 'Bridgehead', 'Victory', 0, 0,
      [], [], { unitIds: ids, misses }, experience as never, false, 'narrative',
    );

  beforeEach(() => {
    useStore.setState({ warbands: [seed([unit(), troop()])], activeWarbandId: WB });
  });

  it('gives the model the ELITE Keyword and its place on the Roster', () => {
    /*
      "…they immediately gain the ELITE Keyword and they are considered to be
      an Elite model from then on… Cross out their old entry on your Warband
      Roster and write a new one for them in the Elite Models section."
    */
    promote(['u2']);
    const u = unitAfter('u2');
    expect(u.isElite).toBe(true);
    expect(u.profileSnapshot.category).toBe('Elite');
    expect(u.profileSnapshot.elite).toBe(true);
  });

  it('starts it on 0 Experience, not on what it had as a Troop', () => {
    /*
      "They begin with 0 Experience Points, but will gain at least 1 due to
      surviving the game after which they were Promoted."

      The Janissary is seeded on 6 — which a carried-over Warband really does
      have, because the step granted a point to every model on the roster for
      two years. Adding its survival point to that would hand a brand-new
      ELITE model three Advancement Rolls on the spot.
    */
    promote(['u2'], 0, [{ unitId: 'u2', earns: true, points: 1 }]);
    expect(unitAfter('u2').xp).toBe(1);
  });

  it('starts it on 0 where it earned nothing either', () => {
    promote(['u2']);
    expect(unitAfter('u2').xp).toBe(0);
  });

  it('leaves a model that was not promoted exactly as it was', () => {
    promote(['u2']);
    const other = unitAfter('u1');
    expect(other.isElite).toBeUndefined();
    expect(other.xp).toBe(3);
  });

  it('writes the miss count onto the Warband, not onto a model', () => {
    /*
      "…make a note on your Roster of how many dice you have rolled in a row
      without getting a Promotion." It runs across models and between games,
      so it belongs to the Warband.
    */
    promote([], 4);
    expect(useStore.getState().warbands.find((w) => w.id === WB)!.promotionMisses).toBe(4);
  });

  it('clears the count when a Promotion happened', () => {
    useStore.setState({
      warbands: [{ ...seed([unit(), troop()]), promotionMisses: 3 }],
      activeWarbandId: WB,
    });
    promote(['u2'], 0);
    expect(useStore.getState().warbands.find((w) => w.id === WB)!.promotionMisses).toBeUndefined();
  });

  it('records the Promotion in the snapshot changelog', () => {
    promote(['u2']);
    const summary = useStore.getState().warbands
      .find((w) => w.id === WB)!.snapshots!.at(-1)!.changesSummary;
    expect(summary.some((l) => l.includes('Promotion: Janissary Kerem'))).toBe(true);
  });
});

/*
  The Experience award is a NUMBER, not a flag.

  The slice read `experience.some((x) => x.unitId === u.id && x.earns) ? 1 : 0`,
  so the second point for a Glorious Deed (p.105) had nowhere to land however
  the wizard decided it, and a LIMITED POTENTIAL model with room for one of
  two points would have taken both. The wizard decides how many, because that
  is where the match and the cap are both in hand; the slice writes what it is
  given.
*/
describe('how many Experience Points the award carries', () => {
  const award = (experience: { unitId: string; earns: boolean; points: number }[]) =>
    useStore.getState().applyPostBattleResults(
      'sc-1', 'Bridgehead', 'Victory', 0, 0,
      [], [], { unitIds: [], misses: 0 }, experience as never, false, 'narrative',
    );

  beforeEach(() => {
    useStore.setState({ warbands: [seed([unit()])], activeWarbandId: WB });
  });

  it('writes two where the model also performed a Glorious Deed', () => {
    const before = unitAfter().xp;
    award([{ unitId: 'u1', earns: true, points: 2 }]);
    expect(unitAfter().xp).toBe(before + 2);
  });

  it('writes one for a survivor with no Deed', () => {
    const before = unitAfter().xp;
    award([{ unitId: 'u1', earns: true, points: 1 }]);
    expect(unitAfter().xp).toBe(before + 1);
  });

  it('writes the trimmed number where a cap left room for one of two', () => {
    const before = unitAfter().xp;
    award([{ unitId: 'u1', earns: true, points: 1, forDeed: true } as never]);
    expect(unitAfter().xp).toBe(before + 1);
  });

  it('writes nothing for a model that earns nothing, whatever points says', () => {
    /* `earns: false` is the verdict; `points` is how much. A row that says
       no must not pay out because a number was left on it. */
    const before = unitAfter().xp;
    award([{ unitId: 'u1', earns: false, points: 2 }]);
    expect(unitAfter().xp).toBe(before);
  });

  it('writes nothing for a model with no row at all', () => {
    const before = unitAfter().xp;
    award([]);
    expect(unitAfter().xp).toBe(before);
  });
});
