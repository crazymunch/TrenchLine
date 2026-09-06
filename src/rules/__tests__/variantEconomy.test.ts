/**
 * The Papal States Intervention Force musters on its own economy.
 *
 * Reported by a player: "you gotta adjust the starting settings for papal
 * states — they start with 500 ducats an 11 glory instead of 700 ducats."
 * He was right, and the app was worse than merely wrong: it displayed the
 * Specialist Force rule stating 500 and 11 on the same screen that handed out
 * 700 and 0.
 *
 * Tested against the real dataset rather than a fixture. The whole failure was
 * that the rule existed as prose nothing read, so a fixture asserting the
 * numbers I typed would pass whether or not the pipeline derives them.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { musterBudget, forceLimits, reinforcementAllowance, reinforcementGlory } from '../campaign';
import { checkForceLimits } from '../validate';

const PAPAL = 'papalstatesinterventionforce';
const NEW_ANTIOCH = 'new-antioch';

describe('the dataset', () => {
  it('derives the Papal States economy from the rule prose', () => {
    const v = DATASET.variants.find((x) => x.id === PAPAL)!;
    expect(v.budget).toEqual({ ducats: 500, glory: 11 });
    expect(v.thresholdDelta).toBe(-200);
    expect(v.reinforcementGlory).toBe(4);
    // Traceable back to the sentence it was read from, not just to this file.
    expect(v.economyFrom).toBe('Specialist Force');
  });

  it('gives every other variant no economy of its own', () => {
    const others = DATASET.variants.filter((v) => v.id !== PAPAL);
    expect(others.length).toBeGreaterThan(20);
    for (const v of others) {
      expect(v.budget, `${v.id} states a budget`).toBeUndefined();
      expect(v.thresholdDelta, `${v.id} states a threshold shift`).toBeUndefined();
      expect(v.reinforcementGlory, `${v.id} states a payout`).toBeUndefined();
    }
  });

  it('still puts every faction on 700 Ducats and no Glory', () => {
    for (const f of DATASET.factions) {
      expect(f.budget, f.id).toMatchObject({ ducats: 700, glory: 0 });
    }
  });
});

describe('musterBudget', () => {
  it('gives a Papal States warband 500 Ducats and 11 Glory', () => {
    expect(musterBudget(DATASET, NEW_ANTIOCH, PAPAL)).toEqual({ ducats: 500, glory: 11 });
  });

  it('gives its parent faction the standard 700 and none', () => {
    expect(musterBudget(DATASET, NEW_ANTIOCH)).toEqual({ ducats: 700, glory: 0 });
  });

  it('gives a sibling variant of the same faction the faction’s purse', () => {
    expect(musterBudget(DATASET, NEW_ANTIOCH, 'eirerangers')).toEqual({ ducats: 700, glory: 0 });
  });

  it('resolves the variant by name as well as by id, as saved warbands are', () => {
    expect(musterBudget(DATASET, NEW_ANTIOCH, 'Papal States Intervention Force'))
      .toEqual({ ducats: 500, glory: 11 });
  });

  it('falls back to the faction when the variant is unknown, never to nothing', () => {
    expect(musterBudget(DATASET, NEW_ANTIOCH, 'no-such-variant'))
      .toEqual({ ducats: 700, glory: 0 });
  });

  it('returns null rather than 700 when a dataset states no budget at all', () => {
    // Rule 2: a caller must be able to tell "the dataset is broken" from "this
    // warband musters on 700", because those need different handling.
    const empty = { ...DATASET, factions: [], variants: [], campaign: {} } as unknown as typeof DATASET;
    expect(musterBudget(empty, NEW_ANTIOCH)).toBeNull();
  });
});

describe('the Threshold Value shift', () => {
  it('lowers every published row by 200 for a Papal States force', () => {
    for (const game of [1, 4, 12]) {
      const standard = forceLimits(DATASET, game)!;
      const papal = forceLimits(DATASET, game, PAPAL)!;
      expect(papal.threshold).toBe(standard.threshold - 200);
      // Only the Threshold moves: Field Strength is not part of the rule.
      expect(papal.fieldStrength).toBe(standard.fieldStrength);
    }
  });

  it('shifts the held-at-last-row value too, past the published table', () => {
    const standard = forceLimits(DATASET, 20)!;
    const papal = forceLimits(DATASET, 20, PAPAL)!;
    expect(papal.extrapolated).toBe(true);
    expect(papal.threshold).toBe(standard.threshold - 200);
  });

  it('leaves a warband with no variant on the published row', () => {
    expect(forceLimits(DATASET, 1)!.threshold).toBe(forceLimits(DATASET, 1, undefined)!.threshold);
    expect(forceLimits(DATASET, 1, 'eirerangers')!.threshold).toBe(700);
  });

  it('warns a Papal States force 200 Ducats earlier than a standard one', () => {
    // 620 Ducats at game 1: legal for anyone else, over the Papal States cap.
    expect(checkForceLimits(620, 9, forceLimits(DATASET, 1)!)).toEqual([]);

    const v = checkForceLimits(620, 9, forceLimits(DATASET, 1, PAPAL)!);
    expect(v.map((x) => x.code)).toEqual(['force-over-threshold']);
    expect(v[0].message).toContain('Threshold Value of 500');
    expect(v[0].message).toContain('120 Ducats');
  });
});

describe('the Reinforcements payout', () => {
  it('pays a Papal States force 4 Glory', () => {
    expect(reinforcementGlory(DATASET, PAPAL)).toBe(4);
  });

  it('pays every other warband nothing', () => {
    expect(reinforcementGlory(DATASET, 'eirerangers')).toBe(0);
    expect(reinforcementGlory(DATASET, undefined)).toBe(0);
  });

  it('computes the Ducat allowance against the shifted Threshold', () => {
    // The allowance is Threshold minus the warband's cost, so the -200 carries
    // through here as well — this is the same rule, not a second one.
    expect(reinforcementAllowance(DATASET, 4, 635)).toBe(365);
    expect(reinforcementAllowance(DATASET, 4, 635, PAPAL)).toBe(165);
  });

  it('never returns a negative allowance for a shifted Threshold', () => {
    expect(reinforcementAllowance(DATASET, 1, 900, PAPAL)).toBe(0);
  });
});

/**
 * Gear ships under the name the books print.
 *
 * Separate from the economy above, and here because it is the same class of
 * failure: a published rule that the pipeline had and the app did not.
 *
 * A BattleScribe entry carries two names — the `selectionEntry`'s and its
 * profile's — and the pipeline ships the profile's. Where a community
 * catalogue has a transcription slip, the app carried an official weapon under
 * a name no official document prints, and the Dispatch op written against the
 * real name found nothing. It reported `target not found` on every build and
 * the build went green.
 */
