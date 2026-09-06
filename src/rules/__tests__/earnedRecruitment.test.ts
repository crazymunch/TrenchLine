/**
 * A recruitment bound the Warband earns, and the price of earning it.
 *
 * `docs/RULES-COVERAGE-AUDIT.md` RC-08. *Curse on Creation* raises the Amalgam
 * limit to 0-2 in exchange for six Grail Thralls, on a condition, at a stated
 * moment. The ability was derived and rendered on the unit card and consumed by
 * nothing: the Amalgam's `max` of 1 stayed correct as a BASE bound, so a second
 * Amalgam was simply illegal whether or not a player had earned it. "There is
 * no rule-aware state distinguishing a legal second Amalgam from an illegal
 * one" — this is that state.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { boundFor, entitlementOf, eligibility } from '../earnedRecruitment';
import { validateRoster } from '../validate';
import type { Roster } from '../costs';

const AMALGAM = DATASET.units.find((u) => u.name === 'Amalgam')!;
const THRALL = DATASET.units.find((u) => u.name === 'Thrall')!;
const RULE = entitlementOf(AMALGAM)!;

let n = 0;
const model = (profile: typeof AMALGAM, totalCost: number) => ({
  id: `m${++n}`, profileName: profile.name, name: profile.name, totalCost,
});

const warband = (thralls: number, otherCost = 0, claims: never[] | undefined = undefined) => ({
  units: [
    ...Array.from({ length: thralls }, () => model(THRALL, 15)),
    ...(otherCost > 0 ? [model(AMALGAM, otherCost)] : []),
  ],
  claims,
});

const roster = (amalgams: number, earned = false): Roster => ({
  id: 'r', name: 'The Rot', factionId: 'Black Grail',
  units: Array.from({ length: amalgams }, () => ({
    ...model(AMALGAM, 0), profileId: AMALGAM.id, cost: AMALGAM.cost, items: [], options: [],
  })),
  stash: [], budget: { ducats: 5000, glory: 50 },
  ...(earned
    ? { earnedRecruitment: [{
        profileId: AMALGAM.id, grantedBy: RULE.grantedBy,
        claimedAt: '2026-01-01T00:00:00Z', spent: [],
      }] }
    : {}),
} as unknown as Roster);

describe('the rule is on the dataset, in its own words', () => {
  it('names what it costs, what it grants and when', () => {
    expect(RULE.grantedBy).toBe('Curse on Creation');
    expect(RULE.max).toBe(2);
    expect(RULE.spends).toEqual({ profileName: 'Thrall', count: 6 });
    expect(RULE.otherModelsCostAtLeast.ducats).toBe(1000);
    expect(RULE.step).toBe('Promotion Step');
    expect(RULE.freeRecruit).toBe(true);
    expect(RULE.text).toContain('remove 6 Grail Thralls');
  });

  it('leaves the base bound alone, which is correct as a base', () => {
    /*
      Raising `max` to 2 outright would contradict the condition — the audit
      says so explicitly. The base is 1 and the earned bound sits beside it.
    */
    expect(AMALGAM.max).toBe(1);
  });
});

describe('the bound in force', () => {
  it('is the base one for a Warband that has not claimed it', () => {
    expect(boundFor(AMALGAM, undefined, 1)).toBe(1);
    expect(boundFor(AMALGAM, [], 1)).toBe(1);
  });

  it('is the earned one once claimed', () => {
    expect(boundFor(AMALGAM, [{
      profileId: AMALGAM.id, grantedBy: 'Curse on Creation',
      claimedAt: 'x', spent: [],
    }], 1)).toBe(2);
  });

  it('is untouched for an entry with no such rule', () => {
    expect(boundFor(THRALL, undefined, null)).toBeNull();
  });
});

describe('whether it can be claimed', () => {
  it('needs six of the named model', () => {
    const v = eligibility(DATASET, AMALGAM, warband(5, 2000));
    expect(v.eligible).toBe(false);
    expect(v.blockers.join(' ')).toContain('6 Thralls must be removed; the Warband has 5');
  });

  it('needs the other models to be worth the threshold', () => {
    const v = eligibility(DATASET, AMALGAM, warband(6, 100));
    expect(v.eligible).toBe(false);
    expect(v.blockers.join(' ')).toContain('1000 Ducats');
  });

  it('does not count the six being given up towards the threshold', () => {
    /*
      They are what is being SPENT. Letting them also pay the threshold would
      let a Warband of nothing but expensive Thralls qualify on the strength of
      the very models it is about to lose.
    */
    const v = eligibility(DATASET, AMALGAM, {
      units: Array.from({ length: 6 }, () => model(THRALL, 200)),
      claims: undefined,
    });
    expect(v.othersCost.ducats).toBe(0);
    expect(v.eligible).toBe(false);
  });

  it('is eligible when both halves are met, and names the six', () => {
    const v = eligibility(DATASET, AMALGAM, warband(6, 1000));
    expect(v.eligible).toBe(true);
    expect(v.blockers).toEqual([]);
    expect(v.spendable).toHaveLength(6);
  });

  it('cannot be claimed twice', () => {
    const v = eligibility(DATASET, AMALGAM, {
      ...warband(6, 1000),
      claims: [{ profileId: AMALGAM.id, grantedBy: 'Curse on Creation', claimedAt: 'x', spent: [] }],
    });
    expect(v.eligible).toBe(false);
    expect(v.blockers.join(' ')).toContain('already been claimed');
  });

  it('matches the six by profile NAME, not by a re-keyed id', () => {
    /*
      `ActiveUnit.baseProfileId` is the id of the HYDRATED catalogue entry, and
      hydration re-keys: the Amalgam is one id in the dataset and another in
      the store. An id comparison here matches nothing and every Warband looks
      ineligible — which is how this first failed.
    */
    const v = eligibility(DATASET, AMALGAM, {
      units: [
        ...Array.from({ length: 6 }, () => ({
          id: `x${++n}`, profileName: 'Thrall', name: 'Thrall', totalCost: 15,
        })),
        { id: 'rich', profileName: 'Amalgam', name: 'Amalgam', totalCost: 1000 },
      ],
    });
    expect(v.eligible).toBe(true);
  });

  it('says so rather than guessing when the ruleset has no such entry', () => {
    // Rule 2: a ruleset whose Thrall is renamed does not silently spend
    // something else.
    const noThrall = { ...DATASET, units: DATASET.units.filter((u) => u.name !== 'Thrall') };
    const v = eligibility(noThrall as typeof DATASET, AMALGAM, warband(6, 1000));
    expect(v.eligible).toBe(false);
    expect(v.blockers.join(' ')).toContain('no entry named "Thrall"');
  });
});

describe('the validator', () => {
  it('rejects a second Amalgam, and says what would allow it', () => {
    const out = validateRoster(roster(2), DATASET);
    const v = out.violations.find((x) => x.code === 'unit-max')!;
    expect(v).toBeDefined();
    expect(v.message).toContain('Curse on Creation would raise it to 2');
  });

  it('allows the second once the entitlement is on the roster', () => {
    expect(validateRoster(roster(2, true), DATASET).violations
      .filter((v) => v.code === 'unit-max')).toEqual([]);
  });

  it('still rejects a third', () => {
    const out = validateRoster(roster(3, true), DATASET);
    expect(out.violations.find((x) => x.code === 'unit-max')!.message)
      .toContain('limit is 2');
  });
});
