/**
 * The Formulas shelf: what a model may buy, at what price, and what refuses.
 *
 * Driven off the real dataset rather than hand-built options, because every
 * one of the four rules here reads published text — the catalogue's Formula
 * sentences, the Book of Golems row, the House of Wisdom's association
 * paragraph — and a fixture would be this file's opinion of what those say.
 *
 * The six entries that carry Formulae are not interchangeable, and the tests
 * use the difference: the Iron Sultanate's Homunculus offers **Two Heads**
 * and the five copies offer **Additional Head**, while both sets of Eye
 * Options print *"without Two Heads"*.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { formulaShelf } from '../formulaShelf';
import { alchemistAliveFor, takwinEntries, takwinRuleText } from '../takwin';
import { GOLEM_GRANTED_BY, golemGrant } from '../golem';
import type { Dataset, UnitOption } from '@/types/catalogue';

const D = DATASET as unknown as Dataset;

const entryOf = (name: string, factionId: string) =>
  D.units.find((u) => u.name === name && u.factionId === factionId)!;

/** The Iron Sultanate's, which offers Two Heads. */
const SULTANATE = entryOf('Homunculus', 'Iron Sultanate');
/** A Golem copy, which offers Additional Head instead. */
const NEW_ANTIOCH = entryOf('Homunculus', 'New Antioch');

const model = (over: Record<string, unknown> = {}) => ({
  specialUpgrades: [] as { name: string; category?: string }[],
  equippedEquipment: [] as { name: string; group?: string }[],
  profileSnapshot: { innateAbilities: [] as { name: string; description?: string }[] },
  ...over,
});

const shelf = (over: Parameters<typeof formulaShelf>[1]) => formulaShelf(D, over);
const offerFor = (s: ReturnType<typeof formulaShelf>, name: string) =>
  s.offers.find((o) => o.option.name === name)!;

describe('what is on the shelf', () => {
  it('is the model entry’s own Formulae, sub-groups included', () => {
    const s = shelf({
      unit: model(), catalogueUnit: SULTANATE, alchemistAlive: true, isTakwin: true,
    });

    expect(s.open).toBe(true);
    const names = s.offers.map((o) => o.option.name);
    expect(names).toContain('Human Hands');
    // An Eye Option is a Formula. It is in `Alchemical Formulae::Eye Options`,
    // and reading the leaf alone was FORM-1.
    expect(names).toContain('Hawk Eyes');
    expect(names).toContain('Hypnotic Eyes');
    // The entry's own, not the ruleset's: this one has Two Heads, not
    // Additional Head.
    expect(names).toContain('Two Heads');
    expect(names).not.toContain('Additional Head');
  });

  it('is closed, not empty, for a model whose entry has none', () => {
    const azeb = D.units.find((u) => u.name === 'Azeb')!;
    const s = shelf({
      unit: model(), catalogueUnit: azeb, alchemistAlive: true, isTakwin: false,
    });
    expect(s.open).toBe(false);
    expect(s.offers).toEqual([]);
  });

  it('charges the catalogue’s price, both currencies', () => {
    const s = shelf({
      unit: model(), catalogueUnit: SULTANATE, alchemistAlive: true, isTakwin: true,
    });
    const human = offerFor(s, 'Human Hands');
    const fromCatalogue = (SULTANATE.options as UnitOption[])
      .find((o) => o.name === 'Human Hands')!;

    expect(human.price).toEqual({
      ducats: fromCatalogue.cost.ducats, glory: fromCatalogue.cost.glory,
    });
    expect(human.free).toBe(false);
  });
});

