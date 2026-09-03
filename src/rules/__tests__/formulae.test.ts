import { describe, it, expect } from 'vitest';
import {
  isAlchemicalFormula,
  isInventedFormula,
  hasExtraLimb,
  formulaeOf,
  EXTRA_LIMB_FORMULA,
} from '../formulae';
import { repairInventedFormulae } from '../../services/repairSavedRosters';
import type { Warband } from '../../types/warband';

/*
  Al-Masyukh, Hunter of Hunters, exactly as the roster records him.

  Eight Alchemical Formulae, every one of them from the catalogue's
  `Alchemical Formulae` group, and every one of them rendered by the app as
  ordinary gear because none of their NAMES contains the word "formula".
*/
const AL_MASYUKH_FORMULAE = [
  { name: 'Massive Size', cost: 30, group: 'Alchemical Formulae' },
  { name: 'Human Hands', cost: 10, group: 'Alchemical Formulae' },
  { name: 'Inhuman Strength', cost: 15, group: 'Alchemical Formulae' },
  { name: 'Additional Arm', cost: 15, group: 'Alchemical Formulae' },
  { name: 'Two Heads', cost: 5, group: 'Alchemical Formulae' },
  { name: 'Hawk Eyes', cost: 10, group: 'Alchemical Formulae::Eye Options' },
  { name: 'Hypnotic Eyes', cost: 15, group: 'Alchemical Formulae::Eye Options' },
  { name: 'Gargantuan Size', cost: 20, group: 'Alchemical Formulae' },
];

describe('telling a Formula from gear', () => {
  it('reads the catalogue group, so all eight of Al-Masyukh’s count', () => {
    for (const f of AL_MASYUKH_FORMULAE) {
      expect(isAlchemicalFormula(f), f.name).toBe(true);
    }
  });

  /*
    The regression. Every one of these is what the old name regex tested for,
    and not one of the eight above matches any of them.
  */
  it('does not depend on the word "formula" appearing in the name', () => {
    const nameRegex = /formula|elixir|salve|phial|alkahest|vitriol|brimstone|cinnabar/i;
    expect(AL_MASYUKH_FORMULAE.every((f) => !nameRegex.test(f.name))).toBe(true);
  });

  it('an Eye Option is a Formula, because its group sits under one', () => {
    expect(isAlchemicalFormula({ name: 'Hawk Eyes', group: 'Alchemical Formulae::Eye Options' })).toBe(true);
  });

  it('ordinary gear is not a Formula, whatever it is called', () => {
    expect(isAlchemicalFormula({ name: 'Gas Mask', group: 'Equipment' })).toBe(false);
    expect(isAlchemicalFormula({ name: 'Fire Shield', group: 'Weapons::Utility Hand::Shields' })).toBe(false);
    // No group at all is not a claim that it IS one.
    expect(isAlchemicalFormula({ name: 'Elixir of Al-Khidr' })).toBe(false);
  });
});

/*
  The bug with teeth. `Additional Arm` is what the catalogue prints; the app
  granted the third weapon hand only for `Third Arm`, which it does not.
*/
describe('the third weapon hand', () => {
  const OLD_REGEX = /third arm|extra arm|limb/i;

  it('is granted by the Formula the catalogue actually prints', () => {
    expect(hasExtraLimb({ equippedEquipment: AL_MASYUKH_FORMULAE })).toBe(true);
  });

  it('was NOT granted by it before — which is the whole bug', () => {
    expect(OLD_REGEX.test(EXTRA_LIMB_FORMULA)).toBe(false);
  });

  it('was granted only by the invented entry', () => {
    expect(OLD_REGEX.test('Third Arm (Extra Limb)')).toBe(true);
  });

  it('is not granted to a model without it', () => {
    expect(hasExtraLimb({ equippedEquipment: [{ name: 'Two Heads', group: 'Alchemical Formulae' }] })).toBe(false);
    expect(hasExtraLimb(null)).toBe(false);
  });

  it('is granted to a model born with it', () => {
    expect(hasExtraLimb({
      profileSnapshot: { innateAbilities: [{ name: 'Additional Arm', description: '' }] },
    })).toBe(true);
  });

  it('is granted through an in-app upgrade too, not only an import', () => {
    expect(hasExtraLimb({
      specialUpgrades: [{ name: 'Additional Arm', category: 'Alchemical Formulae' }],
    })).toBe(true);
  });
});

