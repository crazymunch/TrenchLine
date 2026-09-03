import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { recruitable } from '../recruitable';
import { toRoster } from '../fromWarband';
import { validateRoster, factionMatches } from '../validate';
import type { Dataset } from '@/types/catalogue';
import type { Warband } from '@/types/warband';

/**
 * An entry the catalogue gates must not be offered, and must not be required.
 *
 * A `sharedSelectionEntry` is a definition; it reaches a list only through an
 * `entryLink`, and the LINK carries the `hidden` that decides availability.
 * Reading `hidden` off the definition let three gated entries onto the
 * Trench Pilgrims recruit list at muster:
 *
 *   - `Homunculus`, which the rulebook adds only through the `Book of Golems`
 *     Exploration result, mid-campaign.
 *   - `Trench Dog`, which is a GLORY ITEM (1-3 ☼, Limit 1) rather than a
 *     Mercenary — it is revealed to New Antioch by The Red Brigade Variant.
 *   - `Chieftain`, which is the Children of Yggdrasil Variant's leader. Its
 *     `min=1` was then enforced on every Pilgrims warband, so a legal roster
 *     was told to include a model it could not recruit.
 */
const d = DATASET as unknown as Dataset;
const APP_FACTIONS = ['new-antioch', 'trench-pilgrims', 'iron-sultanate', 'heretic-legions',
  'black-grail', 'court-of-the-seven-headed-serpent'];

/*
  What a Warband of this faction is actually offered at muster: its own
  entries, minus anything a Variant it has not taken locks away. `recruitable`
  returns every faction's units and the UI narrows by faction, so the test has
  to narrow the same way or it asserts against the whole game.
*/
const offered = (factionId: string) =>
  recruitable(d, factionId, APP_FACTIONS).units
    .filter((u) => factionMatches(u.factionId, factionId) || u.category === 'Mercenary')
    .filter((u) => !u.requiresVariant?.length)
    .map((u) => u.name);

describe('the recruit list', () => {
  it('does not offer a Trench Pilgrims warband a Homunculus', () => {
    expect(offered('trench-pilgrims')).not.toContain('Homunculus');
  });

  it('does not offer a Trench Dog as if it were a Mercenary', () => {
    expect(offered('trench-pilgrims')).not.toContain('Trench Dog');
    expect(offered('new-antioch')).not.toContain('Trench Dog');
  });

  it('does not offer the Children of Yggdrasil leader to every Pilgrims warband', () => {
    expect(offered('trench-pilgrims')).not.toContain('Chieftain');
    expect(offered('trench-pilgrims')).not.toContain('Huscarl');
  });

  /*
    The control. These gates must not swallow the ordinary list — a fix that
    empties the recruit sheet would pass every assertion above.
  */
  it('still offers the entries a Pilgrims warband actually has', () => {
    const list = offered('trench-pilgrims');
    for (const want of ['War Prophet', 'Trench Pilgrim', 'Communicant', 'Stigmatic Nun']) {
      expect(list, `${want} went missing`).toContain(want);
    }
    expect(list.length).toBeGreaterThan(4);
  });

  it('still offers basic kit, which is not gated', () => {
    const gear = recruitable(d, 'trench-pilgrims', APP_FACTIONS);
    const names = [...gear.weapons, ...gear.armour, ...gear.equipment].map((x) => x.name);
    for (const want of ['Gas Mask', 'Standard Armour']) {
      expect(names, `${want} went missing`).toContain(want);
    }
  });
});

describe('a gated entry is still reachable through its Variant', () => {
  it('The House of Wisdom unlocks the Homunculus', () => {
    const u = recruitable(d, 'iron-sultanate', APP_FACTIONS).units.find((x) => x.name === 'Homunculus');
    expect(u, 'the Homunculus vanished from the Iron Sultanate entirely').toBeTruthy();
    expect(u!.requiresVariant?.map((v) => v.name)).toContain('The House of Wisdom');
  });

  it('Children of Yggdrasil unlocks the Chieftain', () => {
    const u = recruitable(d, 'trench-pilgrims', APP_FACTIONS).units.find((x) => x.name === 'Chieftain');
    expect(u!.requiresVariant?.map((v) => v.name)).toContain('Children of Yggdrasil');
  });
});

describe('legality', () => {
  const warband = (variantId?: string): Warband => ({
    id: 'w1', name: 'Test', factionId: 'trench-pilgrims', variantId, ducatLimit: 1000,
    units: [{
      id: 'u1', customName: 'The Prophet',
      profileSnapshot: { name: 'War Prophet' },
      equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
      xp: 0, advancements: [], injuries: [], isDead: false, totalCost: 0,
    }],
  } as unknown as Warband);

  const messages = (variantId?: string) => {
    const { roster } = toRoster(warband(variantId), d);
    return validateRoster(roster, d).violations.filter((v) => v.code === 'unit-min').map((v) => v.message);
  };

  it('never demands a Chieftain from a warband that cannot recruit one', () => {
    expect(messages().join(' ')).not.toMatch(/Chieftain/);
    expect(messages('Procession of the Sacred Affliction').join(' ')).not.toMatch(/Chieftain/);
  });

  /*
    And still demands the leader that IS required. A guard that skipped every
    minimum would pass the assertion above and make the check worthless.
  */
  it('still requires the War Prophet a Pilgrims warband must have', () => {
    const { roster } = toRoster({ ...warband(), units: [] } as unknown as Warband, d);
    const codes = validateRoster(roster, d).violations.filter((v) => v.code === 'unit-min');
    expect(codes.map((v) => v.message).join(' ')).toMatch(/War Prophet/);
  });
});
