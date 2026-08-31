import { describe, it, expect } from 'vitest';
import {
  rollKeeping, rollSuccess, rollInjury, successOutcome, injuryOutcome,
  capInjuryModifier, combineDice, describePool, successOdds, type Rng,
} from '../dice';

/**
 * Every case here is the rulebook's own worked example or its printed table.
 * The randomness is injected, so these assert the arithmetic and not luck.
 */

/** Deal these faces, in order, as the "random" rolls. */
const dealer = (faces: number[]): Rng => {
  let i = 0;
  return () => {
    const f = faces[i++];
    if (f === undefined) throw new Error('the roll asked for more dice than the test dealt');
    return (f - 1) / 6 + 1e-9;   // maps back to `f` through Math.floor(rng()*6)+1
  };
};

describe('dealing fixed dice', () => {
  it('deals exactly the faces it is given', () => {
    expect(rollKeeping(2, 0, 0, dealer([4, 3])).rolled).toEqual([4, 3]);
    expect(rollKeeping(2, 0, 0, dealer([1, 6])).rolled).toEqual([1, 6]);
  });
});

describe('Success Rolls', () => {
  /*
    "A Heretic Trooper model with +1 DICE bonus for Ranged Attack shoots at a
    Pilgrim model in cover. The -1 DICE penalty and the +1 DICE bonus cancel
    each other out, so the Heretic player simply rolls 2 dice. The result is 4
    and 3, for a total of 7. The shot hits!"
  */
  it('the worked example: +1 DICE and -1 DICE cancel, 4 and 3 is a hit', () => {
    expect(combineDice(1, 1)).toBe(0);
    const r = rollSuccess({ dice: 0 }, dealer([4, 3]));
    expect(r.rolled).toHaveLength(2);
    expect(r.total).toBe(7);
    expect(r.outcome).toBe('success');
  });

  /*
    "The Heretic is in Cover, which adds -1 DICE ... 3 dice are rolled for the
    attack, and come up 5, 5 and 1. The two lowest rolls are picked (a 5 and
    the 1) giving a Success Roll of 6. The Success Roll has failed."
  */
  it('the worked example: -1 DICE rolls three and keeps the two lowest', () => {
    const r = rollSuccess({ dice: -1 }, dealer([5, 5, 1]));
    expect(r.rolled).toEqual([5, 5, 1]);
    expect(r.kept.sort()).toEqual([1, 5]);
    expect(r.dropped).toEqual([5]);
    expect(r.total).toBe(6);
    expect(r.outcome).toBe('failure');
  });

  it('+2 DICE rolls four and keeps the two highest', () => {
    const r = rollSuccess({ dice: 2 }, dealer([1, 6, 2, 5]));
    expect(r.rolled).toHaveLength(4);
    expect(r.kept).toEqual([6, 5]);
    expect(r.total).toBe(11);
  });

  /*
    The Success Roll Table, as printed: 2-6 Failure, 7-11 Success, 12+ Critical.
    The console this replaced read the failure band as "1-6" and reported a
    double 1 as a separate "FUMBLE / DISASTER" result. 1 is not a result on 2D6
    and there is no fumble band.
  */
  it('follows the printed table with no invented bands', () => {
    expect(successOutcome(2)).toBe('failure');
    expect(successOutcome(6)).toBe('failure');
    expect(successOutcome(7)).toBe('success');
    expect(successOutcome(11)).toBe('success');
    expect(successOutcome(12)).toBe('critical');
    expect(successOutcome(14)).toBe('critical');
  });

  it('a double 1 is an ordinary Failure, not a fumble', () => {
    const r = rollSuccess({ dice: 0 }, dealer([1, 1]));
    expect(r.total).toBe(2);
    expect(r.outcome).toBe('failure');
  });

  it('a 12 reached with +DICE is a Critical Success', () => {
    const r = rollSuccess({ dice: 1 }, dealer([6, 2, 6]));
    expect(r.kept).toEqual([6, 6]);
    expect(r.outcome).toBe('critical');
  });
});

