/**
 * Re-creation, and the two different deadlines it is printed with.
 *
 * FD-13b's first item was declined on the grounds that this rule "is not in
 * any source this repository carries". That was wrong: the search behind it
 * looked for "post-battle sequence" in the extracted PDF, which breaks the
 * word across a line as `post-` / `battle`. The sentence is at Warbands
 * L5324-L5327, in the catalogue at `Iron Sultanate.cat` L3362, and in the
 * shipped dataset six times.
 *
 * So the first thing these tests pin is that it is really there, read from
 * the dataset rather than from a phrase search — and the second is the thing
 * that makes it two rules rather than one: the Takwin's offer expires with
 * the following Quartermaster Step, the Golem's does not expire at all.
 */
import { describe, it, expect } from 'vitest';
import { DATASET } from '@/data/generated/trenchline.generated';
import { recreationFromText, recreationOffer, recreationEntries } from '@/rules/recreation';

/** Warbands L5324-L5327, as the catalogue prints it. */
const TAKWIN = 'If a Takwin Homunculus is killed in the post-battle sequence, you do not '
  + 'have to remove it from your roster. Instead, you can spend 40 ducats in the '
  + 'following Quartermaster Step to leave it on the Roster.';

/** The Book of Golems find, as the catalogue prints it. */
const GOLEM = 'If the Homunculus is taken Out of Action during battle, and is deemed to '
  + 'have been killed in the post-battle sequence, you do not have to remove it from '
  + 'your roster. Instead, you can spend 40 ducats at any time between battles to '
  + 'bring it back to life with all of its weapons and abilities';

describe('reading the sentence', () => {
  it('reads the Takwin Homunculus offer and its deadline', () => {
    expect(recreationFromText({ name: 'Re-creation', description: TAKWIN })).toMatchObject({
      ability: 'Re-creation',
      cost: { ducats: 40, glory: 0 },
      deadline: 'quartermaster',
    });
  });

  it('reads the Golem offer, which does not expire', () => {
    expect(recreationFromText({ name: 'Re-creation', description: GOLEM })).toMatchObject({
      cost: { ducats: 40, glory: 0 },
      deadline: 'between-battles',
    });
  });

  it('is not fooled by an ability that merely mentions the post-battle sequence', () => {
    expect(recreationFromText({
      name: 'Artificial Life',
      description: 'Add -1 DICE to Injury Rolls for a Takwin Homunculus.',
    })).toBeNull();
    expect(recreationFromText({
      name: 'Something',
      description: 'If this model is killed in the post-battle sequence, remove it.',
    })).toBeNull();
  });

  it('refuses an offer whose deadline it cannot read', () => {
    /*
      Both defaults are wrong in a way a player would not see: `quartermaster`
      discards a Golem its owner could still have saved, `between-battles`
      keeps a Takwin a campaign after the book took it away. So it is not
      offered, and the model falls as it would have before.
    */
    expect(recreationFromText({
      name: 'Re-creation',
      description: 'If a Takwin Homunculus is killed in the post-battle sequence, you do '
        + 'not have to remove it from your roster. Instead, you can spend 40 ducats.',
    })).toBeNull();
  });

  it('reads a Glory price as Glory', () => {
    // Nothing in the book prices Re-creation in Glory. Pinned because the
    // currency is a real field and `{ducats: 40}` for a Glory cost is the
    // FD-05g defect one layer up.
    expect(recreationFromText({
      name: 'Re-creation',
      description: 'If it is killed in the post-battle sequence, you do not have to remove '
        + 'it from your roster. Instead, you can spend 3 Glory in the following '
        + 'Quartermaster Step to leave it on the Roster.',
    })).toMatchObject({ cost: { ducats: 0, glory: 3 } });
  });
});

describe('a model on a roster', () => {
  const withAbility = (description: string) => ({
    profileSnapshot: {
      innateAbilities: [
        { id: 'a', name: 'Artificial Life', description: 'Add -1 DICE to Injury Rolls.' },
        { id: 'b', name: 'Re-creation', description },
      ],
    },
  } as unknown as Parameters<typeof recreationOffer>[0]);

  it('carries the offer its own profile snapshot states', () => {
    expect(recreationOffer(withAbility(TAKWIN))?.deadline).toBe('quartermaster');
    expect(recreationOffer(withAbility(GOLEM))?.deadline).toBe('between-battles');
  });

  it('carries none when nothing on it says so', () => {
    expect(recreationOffer({ profileSnapshot: { innateAbilities: [] } } as never)).toBeNull();
    expect(recreationOffer(null)).toBeNull();
    expect(recreationOffer({} as never)).toBeNull();
  });
});

describe('the ruleset as shipped', () => {
  it('carries the rule, which is the claim FD-13b was declined on', () => {
    const entries = recreationEntries(DATASET);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((e) => e.offer.cost.ducats === 40)).toBe(true);
  });

  it('prints both deadlines, so the app cannot model one and call it done', () => {
    const deadlines = new Set(recreationEntries(DATASET).map((e) => e.offer.deadline));
    expect([...deadlines].sort()).toEqual(['between-battles', 'quartermaster']);
  });

  it('puts it on the Homunculus entries and nothing else', () => {
    const names = new Set(recreationEntries(DATASET).map((e) => e.unit));
    expect([...names].every((n) => /Homunculus/i.test(n))).toBe(true);
  });
});
