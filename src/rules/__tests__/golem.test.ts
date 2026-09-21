/**
 * The Book of Golems, as the shipped Exploration table states it.
 *
 * FD-13b. Every clause is read out of the row's own sentences rather than
 * retyped, so if the pipeline ever stops producing that text these fail
 * instead of the app quietly applying a remembered version of the rule.
 */
import { describe, it, expect } from 'vitest';
import { DATASET } from '@/data/generated/trenchline.generated';
import {
  golemGrant, golemKeywords, freeFormulaBudgetLeft, isGolem, GOLEM_GRANTED_BY,
} from '../golem';
import { canBePromoted } from '../promotions';
import type { Dataset } from '@/types/catalogue';
import type { ActiveUnit } from '@/types/warband';

const D = DATASET as unknown as Dataset;

describe('the grant, from the Exploration table', () => {
  const g = golemGrant(D)!;

  it('is Exploration 17, Book of Golems', () => {
    expect(g).toBeTruthy();
    expect(g.roll).toBe('17');
    expect(g.name).toBe('Book of Golems');
  });

  it('reads the free-Formula budget off the sentence, not a constant', () => {
    expect(g.freeFormulaDucats).toBe(50);
    expect(g.text).toContain('worth a total of up to 50');
  });

  it('reads the Formula the model is created holding', () => {
    expect(g.startsWith).toBe('Human Hands');
  });

  it('reads both Keywords: GOLEM gained, SULTANATE replaced', () => {
    expect(g.addsKeyword).toBe('GOLEM');
    expect(g.replacesKeyword).toBe('SULTANATE');
  });

  it('reads the three standing restrictions', () => {
    expect(g.neverPromoted).toBe(true);
    expect(g.noFurtherFormulas).toBe(true);
    expect(g.hostArmoury).toBe(true);
  });

  /*
    The catalogue says "a Homunculus of up to 100 ducats of value (40 ducats
    base cost)". The rulebook grants Human Hands plus fifty Ducats of Formulas
    and prices the model at nothing. Precedence is rulebook over catalogue, and
    this asserts the app took the rulebook's shape.
  */
  it('does not carry the catalogue’s "100 ducats of value" phrasing', () => {
    expect(g.text).not.toMatch(/100 ducats/i);
    expect(g.text).toMatch(/Add a Takwin Homunculus/i);
  });

  it('finds nothing in a ruleset with no Exploration table', () => {
    expect(golemGrant(null)).toBeNull();
    expect(golemGrant(undefined)).toBeNull();
  });
});

describe('the Golem’s Keywords', () => {
  const g = golemGrant(D)!;

  it('swaps SULTANATE for the host’s and adds GOLEM', () => {
    expect(golemKeywords(g, ['SULTANATE', 'TOUGH'], 'HERETIC'))
      .toEqual(['TOUGH', 'HERETIC', 'GOLEM']);
  });

  /* The design's own case: the host IS the Sultanate, so it keeps SULTANATE. */
  it('leaves a Sultanate host holding SULTANATE', () => {
    const out = golemKeywords(g, ['SULTANATE', 'TOUGH'], 'SULTANATE');
    expect(out).toContain('SULTANATE');
    expect(out).toContain('GOLEM');
  });

  it('does not add GOLEM twice', () => {
    const out = golemKeywords(g, ['SULTANATE', 'GOLEM'], 'HERETIC');
    expect(out.filter((k) => k === 'GOLEM')).toHaveLength(1);
  });

  it('leaves the entry alone where there is no grant', () => {
    expect(golemKeywords(null, ['SULTANATE'], 'HERETIC')).toEqual(['SULTANATE']);
  });
});

describe('the free-Formula budget', () => {
  const g = golemGrant(D)!;

  it('starts at the sentence’s fifty and spends down', () => {
    expect(freeFormulaBudgetLeft(g, 0)).toBe(50);
    expect(freeFormulaBudgetLeft(g, 20)).toBe(30);
    expect(freeFormulaBudgetLeft(g, 50)).toBe(0);
  });

  /* Overspend is clamped, not negative: the next Formula costs Ducats. */
  it('never goes below zero', () => {
    expect(freeFormulaBudgetLeft(g, 70)).toBe(0);
  });

  it('is nothing at all without a grant', () => {
    expect(freeFormulaBudgetLeft(null, 0)).toBe(0);
  });
});

describe('recognising a Golem on the roster', () => {
  it('reads the grant that created it', () => {
    expect(isGolem({ grantedBy: GOLEM_GRANTED_BY })).toBe(true);
    expect(isGolem({ grantedBy: 'Weapon Collections' })).toBe(false);
    expect(isGolem({})).toBe(false);
    expect(isGolem(null)).toBe(false);
  });
});

/**
 * "The model is treated as an Ally that can never be Promoted."
 *
 * Its own block reason rather than the rulebook's Models That Cannot Be
 * Promoted table: that table lists ENTRIES, and the Takwin Homunculus is not
 * in it. What forbids this promotion is how the model arrived, so the same
 * entry recruited out of the Armoury promotes normally.
 */
describe('a Golem is never Promoted', () => {
  const troop = (over: Partial<ActiveUnit> = {}): ActiveUnit => ({
    id: 'u1', customName: 'Al-Mudawwan', baseProfileId: '02c4-88da-ec78-8a33',
    profileSnapshot: { name: 'Homunculus', category: 'Trooper', elite: false, stats: {} },
    equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
    xp: 0, advancements: [], injuries: [], isDead: false, totalCost: 40,
    ...over,
  } as unknown as ActiveUnit);

  const band = { units: [] as ActiveUnit[] };

  it('refuses a granted Golem, naming the grant', () => {
    const v = canBePromoted(D, troop({ grantedBy: GOLEM_GRANTED_BY }), band);
    expect(v.eligible).toBe(false);
    expect(v.reason).toBe('granted-ally');
    expect(v.detail).toContain('Book of Golems');
    expect(v.detail).toMatch(/never be Promoted/i);
  });

  /* The same entry, hired rather than granted, is untouched by the rule. */
  it('leaves the same entry alone when it was simply recruited', () => {
    const v = canBePromoted(D, troop(), band);
    expect(v.reason).not.toBe('granted-ally');
  });
});
