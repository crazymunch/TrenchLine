/**
 * Promotion eligibility and the Experience cap, against the shipped dataset.
 *
 * RR-05 / FD-06a. Promotion was `handleToggleElite`, a switch on the unit card
 * that set `isElite` and asked nothing — so a Warband could promote an
 * Amalgam, which the rulebook forbids outright, and could promote its whole
 * roster past the six ELITE models at which the book skips the step. Nothing
 * capped Experience, so a LIMITED POTENTIAL model sailed past the 7 it is
 * allowed and went on earning Advancement Rolls.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import type { ActiveUnit } from '@/types/warband';
import {
  canBePromoted, eliteCount, experienceCap, cappedExperience, promotionRules,
  promotionPool, assignmentIsLegal, rollPromotions, SHOW_OFF,
} from '../promotions';

const rules = promotionRules(DATASET)!;

/** A unit id from the derived cannot-promote table, by the book's own name. */
const cannotPromoteId = (bookName: string) => rules.cannotPromote
  .flatMap((f) => f.models)
  .find((m) => m.name === bookName)!.unitId!;

const unitNamed = (name: string) => DATASET.units.find((u) => u.name === name)!;

const unit = (over: Partial<ActiveUnit> = {}): ActiveUnit => ({
  id: 'u1',
  customName: 'Someone',
  baseProfileId: 'no-such-profile',
  profileSnapshot: { name: 'Trooper', category: 'Trooper', elite: false } as never,
  equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
  xp: 0, advancements: [], injuries: [], deeds: [], isDead: false,
  totalCost: 10, currentWounds: 0, maxWounds: 1, bloodMarkers: 0,
  status: 'Active', hasActedThisTurn: false,
  ...over,
} as unknown as ActiveUnit);

const troops = (n: number) => ({
  units: Array.from({ length: n }, (_, i) => unit({ id: `t${i}` })),
});

const elites = (n: number) => ({
  units: Array.from({ length: n }, (_, i) =>
    unit({ id: `e${i}`, profileSnapshot: { name: 'X', category: 'Elite', elite: true } as never })),
});

describe('the derived tables', () => {
  it('ships both, with the book’s own numbers', () => {
    /*
      Pinned because a change to either is a change to every campaign: the
      first decides when the Promotion step stops happening at all, the second
      how much Experience seven named models may ever hold.
    */
    expect(rules.maxElites).toBe(6);
    expect(rules.limitedPotential.maxXp).toBe(7);
  });

  it('lists the Amalgam under the Cult of the Black Grail', () => {
    const cult = rules.cannotPromote.find((f) => f.factionId === 'cult-of-the-black-grail')!;
    expect(cult.models.map((m) => m.name)).toContain('Amalgam');
  });

  it('resolves every named model to a real unit', () => {
    /*
      The whole rule is unit ids. A row that resolved to null would be a model
      the app silently allows to be promoted while printing the rule that
      forbids it.
    */
    const all = [
      ...rules.cannotPromote.flatMap((f) => f.models),
      ...rules.limitedPotential.factions.flatMap((f) => f.models),
    ];
    expect(all.length).toBeGreaterThan(0);
    expect(all.filter((m) => !m.unitId)).toEqual([]);
  });

  it('keeps a faction the book gives no models, rather than dropping the row', () => {
    // New Antioch's row is a bare `-` in both tables. That is an answer.
    const na = rules.cannotPromote.find((f) => f.factionId === 'new-antioch')!;
    expect(na.models).toEqual([]);
  });

  it('carries the book’s spelling where the catalogue differs', () => {
    /*
      `Fly Thralls` is the catalogue's `Winged Thrall` — a rename, not a
      spelling, and the one case the equivalence file exists for. Both names
      ship, so a player searching for either finds the rule.
    */
    const cult = rules.cannotPromote.find((f) => f.factionId === 'cult-of-the-black-grail')!;
    const fly = cult.models.find((m) => m.name === 'Fly Thralls')!;
    expect(fly.unitName).toBe('Winged Thrall');

    // And the entry-name cases, which resolve from the catalogue with no file.
    const pilgrims = rules.cannotPromote.find((f) => f.factionId === 'trench-pilgrims')!;
    expect(pilgrims.models.find((m) => m.name === 'Anchorite Shrine')!.unitName).toBe('Anchorite');
  });
});

