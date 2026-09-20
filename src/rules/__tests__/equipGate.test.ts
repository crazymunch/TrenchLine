import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { canEquip } from '../equipGate';
import { armouryFor } from '../armoury';
import type { Dataset } from '@/types/catalogue';

/**
 * What the equip sheet may offer, asked of the same data the validator uses.
 *
 * It used to be decided by regexes over names, and two of them hid the Titan
 * Zulfiqar from a Takwin Homunculus:
 *
 *     isHeavyConstruct = /brazen|golem|mamluk|mechanized/i.test(unitName)
 *     isHeavySpecialWeapon = /titan|cannon|autocannon/i.test(weapon.name)
 *     if (isHeavySpecialWeapon && !isHeavyConstruct) return false;
 *
 * "Titan Zulfiqar" matches the second, "Takwin Homunculus" does not match the
 * first, and the filter is permanently on — so the model could not be OFFERED
 * a weapon the catalogue explicitly reveals to it, even after the validator
 * was taught to allow it.
 */
const d = DATASET as unknown as Dataset;
const sultanate = armouryFor(d, 'iron-sultanate');
const procession = armouryFor(d, 'procession-of-the-sacred-affliction');

const homunculus = { name: 'Takwin Homunculus', keywords: ['ARTIFICIAL'] };

describe('a Homunculus and the Titan Zulfiqar', () => {
  it('is offered it when it has Gargantuan Size', () => {
    expect(canEquip({ name: 'Titan Zulfiqar' }, {
      dataset: d, armoury: sultanate, carried: [],
      unit: homunculus, traits: ['Gargantuan Size'],
    })).toEqual({ allowed: true });
  });

  it('and refused it when it does not', () => {
    const v = canEquip({ name: 'Titan Zulfiqar' }, {
      dataset: d, armoury: sultanate, carried: [], unit: homunculus, traits: [],
    });
    expect(v.allowed).toBe(false);
    expect(v.reason).toMatch(/Brazen Bull only/);
  });

  it('and a Brazen Bull is offered it on its own name', () => {
    expect(canEquip({ name: 'Titan Zulfiqar' }, {
      dataset: d, armoury: sultanate, carried: [],
      unit: { name: 'Brazen Bull' },
    }).allowed).toBe(true);
  });
});

describe('one suit of Armour', () => {
  const suits = (procession?.rows ?? [])
    .filter((r) => r.section === 'Armour').map((r) => r.name);
  const pilgrim = { name: 'Lazarist Castigator', keywords: ['PILGRIM'] };

  it('the first is offered', () => {
    expect(canEquip({ name: suits[0] }, {
      dataset: d, armoury: procession, carried: [], unit: pilgrim,
    }).allowed).toBe(true);
  });

  it('a second is refused, quoting the book', () => {
    const v = canEquip({ name: suits[1] }, {
      dataset: d, armoury: procession,
      carried: [{ name: suits[0] }], unit: pilgrim,
    });
    expect(v.allowed).toBe(false);
    expect(v.reason).toMatch(/One suit of Armour/);
  });

  /*
    The control. p.80: "The effect of a Shield can be combined with the effect
    of a suit of Armour unless noted otherwise." Greying out a shield because
    armour is worn would block a legal, common loadout.
  */
  it('and a Shield alongside armour is still offered', () => {
    const shield = (procession?.rows ?? []).find((r) => /^Shields?$/.test(r.section))!;
    expect(canEquip({ name: shield.name }, {
      dataset: d, armoury: procession,
      carried: [{ name: suits[0] }], unit: pilgrim,
    }).allowed).toBe(true);
  });
});

describe('an item already over a limit for another reason', () => {
  it('does not block an unrelated one', () => {
    // Asked as "what changes if one more is added", so a model that is
    // already illegal is not told it cannot take anything at all.
    const suits = (procession?.rows ?? [])
      .filter((r) => r.section === 'Armour').map((r) => r.name);
    // An unrestricted row on purpose: the first Equipment row is "Bells of
    // Warding", which is ELITE only, and refusing that is correct behaviour
    // rather than the thing under test.
    const equipment = (procession?.rows ?? []).find(
      (r) => r.section === 'Equipment' && !r.restrictions.length)!;
    expect(canEquip({ name: equipment.name }, {
      dataset: d, armoury: procession,
      carried: [{ name: suits[0] }, { name: suits[1] }],
      unit: { name: 'Lazarist Castigator' },
    }).allowed).toBe(true);
  });
});

