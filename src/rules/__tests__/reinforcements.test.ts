/**
 * Calling for Reinforcements, and the price the app never charged.
 *
 * `docs/RULES-COVERAGE-AUDIT.md` RC-09. The book's sequence has six steps. The
 * app applied one — step 6, forfeiting Exploration and the Quartermaster, which
 * the wizard enforces by hiding those controls — and skipped every step that
 * costs something. The Arsenal was kept, the Strongbox was kept, and unspent
 * Ducats were never lost.
 *
 * So the option that exists as a costly bail-out left a player strictly better
 * off than not taking it: they gave up two steps and kept everything else.
 *
 * The finding is also partly mine. `reinforcementAllowance` was written and
 * tested during RULES-3 and never called from anywhere — a function with a
 * passing test suite and no production caller, which is exactly the shape a
 * value-oriented check cannot see.
 *
 * Tested against the real dataset, because the whole failure was a published
 * sequence nothing read.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import {
  reinforcementsSequence, reinforcementCost, reinforcementAllowance, forceLimits,
} from '../campaign';

const SEQ = reinforcementsSequence(DATASET)!;

const warband = (over: Partial<{
  units: { totalCost: number; isDead?: boolean }[];
  armoryStash: { id: string; name: string }[];
  treasuryDucats: number;
  variantId: string;
}> = {}) => ({
  units: [{ totalCost: 300 }, { totalCost: 335 }],
  armoryStash: [],
  treasuryDucats: 0,
  ...over,
});

describe('the derived sequence', () => {
  it('is on the dataset, all six steps, in order', () => {
    expect(SEQ).toBeTruthy();
    expect(SEQ.steps.map((s) => s.step)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('states each clause a caller has to act on', () => {
    expect(SEQ.discardsArsenal).toBe(true);
    expect(SEQ.zeroesStrongbox).toBe(true);
    expect(SEQ.unspentLost).toBe(true);
    expect(SEQ.forgoesExplorationAndQuartermaster).toBe(true);
  });

  it('carries the book’s wording, so a screen can quote rather than paraphrase', () => {
    // This screen is about to empty two things a player spent a campaign
    // filling. It should be able to show them the rule.
    expect(SEQ.steps[0].text).toContain('abandoned when you fall back');
    expect(SEQ.steps[1].text).toContain('Strongbox to zero');
    expect(SEQ.steps[4].text).toContain('are lost');
    expect(SEQ.steps[5].text).toContain('Roster Step');
  });

  it('renders the Ducat glyph as a word, without stray spacing', () => {
    // The crown survives this extraction where it does not survive others, so
    // it is substituted rather than shipped as an unrenderable box.
    const all = SEQ.steps.map((s) => s.text).join(' ');
    expect(all).toContain('Ducats');
    expect(all).not.toContain('👑');
    expect(all).not.toMatch(/\s[,.)]/);
  });
});

describe('what it costs', () => {
  it('names every item leaving the Arsenal, not just how many', () => {
    // A player is losing these. "3 items discarded" is not good enough.
    const cost = reinforcementCost(DATASET, warband({
      armoryStash: [
        { id: 'a', name: 'Gas Mask' },
        { id: 'b', name: 'Medi-kit' },
      ],
    }), 2);
    expect(cost.arsenalDiscarded).toEqual([
      { id: 'a', name: 'Gas Mask' },
      { id: 'b', name: 'Medi-kit' },
    ]);
  });

  it('reports the whole Strongbox as lost', () => {
    expect(reinforcementCost(DATASET, warband({ treasuryDucats: 420 }), 2).strongboxLost)
      .toBe(420);
  });

  it('totals the Warband, excluding models removed from the roster', () => {
    /*
      Step 3 says "all the models in your Warband". A dead model is not in the
      Warband — counting it would inflate the total and shrink the allowance,
      punishing the player twice for the same casualty.
    */
    const cost = reinforcementCost(DATASET, warband({
      units: [{ totalCost: 300 }, { totalCost: 335 }, { totalCost: 500, isDead: true }],
    }), 2);
    expect(cost.warbandTotalCost).toBe(635);
  });

  it('computes the allowance the book’s own worked example gives', () => {
    /*
      "if the Total Cost of your Warband was 635, and the Threshold Value for
       the next game was 1,000, you can spend up to 365 Ducats".

      Checked against the real threshold table rather than a made-up 1,000, so
      this pins the arithmetic to whichever game actually has that Threshold.
    */
    const game = [...Array(20)].map((_, i) => i + 1)
      .find((n) => forceLimits(DATASET, n)?.threshold === 1000);
    expect(game, 'no game in the table has a Threshold of 1,000').toBeDefined();
    expect(reinforcementAllowance(DATASET, game!, 635)).toBe(365);
    expect(reinforcementCost(DATASET, warband(), game!).allowance).toBe(365);
  });

  it('never offers a negative allowance', () => {
    expect(reinforcementCost(DATASET, warband({
      units: [{ totalCost: 9999 }],
    }), 1).allowance).toBe(0);
  });

  it('carries the Papal States Threshold shift into the allowance', () => {
    // The −200 is the same rule, resolved in one place, so it reaches here
    // without this function knowing the Specialist Force exists.
    const plain = reinforcementCost(DATASET, warband(), 4).allowance!;
    const papal = reinforcementCost(
      DATASET,
      warband({ variantId: 'papalstatesinterventionforce' }),
      4,
    ).allowance!;
    expect(plain - papal).toBe(200);
  });

  it('says it does not know rather than inventing a number', () => {
    /*
      Rule 2. A dataset with no Threshold table yields `null`, and the screen
      shows that it cannot say — the one thing it must not do is print a
      plausible allowance a player then recruits against.
    */
    const empty = { ...DATASET, campaign: { ...DATASET.campaign, thresholds: [] } };
    expect(reinforcementCost(empty as typeof DATASET, warband(), 2).allowance).toBeNull();
  });
});

describe('a ruleset that does not state the sequence', () => {
  it('reports nothing rather than "Reinforcements is free"', () => {
    const empty = { ...DATASET, campaign: { ...DATASET.campaign, reinforcements: undefined } };
    expect(reinforcementsSequence(empty as typeof DATASET)).toBeNull();
  });
});