describe('gear named as the books name it', () => {
  const weapon = (name: string) => DATASET.weapons.find((w) => w.name === name);

  it('carries the Demonic Aura Grenade under the rulebook’s name', () => {
    // The rulebook prints "Demonic Aura Grenade" in the Glory Items table and
    // four times in its rules text; the catalogue profile said "Demonic
    // Grenade", and that is what shipped.
    expect(weapon('Demonic Grenade'), 'the catalogue misspelling still ships').toBeUndefined();
    expect(weapon('Demonic Aura Grenade')).toBeDefined();
  });

  it('applies the Dispatch’s FUMBLE to it, which the old name silently lost', () => {
    // This is the whole point. The op could not find its target, so the
    // published keyword was simply absent.
    expect(weapon('Demonic Aura Grenade')!.keywords).toContain('FUMBLE');
  });

  it('carries Call of the Flesh, a Goetic Power, under its book name', () => {
    expect(weapon('Call of Flesh')).toBeUndefined();
    expect(weapon('Call of the Flesh')).toBeDefined();
  });

  it('records what the catalogue called it, so the rename is traceable', () => {
    const w = weapon('Demonic Aura Grenade') as { profileName?: string };
    expect(w.profileName).toBe('Demonic Grenade');
  });

  it('leaves the catalogues’ deliberate decorations alone', () => {
    // The Court's looted copy is a different entry with its own restrictions.
    // A first pass at this renamed 123 things and would have collapsed them.
    expect(weapon('Claimed: Automatic Pistol')).toBeDefined();
    expect(weapon('Stolen: Sniper Rifle')).toBeDefined();
  });

  it('does not ship the build’s own scaffolding to every phone', () => {
    // `entryName` existed on 226 weapons and nothing in the app reads it. The
    // dataset is fetched over the wire.
    const leaked = DATASET.weapons.filter((w) => 'entryName' in (w as object));
    expect(leaked.map((w) => w.name)).toEqual([]);
  });
});