/**
 * A Mercenary may have no Battlekit but its own.
 *
 * "A Mercenaries' Battlekit cannot be removed or lost over the course of the
 * campaign for any reason, and they cannot have any other Battlekit"
 * (Warbands L9751-9752) — and BATTLEKIT LIMITS (Digital Rulebook L3810-3818)
 * makes Battlekit mean weapons, grenades, armour, shields and equipment alike.
 * The app had been selling them gear the game does not let them carry.
 */
describe('a Mercenary and the gear it may not have', () => {
  const unitNamed = (name: string) => {
    const u = d.units.find((x) => x.name === name)!;
    return {
      name: u.name,
      keywords: u.keywords,
      roles: u.roles,
      battlekit: u.battlekit ?? [],
      mercenaryMayBuy: u.mercenaryMayBuy,
    };
  };
  const antioch = armouryFor(d, 'new-antioch');
  const ask = (item: string, unit: ReturnType<typeof unitNamed>, armoury = antioch) =>
    canEquip({ name: item }, { dataset: d, armoury, carried: [], unit });

  it('refuses a Witchburner an Armoury weapon', () => {
    const v = ask('Sword/Axe', unitNamed('Witchburner'));
    expect(v.allowed).toBe(false);
    expect(v.reason).toContain('cannot have any other Battlekit');
  });

  it('refuses one without the MERCENARY keyword, on its role', () => {
    /*
      Five of the fourteen Mercenaries carry no MERCENARY keyword. The Sister
      of Saint Cosmas carries none at all — her catalogue entry gives her none
      and no source states one, which #80 documents. A keyword gate would have
      let her buy anything.
    */
    const sister = unitNamed('Sister of Saint Cosmas');
    expect(sister.keywords).not.toContain('MERCENARY');
    expect(sister.roles).toContain('Mercenary');
    expect(ask('Sword/Axe', sister).allowed).toBe(false);
  });

  it('offers the Scripture Guardian a Melee Weapon, and nothing else', () => {
    // Dispatch L748-753: "either two 1-Handed Melee Weapons or one 2-Handed
    // Melee Weapon … purchase … from your Faction Armoury Tables".
    const sg = unitNamed('Scripture Guardian');
    expect(sg.mercenaryMayBuy).toEqual(['Melee']);
    expect(ask('Sword/Axe', sg).allowed).toBe(true);

    const ranged = ask('Rifle', sg);
    expect(ranged.allowed).toBe(false);
    expect(ranged.reason).toContain('Melee Weapons only');
  });

  it('does not count a Pistol as a Melee Weapon', () => {
    /*
      A Pistol's range reads `Melee/16"` — a Ranged weapon usable in melee, not
      one of the "two 1-Handed Melee Weapons" the entry may buy.
    */
    const pistol = d.weapons.find((w) => /\//.test(w.range ?? '') && /melee/i.test(w.range ?? ''));
    expect(pistol, 'a dual-purpose weapon to test with').toBeTruthy();
    expect(ask(pistol!.name, unitNamed('Scripture Guardian')).allowed).toBe(false);
  });

  it('leaves a Mercenary whose Battlekit is unmodelled alone', () => {
    /*
      The rule forbids any OTHER Battlekit, and where the entry's own kit is
      not in the dataset the app does not know what "other" means. The Mamluk
      Faris is the live case: the book gives it armour, a helmet, a Jezzail and
      a three-way loadout choice (Warbands L10055-10063) and the dataset has
      none of it, so refusing everything would leave it permanently unarmed.
    */
    const faris = unitNamed('Mamluk Faris');
    expect(faris.battlekit).toEqual([]);
    expect(ask('Sword/Axe', faris, armouryFor(d, 'iron-sultanate')).allowed).toBe(true);
  });

  it('says nothing about a model that is not a Mercenary', () => {
    const trooper = d.units.find(
      (u) => !(u.roles ?? []).some((r) => /mercenary/i.test(r)) && u.factionId === 'New Antioch')!;
    expect(ask('Sword/Axe', {
      name: trooper.name, keywords: trooper.keywords, roles: trooper.roles,
      battlekit: trooper.battlekit ?? [], mercenaryMayBuy: undefined,
    }).allowed).toBe(true);
  });
});