describe('what a Formula’s own sentence refuses', () => {
  it('refuses a prerequisite the model does not hold, with the sentence', () => {
    const s = shelf({
      unit: model(), catalogueUnit: SULTANATE, alchemistAlive: true, isTakwin: true,
    });
    // "Can only be bought if the Homunculus already has the Human Hands,
    //  Inhuman Strength and Massive Size Formulas."
    const gargantuan = offerFor(s, 'Gargantuan Size');
    expect(gargantuan.verdict.allowed).toBe(false);
    expect(gargantuan.verdict.reason).toMatch(/already has/i);
  });

  it('allows it once they are held', () => {
    const s = shelf({
      unit: model({
        specialUpgrades: ['Human Hands', 'Inhuman Strength', 'Massive Size']
          .map((name) => ({ name, category: 'Alchemical Formulae' })),
      }),
      catalogueUnit: SULTANATE, alchemistAlive: true, isTakwin: true,
    });
    expect(offerFor(s, 'Gargantuan Size').verdict.allowed).toBe(true);
  });

  it('reads an exclusion against the Formulae THIS entry offers (FORM-4)', () => {
    // The Sultanate entry's lifter is Two Heads; the copies' is Additional
    // Head, and both entries' Eye Options say "without Two Heads".
    const sultanate = shelf({
      unit: model({ specialUpgrades: [{ name: 'Hawk Eyes' }, { name: 'Two Heads' }] }),
      catalogueUnit: SULTANATE, alchemistAlive: true, isTakwin: true,
    });
    expect(offerFor(sultanate, 'Hypnotic Eyes').verdict.allowed).toBe(true);

    const golemCopy = shelf({
      unit: model({ specialUpgrades: [{ name: 'Hawk Eyes' }, { name: 'Additional Head' }] }),
      catalogueUnit: NEW_ANTIOCH, alchemistAlive: true, isTakwin: true,
    });
    expect(offerFor(golemCopy, 'Hypnotic Eyes').verdict.allowed).toBe(true);

    const neither = shelf({
      unit: model({ specialUpgrades: [{ name: 'Hawk Eyes' }] }),
      catalogueUnit: SULTANATE, alchemistAlive: true, isTakwin: true,
    });
    expect(offerFor(neither, 'Hypnotic Eyes').verdict.allowed).toBe(false);
  });

  it('reads the pair from whichever Formula states it (FORM-5)', () => {
    /*
      The Iron Sultanate entry states Human Hands ⊥ Wings on HUMAN HANDS —
      "A Homunculus cannot have the Human Hands Alchemical Formula if it has
      the Wings Alchemical Formula" — and never on Wings, whose own sentence
      is about Massive Size. A model holding Human Hands was therefore
      offered Wings without a word.

      Found by opening the tab on the owner's own September roster, where
      Al-Masyukh holds Human Hands. Every test until this one asked the
      question from the side the sentence happens to be written on.
    */
    const s = shelf({
      unit: model({ specialUpgrades: [{ name: 'Human Hands' }] }),
      catalogueUnit: SULTANATE, alchemistAlive: true, isTakwin: true,
    });
    const wings = offerFor(s, 'Wings');
    expect(wings.verdict.allowed).toBe(false);
    // The sentence that actually refuses, on the Formula that carries it.
    expect(wings.verdict.reason).toMatch(/cannot have the Human Hands/i);

    // And the other way round, which was already read.
    const other = shelf({
      unit: model({ specialUpgrades: [{ name: 'Wings' }] }),
      catalogueUnit: SULTANATE, alchemistAlive: true, isTakwin: true,
    });
    expect(offerFor(other, 'Human Hands').verdict.allowed).toBe(false);

    // Nothing held: both are on offer.
    const bare = shelf({
      unit: model(), catalogueUnit: SULTANATE, alchemistAlive: true, isTakwin: true,
    });
    expect(offerFor(bare, 'Wings').verdict.allowed).toBe(true);
    expect(offerFor(bare, 'Human Hands').verdict.allowed).toBe(true);
  });

  it('does not refuse a held Formula on its own sentence', () => {
    // Asking the gate of a list that includes the Formula itself is how a
    // model gets told it cannot have what it is already holding.
    const s = shelf({
      unit: model({ specialUpgrades: [{ name: 'Human Hands' }] }),
      catalogueUnit: SULTANATE, alchemistAlive: true, isTakwin: true,
    });
    const human = offerFor(s, 'Human Hands');
    expect(human.held).toBe(true);
    expect(human.verdict.allowed).toBe(true);
  });
});