describe('counting the ELITE models', () => {
  it('counts the models that have the Keyword', () => {
    expect(eliteCount(elites(3))).toBe(3);
    expect(eliteCount(troops(4))).toBe(0);
  });

  it('does not count a dead model', () => {
    const w = { units: [...elites(2).units, unit({ id: 'dead', profileSnapshot: { name: 'X', category: 'Elite', elite: true } as never, isDead: true })] };
    expect(eliteCount(w)).toBe(2);
  });

  it('counts an unrecorded model as ELITE', () => {
    /*
      The bound is a ceiling. Guessing low would let a seventh model be
      promoted; guessing high only declines a promotion, which the player can
      still argue for at the table.
    */
    const unknown = unit({ id: 'm', profileSnapshot: { name: 'Merc', category: 'Mercenary' } as never });
    expect(eliteCount({ units: [unknown] })).toBe(1);
  });
});

describe('who may be Promoted', () => {
  it('allows an ordinary Troop in a Warband under the ceiling', () => {
    expect(canBePromoted(DATASET, unit(), troops(3))).toMatchObject({ eligible: true, reason: null });
  });

  it('refuses a model the rulebook names, by unit id', () => {
    const amalgam = unit({ baseProfileId: cannotPromoteId('Amalgam') });
    const verdict = canBePromoted(DATASET, amalgam, troops(1));
    expect(verdict.eligible).toBe(false);
    expect(verdict.reason).toBe('cannot-be-promoted');
    expect(verdict.detail).toContain('Amalgam');
  });

  it('refuses the renamed model too, which a name match would let through', () => {
    // The book says `Fly Thralls`; the roster says `Winged Thrall`.
    const fly = unit({ baseProfileId: unitNamed('Winged Thrall').id });
    expect(canBePromoted(DATASET, fly, troops(1)).reason).toBe('cannot-be-promoted');
  });

  it('refuses once the Warband is at the Maximum Elites ceiling', () => {
    const verdict = canBePromoted(DATASET, unit(), elites(rules.maxElites));
    expect(verdict.reason).toBe('maximum-elites');
    expect(verdict.detail).toContain(String(rules.maxElites));
  });

  it('still allows one at exactly one below the ceiling', () => {
    expect(canBePromoted(DATASET, unit(), elites(rules.maxElites - 1)).eligible).toBe(true);
  });

  it('refuses a model that already has the Keyword', () => {
    const already = unit({ profileSnapshot: { name: 'X', category: 'Elite', elite: true } as never });
    expect(canBePromoted(DATASET, already, troops(1)).reason).toBe('already-elite');
  });

  it('refuses rather than allowing when the ruleset has no rules', () => {
    /*
      Rule 2. "We cannot check" is not "anyone may", and reading it that way is
      exactly the switch this replaces.
    */
    const verdict = canBePromoted(null, unit(), troops(1));
    expect(verdict.eligible).toBe(false);
    expect(verdict.reason).toBe('no-rules');
  });
});

describe('the Experience cap', () => {
  const limited = (name: string) => unit({ baseProfileId: unitNamed(name).id });

  it('caps a model carrying LIMITED POTENTIAL', () => {
    expect(experienceCap(DATASET, limited('Lion of Jabir'))).toBe(rules.limitedPotential.maxXp);
  });

  it('does not cap a model without it', () => {
    expect(experienceCap(DATASET, unit())).toBeNull();
  });

  it('reads the keyword, not the rulebook’s table — the Brazen Bull', () => {
    /*
      The rulebook's p.111 table names the Brazen Bull, and the catalogue gives
      it the keyword. Then the Trench Dispatch replaces its whole Warband Entry
      with a keyword row that has no LIMITED POTENTIAL in it, and precedence
      puts the Dispatch first. So the table still names it and the cap is gone
      — which is the one case that tells the two sources apart.
    */
    const named = rules.limitedPotential.factions
      .flatMap((f) => f.models).find((m) => m.name === 'Brazen Bull');
    expect(named).toBeTruthy();
    expect(experienceCap(DATASET, unit({ baseProfileId: named!.unitId! }))).toBeNull();
  });

  it('withholds the part of an award that would pass the cap', () => {
    const bull = limited('Lion of Jabir');
    const at = { ...bull, xp: rules.limitedPotential.maxXp - 1 } as ActiveUnit;

    expect(cappedExperience(DATASET, at, 1)).toMatchObject({ xp: rules.limitedPotential.maxXp, withheld: 0 });

    const full = { ...bull, xp: rules.limitedPotential.maxXp } as ActiveUnit;
    expect(cappedExperience(DATASET, full, 1))
      .toMatchObject({ xp: rules.limitedPotential.maxXp, withheld: 1, cap: rules.limitedPotential.maxXp });
  });

  it('awards in full where there is no cap', () => {
    expect(cappedExperience(DATASET, { ...unit(), xp: 40 } as ActiveUnit, 1))
      .toMatchObject({ xp: 41, withheld: 0, cap: null });
  });

  it('does not delete Experience a model already has above its cap', () => {
    /*
      The cap bounds what may be EARNED. A roster imported or edited to a
      higher number is a record this function has no business rewriting — it
      declines the award and leaves the number alone.
    */
    const over = { ...unitNamed('Lion of Jabir'), ...unit({ baseProfileId: unitNamed('Lion of Jabir').id }), xp: 12 } as ActiveUnit;
    expect(cappedExperience(DATASET, over, 1)).toMatchObject({ xp: 12, withheld: 1 });
  });

  it('applies no cap at all where the ruleset has no rules', () => {
    expect(experienceCap(null, unit())).toBeNull();
    expect(cappedExperience(null, { ...unit(), xp: 3 } as ActiveUnit, 1)).toMatchObject({ xp: 4, withheld: 0 });
  });
});

