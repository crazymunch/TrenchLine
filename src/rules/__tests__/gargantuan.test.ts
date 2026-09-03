import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { validateRoster } from '../validate';
import { traitsOf } from '../formulae';
import type { Dataset } from '@/types/catalogue';
import type { Roster } from '../costs';

/**
 * "The Homunculus can use 1 Weapon that can usually only be taken by a Brazen
 * Bull" — Gargantuan Size, Warbands of Trench Crusade.
 *
 * The Titan Zulfiqar's Armoury row says `Brazen Bull only`, and the catalogue
 * spells out what that shorthand means: the entry is revealed to a Brazen Bull
 * OR to anything named `Gargantuan Size`. A Homunculus that has the Formula is
 * wielding it legally.
 *
 * It was rejected anyway. `unlockedBy` was correct and the roster builder read
 * the Formula from the two places one can be BOUGHT — an imported roster's
 * `equippedEquipment` and the app's own `specialUpgrades` — but not from the
 * third, where a model that was ADVANCED into the Formula records it: the
 * profile snapshot's innate abilities. Al-Masyukh, Hunter of Hunters carries
 * Gargantuan Size exactly there.
 */
const d = DATASET as unknown as Dataset;

const zulfiqar = d.weapons.find((w) => w.name === 'Titan Zulfiqar')!;
const homunculus = d.units.find(
  (u) => u.name.includes('Homunculus')
      && String(u.factionId).toLowerCase().includes('sultanate'))!;

const rosterWith = (traits: string[]): Roster => ({
  id: 'r1', name: 'Al-Qarn Rihla', factionId: 'iron-sultanate',
  units: [{
    id: 'u1', profileId: homunculus.id, name: 'Al-Masyukh',
    cost: homunculus.cost,
    items: [{ weaponId: zulfiqar.id, name: zulfiqar.name, cost: { ducats: 30, glory: 0 } }],
    options: [],
    traits,
  }],
  stash: [], budget: { ducats: 1220, glory: 10 },
});

const restricted = (r: Roster) =>
  validateRoster(r, d).violations.filter((v) => v.code === 'wargear-restricted');

describe('a Takwin Homunculus with Gargantuan Size', () => {
  it('may take the Titan Zulfiqar', () => {
    expect(restricted(rosterWith(['Gargantuan Size']))).toEqual([]);
  });

  /*
    The control that matters. The grant is the Formula's, not the model's: a
    Homunculus without it is still held to "Brazen Bull only", and a fix that
    simply stopped enforcing the restriction would pass the test above.
  */
  it('and one without it still cannot', () => {
    const v = restricted(rosterWith([]));
    expect(v, 'the restriction is no longer enforced at all').toHaveLength(1);
    expect(v[0].message).toContain('Brazen Bull only');
  });

  it('is not unlocked by some other Formula it happens to hold', () => {
    // Only names the entry itself lists in `unlockedBy` may count.
    expect(restricted(rosterWith(['Massive Size', 'Hawk Eyes', 'Human Hands'])))
      .toHaveLength(1);
  });

  it('reads the same whichever way the catalogue names the unlock', () => {
    // The entry is revealed to a Brazen Bull *or* to Gargantuan Size; both are
    // in `unlockedBy`, and neither is privileged over the other.
    expect(zulfiqar as unknown as { unlockedBy?: string[] })
      .toHaveProperty('unlockedBy', expect.arrayContaining(['Brazen Bull', 'Gargantuan Size']));
  });
});

describe('traitsOf', () => {
  it('reads a Formula the model was advanced into, on its profile snapshot', () => {
    expect(traitsOf({
      profileSnapshot: { innateAbilities: [
        { name: 'Gargantuan Size', description: 'Base size 60mm, can wield Brazen Bull weapons.' },
      ] },
    })).toContain('Gargantuan Size');
  });

  it('reads one imported into equippedEquipment', () => {
    expect(traitsOf({
      equippedEquipment: [{ name: 'Gargantuan Size', group: 'Alchemical Formulae' }],
    })).toContain('Gargantuan Size');
  });

  it('reads one bought in the app', () => {
    expect(traitsOf({
      specialUpgrades: [{ name: 'Gargantuan Size', category: 'Alchemical Formulae' }],
    })).toContain('Gargantuan Size');
  });

  it('does not invent one for a model that has none', () => {
    expect(traitsOf({})).toEqual([]);
    expect(traitsOf(undefined)).toEqual([]);
  });
});