describe('the Book of Golems allowance', () => {
  const grant = golemGrant(D)!;
  const golem = (over: Record<string, unknown> = {}) =>
    model({ grantedBy: GOLEM_GRANTED_BY, ...over });

  it('is the grant’s own number, and spends before the Strongbox', () => {
    const s = shelf({
      unit: golem(), catalogueUnit: NEW_ANTIOCH, alchemistAlive: null, isTakwin: true,
    });

    expect(s.freeBudgetLeft).toBe(grant.freeFormulaDucats);
    const human = offerFor(s, 'Human Hands');
    expect(human.free).toBe(true);
    expect(human.price).toEqual({ ducats: 0, glory: 0 });
    // The catalogue's number is still carried, so a screen can say what the
    // grant is paying.
    expect(human.listPrice.ducats).toBeGreaterThan(0);
  });

  it('shrinks as Formulae are bought', () => {
    const s = shelf({
      unit: golem({ specialUpgrades: [{ name: 'Wings' }] }),   // 30 Ducats
      catalogueUnit: NEW_ANTIOCH, alchemistAlive: null, isTakwin: true,
    });
    const wings = (NEW_ANTIOCH.options as UnitOption[]).find((o) => o.name === 'Wings')!;
    expect(s.freeBudgetLeft).toBe(grant.freeFormulaDucats - wings.cost.ducats);
  });

  it('refuses a Formula the allowance will not stretch to, with the row’s words', () => {
    /*
      The reading recorded in formulaShelf.ts: "an Ally that can never be
      Promoted or receive additional Alchemical Formulas" makes the budget the
      Golem's WHOLE allowance, so what it will not cover is refused rather
      than offered for Ducats.
    */
    const s = shelf({
      unit: golem({ specialUpgrades: [{ name: 'Elemental Resistance' }] }), // 40 of 50
      catalogueUnit: NEW_ANTIOCH, alchemistAlive: null, isTakwin: true,
    });
    expect(s.freeBudgetLeft).toBe(10);

    const wings = offerFor(s, 'Wings'); // 30 Ducats, over what is left
    expect(wings.free).toBe(false);
    expect(wings.verdict.allowed).toBe(false);
    expect(wings.verdict.reason).toBe(grant.text);

    const cheap = offerFor(s, 'Human Hands'); // 10 Ducats, exactly what is left
    expect(cheap.free).toBe(true);
  });

  it('never refuses a Formula the Golem is already holding', () => {
    const s = shelf({
      unit: golem({
        specialUpgrades: [{ name: 'Elemental Resistance' }, { name: 'Wings' }],
      }),
      catalogueUnit: NEW_ANTIOCH, alchemistAlive: null, isTakwin: true,
    });
    // Over budget, and both are on the model: keeping them is not a purchase.
    expect(s.freeBudgetLeft).toBe(0);
    expect(offerFor(s, 'Wings').verdict.allowed).toBe(true);
    expect(offerFor(s, 'Wings').free).toBe(true);
  });

  it('counts the Formula the grant supplies as given, not as spent', () => {
    // "It has the Human Hands Alchemical Formula, PLUS Alchemical Formulas
    //  worth a total of up to 50 👑" — innate, so the budget is untouched.
    const s = shelf({
      unit: golem({
        profileSnapshot: { innateAbilities: [{ name: grant.startsWith, description: '' }] },
      }),
      catalogueUnit: NEW_ANTIOCH, alchemistAlive: null, isTakwin: true,
    });
    expect(s.freeBudgetLeft).toBe(grant.freeFormulaDucats);
    expect(offerFor(s, grant.startsWith).held).toBe(true);
  });

  it('lets an innate Formula satisfy another’s prerequisite', () => {
    /*
      Human Hands arrives on a Golem as an ABILITY, not a purchase, and
      Gargantuan Size names it as one of its three prerequisites. A shelf
      that read only the purchases would refuse the Golem what its own grant
      had just qualified it for.

      Read through WHICH sentence refuses. Both of these models are over the
      50-Ducat allowance — Inhuman Strength and Massive Size are 45 of it —
      so both are refused; the question is what for. With Human Hands the
      answer is the grant's budget, which means the prerequisite passed.
      Without it the answer is the prerequisite itself.
    */
    const held = [{ name: 'Inhuman Strength' }, { name: 'Massive Size' }];

    const withHands = shelf({
      unit: golem({
        profileSnapshot: { innateAbilities: [{ name: 'Human Hands', description: '' }] },
        specialUpgrades: held,
      }),
      catalogueUnit: NEW_ANTIOCH, alchemistAlive: null, isTakwin: true,
    });
    expect(offerFor(withHands, 'Gargantuan Size').verdict.reason).toBe(grant.text);

    const without = shelf({
      unit: golem({ specialUpgrades: held }),
      catalogueUnit: NEW_ANTIOCH, alchemistAlive: null, isTakwin: true,
    });
    expect(offerFor(without, 'Gargantuan Size').verdict.reason).toMatch(/already has/i);
  });

  it('keeps the Formula’s own refusal rather than replacing it with the budget', () => {
    // A player told to save up for something no amount of Ducats can buy is
    // worse off than one told the rule.
    const s = shelf({
      unit: golem(),   // nothing held, whole allowance free
      catalogueUnit: NEW_ANTIOCH, alchemistAlive: null, isTakwin: true,
    });
    expect(s.freeBudgetLeft).toBe(grant.freeFormulaDucats);
    const gargantuan = offerFor(s, 'Gargantuan Size');   // 20, within budget
    expect(gargantuan.verdict.allowed).toBe(false);
    expect(gargantuan.verdict.reason).toMatch(/already has/i);
  });
});