describe('collecting a model’s Formulae', () => {
  it('reads both places one can be recorded', () => {
    expect(formulaeOf({
      equippedEquipment: [{ name: 'Two Heads', group: 'Alchemical Formulae' }, { name: 'Gas Mask', group: 'Equipment' }],
      specialUpgrades: [{ name: 'Gargantuan Size', category: 'Alchemical Formulae' }],
    })).toEqual(['Two Heads', 'Gargantuan Size']);
  });
});

describe('the invented Formulae', () => {
  it('recognises the one that shipped, with and without its gloss', () => {
    expect(isInventedFormula({ name: 'Third Arm (Extra Limb)' })).toBe(true);
    expect(isInventedFormula({ name: 'Third Arm' })).toBe(true);
    expect(isInventedFormula({ name: 'Chameleon Skin' })).toBe(true);
  });

  /*
    `Additional Arm` is the real entry sitting next to it in the same picker.
    Removing that instead would delete a Formula the player legitimately owns.
  */
  it('never touches the real entry it sat beside', () => {
    expect(isInventedFormula({ name: 'Additional Arm' })).toBe(false);
    expect(isInventedFormula({ name: 'Gargantuan Size' })).toBe(false);
  });
});

describe('repairing a saved roster', () => {
  const warband = (upgrades: { id: string; name: string; cost: number; category: string }[]): Warband[] => ([{
    id: 'w1', name: 'Al-Qarn Rihla', factionId: 'iron-sultanate', units: [{
      id: 'u1', customName: 'Al-Masyukh, Hunter of Hunters',
      profileSnapshot: { name: 'Favoured Takwin Homunculus' },
      equippedWeapons: [], equippedArmour: [], equippedEquipment: AL_MASYUKH_FORMULAE,
      xp: 1, advancements: [], injuries: [], isDead: false,
      totalCost: 262, specialUpgrades: upgrades,
    }],
  }] as unknown as Warband[]);

  it('removes the invented entry and refunds what it charged', () => {
    const { warbands, repairs } = repairInventedFormulae(
      warband([{ id: 'x', name: 'Third Arm (Extra Limb)', cost: 10, category: 'Alchemical Formula' }]),
    );

    expect(warbands[0].units[0].specialUpgrades).toEqual([]);
    // 40 base + 120 of Formulae + 92 of weapons = 252. The card said 262.
    expect(warbands[0].units[0].totalCost).toBe(252);
    expect(repairs).toEqual([{
      warband: 'Al-Qarn Rihla',
      unit: 'Al-Masyukh, Hunter of Hunters',
      removed: ['Third Arm (Extra Limb)'],
      ducatsRefunded: 10,
    }]);
  });

  it('leaves a roster that has none of them completely alone', () => {
    const input = warband([{ id: 'y', name: 'Whispering Zīj', cost: 20, category: 'Alchemical Formulae' }]);
    const { warbands, repairs } = repairInventedFormulae(input);
    expect(repairs).toEqual([]);
    // The identical array, so nothing downstream sees a change it must persist.
    expect(warbands).toBe(input);
  });

  it('keeps the model’s third hand afterwards, because the real Formula grants it', () => {
    const { warbands } = repairInventedFormulae(
      warband([{ id: 'x', name: 'Third Arm (Extra Limb)', cost: 10, category: 'Alchemical Formula' }]),
    );
    expect(hasExtraLimb(warbands[0].units[0])).toBe(true);
  });
});
