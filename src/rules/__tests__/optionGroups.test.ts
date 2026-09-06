/**
 * The Black Grail's group rules, which shipped as five loose toggles.
 *
 * `docs/RULES-COVERAGE-AUDIT.md` RC-07. The four Strains and the Vile Corpus
 * are present, priced and displayed; their governing clauses were not there at
 * all. `Constraint` sits on one option and can only say "at most one Bolgias
 * Gut" — the rules are about the group, and the dataset had no shape for that,
 * so nothing counted them and nothing compared two models.
 *
 * Pinned against the real dataset, because the finding is a published sentence
 * with no representation rather than a value being wrong.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { validateRoster } from '../validate';
import {
  allowanceFor, groupBreaches, heldIn, optionGroupsOf, otherModelsCost, permanenceOf,
} from '../optionGroups';
import type { Roster } from '../costs';

const THRALL = DATASET.units.find((u) => u.name === 'Thrall')!;
const AMALGAM = DATASET.units.find((u) => u.name === 'Amalgam')!;
const STRAINS = optionGroupsOf(THRALL)[0];

const opt = (name: string) => {
  const o = (THRALL.options ?? []).find((x) => x.name === name)!;
  return { name: o.name, cost: o.cost };
};

const corpus = (name: string) => {
  const o = (AMALGAM.options ?? []).find((x) => x.name === name)!;
  return { name: o.name, cost: o.cost };
};

let n = 0;
const thrall = (options: { name: string; cost: unknown }[] = [], cost = 15) => ({
  id: `t${++n}`, profileId: THRALL.id, name: 'Thrall',
  cost: { ducats: cost, glory: 0 }, items: [], options,
});

const amalgam = (options: { name: string; cost: unknown }[] = []) => ({
  id: `a${++n}`, profileId: AMALGAM.id, name: 'Amalgam',
  cost: AMALGAM.cost, items: [], options,
});

const roster = (units: unknown[]): Roster => ({
  id: 'r', name: 'The Rot', factionId: 'Black Grail',
  units, stash: [], budget: { ducats: 5000, glory: 50 },
} as unknown as Roster);

describe('the rules are on the dataset, in the source’s own words', () => {
  it('states the Strain allowance, its condition and its permanence', () => {
    expect(STRAINS.group).toBe('Strains');
    expect(STRAINS.max).toBe(1);
    expect(STRAINS.permanent).toBe(true);
    expect(STRAINS.bonus!.max).toBe(1);
    expect(STRAINS.bonus!.otherModelsCostAtLeast.ducats).toBe(1000);
    expect(STRAINS.text).toContain('cannot be removed or lost');
  });

  it('states that each Amalgam’s Vile Corpus must be different', () => {
    const vile = optionGroupsOf(AMALGAM)[0];
    expect(vile.group).toBe('Vile Corpus');
    expect(vile.max).toBe(1);
    expect(vile.distinctPerRoster).toBe(true);
    expect(vile.permanent).toBe(true);
  });

  it('also carries the half of the sentence about Battlekit', () => {
    // "A Grail Thrall cannot have any Battlekit but can have up to 1 Strain."
    // One sentence; transcribing half of it would have been a choice.
    expect(THRALL.battlekitNote).toContain('cannot have any Battlekit');
  });
});

describe('one Strain, or two', () => {
  it('allows the first', () => {
    const r = roster([thrall([opt('Bolgias Gut')])]);
    expect(groupBreaches(DATASET, r)).toEqual([]);
  });

  it('refuses the second on an ordinary Warband', () => {
    const r = roster([thrall([opt('Bolgias Gut'), opt('Leech Grip')])]);
    const [breach] = groupBreaches(DATASET, r);
    expect(breach.kind).toBe('over-allowance');
    expect(breach.max).toBe(1);
    expect(breach.held).toEqual(['Bolgias Gut', 'Leech Grip']);
  });

  it('allows the second once the OTHER models are worth 1000', () => {
    const rich = roster([
      thrall([opt('Bolgias Gut'), opt('Leech Grip')]),
      thrall([], 1000),
    ]);
    expect(groupBreaches(DATASET, rich)).toEqual([]);
    expect(allowanceFor(STRAINS, rich, rich.units[0].id))
      .toMatchObject({ max: 2, bonusApplies: true });
  });

  it('does not let a model qualify itself', () => {
    /*
      "the total cost of all of the OTHER models in the Warband". A single
      1000-Ducat Thrall counts nothing towards its own second Strain — reading
      it as the whole roster would make the condition self-satisfying.
    */
    const alone = roster([thrall([opt('Bolgias Gut'), opt('Leech Grip')], 1000)]);
    expect(otherModelsCost(alone, alone.units[0].id)).toEqual({ ducats: 0, glory: 0 });
    expect(groupBreaches(DATASET, alone)).toHaveLength(1);
  });

  it('counts what the other models paid for their own options', () => {
    // "(including their Battlekit, etc.)" — a model's cost is its whole cost.
    const r = roster([thrall([], 995), thrall([opt('Bolgias Gut')])]);
    expect(otherModelsCost(r, r.units[0].id).ducats).toBe(15 + 10);
  });

  it('refuses a third even on a rich Warband', () => {
    const r = roster([
      thrall([opt('Bolgias Gut'), opt('Leech Grip'), opt('Tapeworm Throng')]),
      thrall([], 2000),
    ]);
    expect(groupBreaches(DATASET, r)[0].max).toBe(2);
  });
});

