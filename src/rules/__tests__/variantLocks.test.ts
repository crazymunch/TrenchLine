/**
 * Which models a Warband Variant unlocks, against the real catalogues.
 *
 * The app offered every Variant-locked model to every Warband of the faction,
 * so a standard Black Grail list could recruit the Matagot Hag — a Leader that
 * belongs to The Great Hunger.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { variantLocks, unlockedBy } from '../variantLocks';
import { variantById } from '../variants';
import { validateRoster } from '../validate';
import { recruitable } from '../recruitable';
import { FACTIONS } from '@/data/defaultRules';
import type { Roster } from '../costs';

const LOCKS = variantLocks(DATASET);
const nameOf = (entryId: string) =>
  DATASET.units.find((u) => (u.entryId || u.id) === entryId)?.name ?? entryId;

describe('models locked to a Warband Variant', () => {
  it('is the set the catalogues gate, and nothing more', () => {
    const rows = [...LOCKS.entries()]
      .map(([id, l]) => `${nameOf(id)} <- ${l.variantNames.sort().join(', ')}`)
      .sort();
    expect(rows).toEqual([
      '"Zamburak" Weapon Platform <- Nomads of Al-Badia',
      'Archeologist <- Nomads of Al-Badia',
      'Bedu Sharpshooter <- Nomads of Al-Badia',
      'Captive Giant <- Children of Yggdrasil',
      'Chieftain <- Children of Yggdrasil',
      'Communicant Anti-Tank Hunter <- War Pilgrimage of Saint Methodius',
      'Crimson Communicant <- The Red Brigade',
      'Faceless <- Fang of the Seething Black',
      'Goetic Warlock <- Fang of the Seething Black, Trench Ghosts',
      'Gregori Gula <- The Great Hunger',
      /*
        The Iron Sultanate Homunculus. Its catalogue entry is revealed by TWO
        conditions — `Book of Golems`, the Exploration result, and The House of
        Wisdom — and only the second is a route a Warband can take at muster.
        Reading the first as "reachable another way" left it unlocked and
        offered to every Sultanate list on day one.
      */
      'Homunculus <- The House of Wisdom',
      'Huscarl <- Children of Yggdrasil',
      'Matagot Hag <- The Great Hunger',
      'Mendelist Ammo Monk <- War Pilgrimage of Saint Methodius',
      'Pairika <- Ghazi of the Golden Path',
      'Shirdal <- Ghazi of the Golden Path',
      'Sin Eater <- Fang of the Seething Black, Trench Ghosts',
      'Stalker <- Fang of the Seething Black',
      'Technomancer <- Cadaver Corps',
      'Teğmen <- Ghazi of the Golden Path',
      'Trench Dog <- The Red Brigade',
      'Witch Coven Matriarch <- Cadaver Corps',
    ]);
  });

  it('never locks a model that is visible by default', () => {
    /*
      A `set hidden false` on a visible entry undoes another Variant's ban; it
      is not a gate. The Janissary is the proof: a core Iron Sultanate troop,
      banned by two Variants and re-revealed under Fida'i of Alamut. Locking it
      would make Janissaries exclusive to the Cabal of Assassins.
    */
    for (const name of ['Janissary', 'Plague Knight', 'War Prophet', 'Trench Cleric',
                        'Anointed Heavy Infantry', 'Sultanate Sapper', 'Shocktrooper',
                        'War Wolf', 'Yoke Fiend', 'Desecrated Saint']) {
      const u = DATASET.units.find((x) => x.name === name);
      expect(u, name).toBeDefined();
      expect(LOCKS.has(u!.entryId || u!.id), `${name} must not be Variant-locked`).toBe(false);
    }
  });

  it('does not lock a model reachable another way', () => {
    // The Desecrated Saint and the Yoke Fiend answer to the Court's Chosen Sin
    // as well as to the Fang, so neither belongs to the Fang alone.
    for (const name of ['Desecrated Saint', 'Yoke Fiend']) {
      const u = DATASET.units.find((x) => x.name === name)!;
      expect(LOCKS.has(u.entryId || u.id), name).toBe(false);
    }
  });
});