describe('Injury Rolls', () => {
  /*
    "an Injury Roll has a +1 INJURY DICE modifier and a -1 INJURY MODIFIER. 3
    dice are rolled, resulting in a 2, 4 and 5. The two highest dice are used,
    giving a roll of 9. Then the -1 INJURY MODIFIER is applied, subtracting 1
    from the roll and changing it to an 8. The roll is looked up on the Injury
    Table, which gives a Down result."
  */
  it('the worked example: 2/4/5 with +1 INJURY DICE and -1 is Down on 8', () => {
    const r = rollInjury({ injuryDice: 1, modifier: -1 }, dealer([2, 4, 5]));
    expect(r.kept).toEqual([5, 4]);
    expect(r.diceTotal).toBe(9);
    expect(r.total).toBe(8);
    expect(r.outcome).toBe('down');
  });

  /*
    The bug the user hit. The console kept the single best die and threw the
    rest away, so this read 6 - 3 = 3 (a Minor Hit) where the book gives
    6 + 5 + 4 - 3 = 12 and the model is Out of Action.
  */
  it('a Bloodbath adds all three dice, so -3 Armour does not save the model', () => {
    const r = rollInjury({ bloodbath: true, modifier: -3 }, dealer([6, 5, 4]));
    expect(r.kept).toEqual([6, 5, 4]);
    expect(r.diceTotal).toBe(15);
    expect(r.total).toBe(12);
    expect(r.outcome).toBe('out-of-action');
  });

  it('a Bloodbath with +INJURY DICE rolls four and keeps the three highest', () => {
    const r = rollInjury({ bloodbath: true, injuryDice: 1 }, dealer([1, 6, 3, 5]));
    expect(r.rolled).toHaveLength(4);
    expect(r.kept).toEqual([6, 5, 3]);
    expect(r.total).toBe(14);
  });

  it('a Bloodbath with -INJURY DICE keeps the three lowest', () => {
    const r = rollInjury({ bloodbath: true, injuryDice: -1 }, dealer([1, 6, 3, 5]));
    expect(r.kept).toEqual([5, 3, 1]);
    expect(r.dropped).toEqual([6]);
    expect(r.total).toBe(9);
  });

  // "If the Injury Roll has the DEADLY Keyword, instead roll 4D6 and add all 4."
  it('DEADLY makes a Bloodbath four dice, all four counted', () => {
    const r = rollInjury({ bloodbath: true, deadly: true }, dealer([2, 3, 4, 5]));
    expect(r.keep).toBe(4);
    expect(r.kept).toEqual([5, 4, 3, 2]);
    expect(r.total).toBe(14);
  });

  /*
    DEADLY sits inside the Bloodbath paragraph. On an ordinary Injury Roll it
    does not add dice, so it must not quietly turn a 2D6 roll into 4D6.
  */
  it('DEADLY alone does not enlarge an ordinary Injury Roll', () => {
    const r = rollInjury({ deadly: true }, dealer([4, 4]));
    expect(r.keep).toBe(2);
    expect(r.rolled).toHaveLength(2);
  });

  /*
    The Injury Roll Table, as printed. The console this replaced used
    >=9 / >=7 / >=4 / else, and named the bands "Serious Injury" and "Flesh
    Wound" — neither is a result in the game.
  */
  it('follows the printed table', () => {
    expect(injuryOutcome(0)).toBe('no-effect');
    expect(injuryOutcome(1)).toBe('no-effect');
    expect(injuryOutcome(2)).toBe('minor-hit');
    expect(injuryOutcome(6)).toBe('minor-hit');
    expect(injuryOutcome(7)).toBe('down');
    expect(injuryOutcome(8)).toBe('down');
    expect(injuryOutcome(9)).toBe('out-of-action');
    expect(injuryOutcome(15)).toBe('out-of-action');
  });

  it('a 4 is a Minor Hit, which the old console called Downed', () => {
    expect(injuryOutcome(4)).toBe('minor-hit');
  });

  // "The maximum -INJURY MODIFIER cannot be more than -3 in total."
  it('floors the negative modifier at -3 and leaves positives alone', () => {
    expect(capInjuryModifier(-5)).toBe(-3);
    expect(capInjuryModifier(-3)).toBe(-3);
    expect(capInjuryModifier(-1)).toBe(-1);
    expect(capInjuryModifier(4)).toBe(4);
    expect(rollInjury({ modifier: -9 }, dealer([6, 6])).total).toBe(9);
  });
});

describe('keeping dice', () => {
  it('drops by value, so two dice showing the same face are not confused', () => {
    const r = rollKeeping(2, 1, 0, dealer([4, 4, 4]));
    expect(r.kept).toEqual([4, 4]);
    expect(r.dropped).toEqual([4]);
  });

  it('reports every die that was rolled, in the order it came up', () => {
    const r = rollKeeping(2, 2, 0, dealer([3, 1, 6, 2]));
    expect(r.rolled).toEqual([3, 1, 6, 2]);
    expect(r.kept.concat(r.dropped).sort()).toEqual([1, 2, 3, 6]);
  });

  it('describes the pool the way the button reads', () => {
    expect(describePool(2, 0)).toBe('2D6');
    expect(describePool(2, 1)).toBe('3D6, keep the 2 highest');
    expect(describePool(2, -2)).toBe('4D6, keep the 2 lowest');
    expect(describePool(3, 0)).toBe('3D6');
  });
});

describe('success odds', () => {
  const pct = (n: number) => Math.round(n * 1000) / 10;

  /*
    Plain 2D6: 15 of the 36 outcomes are 7 or more, and only 6+6 is 12.
    These are the numbers anyone can check by hand, which is the point.
  */
  it('matches 2D6 counted by hand', () => {
    const o = successOdds(0);
    expect(pct(o.hit)).toBe(58.3);          // 21/36
    expect(pct(o.critical)).toBe(2.8);      // 1/36
    expect(pct(o.failure)).toBe(41.7);      // 15/36
    expect(Math.round(o.mean * 10) / 10).toBe(7);
  });

  it('sums to one at every modifier', () => {
    for (const d of [-3, -2, -1, 0, 1, 2, 3]) {
      const o = successOdds(d);
      expect(o.failure + o.success + o.critical).toBeCloseTo(1, 10);
      expect([...o.byTotal.values()].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    }
  });

  /*
    The distinction the old probability view missed: +DICE is not "+1 to the
    roll". It reshapes the distribution — more dice to pick the best two from —
    so it helps more than a flat point at the low end and less at the top.
  */
  it('+DICE improves the odds and -DICE worsens them, monotonically', () => {
    const hits = [-3, -2, -1, 0, 1, 2, 3].map((d) => successOdds(d).hit);
    for (let i = 1; i < hits.length; i++) expect(hits[i]).toBeGreaterThan(hits[i - 1]);
  });

  it('never rolls a total below 2 or above 12', () => {
    for (const d of [-2, 0, 2]) {
      const totals = [...successOdds(d).byTotal.keys()];
      expect(Math.min(...totals)).toBeGreaterThanOrEqual(2);
      expect(Math.max(...totals)).toBeLessThanOrEqual(12);
    }
  });
});
