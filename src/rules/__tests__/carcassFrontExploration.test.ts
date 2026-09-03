/**
 * The Carcass Front Exploration Step.
 *
 * A Carcass Front campaign replaces the rulebook's Exploration Step, and four
 * things change with it. Each is tested because each is a rule a player — or
 * this app — gets wrong by carrying a habit over from a standard campaign, and
 * because every one of them is worth Ducats every single game.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import {
  resolveCarcassFrontExploration, carcassFrontResources, hasThreeOfAKind,
  resolveExploration, rollLabel, inRange,
  CARCASS_FRONT_LOOT_PER_POINT, CARCASS_FRONT_STARTING_DICE,
} from '../campaign';

const cf = (opts: Parameters<typeof resolveCarcassFrontExploration>[1]) =>
  resolveCarcassFrontExploration(DATASET, opts)!;

describe('the tables reach the dataset', () => {
  it('carries all four Resource tables', () => {
    expect(carcassFrontResources(DATASET)).toEqual(['favour', 'relic', 'supplies', 'territories']);
  });

  it('leaves the rulebook’s three where they were', () => {
    // The two sets sit side by side: a player is in one kind of campaign or
    // the other, and the app has to be able to show either.
    expect(Object.keys(DATASET.campaign.exploration.locations))
      .toEqual(['common', 'rare', 'legendary']);
  });
});

/*
  1. The rows are ranges. "A Location is discovered if the Exploration Roll
  corresponds to any number in the range – in this example, on the roll of a 1,
  a 2, or a 3."
*/
describe('ranges, not single numbers', () => {
  it('finds the same Location anywhere in its band', () => {
    for (const n of [1, 2, 3]) expect(cf({ roll: n, resource: 'favour' }).location!.name).toBe('Shaken');
    for (const n of [6, 7, 8, 9]) expect(cf({ roll: n, resource: 'favour' }).location!.name).toBe('Rival Icon');
  });

  it('always finds something, because the tables are contiguous', () => {
    for (const r of carcassFrontResources(DATASET)) {
      for (let n = 1; n <= 40; n++) {
        expect(cf({ roll: n, resource: r }).location, `${r} on ${n}`).not.toBeNull();
      }
    }
  });

  it('catches a roll above the last printed number on the open last row', () => {
    // The pool grows all campaign, so a roll can exceed any printed number.
    expect(cf({ roll: 34, resource: 'favour' }).location!.name).toBe('Chosen Blessing');
    expect(cf({ roll: 120, resource: 'favour' }).location!.name).toBe('Chosen Blessing');
  });
});

/*
  2. Loot is the roll times FIVE. The rulebook's Step pays ten, and paying ten
  here hands a warband roughly double what the book gives it every game — the
  sort of error nobody notices until the campaign is over.
*/
describe('loot', () => {
  it('pays five per point, not the rulebook’s ten', () => {
    expect(CARCASS_FRONT_LOOT_PER_POINT).toBe(5);
    expect(cf({ roll: 12, resource: 'supplies' }).loot).toBe(60);
    expect(resolveExploration(DATASET, 12, 'common')!.loot).toBe(120);
  });

  it('pays the player who does not consult a table at all', () => {
    // "If you were not the Aggressor, make your Exploration Roll but do not
    // look it up on an Exploration Table… You then receive Loot equal to your
    // Exploration Roll times 5."
    const out = cf({ roll: 11, resource: null });
    expect(out.loot).toBe(55);
    expect(out.location).toBeNull();
    expect(out.resource).toBeNull();
  });
});

/*
  3. The pool is 3D6 and does NOT grow with games played. It grows with
  Campaign Tracker rewards and Camp Buildings instead — "The number of
  Exploration Dice you roll is not determined by the number of games you have
  played."
*/
describe('the dice pool', () => {
  it('starts at 3D6', () => {
    expect(CARCASS_FRONT_STARTING_DICE).toBe(3);
  });
});

/*
  4. Three or more matching dice send a non-Aggressor to Rudolf's Folly. It is
  counted over the DICE, so it cannot be derived from the total — which is why
  the individual dice are kept and not just their sum.
*/
describe('Rudolf’s Folly', () => {
  it('needs three or more dice of the same value', () => {
    expect(hasThreeOfAKind([6, 6, 6])).toBe(true);
    expect(hasThreeOfAKind([2, 2, 2, 5])).toBe(true);
    expect(hasThreeOfAKind([6, 6, 5, 5])).toBe(false);
    expect(hasThreeOfAKind([1, 2, 3])).toBe(false);
  });

  it('is reported off the dice, not off the total', () => {
    // 2+2+2 and 1+2+3 both total 6, and only one of them is three of a kind.
    expect(cf({ roll: 6, dice: [2, 2, 2], resource: null }).rudolfsFolly).toBe(true);
    expect(cf({ roll: 6, dice: [1, 2, 3], resource: null }).rudolfsFolly).toBe(false);
  });

  it('says it does not know when the dice were not recorded', () => {
    // Null rather than false: a physical roll the player only typed the total
    // of cannot answer this, and saying "no" would be an answer.
    expect(cf({ roll: 6, resource: null }).rudolfsFolly).toBeNull();
  });
});

/*
  The rulebook's Step says a Location is discovered only once in a campaign and
  a repeat is treated as a Pillaged result. Carcass Front does not restate that
  rule for its own tables, and it rewrites the rest of the Step in detail. So
  the repeat is reported and not acted on — suppressing the result would apply
  a rule this book does not print.
*/
describe('a Location found twice', () => {
  it('still returns the Location, and says it has been seen', () => {
    const out = cf({ roll: 1, resource: 'favour', alreadyDiscovered: ['Shaken'] });
    expect(out.location!.name).toBe('Shaken');
    expect(out.previouslyDiscovered).toBe(true);
  });

  it('is not confused with a first find', () => {
    expect(cf({ roll: 1, resource: 'favour' }).previouslyDiscovered).toBe(false);
  });

  it('still suppresses the rulebook’s own tables, where the rule is printed', () => {
    const first = resolveExploration(DATASET, 4, 'common')!;
    const again = resolveExploration(DATASET, 4, 'common', [first.location!.name])!;
    expect(again.location).toBeNull();
    expect(again.nothingBecause).toBe('already-discovered');
    // The loot is unaffected either way.
    expect(again.loot).toBe(40);
  });
});

describe('the widened roll type', () => {
  it('leaves the rulebook’s sparse tables sparse', () => {
    // 7 is not a row on the Common table, and that is the rule: "If you roll a
    // number that is not included on the Exploration Table, then you discover
    // nothing (but you still use the roll to determine how much Loot)".
    const out = resolveExploration(DATASET, 7, 'common')!;
    expect(out.location).toBeNull();
    expect(out.nothingBecause).toBe('not-on-table');
    expect(out.loot).toBe(70);
  });

  it('prints a range the way the book does', () => {
    expect(rollLabel({ from: 4, to: 4 })).toBe('4');
    expect(rollLabel({ from: 1, to: 3 })).toBe('1-3');
    expect(rollLabel({ from: 34, to: null })).toBe('34+');
  });

  it('matches an open range above its floor', () => {
    expect(inRange({ from: 34, to: null }, 33)).toBe(false);
    expect(inRange({ from: 34, to: null }, 34)).toBe(true);
    expect(inRange({ from: 34, to: null }, 9999)).toBe(true);
  });
});
