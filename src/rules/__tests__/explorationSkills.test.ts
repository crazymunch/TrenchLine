/**
 * The Exploration Skills, and what a Location hands out.
 *
 * FD-07 / RR-10. Seven Skills are printed on page 115 and the app had nowhere
 * to put one, so a Warband that found the Map & Document Bag — *"Your Warband
 * gains the Reroll Exploration Skill"* — gained nothing at all.
 *
 * Everything here runs against the shipped dataset rather than a fixture,
 * because the failure being guarded is a wording drifting out from under a
 * regex: the book spells the same Skill `Extra dice` in its list and `Extra
 * Dice` in the Location that grants it, and `Re-roll` against `Reroll`. A
 * fixture written to match today's regexes proves only that they match
 * themselves.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import {
  explorationSkillEffect, explorationSkillNamed, explorationGrants,
  explorationPool, explorationLootBonus, resolveExploration, explorationFromModels,
  explorationRerolls,
} from '../campaign';

const SKILLS = DATASET.campaign.exploration.skills ?? [];
const effectOf = (name: string) =>
  explorationSkillEffect(explorationSkillNamed(DATASET, name)!.text);

describe('the seven Skills the book prints', () => {
  it('are all seven, with their text', () => {
    expect(SKILLS.map((s) => s.name)).toEqual([
      'Extra dice', 'Duplicate', 'Re-roll', 'Set Dice', 'Seek', 'Circle Back', 'Lucky',
    ]);
    expect(SKILLS.filter((s) => !s.text)).toEqual([]);
  });

  it('each classify — none falls through unrecognised into by-hand by accident', () => {
    /*
      The three that are arithmetic must be READ as arithmetic. If a wording
      drifts, this is the test that fails, rather than a Warband's Extra Dice
      quietly becoming a note on the screen.
    */
    expect(effectOf('Extra dice').extraDice).toBe(1);
    expect(effectOf('Re-roll').rerolls).toBe(1);
    expect(effectOf('Seek').modifier).toBe(1);
    expect(effectOf('Circle Back').modifier).toBe(-1);
  });

  it('leaves the three that need a die chosen to the player', () => {
    // Each begins "After you make an Exploration Roll, select one of the
    // Exploration Dice": a choice, not a number.
    for (const name of ['Duplicate', 'Set Dice', 'Lucky']) {
      expect(effectOf(name).byHand, name).toBe(true);
      expect(effectOf(name).extraDice, name).toBe(0);
      expect(effectOf(name).modifier, name).toBe(0);
    }
  });

  it('does not confuse the two that move the total in opposite directions', () => {
    expect(effectOf('Seek').modifier + effectOf('Circle Back').modifier).toBe(0);
  });
});

describe('a Skill named in a Location’s prose', () => {
  it('matches the list however the book spelled it that day', () => {
    expect(explorationSkillNamed(DATASET, 'Reroll')?.name).toBe('Re-roll');
    expect(explorationSkillNamed(DATASET, 'Extra Dice')?.name).toBe('Extra dice');
    expect(explorationSkillNamed(DATASET, 'set dice')?.name).toBe('Set Dice');
  });

  it('is undefined for a name the book does not print, rather than a guess', () => {
    expect(explorationSkillNamed(DATASET, 'Second Sight')).toBeUndefined();
  });
});