describe('whether a Warband may field a locked model', () => {
  const lockFor = (name: string) =>
    LOCKS.get(DATASET.units.find((u) => u.name === name)!.entryId!);

  it('says yes on the Variant that unlocks it', () => {
    expect(unlockedBy(lockFor('Technomancer'), variantById(DATASET, 'cadavercorps'))).toBe(true);
    expect(unlockedBy(lockFor('Matagot Hag'), variantById(DATASET, 'greathunger'))).toBe(true);
  });

  it('says no on another Variant, and on the standard list', () => {
    expect(unlockedBy(lockFor('Technomancer'), variantById(DATASET, 'trenchghosts'))).toBe(false);
    expect(unlockedBy(lockFor('Matagot Hag'), undefined)).toBe(false);
  });

  it('leaves an unlocked model alone', () => {
    // No lock means offered as normal — the default, and the safe one.
    expect(unlockedBy(undefined, undefined)).toBe(true);
  });

  it('accepts either of the two Variants that unlock the same hire', () => {
    const sin = lockFor('Sin Eater');
    expect(unlockedBy(sin, variantById(DATASET, 'trenchghosts'))).toBe(true);
    expect(unlockedBy(sin, variantById(DATASET, 'fangoftheseethingblack'))).toBe(true);
    expect(unlockedBy(sin, variantById(DATASET, 'houseofwisdom'))).toBe(false);
  });
});


describe('a locked model left on the roster', () => {
  /*
    The recruit list will not offer one, so this fires when the Variant is
    changed afterwards — which the roster screen allows until the first game.
  */
  const hag = DATASET.units.find((u) => u.name === 'Matagot Hag')!;
  const rosterOn = (variantId: string | undefined): Roster => ({
    id: 'r1', name: 'T', factionId: 'Black Grail', variantId,
    allowThirdParty: true,
    units: [{ id: 'u1', profileId: hag.id, name: hag.name, cost: hag.cost,
              items: [], options: [] }],
    stash: [], budget: { ducats: 700, glory: 10 },
  });

  it('is legal on the Variant that unlocks it', () => {
    const r = validateRoster(rosterOn('greathunger'), DATASET);
    expect(r.violations.filter((v) => v.code === 'variant-locked')).toEqual([]);
  });

  it('is an error on the standard list', () => {
    const r = validateRoster(rosterOn(undefined), DATASET);
    const v = r.violations.find((x) => x.code === 'variant-locked');
    expect(v, 'no violation raised').toBeDefined();
    expect(v!.severity).toBe('error');
    expect(v!.message).toContain('The Great Hunger');
    expect(v!.unitId).toBe('u1');
  });

  it('leaves ordinary models alone', () => {
    const knight = DATASET.units.find((u) => u.name === 'Plague Knight')!;
    const r = validateRoster({
      ...rosterOn(undefined),
      units: [{ id: 'u2', profileId: knight.id, name: knight.name, cost: knight.cost,
                items: [], options: [] }],
    }, DATASET);
    expect(r.violations.filter((x) => x.code === 'variant-locked')).toEqual([]);
  });
});

describe('what the recruit list carries', () => {
  const APP = FACTIONS.map((f) => f.id);

  it('marks a locked model with the Variants that unlock it', () => {
    const grail = recruitable(DATASET, 'cult-of-the-black-grail', APP);
    const hag = grail.units.find((u) => u.name === 'Matagot Hag')!;
    expect(hag.requiresVariant?.map((v) => v.name)).toEqual(['The Great Hunger']);
  });

  it('leaves an ordinary model unmarked, so it is offered as normal', () => {
    const grail = recruitable(DATASET, 'cult-of-the-black-grail', APP);
    for (const name of ['Plague Knight', 'Corpse Guard']) {
      const u = grail.units.find((x) => x.name === name);
      expect(u?.requiresVariant, name).toBeUndefined();
    }
  });
});
