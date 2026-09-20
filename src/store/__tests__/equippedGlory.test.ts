/**
 * Battlekit bought straight onto a model, in the currency it is priced in.
 *
 * FD-05g. FD-05f fixed the Arsenal; the model's own Battlekit was still
 * charged with `charge(wb, equipped.cost, …)` — one number, spent as Ducats.
 * **Every Glory-priced row in the dataset is zero Ducats**, so the equip
 * debited nothing at all: a Takwin Anqā Bird, 2 Glory on the Iron Sultanate's
 * Armoury Table, went onto a model for free.
 *
 * Driven with the SHIPPED row rather than a made-up one, because the defect is
 * about what the catalogue actually prices in Glory and what the store does
 * with it. The Anqā Bird is the case the owner will hit: they play Iron
 * Sultanate.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import { DATASET } from '@/data/generated/trenchline.generated';
import { recruitable } from '@/rules/recruitable';
import type { Warband } from '@/types/warband';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

const WB = 'wb-glory-kit';
const UNIT = 'u-takwin';

const SULTANATE = recruitable(DATASET, 'iron-sultanate',
  (DATASET.armouries ?? []).map((a) => a.factionId));

/** The shipped row: 0 Ducats, 2 Glory, ELITE only, Limit 1. */
const ANQA = [...SULTANATE.weapons, ...SULTANATE.armour, ...SULTANATE.equipment]
  .find((e) => /Anq/i.test(e.name))!;
/** A Ducat-priced row from the same table, as the control. */
const DUCATS = [...SULTANATE.weapons, ...SULTANATE.armour, ...SULTANATE.equipment]
  .find((e) => e.cost > 0 && !e.gloryCost)!;

const seed = (over: Partial<Warband> = {}): Warband => ({
  id: WB,
  name: 'The Brazen',
  factionId: 'iron-sultanate',
  campaignId: 'c1',
  ducatLimit: 1000,
  treasuryDucats: 200,
  gloryPoints: 5,
  forceMode: 'campaign',
  armoryStash: [],
  units: [{
    id: UNIT, customName: 'Takwin', totalCost: 40,
    equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
    profileSnapshot: { category: 'Elite', stats: {} },
  }],
  snapshots: [],
  ...over,
} as unknown as Warband);

const warband = () => useStore.getState().warbands.find((w) => w.id === WB)!;
const ducats = () => warband().treasuryDucats;
const glory = () => warband().gloryPoints;
const stash = () => warband().armoryStash;
const unit = () => warband().units.find((u) => u.id === UNIT)!;

/** Equip whichever list the row came from, the way the sheet does. */
const equip = (row: { id: string }) => {
  const s = useStore.getState();
  if (SULTANATE.weapons.some((w) => w.id === row.id)) s.equipWeapon(WB, UNIT, row.id);
  else if (SULTANATE.armour.some((a) => a.id === row.id)) s.equipArmour(WB, UNIT, row.id);
  else s.equipEquipment(WB, UNIT, row.id);
};
const held = () => [
  ...unit().equippedWeapons, ...unit().equippedArmour, ...unit().equippedEquipment,
];
const remove = (instanceId: string) => {
  const s = useStore.getState();
  if (unit().equippedWeapons.some((g) => g.instanceId === instanceId)) s.removeWeapon(WB, UNIT, instanceId);
  else if (unit().equippedArmour.some((g) => g.instanceId === instanceId)) s.removeArmour(WB, UNIT, instanceId);
  else s.removeEquipment(WB, UNIT, instanceId);
};

/**
 * Play the game the purchase was made in.
 *
 * What decides whether a removal undoes a purchase is the GAME NUMBER on the
 * ledger entry, not a snapshot: `reversible` keeps entries from the current
 * game, because "users can make any variations from the end of one game to
 * the start of the next". So a purchase settles when the campaign moves on,
 * and that is what this does.
 */
const advanceGame = () => useStore.setState({
  campaign: { id: 'c1', currentTurn: 2 } as never,
});

beforeEach(() => {
  useStore.setState({
    warbands: [seed()],
    activeWarbandId: WB,
    weapons: SULTANATE.weapons as never,
    armour: SULTANATE.armour as never,
    equipment: SULTANATE.equipment as never,
    campaign: { id: 'c1', currentTurn: 1 } as never,
  });
});

describe('the shipped row this is about', () => {
  it('is the Takwin Anqā Bird, priced in Glory and nothing else', () => {
    expect(ANQA.name).toMatch(/Anq/);
    expect(ANQA.cost).toBe(0);
    expect(ANQA.gloryCost).toBe(2);
  });
});

describe('a Glory-priced item bought onto a model', () => {
  it('debits the Glory, and no Ducats', () => {
    equip(ANQA);
    expect(glory()).toBe(3);
    expect(ducats()).toBe(200);
  });

  it('is booked as a purchase against the Strongbox', () => {
    equip(ANQA);
    const entry = (warband().ledger ?? []).find((e) => e.reason === 'quartermaster')!;
    expect(entry.glory).toBe(-2);
    expect(entry.ducats ?? 0).toBe(0);
    expect(entry.note).toContain(ANQA.name);
  });

  it('hands the Glory back when it comes off in the same muster', () => {
    equip(ANQA);
    remove(held()[0].instanceId!);
    expect(glory()).toBe(5);
    // Nothing was bought, so nothing goes to the Arsenal.
    expect(stash()).toEqual([]);
  });

  it('goes to the Arsenal with its price once the game it was bought in is played', () => {
    equip(ANQA);
    expect(glory()).toBe(3);

    advanceGame();
    remove(held()[0].instanceId!);
    // Settled: the purchase stands and the item is property.
    expect(glory()).toBe(3);
    expect(stash()).toHaveLength(1);
    expect(stash()[0].price).toEqual({ ducats: 0, glory: 2 });
  });

  it('sells back out of the Arsenal for half its Glory, rounded up', () => {
    equip(ANQA);
    advanceGame();
    remove(held()[0].instanceId!);

    useStore.getState().sellFromStash(WB, stash()[0].id);
    // 2 Glory paid, 1 back. p.121: "half the Cost … rounding any fractions up".
    expect(glory()).toBe(4);
    expect(ducats()).toBe(200);
  });
});

describe('a Ducat-priced item, across the same four steps', () => {
  it('is unchanged', () => {
    expect(DUCATS.gloryCost ?? 0).toBe(0);

    equip(DUCATS);
    expect(ducats()).toBe(200 - DUCATS.cost);
    expect(glory()).toBe(5);

    remove(held()[0].instanceId!);
    expect(ducats()).toBe(200);
    expect(stash()).toEqual([]);

    equip(DUCATS);
    advanceGame();
    remove(held()[0].instanceId!);
    expect(ducats()).toBe(200 - DUCATS.cost);
    expect(stash()[0].price).toEqual({ ducats: DUCATS.cost, glory: 0 });

    useStore.getState().sellFromStash(WB, stash()[0].id);
    expect(ducats()).toBe(200 - DUCATS.cost + Math.ceil(DUCATS.cost / 2));
    expect(glory()).toBe(5);
  });
});

describe('an unrestricted Force', () => {
  it('is charged nothing, in either currency', () => {
    useStore.setState({
      warbands: [seed({ forceMode: 'unrestricted' })], activeWarbandId: WB,
    });
    equip(ANQA);
    expect(glory()).toBe(5);
    expect(ducats()).toBe(200);
    expect(warband().ledger ?? []).toEqual([]);
  });
});
