import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { validateRoster } from '../validate';
import { effectiveKeywords } from '../keywordGrants';
import { traitsOf } from '../formulae';
import { toRoster } from '../fromWarband';
import type { Dataset } from '@/types/catalogue';
import type { Warband } from '@/types/warband';

/**
 * A Takwin Homunculus with its Formulae, as a real roster stores them.
 *
 * Two errors on a legal model, and both came from the same place: the app
 * could not see the model's Alchemical Formulae.
 *
 *   "Homunculus cannot take Titan Zulfiqar — Brazen Bull only."
 *      Gargantuan Size: "The Homunculus can use 1 Weapon that can usually only
 *      be taken by a Brazen Bull." The catalogue reveals the Zulfiqar to that
 *      name. The Formula was stored in `equippedEquipment` with no group,
 *      because the importer that dropped the group is the reason this whole
 *      family of bug exists — and `traitsOf` was still requiring one.
 *
 *   "Titan Zulfiqar, Great Sword/Axe needs 3 hands and the model has 2."
 *      Inhuman Strength: "Give this Takwin Homunculus the STRONG Keyword."
 *      STRONG lets a model use one 2-Handed Melee Weapon as if it were
 *      1-Handed. The base entry carries only ARTIFICIAL, so reading it alone
 *      counted three hands for a legal loadout.
 */
const d = DATASET as unknown as Dataset;

const homunculus = d.units.find((u) => u.name === 'Takwin Homunculus')!;
const zulfiqar = d.weapons.find((w) => w.name === 'Titan Zulfiqar')!;
const greatSword = d.weapons.find(
  (w) => w.name === 'Great Sword/Axe' || w.name === 'Great Sword')!;

/** A saved roster whose Formulae carry no group — the shape that broke. */
const warband = (formulae: string[]): Warband => ({
  id: 'wb1', name: 'Al-Qarn Rihla', factionId: 'iron-sultanate',
  ducatLimit: 1220, treasuryDucats: 0, gloryPoints: 0,
  units: [{
    id: 'u1', customName: 'Al-Masyukh', baseProfileId: homunculus.id,
    profileSnapshot: homunculus as never,
    equippedWeapons: [
      { instanceId: 'w1', id: zulfiqar.id, name: zulfiqar.name, cost: 30 },
      { instanceId: 'w2', id: greatSword.id, name: greatSword.name, cost: 12 },
    ] as never,
    equippedArmour: [],
    // No `group` on any of them, exactly as the old importer wrote them.
    equippedEquipment: formulae.map((name, i) => ({
      id: `e${i}`, name, cost: 0,
    })) as never,
    xp: 0, advancements: [], injuries: [], isDead: false,
    totalCost: 100, currentWounds: 1, maxWounds: 1, bloodMarkers: 0,
    status: 'Active',
  }] as never,
  armoryStash: [], createdAt: '', updatedAt: '',
} as unknown as Warband);

const errorsFor = (formulae: string[]) => {
  const { roster } = toRoster(warband(formulae), d);
  return validateRoster(roster, d).errors;
};

describe('a Homunculus with its Formulae', () => {
  const full = ['Human Hands', 'Massive Size', 'Inhuman Strength', 'Gargantuan Size'];

  it('may wield a Titan Zulfiqar, because Gargantuan Size says so', () => {
    expect(errorsFor(full).filter((e) => e.code === 'wargear-restricted'))
      .toEqual([]);
  });

  it('and its greatsword does not cost it a third hand, because Inhuman Strength gives STRONG', () => {
    expect(errorsFor(full).filter((e) => e.code === 'battlekit-limit'))
      .toEqual([]);
  });

  it('reads the Formulae even though nothing recorded their group', () => {
    // The group is exactly what the old importer dropped, so requiring one
    // loses the Formula on every roster imported before that was fixed.
    const { roster } = toRoster(warband(full), d);
    expect(roster.units[0].traits).toEqual(expect.arrayContaining(['Gargantuan Size']));
    expect(roster.units[0].keywords).toEqual(expect.arrayContaining(['STRONG']));
  });

  /*
    The controls. Neither grant may be free: a model without the Formula must
    still be refused, or the fix is just "stop enforcing the rule".
  */
  it('and a Homunculus WITHOUT Gargantuan Size still cannot take the Zulfiqar', () => {
    const v = errorsFor(['Human Hands', 'Massive Size', 'Inhuman Strength']);
    expect(v.some((e) => e.code === 'wargear-restricted')).toBe(true);
  });

  it('and one WITHOUT Inhuman Strength is still held to two hands', () => {
    const v = errorsFor(['Human Hands', 'Massive Size', 'Gargantuan Size']);
    expect(v.some((e) => e.code === 'battlekit-limit')).toBe(true);
  });
});

describe('effectiveKeywords', () => {
  it('adds what a Formula grants to what the entry carries', () => {
    expect(effectiveKeywords(homunculus, ['Inhuman Strength'], d))
      .toEqual(expect.arrayContaining(['ARTIFICIAL', 'STRONG']));
  });

  it('grants nothing for a name no option matches', () => {
    expect(effectiveKeywords(homunculus, ['Not A Formula'], d))
      .toEqual([...(homunculus.keywords ?? [])]);
  });

  it('reads a multi-keyword grant as several', () => {
    // "Give this Takwin Homunculus the NEGATE FIRE and NEGATE GAS Keywords."
    expect(effectiveKeywords(homunculus, ['Elemental Resistance'], d))
      .toEqual(expect.arrayContaining(['NEGATE FIRE', 'NEGATE GAS']));
  });

  it('does not duplicate one the model already has', () => {
    const ks = effectiveKeywords(homunculus, ['Inhuman Strength', 'Inhuman Strength'], d);
    expect(ks.filter((k) => k === 'STRONG')).toHaveLength(1);
  });
});

describe('traitsOf reads every equipped entry', () => {
  it('regardless of whether its group survived the import', () => {
    expect(traitsOf({ equippedEquipment: [{ name: 'Gargantuan Size' }] }))
      .toContain('Gargantuan Size');
  });
});