describe('the Promotion Dice Pool', () => {
  const showOff = (id: string) => unit({ id, skills: [{ name: SHOW_OFF, category: 'wildcard' }] } as never);

  it('ships the book’s four numbers', () => {
    /*
      Pinned. Each decides how often a Warband gets a new ELITE model, and a
      crossed pair — promoting on 5, or automatic after 6 — would read as a
      working rule while changing every campaign in the app.
    */
    expect(rules.poolBase).toBe(1);
    expect(rules.poolPerDeed).toBe(1);
    expect(rules.promoteOn).toBe(6);
    expect(rules.autoAfterMisses).toBe(5);
  });

  it('is one die, plus one for each Glorious Deed', () => {
    expect(promotionPool(DATASET, { deeds: 0 })!.dice).toBe(rules.poolBase);
    expect(promotionPool(DATASET, { deeds: 3 })!.dice).toBe(rules.poolBase! + 3 * rules.poolPerDeed!);
  });

  it('counts Show Off off the roster rather than asking for a number', () => {
    /*
      "Add 1 dice to the Promotion Pool in the Promotion step for each model in
      your Warband with this Skill." After FD-04b a Skill learned from an
      Advancement Roll is recorded properly, so this is derivable — and a
      number the player has to work out themselves is a number they will get
      wrong.
    */
    const w = { units: [showOff('a'), showOff('b'), unit({ id: 'c' })] };
    expect(promotionPool(DATASET, { deeds: 0, warband: w })!.dice).toBe(rules.poolBase! + 2);
  });

  it('does not count a dead model’s Show Off', () => {
    const w = { units: [showOff('a'), { ...showOff('b'), isDead: true } as never] };
    expect(promotionPool(DATASET, { deeds: 0, warband: w })!.dice).toBe(rules.poolBase! + 1);
  });

  it('shows its working, so a player can check it against the page', () => {
    const w = { units: [showOff('a')] };
    const pool = promotionPool(DATASET, { deeds: 2, warband: w, extraDice: 1 })!;
    expect(pool.parts.map((p) => p.dice)).toEqual([1, 2, 1, 1]);
    expect(pool.dice).toBe(5);
    expect(pool.parts.map((p) => p.label).join(' ')).toContain(SHOW_OFF);
  });

  it('leaves out a part that contributed nothing', () => {
    // A pool listing "Glorious Deeds (0)" invites the reader to wonder what
    // they missed.
    expect(promotionPool(DATASET, { deeds: 0 })!.parts).toHaveLength(1);
  });

  it('returns null where the ruleset cannot say', () => {
    // Not a pool of nought, which is a real answer and a different one.
    expect(promotionPool(null, { deeds: 5 })).toBeNull();
  });
});

describe('assigning the dice', () => {
  const ids = ['a', 'b', 'c'];

  it('allows an even spread', () => {
    expect(assignmentIsLegal({ a: 1, b: 1, c: 1 }, ids, 3)).toMatchObject({ legal: true, assigned: 3 });
  });

  it('allows one model to be one ahead of another', () => {
    // Four dice over three models cannot be even, and the book allows it: the
    // rule bites at a THIRD die while another has one.
    expect(assignmentIsLegal({ a: 2, b: 1, c: 1 }, ids, 4).legal).toBe(true);
  });

  it('refuses a third die while a model has one', () => {
    /*
      "You cannot assign a 3rd dice to the same model until all Troop models in
      your Warband have at least 2 dice each."
    */
    const v = assignmentIsLegal({ a: 3, b: 1, c: 1 }, ids, 5);
    expect(v.legal).toBe(false);
    expect(v.detail).toContain('3');
  });

  it('counts a model given nothing', () => {
    /*
      The sentence is about ALL Troop models, so a model on nought is what
      makes a second die on another illegal. Stacking the whole pool on one
      model was the obvious way to game this.
    */
    expect(assignmentIsLegal({ a: 2 }, ids, 2).legal).toBe(false);
    expect(assignmentIsLegal({ a: 1 }, ids, 1).legal).toBe(true);
  });

  it('refuses more dice than the pool holds', () => {
    const v = assignmentIsLegal({ a: 2, b: 2 }, ids, 3);
    expect(v.legal).toBe(false);
    expect(v.detail).toContain('pool holds 3');
  });

  it('refuses a die on a model that cannot be Promoted, and says so', () => {
    // A different rule from the spread, so a different sentence: the player
    // needs to know which one they are up against.
    const v = assignmentIsLegal({ z: 1 }, ids, 3);
    expect(v.legal).toBe(false);
    expect(v.detail).toContain('cannot be Promoted');
  });

  it('allows leaving dice unassigned', () => {
    // "Any Promotion Dice not assigned are lost" — permitted, and a loss.
    expect(assignmentIsLegal({ a: 1 }, ids, 4)).toMatchObject({ legal: true, assigned: 1 });
  });
});