describe('every grant in the shipped tables', () => {
  const locations = Object.values(DATASET.campaign.exploration.locations).flat();
  /*
    "Your Warband gains the <name> Exploration Skill" — a Location naming the
    Skill it hands over. Not every mention of an Exploration Skill is one: see
    the Fruit from the Tree below, which offers a CHOICE.
  */
  const granting = locations.filter((l) =>
    /gains? the [A-Za-z][A-Za-z -]*? Exploration Skill/i.test(l.description ?? ''));

  it('is found at all — four Locations grant a named Skill', () => {
    expect(granting.map((l) => l.name).sort()).toEqual([
      'Abandoned Prophetic Radio Post',
      'Hidden Passages',
      'High-Ranking Captive',
      'Map & Document Bag',
    ]);
  });

  it('resolves to one of the seven, so none is recorded under a name nothing reads', () => {
    for (const l of granting) {
      const [effect] = explorationGrants(DATASET, l, 3);
      expect(effect, l.name).toBeTruthy();
      expect(SKILLS.map((s) => s.name), `${l.name} granted ${effect.name}`)
        .toContain(effect.name);
      expect(effect.source).toBe(l.name);
      expect(effect.sinceGame).toBe(3);
    }
  });

  it('reads the Pot of Manna’s ten Ducats out of its own sentence', () => {
    const pot = locations.find((l) => l.name === 'Pot of Manna')!;
    expect(explorationGrants(DATASET, pot, 2)).toEqual([
      { name: 'Pot of Manna', source: 'Pot of Manna', sinceGame: 2, lootBonus: 10 },
    ]);
  });

  it('picks nothing for a Location that says the choice is the player’s', () => {
    /*
      The Fruit from the Tree of Good and Evil Knowledge: "you can give them
      one Skill of your choice. You can choose a Skill from any of the Skill
      Tables, or any Patron Skill ... or any Exploration Skill."

      It mentions Exploration Skills and grants none of them. An app that
      pattern-matched on the words would choose one on the player's behalf,
      which is the whole of what this step is not allowed to do — and it goes
      to a MODEL, alongside the DEMONIC Keyword, not to the Warband.
    */
    const fruit = locations.find((l) => /^Fruit from the Tree/.test(l.name))!;
    expect(fruit.description).toMatch(/one Skill of your choice/i);
    expect(explorationGrants(DATASET, fruit, 5)).toEqual([]);
  });

  it('hands out nothing for a Location whose text grants nothing', () => {
    const plain = locations.find((l) =>
      !/gains? the .+ Exploration Skill|each Exploration Step/i.test(l.description ?? ''))!;
    expect(explorationGrants(DATASET, plain, 1)).toEqual([]);
  });
});

describe('the pool a roll is made with', () => {
  const held = (...names: string[]) =>
    names.map((name) => ({ name, source: 'a test', sinceGame: 1 }));

  it('is the band, with nothing held', () => {
    expect(explorationPool(DATASET, { dice: 4 })).toEqual({
      dice: 4, rerolls: 0, modifier: 0, byHand: [],
    });
  });

  it('stays NULL where the ruleset has no band, and never becomes three', () => {
    /*
      The whole of RR-10's first defect: `explorationDice(...) ?? 3`. Three is
      the first band's number, so a ruleset that could not say how many dice
      paid out exactly as though it had said "three" — inventing a roll, and
      loot, out of a dataset that carried neither.
    */
    expect(explorationPool(DATASET, { dice: null }).dice).toBeNull();
    expect(explorationPool(null, { dice: null }).dice).toBeNull();
  });

  it('adds a die per Extra dice held, and counts repeats', () => {
    expect(explorationPool(DATASET, { dice: 4 }, held('Extra dice')).dice).toBe(5);
    // "You can have multiples of any of the Exploration Skills on this list."
    expect(explorationPool(DATASET, { dice: 4 }, held('Extra dice', 'Extra dice')).dice).toBe(6);
  });

  it('adds a re-roll per Re-roll held, without touching the dice', () => {
    const pool = explorationPool(DATASET, { dice: 3 }, held('Reroll'));
    expect(pool.rerolls).toBe(1);
    expect(pool.dice).toBe(3);
  });

  it('sums Seek and Circle Back into one modifier', () => {
    expect(explorationPool(DATASET, { dice: 3 }, held('Seek', 'Seek')).modifier).toBe(2);
    expect(explorationPool(DATASET, { dice: 3 }, held('Seek', 'Circle Back')).modifier).toBe(0);
  });

  it('lists the ones the player applies, with their published text', () => {
    const pool = explorationPool(DATASET, { dice: 3 }, held('Lucky', 'Duplicate'));
    expect(pool.byHand.map((s) => s.name)).toEqual(['Lucky', 'Duplicate']);
    expect(pool.byHand[0].text).toMatch(/select one of the Exploration Dice/i);
  });

  it('ignores a held name the ruleset does not print, rather than inventing its effect', () => {
    expect(explorationPool(DATASET, { dice: 3 }, held('Second Sight'))).toEqual({
      dice: 3, rerolls: 0, modifier: 0, byHand: [],
    });
  });
});

