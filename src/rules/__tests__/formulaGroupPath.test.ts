/**
 * A Formula in a sub-group is still a Formula.
 *
 * `isAlchemicalFormula` has documented the group as looking like
 * `Alchemical Formulae::Eye Options` since the day it was written, and matched
 * by containment so that "a sub-group counts as its parent". The pipeline
 * never emitted such a value: `optionsOf` let a nested group REPLACE its
 * parent's name, so Hawk Eyes and Hypnotic Eyes arrived as the bare leaf
 * `Eye Options` — and the one sub-group that comment names was the single case
 * the predicate could not answer.
 *
 * The consequence is on the model, not in the abstract. `UnitAdvancementModal`
 * writes the group as the purchase's `category`, and `formulaeOf` reads
 * `specialUpgrades` by asking whether that category contains
 * `Alchemical Formulae`. A Hawk Eyes bought in the app wrote `Eye Options`,
 * so the model that bought it did not have a Formula by that name anywhere:
 * not in `traitsOf`, not in `chosenBy`, not in the card's Formula section.
 */
import { describe, it, expect } from 'vitest';
import { DATASET } from '@/data/generated/trenchline.generated';
import {
  isAlchemicalFormula, inFormulaGroup, formulaeOf, ALCHEMICAL_FORMULAE,
} from '@/rules/formulae';

const optionsWith = (name: string) =>
  DATASET.units.flatMap((u) => u.options ?? []).filter((o) => o.name === name);

describe('the dataset', () => {
  it('carries the Eye Options under a path naming their parent', () => {
    const hawk = optionsWith('Hawk Eyes');
    expect(hawk.length).toBeGreaterThan(0);
    // The leaf stays the leaf: it is the heading a player reads.
    expect(hawk.every((o) => o.group === 'Eye Options')).toBe(true);
    expect(hawk.every((o) => o.groupPath === 'Alchemical Formulae::Eye Options')).toBe(true);
  });

  it('leaves a top-level group without a path, rather than repeating itself', () => {
    const top = DATASET.units.flatMap((u) => u.options ?? [])
      .filter((o) => o.group === ALCHEMICAL_FORMULAE);
    expect(top.length).toBeGreaterThan(0);
    expect(top.every((o) => o.groupPath === undefined)).toBe(true);
  });

  it('keeps the other nested groups too, which lost their parent the same way', () => {
    // Goetic Powers has one sub-group per Sin, and every one of them was
    // arriving as the bare Sin name.
    const paths = new Set(DATASET.units.flatMap((u) => u.options ?? [])
      .map((o) => o.groupPath).filter(Boolean));
    expect([...paths].some((p) => p!.startsWith('Goetic Powers::'))).toBe(true);
  });
});

describe('the predicate', () => {
  it('accepts a sub-group by its path', () => {
    expect(isAlchemicalFormula({
      name: 'Hawk Eyes', group: 'Eye Options',
      groupPath: 'Alchemical Formulae::Eye Options',
    })).toBe(true);
  });

  it('still accepts a top-level group with no path', () => {
    expect(isAlchemicalFormula({ name: 'Human Hands', group: ALCHEMICAL_FORMULAE })).toBe(true);
  });

  it('refuses a group that is not one, path or no path', () => {
    expect(isAlchemicalFormula({ name: 'Wrath', group: 'Wrath', groupPath: 'Goetic Powers::Wrath' }))
      .toBe(false);
    expect(isAlchemicalFormula({ name: 'Bloodlust', group: 'Strains' })).toBe(false);
  });

  it('answers a bare group string the same way, for the category branch', () => {
    expect(inFormulaGroup('Alchemical Formulae::Eye Options')).toBe(true);
    expect(inFormulaGroup('Eye Options')).toBe(false);
    expect(inFormulaGroup(undefined)).toBe(false);
  });
});

describe('a model that bought one', () => {
  const unit = (category: string) => ({
    specialUpgrades: [{ name: 'Hawk Eyes', category }],
  });

  it('counts it when the category carries the path', () => {
    expect(formulaeOf(unit('Alchemical Formulae::Eye Options'))).toEqual(['Hawk Eyes']);
  });

  it('did not count it when the category was the bare leaf — the defect', () => {
    expect(formulaeOf(unit('Eye Options'))).toEqual([]);
  });

  it('keeps counting what an older purchase wrote', () => {
    // Before the group was carried through at all, an in-app purchase wrote
    // the singular `Alchemical Formula`. A saved roster still says that.
    expect(formulaeOf(unit('Alchemical Formula'))).toEqual(['Hawk Eyes']);
    expect(formulaeOf(unit(ALCHEMICAL_FORMULAE))).toEqual(['Hawk Eyes']);
  });
});