describe('rolling the dice', () => {
  const order = ['a', 'b'];

  it('promotes on a 6 and stops rolling for that model', () => {
    /*
      "As soon as one of the dice rolls a '6', stop rolling for that model."
      The model has three dice and uses one; the other two are never rolled,
      so they stay in the list for the NEXT model.
    */
    const r = rollPromotions(DATASET, order, { a: 3, b: 1 }, [6, 2], { eliteBefore: 0 })!;
    expect(r.outcomes[0]).toMatchObject({ promoted: true, rolled: [6] });
    expect(r.outcomes[1]).toMatchObject({ promoted: false, rolled: [2] });
  });

  it('counts misses across models, and across the whole step', () => {
    const r = rollPromotions(DATASET, order, { a: 2, b: 2 }, [1, 2, 3, 4], {})!;
    expect(r.outcomes.every((o) => !o.promoted)).toBe(true);
    expect(r.misses).toBe(4);
  });

  it('makes the sixth die automatic, whatever it shows', () => {
    /*
      "Once the total reaches 5 dice, then the next roll (the 6th one), is
      automatically considered to be a 6." Four misses carried plus one more
      makes five; the die after that promotes on a 1.
    */
    const r = rollPromotions(DATASET, ['a'], { a: 2 }, [1, 1], { missesBefore: 4 })!;
    expect(r.outcomes[0]).toMatchObject({ promoted: true, automatic: true, rolled: [1, 1] });
    expect(r.misses).toBe(0);
  });

  it('carries the miss count between games', () => {
    // It is kept on the Roster, so five misses spread over three games still
    // make the sixth die a 6. Nothing resets it but a Promotion.
    const r = rollPromotions(DATASET, ['a'], { a: 1 }, [2], { missesBefore: 2 })!;
    expect(r.misses).toBe(3);
  });

  it('resets the count on a Promotion, automatic or not', () => {
    expect(rollPromotions(DATASET, ['a'], { a: 1 }, [6], { missesBefore: 3 })!.misses).toBe(0);
  });

  it('stops the whole step at the Maximum Elites ceiling', () => {
    /*
      "…stop rolling for Promotions when a successful Promotion Roll means that
      you have 6 models with the ELITE Keyword in your Warband." The second
      model's die is never rolled.
    */
    const r = rollPromotions(
      DATASET, order, { a: 1, b: 1 }, [6, 6], { eliteBefore: rules.maxElites - 1 },
    )!;
    expect(r.outcomes[0].promoted).toBe(true);
    expect(r.outcomes[1].rolled).toEqual([]);
    expect(r.eliteAfter).toBe(rules.maxElites);
    expect(r.unrolled).toBe(1);
  });

  it('rolls nothing at all when the Warband is already at the ceiling', () => {
    const r = rollPromotions(DATASET, order, { a: 2 }, [6, 6], { eliteBefore: rules.maxElites })!;
    expect(r.outcomes.every((o) => o.rolled.length === 0)).toBe(true);
    expect(r.unrolled).toBe(2);
  });

  it('stops when the supplied dice run out rather than inventing one', () => {
    // Rule 2. The dice are the player's, and a roll the app made up is a
    // Promotion the player did not earn.
    const r = rollPromotions(DATASET, order, { a: 2, b: 2 }, [1], {})!;
    expect(r.outcomes[0].rolled).toEqual([1]);
    expect(r.outcomes[1].rolled).toEqual([]);
  });

  it('returns null where the ruleset carries no dice rules', () => {
    expect(rollPromotions(null, order, { a: 1 }, [6], {})).toBeNull();
  });
});
