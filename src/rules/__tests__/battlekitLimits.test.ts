import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { validateRoster } from '../validate';
import { battlekitBreaches } from '../battlekitLimits';
import { armouryFor } from '../armoury';
import { defaultSultanateWarband } from '@/store/seed';
import { toRoster } from '../fromWarband';
import type { Dataset } from '@/types/catalogue';
import type { Roster, RosterItem } from '../costs';

/**
 * BATTLEKIT LIMITS, Trench Crusade Digital Rulebook p.69.
 *
 *   "Unless otherwise stated a model is limited to the following Battlekit:
 *    ** One 2-Handed Ranged Weapon or two 1-Handed Ranged Weapons.
 *    ** One 2-Handed Melee Weapon or two 1-Handed Melee Weapons.
 *    ** One type of Grenade.
 *    ** One suit of Armour.
 *    ** One Shield (▶ see additional restrictions below).
 *    ** Any number of pieces of Equipment or Special Battlekit. A Model cannot
 *       have two or more pieces of Equipment or Special Battlekit with the
 *       same Name."
 *
 * The app enforced none of it: a model could wear three suits of Armour, carry
 * two Shields and four 2-Handed weapons, and validate clean.
 */
const d = DATASET as unknown as Dataset;
const F = 'procession-of-the-sacred-affliction';
const armoury = armouryFor(d, F)!;
const rowsIn = (section: string) => armoury.rows.filter((r) => r.section === section);
const item = (name: string): RosterItem => {
  const row = armoury.rows.find((r) => r.name === name)!;
  return { weaponId: row.weaponId ?? undefined, name: row.name, cost: row.cost };
};

const profile = d.units.find(
  (u) => u.name === 'Lazarist Castigator'
      && String(u.factionId).toLowerCase().includes('procession'))!;

const carrying = (items: RosterItem[]): Roster => ({
  id: 'r1', name: 'T', factionId: 'Procession of the Sacred Affliction',
  units: [{ id: 'u1', profileId: profile.id, name: profile.name,
            cost: profile.cost, items, options: [] }],
  stash: [], budget: { ducats: 900, glory: 10 },
});

const breaches = (r: Roster) =>
  validateRoster(r, d).violations.filter((v) => v.code === 'battlekit-limit');

describe('the limits are derived, not typed', () => {
  it('the ruleset carries all six bullets and the Shield restrictions', () => {
    const l = d.battlekitLimits!;
    expect(l.limits).toHaveLength(6);
    expect(l.limits.map((x) => x.section).sort()).toEqual(
      ['Armour', 'Equipment', 'Grenades', 'Melee Weapons', 'Ranged Weapons', 'Shields']);
    expect(l.withShield?.unlessBoth).toBe('Shield Combo');
  });

  it('every rule quotes the sentence it came from', () => {
    // The player's next move is to check the page, so the wording is kept.
    for (const rule of d.battlekitLimits!.limits) {
      expect(rule.raw.length, rule.section).toBeGreaterThan(10);
    }
  });
});

describe('one suit of Armour', () => {
  const suits = rowsIn('Armour').map((r) => r.name);

  it('two suits is an error', () => {
    const v = breaches(carrying([item(suits[0]), item(suits[1])]));
    expect(v).toHaveLength(1);
    expect(v[0].severity).toBe('error');
    expect(v[0].message).toContain(suits[0]);
    expect(v[0].rule).toContain('One suit of Armour');
  });

  it('one suit is fine', () => {
    expect(breaches(carrying([item(suits[0])]))).toEqual([]);
  });

  /*
    The control that matters most. p.80: "The effect of a Shield can be
    combined with the effect of a suit of Armour unless noted otherwise." A
    rule that counted Shields as Armour would break a legal, common loadout.
  */
  it('and a Shield alongside it is explicitly legal', () => {
    const shield = rowsIn('Shield').concat(rowsIn('Shields'))[0].name;
    expect(breaches(carrying([item(suits[0]), item(shield)]))).toEqual([]);
  });
});

describe('one Shield', () => {
  const shields = rowsIn('Shield').concat(rowsIn('Shields')).map((r) => r.name);

  it('two Shields is an error', () => {
    expect(shields.length).toBeGreaterThan(1);
    expect(breaches(carrying([item(shields[0]), item(shields[1])]))).toHaveLength(1);
  });
});

