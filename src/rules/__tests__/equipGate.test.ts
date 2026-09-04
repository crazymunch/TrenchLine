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
