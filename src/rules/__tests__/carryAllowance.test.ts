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
/* The engine's own canonicalisation, so a test cannot disagree with it about
   whether `Shield` and `Shields` are the same section. */
const sectionKey = (x: string) => x.trim().toLowerCase().replace(/s$/, '');

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

describe('a Homunculus that is also STRONG', () => {
  /*
    Reported by the app's owner, and the same model as above one Formula
    later: Third Arm and Human Hands give it three melee hands, and Inhuman
    Strength gives it STRONG — "it can equip and use one 2-Handed Melee Weapon
    as if it were a 1-Handed Melee Weapon". So a Zulfiqar, a Great Sword and a
    Shield is three 1-Handed Melee Weapons with the Shield taking one of them:
    three used of three, legal.

    The engine had both halves and never let them meet. The STRONG conversion
    lived inside the chapter's hand arithmetic, and a model whose own entry
    states an allowance never reaches that branch — `battlekitBreaches`
    `continue`s past it. The entry's allowance is the reason the conversion
    matters most, since it is the entry that hands the model a third hand.
  */
  const traits = ['Human Hands', 'Additional Arm', 'Inhuman Strength'];
  const strong = (): CarrierContext => ({ dataset: d, traits, keywords: ['STRONG'] });
  const notStrong = (): CarrierContext => ({ dataset: d, traits });

  const melee = (ctx: CarrierContext) => battlekitBreaches(
    [item('Sword/Axe'), item('Great Sword/Axe'), item('Fire Shield')], ctx)
    .filter((b) => b.section === 'Melee Weapons');

  it('carries a 1-Handed, a 2-Handed and a Shield, which without STRONG it could not', () => {
    expect(melee(strong())).toEqual([]);
    // The other side of the same claim: drop the Keyword and it is over again,
    // so this is not the check having been switched off.
    expect(melee(notStrong()).length).toBe(1);
  });

  it('converts ONE 2-Handed weapon, not every one', () => {
    /*
      Two Great Swords is legal and worth saying why: the entry allows "one
      1-Handed Melee Weapon and one 2-Handed Melee Weapon", and STRONG lets
      one of the pair be used as the 1-Handed. Three is where it runs out —
      one converted leaves two 2-Handed, and no branch allows that.
    */
    const two = battlekitBreaches(
      [item('Great Sword/Axe'), item('Great Sword/Axe')], strong())
      .filter((b) => b.section === 'Melee Weapons');
    expect(two).toEqual([]);

    const three = battlekitBreaches(
      [item('Great Sword/Axe'), item('Great Sword/Axe'), item('Great Sword/Axe')], strong())
      .filter((b) => b.section === 'Melee Weapons');
    expect(three.length).toBe(1);
  });

  it('does not convert a CUMBERSOME weapon', () => {
    /*
      "Weapons with this Keyword require two hands to use, EVEN IF the model
      has the STRONG Keyword." Found in the catalogue rather than named here,
      so this tests the rule and not a fixture — and found through the
      Battlekit chapter's own section, because a weapon the chapter does not
      place is not counted in any section at all.
    */
    const inMelee = new Set(
      (d.battlekit ?? [])
        .filter((b) => sectionKey(b.section ?? '') === sectionKey('Melee Weapons'))
        .map((b) => b.name));
    const cumbersome = (d.weapons ?? []).find(
      (w) => inMelee.has(w.name)
          && /2-Handed/i.test(w.type ?? '')
          && (w.keywords ?? []).some((k) => /^CUMBERSOME$/i.test(k.trim())));
    expect(cumbersome, 'no 2-Handed CUMBERSOME Melee Weapon in the catalogue').toBeDefined();

    const breaches = battlekitBreaches(
      [item('Sword/Axe'), item(cumbersome!.name), item('Fire Shield')], strong())
      .filter((b) => b.section === 'Melee Weapons');
    expect(breaches.length).toBe(1);
  });

  it('leaves the Ranged section alone — the conversion is Melee only', () => {
    // "one 2-Handed MELEE Weapon". Two 2-Handed Ranged weapons is over the
    // entry's Ranged branch whether or not the model is STRONG.
    const breaches = battlekitBreaches(
      [item('Siege Jezzail'), item('Siege Jezzail')], strong())
      .filter((b) => b.section === 'Ranged Weapons');
    expect(breaches.length).toBe(1);
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