describe('what the Strongbox can cover', () => {
  it('reports the shortfall rather than selling a Formula the Warband cannot pay for', () => {
    // Found by buying one through the tab on the owner's own roster, whose
    // Strongbox holds nothing: the purchase went through and left it at -10.
    const s = shelf({
      unit: model(), catalogueUnit: SULTANATE, alchemistAlive: true, isTakwin: true,
      strongbox: { ducats: 12, glory: 0 },
    });

    const cheap = offerFor(s, 'Human Hands');           // 10 Ducats
    expect(cheap.short).toEqual({ ducats: 0, glory: 0 });

    const dear = offerFor(s, 'Wings');                  // 30 Ducats
    expect(dear.short).toEqual({ ducats: 18, glory: 0 });
    // Short of money is not forbidden: the sentence on the entry still
    // permits it, and the next Quartermaster Step may pay for it.
    expect(dear.verdict.allowed).toBe(true);
  });

  it('owes nothing for a Formula already held, or one the grant covers', () => {
    const held = shelf({
      unit: model({ specialUpgrades: [{ name: 'Wings' }] }),
      catalogueUnit: SULTANATE, alchemistAlive: true, isTakwin: true,
      strongbox: { ducats: 0, glory: 0 },
    });
    expect(offerFor(held, 'Wings').short).toEqual({ ducats: 0, glory: 0 });

    const golem = shelf({
      unit: model({ grantedBy: GOLEM_GRANTED_BY }),
      catalogueUnit: NEW_ANTIOCH, alchemistAlive: null, isTakwin: true,
      strongbox: { ducats: 0, glory: 0 },
    });
    expect(offerFor(golem, 'Human Hands').free).toBe(true);
    expect(offerFor(golem, 'Human Hands').short).toEqual({ ducats: 0, glory: 0 });
  });
});

describe('the Takwin whose Alchemist is dead', () => {
  it('closes the shelf with the published sentence', () => {
    const s = shelf({
      unit: model(), catalogueUnit: SULTANATE, alchemistAlive: false, isTakwin: true,
    });

    expect(s.open).toBe(false);
    expect(s.offers).toEqual([]);
    expect(s.refusal).toBe(takwinRuleText(D).text);
    expect(s.refusal).toMatch(/no Alchemical Formulas can be applied to it/i);
  });

  it('does not close it for a Golem, which has no Alchemist to lose', () => {
    const s = shelf({
      unit: model({ grantedBy: GOLEM_GRANTED_BY }),
      catalogueUnit: NEW_ANTIOCH, alchemistAlive: false, isTakwin: true,
    });
    expect(s.open).toBe(true);
  });

  it('is a caveat, never a refusal, where the roster cannot say which model lost one', () => {
    const s = shelf({
      unit: model(), catalogueUnit: SULTANATE, alchemistAlive: null, isTakwin: true,
    });
    expect(s.open).toBe(true);
    expect(s.caveat).toBe(takwinRuleText(D).text);
  });
});

describe('reading the association off the roster', () => {
  it('names both entries from the rule’s own sentence', () => {
    expect(takwinEntries(D)).toEqual({
      homunculus: 'Takwin Homunculus', alchemist: 'Jabirean Alchemist',
    });
  });

  it('is exact at both ends and unknown between them', () => {
    // One-to-one, so enough Alchemists to go round means none has been lost.
    expect(alchemistAliveFor({ alchemists: 2, homunculi: 2 })).toBe(true);
    expect(alchemistAliveFor({ alchemists: 2, homunculi: 1 })).toBe(true);
    // No Alchemist at all: every Homunculus has lost the one it was bound to.
    expect(alchemistAliveFor({ alchemists: 0, homunculi: 1 })).toBe(false);
    // Some have, some have not, and the roster never recorded which.
    expect(alchemistAliveFor({ alchemists: 1, homunculi: 2 })).toBeNull();
    // No Homunculus, no question.
    expect(alchemistAliveFor({ alchemists: 0, homunculi: 0 })).toBeNull();
  });
});