describe('a Vile Corpus each Amalgam must not share', () => {
  it('is fine on one Amalgam', () => {
    expect(groupBreaches(DATASET, roster([amalgam([corpus('Bombardment Horde')])])))
      .toEqual([]);
  });

  it('reports BOTH models when two share one', () => {
    /*
      Both, because the fix is a conversation about two models and telling the
      player about only one of them leaves them looking for the other.
    */
    const r = roster([
      amalgam([corpus('Bombardment Horde')]),
      amalgam([corpus('Bombardment Horde')]),
    ]);
    const shared = groupBreaches(DATASET, r).filter((b) => b.kind === 'not-distinct');
    expect(shared).toHaveLength(2);
    expect(shared[0].shared).toBe('Bombardment Horde');
  });
});

describe('permanence', () => {
  it('names the rule that says a Strain cannot be given up', () => {
    expect(permanenceOf(THRALL, 'Bolgias Gut')?.text).toContain('cannot be removed or lost');
  });

  it('says nothing about an option no group rule governs', () => {
    expect(permanenceOf(THRALL, 'Not A Strain')).toBeNull();
  });
});

describe('the validator', () => {
  it('rejects the two-Strain Thrall, naming the sentence', () => {
    const out = validateRoster(roster([thrall([opt('Bolgias Gut'), opt('Leech Grip')])]), DATASET);
    const v = out.violations.find((x) => x.code === 'option-group-max')!;
    expect(v).toBeDefined();
    expect(v.severity).toBe('error');
    expect(v.rule).toContain('up to 1 Strain');
  });

  it('rejects two Amalgams holding the same Corpus', () => {
    const out = validateRoster(roster([
      amalgam([corpus('Bombardment Horde')]),
      amalgam([corpus('Bombardment Horde')]),
    ]), DATASET);
    expect(out.violations.filter((x) => x.code === 'option-group-distinct')).toHaveLength(2);
  });

  it('leaves a legal Black Grail roster alone', () => {
    const out = validateRoster(roster([thrall([opt('Bolgias Gut')]), thrall()]), DATASET);
    expect(out.violations.filter((v) => v.code.startsWith('option-group'))).toEqual([]);
  });
});

describe('a ruleset that states no group rules', () => {
  it('reports nothing rather than inventing an allowance', () => {
    const plain = {
      ...DATASET,
      units: DATASET.units.map((u) => ({ ...u, optionGroups: undefined })),
    };
    expect(groupBreaches(plain as typeof DATASET,
      roster([thrall([opt('Bolgias Gut'), opt('Leech Grip')])]))).toEqual([]);
    expect(heldIn(thrall([opt('Bolgias Gut')]) as never, 'Strains', THRALL))
      .toEqual(['Bolgias Gut']);
  });
});