describe('loot', () => {
  it('is the roll times ten, as it was', () => {
    expect(resolveExploration(DATASET, 9, 'common')?.loot).toBe(90);
  });

  it('carries the Pot of Manna on top, every Step', () => {
    const bonus = explorationLootBonus([
      { name: 'Pot of Manna', source: 'Pot of Manna', sinceGame: 1, lootBonus: 10 },
    ]);
    expect(bonus).toBe(10);
    expect(resolveExploration(DATASET, 9, 'common', [], bonus)?.loot).toBe(100);
  });

  it('pays it on the Step that finds it — "(including this one)"', () => {
    const pot = Object.values(DATASET.campaign.exploration.locations).flat()
      .find((l) => l.name === 'Pot of Manna')!;
    const bonus = explorationLootBonus(explorationGrants(DATASET, pot, 4));
    expect(resolveExploration(DATASET, pot.roll.from, 'rare', [], bonus)?.loot)
      .toBe(pot.roll.from * 10 + 10);
  });
});

/**
 * The two Wildcard Skills that grant one, which RR-10 counted and the app had
 * nowhere to put.
 *
 * Derived from the Roster rather than stored, and that is the rule: the book
 * gives the Skill to *a model* — "A model with this Skill has the Extra Dice
 * Exploration Skill" — so the Warband holds it for exactly as long as it holds
 * the model. Writing it into `explorationEffects` would leave a dead Scavenger
 * rolling an extra die for the rest of the campaign.
 */
describe('a Skill a model carries', () => {
  const WILDCARDS = DATASET.campaign.skills.wildcard
    .filter((r) => /has the .+ Exploration Skill/i.test(r.description ?? ''));

  const model = (name: string, skillName: string) => {
    const row = WILDCARDS.find((r) => r.name === skillName)!;
    /* A learned Skill lands on the model with the row's published text in
       `effect` — see the Advancement write in `store/slices/campaign.ts`. */
    return { customName: name, skills: [{ name: row.name, effect: row.description }] };
  };

  it('is two of them, by their published text', () => {
    expect(WILDCARDS.map((r) => r.name).sort())
      .toEqual(['Friends In High Places', 'Scavenger']);
  });

  it('gives the Warband the Skill the row names', () => {
    expect(explorationFromModels(DATASET, [model('Ratty', 'Scavenger')], 4)).toEqual([
      { name: 'Extra dice', source: 'Ratty — Scavenger', sinceGame: 4 },
    ]);
  });

  it('matches "Re-roll Dice", which is a THIRD spelling of the same Skill', () => {
    /*
      The list on page 115 prints `Re-roll`, the Map & Document Bag says
      `Reroll`, and Friends In High Places says `Re-roll Dice`. All one Skill.
      A lookup that misses any of them loses a Warband its re-roll.
    */
    const [effect] = explorationFromModels(DATASET, [model('Sir Hugh', 'Friends In High Places')], 1);
    expect(effect.name).toBe('Re-roll');
    expect(explorationPool(DATASET, { dice: 3 }, [effect]).rerolls).toBe(1);
  });

  it('reaches the pool as a die, and stacks with the Warband’s own', () => {
    const held = [
      { name: 'Extra dice', source: 'a Location', sinceGame: 1 },
      ...explorationFromModels(DATASET, [model('Ratty', 'Scavenger')], 4),
    ];
    expect(explorationPool(DATASET, { dice: 4 }, held).dice).toBe(6);
  });

  it('finds nothing on a model with no Skills, or Skills that grant none', () => {
    expect(explorationFromModels(DATASET, [{ customName: 'Plain' }])).toEqual([]);
    expect(explorationFromModels(DATASET, [
      { customName: 'Plain', skills: [{ name: 'Duellist', effect: 'Add 1 DICE to melee.' }] },
    ])).toEqual([]);
  });
});

describe('the re-rolls a Step allows', () => {
  it('is one, for a game that was not won', () => {
    expect(explorationRerolls('Defeat')).toBe(1);
    expect(explorationRerolls('Draw')).toBe(1);
  });

  it('is two for a win — "if you won the game that was just played"', () => {
    expect(explorationRerolls('Victory')).toBe(2);
  });

  it('gains one per Re-roll Skill held, on top of either', () => {
    expect(explorationRerolls('Draw', 1)).toBe(2);
    expect(explorationRerolls('Victory', 2)).toBe(4);
  });

  it('is never fewer than one', () => {
    expect(explorationRerolls('Defeat', -5)).toBe(1);
  });
});
