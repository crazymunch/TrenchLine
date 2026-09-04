/**
 * A carrying allowance a model's own entry states.
 *
 * "Unless otherwise stated" is the first line of the Battlekit Limits, and
 * Warbands of Trench Crusade states otherwise under Human Hands:
 *
 *   "If a Takwin Homunculus with Human hands also has an Additional Arm, then
 *    it can have three 1-Handed Melee Weapons or one 1-Handed Melee Weapon and
 *    one 2-Handed Melee Weapon, and it can have three 1-Handed Ranged Weapons
 *    or one 1-Handed Ranged Weapon and one 2-Handed Ranged Weapon. If it takes
 *    a Shield, then the Shield replaces one of the Melee Weapons it can have
 *    but the Shield Combo rule cannot be used for any of its weapons."
 *
 * Reported by the app's owner: his Homunculus was told its Siege Jezzail was
 * illegal. It is a 2-Handed RANGED weapon, and the Shield replaces a MELEE one.
 */
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { battlekitBreaches, type Carried, type CarrierContext } from '../battlekitLimits';
import type { Dataset } from '@/types/catalogue';

const d = DATASET as unknown as Dataset;
const allowance = (d.carryAllowances ?? [])[0];

const ctx = (traits: string[]): CarrierContext => ({ dataset: d, traits });
const item = (name: string): Carried => ({ name });

describe('the allowance the book states for a Homunculus', () => {
  it('is read from the book, with its condition named by the sentence itself', () => {
    expect(allowance).toBeDefined();
    expect(allowance.model).toBe('Takwin Homunculus');
    expect(allowance.requires.map((r) => r.toLowerCase()).sort())
      .toEqual(['additional arm', 'human hands']);
    expect(allowance.shieldReplaces).toBe('Melee Weapons');
    expect(allowance.shieldComboUsable).toBe(false);
  });

  it('reads the alternatives as combinations, not as a hand count', () => {
    /*
      "three 1-Handed ... or one 1-Handed and one 2-Handed" is three items in
      one branch and three hands in the other. Another entry in the same book
      says "up to three 1-Handed OR two 1-Handed and one 2-Handed" — three
      items against four hands. One capacity number cannot state both.
    */
    expect(allowance.bySection['Melee Weapons']).toEqual([{ '1': 3 }, { '1': 1, '2': 1 }]);
    expect(allowance.bySection['Ranged Weapons']).toEqual([{ '1': 3 }, { '1': 1, '2': 1 }]);
  });
});

describe('a Homunculus with Human Hands and an Additional Arm', () => {
  const traits = ['Human Hands', 'Additional Arm'];

  it('may carry a 2-Handed RANGED weapon alongside a Shield', () => {
    /*
      The reported bug. The chapter forbids a 2-Handed weapon with a Shield
      unless both have Shield Combo; this entry says the Shield replaces a
      MELEE weapon, and forbids using Shield Combo at all — so demanding the
      stipulation asks for something the model may not do.
    */
    const breaches = battlekitBreaches(
      [item('Siege Jezzail'), item('Fire Shield')], ctx(traits));

    expect(breaches.map((b) => b.message).join(' | ')).not.toMatch(/Siege Jezzail/);
  });

  it('may carry one 1-Handed and one 2-Handed melee weapon', () => {
    const breaches = battlekitBreaches(
      [item('Sword/Axe'), item('Great Sword/Axe')], ctx(traits));
    expect(breaches.filter((b) => b.section === 'Melee Weapons')).toEqual([]);
  });

  it('may carry three 1-Handed melee weapons, which the chapter forbids', () => {
    const breaches = battlekitBreaches(
      [item('Sword/Axe'), item('Sword/Axe'), item('Sword/Axe')], ctx(traits));
    expect(breaches.filter((b) => b.section === 'Melee Weapons')).toEqual([]);
  });

  it('is still refused a fourth 1-Handed melee weapon', () => {
    // The allowance replaces the chapter's; it does not remove it.
    const breaches = battlekitBreaches(
      [item('Sword/Axe'), item('Sword/Axe'), item('Sword/Axe'), item('Sword/Axe')],
      ctx(traits));
    expect(breaches.some((b) => b.section === 'Melee Weapons')).toBe(true);
  });

  it('spends a melee slot on the Shield, as the entry says', () => {
    /*
      Al-Masyukh's actual roster, and the honest answer: one melee item over.
      The Shield replaces one of the melee weapons it can have, so a Shield, a
      1-Handed and a 2-Handed is one more than any branch allows — while the
      Siege Jezzail above is not.
    */
    const breaches = battlekitBreaches(
      [item('Sword/Axe'), item('Great Sword/Axe'), item('Fire Shield')], ctx(traits));
    expect(breaches.some((b) => b.section === 'Melee Weapons')).toBe(true);
  });
});

describe('a model the allowance does not name', () => {
  it('is judged by the chapter, exactly as before', () => {
    /*
      The allowance is matched on the traits the model actually holds. A
      Homunculus without both Formulae gets the chapter's rule, which is the
      whole point of "unless otherwise stated".
    */
    const withOne = battlekitBreaches(
      [item('Siege Jezzail'), item('Fire Shield')], ctx(['Human Hands']));
    const withNone = battlekitBreaches(
      [item('Siege Jezzail'), item('Fire Shield')], ctx([]));

    expect(withOne.length, 'one Formula is not the stated condition')
      .toBeGreaterThan(0);
    expect(withNone.length, 'no Formulae is not the stated condition')
      .toBeGreaterThan(0);
  });
});
