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
/* By model, not by index: the reader emits them in the book's order, and the
   Homunculus is no longer the first entry to state one. */
const by = (model: string) =>
  (d.carryAllowances ?? []).find((a) => a.model === model)!;
const allowance = by('Takwin Homunculus');

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

/**
 * The allowances the book states about a MODEL rather than about a Formula.
 *
 * These were read but not attributed: the reader would only believe a
 * sentence that named its own condition, and these three name none — "A
 * Desecrated Saint has several arms. It can have up to three…", where "it" is
 * the entry the paragraph sits under. Four stated allowances went unenforced
 * because of it.
 */
describe('an allowance the entry states about itself', () => {
  it('reads the Desecrated Saint\'s several arms as the book prints them', () => {
    /*
      "It can have up to three 1-Handed Melee Weapons from The Court's Armoury
      Tables or two 1-Handed Melee Weapons and one 2-Handed Melee Weapon."

      The interposed clause is the point: a single pattern spanning the whole
      list stops at "Weapons" and never sees the "or", so this entry was read
      as "one 2-Handed Melee Weapon" — the last fragment to match.
    */
    const saint = by('Desecrated Saint');
    expect(saint.requires).toEqual([]);
    expect(saint.modality).toBe('permitted');
    expect(saint.bySection['Melee Weapons']).toEqual([{ '1': 3 }, { '1': 2, '2': 1 }]);
    expect(saint.noOtherBattlekit).toBe(true);
  });

  it('does not mistake a requirement for a permission', () => {
    /*
      A Scripture Guardian "must have either two 1-Handed Melee Weapons or one
      2-Handed Melee Weapon", and an Anchorite Shrine "is armed with" its two.
      Both cap what the model carries, and both also state a floor. Recording
      them as permissions would say a Scripture Guardian holding nothing was
      a legal model.
    */
    expect(by('Scripture Guardian').modality).toBe('required');
    expect(by('Anchorite Shrine').modality).toBe('innate');
    expect(by('Takwin Homunculus').modality).toBe('permitted');
  });

  it('gives a Desecrated Saint the three arms the chapter would refuse', () => {
    const breaches = battlekitBreaches(
      [item('Sword/Axe'), item('Sword/Axe'), item('Sword/Axe')],
      { dataset: d, modelName: 'Desecrated Saint' });
    expect(breaches.filter((b) => b.section === 'Melee Weapons')).toEqual([]);
  });

  it('allows the Saint two 1-Handed and one 2-Handed, which is four hands', () => {
    /*
      The branch that proves combinations are not a hand count: three items in
      one branch, four hands in the other, out of one sentence.
    */
    const breaches = battlekitBreaches(
      [item('Sword/Axe'), item('Sword/Axe'), item('Great Sword/Axe')],
      { dataset: d, modelName: 'Desecrated Saint' });
    expect(breaches.filter((b) => b.section === 'Melee Weapons')).toEqual([]);
  });

  it('still refuses the Saint a fourth 1-Handed melee weapon', () => {
    const breaches = battlekitBreaches(
      [item('Sword/Axe'), item('Sword/Axe'), item('Sword/Axe'), item('Sword/Axe')],
      { dataset: d, modelName: 'Desecrated Saint' });
    expect(breaches.some((b) => b.section === 'Melee Weapons')).toBe(true);
  });

  it('never lends one entry\'s allowance to another model', () => {
    /*
      The hazard this matching exists for. An unconditional allowance has an
      empty `requires`, and `[].every(...)` is true — so matching on
      `requires` alone gave the Desecrated Saint's several arms to every model
      in the game. The chapter allows two 1-Handed melee weapons; a third is a
      breach for anyone the entry does not name, and for a model whose entry
      name nothing supplied.
    */
    const three = [item('Sword/Axe'), item('Sword/Axe'), item('Sword/Axe')];

    expect(battlekitBreaches(three, { dataset: d, modelName: 'Trench Pilgrims' })
      .some((b) => b.section === 'Melee Weapons'), 'another entry').toBe(true);
    expect(battlekitBreaches(three, { dataset: d })
      .some((b) => b.section === 'Melee Weapons'), 'no entry name at all').toBe(true);
  });
});