describe('the handedness rule', () => {
  /** A weapon of a given section and handedness, from the faction's armoury. */
  const weapon = (section: string, hands: number) => {
    const chapter = new Map((d.battlekit ?? []).map((b) => [b.name, b.type]));
    return rowsIn(section)
      .filter((r) => chapter.get(r.name) === `${hands}-Handed`)
      .map((r) => r.name);
  };

  it('one 2-Handed Melee weapon is fine', () => {
    const [two] = weapon('Melee Weapons', 2);
    expect(two, 'no 2-Handed melee weapon in this armoury').toBeTruthy();
    expect(breaches(carrying([item(two)]))).toEqual([]);
  });

  it('two 2-Handed Melee weapons is an error', () => {
    const two = weapon('Melee Weapons', 2);
    expect(two.length).toBeGreaterThan(1);
    const v = breaches(carrying([item(two[0]), item(two[1])]));
    expect(v).toHaveLength(1);
    expect(v[0].rule).toContain('2-Handed Melee Weapon');
  });

  it('two 1-Handed Melee weapons is fine — the same allowance, spent differently', () => {
    const one = weapon('Melee Weapons', 1);
    expect(one.length).toBeGreaterThan(1);
    expect(breaches(carrying([item(one[0]), item(one[1])]))).toEqual([]);
  });

  it('a 2-Handed and a 1-Handed together is an error — that is three hands', () => {
    const [two] = weapon('Melee Weapons', 2);
    const [one] = weapon('Melee Weapons', 1);
    expect(breaches(carrying([item(two), item(one)]))).toHaveLength(1);
  });

  /*
    Ranged and Melee are separate allowances, and the book says so by stating
    them as two bullets. A model may carry two swords AND two pistols: "A model
    may freely switch between Ranged and Melee Weapons between ACTIONS."
  */
  it('and a Melee allowance does not eat the Ranged one', () => {
    const melee = weapon('Melee Weapons', 1);
    const ranged = weapon('Ranged Weapons', 1);
    if (!ranged.length) return;   // this armoury may stock no 1-Handed ranged
    expect(breaches(carrying([item(melee[0]), item(melee[1]), item(ranged[0])]))).toEqual([]);
  });
});

describe('an extra limb', () => {
  it('buys one more hand, because the rule opens "Unless otherwise stated"', () => {
    const chapter = new Map((d.battlekit ?? []).map((b) => [b.name, b.type]));
    const one = rowsIn('Melee Weapons')
      .filter((r) => chapter.get(r.name) === '1-Handed').map((r) => r.name);
    const three = [item(one[0]), item(one[1]), item(one[0])];

    // Three 1-Handed weapons in two hands is a breach…
    expect(battlekitBreaches(
      three.map((i) => ({ name: i.name!, weaponId: i.weaponId })),
      { armoury, dataset: d },
    )).toHaveLength(1);

    // …and is not, for a model the app already lets hold a third weapon.
    expect(battlekitBreaches(
      three.map((i) => ({ name: i.name!, weaponId: i.weaponId })),
      { armoury, dataset: d, extraLimb: true },
    )).toEqual([]);
  });
});

describe('an item the sources do not classify', () => {
  it('is not counted rather than guessed at', () => {
    // A wrong guess here is a legality error on a legal roster, which is the
    // failure this codebase has been paying for.
    expect(battlekitBreaches(
      [{ name: 'Something No Source Has Heard Of' }],
      { armoury, dataset: d },
    )).toEqual([]);
  });

  it('and a ruleset with no limits parsed is not policed', () => {
    const noLimits = { ...d, battlekitLimits: undefined } as Dataset;
    expect(battlekitBreaches(
      [{ name: 'Standard Armour' }, { name: 'Reinforced Armour' }],
      { armoury, dataset: noLimits },
    )).toEqual([]);
  });
});

/*
  The regression that matters more than any of the above: a real, legal roster
  must stay legal. Al-Qarn Rihla is nine models of mixed weapons, armour and
  equipment, including a Homunculus with an extra limb.
*/
describe('a real warband', () => {
  it('raises no Battlekit violation', () => {
    const { roster } = toRoster(defaultSultanateWarband, d);
    const v = validateRoster(roster, d).violations.filter((x) => x.code === 'battlekit-limit');
    expect(v.map((x) => x.message)).toEqual([]);
  });
});
