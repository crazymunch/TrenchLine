import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { toRoster } from '../fromWarband';
import { validateRoster } from '../validate';
import type { Warband } from '@/types/warband';
import type { Dataset } from '@/types/catalogue';

/**
 * An imported Homunculus keeps the weapon its Formula unlocks.
 *
 * "Homunculus cannot take Titan Zulfiqar — Brazen Bull only" was reported for
 * Al-Masyukh, who has Gargantuan Size. The Armoury's "Brazen Bull only" is
 * shorthand: the catalogue reveals that weapon to a Brazen Bull *or* to
 * anything with the Gargantuan Size Alchemical Formula, and `satisfiesOnlyFor`
 * already knew that.
 *
 * What it never received was the Formula. `toRoster` built each unit's
 * `options` from `specialUpgrades` alone — where an upgrade CHOSEN IN THE APP
 * lands — while a roster IMPORTED from BattleScribe puts its Formulae in
 * `equippedEquipment`. So the fix that comment describes only ever worked for
 * half the rosters in the app.
 */
const d = DATASET as unknown as Dataset;

const homunculus = (formulaIn: 'equipment' | 'upgrades' | 'neither'): Warband => ({
  id: 'w1', name: 'Al-Qarn Rihla', factionId: 'iron-sultanate', ducatLimit: 1320,
  units: [{
    id: 'u1',
    customName: 'Al-Masyukh, Hunter of Hunters',
    profileSnapshot: { name: 'Takwin Homunculus' },
    equippedWeapons: [{
      instanceId: 'w-1', id: 'w-1', name: 'Titan Zulfiqar',
      type: 'Melee', range: 'Melee', hands: 1, cost: 30,
      modifiers: '+0 DICE', damage: 'Standard', keywords: [],
    }],
    equippedArmour: [],
    equippedEquipment: formulaIn === 'equipment'
      ? [{ instanceId: 'e-1', id: 'e-1', name: 'Gargantuan Size', cost: 20,
           effect: '', group: 'Alchemical Formulae' }]
      : [],
    specialUpgrades: formulaIn === 'upgrades'
      ? [{ id: 'o-1', name: 'Gargantuan Size', cost: 20, category: 'Alchemical Formulae' }]
      : [],
    xp: 0, advancements: [], injuries: [], isDead: false, totalCost: 0,
  }],
} as unknown as Warband);

const restrictedCodes = (w: Warband) => {
  const { roster } = toRoster(w, d);
  return validateRoster(roster, d).violations
    .filter((v) => v.code === 'wargear-restricted')
    .map((v) => v.message);
};

describe('a Formula that arrived by import', () => {
  it('unlocks the weapon, exactly as one chosen in the app does', () => {
    expect(restrictedCodes(homunculus('equipment'))).toEqual([]);
  });

  it('still works when the Formula was chosen in the app', () => {
    expect(restrictedCodes(homunculus('upgrades'))).toEqual([]);
  });

  /*
    The control. Without the Formula the restriction is real and must still
    fire — a fix that silences the check rather than informing it would pass
    the two cases above and be worthless.
  */
  it('does not silence the restriction for a model that lacks the Formula', () => {
    expect(restrictedCodes(homunculus('neither')).join(' ')).toMatch(/Titan Zulfiqar/);
  });
});
