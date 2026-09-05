/**
 * The second currency, on the card rather than only in the recruit sheet.
 *
 * `recruitable.ts` already carries a Glory cost through from the catalogue and
 * `recruitable.test.ts` proves it: the Witch Coven Matriarch is 0 Ducats and 5
 * Glory. What nothing checked is that the number survives being recruited. It
 * did not — `ActiveUnit.totalCost` is Ducats, so she sat on the roster reading
 * "0 D", which on a card with no other price on it reads as a free model.
 *
 * These use the real catalogue entry rather than a fixture with a 5 typed into
 * it. A hand-written 5 would pass this suite whether or not the pipeline still
 * produces one.
 */
import { describe, it, expect } from 'vitest';
import { DATASET } from '@/data/generated/trenchline.generated';
import { FACTIONS } from '@/data/defaultRules';
import { recruitable } from '@/rules/recruitable';
import { unitGlory, rosterGlory, formatUnitCost } from '@/rules/savedGlory';
import type { ActiveUnit } from '@/types/warband';
import type { UnitProfile, WeaponProfile } from '@/types/rules';

const APP_FACTIONS = FACTIONS.map((f) => f.id);
const sultanate = recruitable(DATASET, 'iron-sultanate', APP_FACTIONS);

/** A recruited model, shaped as `addUnit` in `store/slices/units.ts` shapes it. */
function recruit(profile: UnitProfile, weapons: WeaponProfile[] = []): ActiveUnit {
  return {
    id: `u-${profile.id}`,
    customName: profile.name,
    baseProfileId: profile.id,
    profileSnapshot: profile,
    equippedWeapons: weapons.map((w, i) => ({ ...w, instanceId: `w${i}` })),
    equippedArmour: [],
    equippedEquipment: [],
    xp: 0,
    advancements: [],
    injuries: [],
    isDead: false,
    totalCost: profile.baseCost,
    currentWounds: 1,
    maxWounds: 1,
    bloodMarkers: 0,
    status: 'Active',
    hasActedThisTurn: false,
  };
}

const matriarch = () => sultanate.units.find((u) => u.name === 'Witch Coven Matriarch');

describe('a Glory-priced model keeps its price after it is recruited', () => {
  it('has a Glory-priced entry to recruit', () => {
    expect(matriarch(), 'the Witch Coven Matriarch is not in the Sultanate list').toBeDefined();
    expect(matriarch()!.gloryCost).toBe(5);
  });

  it('reads the Glory off the snapshot', () => {
    expect(unitGlory(recruit(matriarch()!))).toBe(5);
  });

  it('renders as a price, not as free', () => {
    const u = recruit(matriarch()!);
    expect(formatUnitCost(u.totalCost, unitGlory(u))).toBe('5 G');
    // The bug, stated as the thing that must not come back.
    expect(formatUnitCost(u.totalCost, unitGlory(u))).not.toBe('0 D');
  });

  it('adds the Glory on the wargear to the Glory on the model', () => {
    /*
      Both currencies appear on gear as well as on entries — `arsenal.ts` is
      there because the same item is Ducats in one armoury and Glory in
      another — so a model's Glory is not just its own line.

      Searched for rather than named: the Iron Sultanate armoury happens to
      price nothing in Glory, and New Antioch's Field Shrine is a Glory item
      today. Which faction stocks one is the catalogue's business.
    */
    const gloryGear = APP_FACTIONS
      .flatMap((f) => recruitable(DATASET, f, APP_FACTIONS).weapons)
      .find((w) => (w.gloryCost ?? 0) > 0);
    expect(gloryGear, 'no armoury in the catalogue prices a weapon in Glory').toBeDefined();

    const bare = recruit(matriarch()!);
    const armed = recruit(matriarch()!, [gloryGear!]);
    expect(unitGlory(armed)).toBe(unitGlory(bare) + gloryGear!.gloryCost!);
  });

  it('is zero for a model and gear priced only in Ducats', () => {
    const ducatOnly = sultanate.units.find((u) => u.baseCost > 0 && !u.gloryCost);
    expect(ducatOnly).toBeDefined();
    expect(unitGlory(recruit(ducatOnly!))).toBe(0);
    expect(formatUnitCost(ducatOnly!.baseCost, 0)).toBe(`${ducatOnly!.baseCost} D`);
  });

  it('sums across a roster', () => {
    const roster = [recruit(matriarch()!), recruit(matriarch()!)];
    expect(rosterGlory(roster)).toBe(10);
  });
});

describe('formatUnitCost', () => {
  it('shows both when both are spent', () => expect(formatUnitCost(120, 4)).toBe('120 D · 4 G'));
  it('shows only Glory when no Ducats are spent', () => expect(formatUnitCost(0, 4)).toBe('4 G'));
  it('shows only Ducats when no Glory is spent', () => expect(formatUnitCost(120, 0)).toBe('120 D'));
  it('still prints a genuinely free model as 0 D', () =>
    // Blank would read as "unpriced". `0 D` standing in for a Glory cost is
    // the bug; `0 D` for a model that really costs nothing is the truth.
    expect(formatUnitCost(0, 0)).toBe('0 D'));
});
