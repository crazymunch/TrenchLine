/**
 * The Quartermaster's money.
 *
 * RR-12 / FD-05c. Three defects in the Arsenal's buying and selling, all of
 * them in the direction of giving the player something the book does not.
 *
 * 1. **A purchase over the balance was not refused.** `treasuryDucats:
 *    Math.max(0, w.treasuryDucats - item.cost)` hands over the item and takes
 *    whatever is in the Strongbox — so 10 Ducats bought a 50-Ducat weapon and
 *    the 40 that were missing were simply forgiven, silently.
 * 2. **A sale rounded down.** Page 121: "you receive half the Cost of the item
 *    you were selling, ROUNDING ANY FRACTIONS UP." Every odd price paid one
 *    Ducat short.
 * 3. **Both currencies were Ducats.** `StashedItem` held one `cost` with no
 *    label, so a Glory Item was bought with Ducats and sold for Ducats: free
 *    in the currency it is priced in, paid for in one it is not.
 *
 * The ledger becoming the authority for the balance is FD-05d; this is the
 * arithmetic, which is wrong independently of where the number is stored.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import type { Warband } from '@/types/warband';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

const WB = 'wb-quartermaster';

const seed = (over: Partial<Warband> = {}): Warband => ({
  id: WB,
  name: 'The Thrifty',
  factionId: 'new-antioch',
  ducatLimit: 700,
  treasuryDucats: 100,
  gloryPoints: 10,
  armoryStash: [],
  units: [],
  snapshots: [],
  ...over,
} as unknown as Warband);

const warband = () => useStore.getState().warbands.find((w) => w.id === WB)!;
const stash = () => warband().armoryStash;
const ducats = () => warband().treasuryDucats;
const glory = () => warband().gloryPoints;

const item = (over: Partial<{ id: string; name: string; type: 'Weapon'; cost: number; currency: 'ducats' | 'glory' }> = {}) =>
  ({ id: 'flail', name: 'Flail', type: 'Weapon' as const, cost: 40, ...over });

beforeEach(() => {
  useStore.setState({ warbands: [seed()], activeWarbandId: WB });
});

describe('buying more than the Strongbox holds', () => {
  it('is refused, rather than taking everything there is', () => {
    /*
      The old behaviour: the item appeared in the Arsenal and the Strongbox
      read 0. The player was 40 Ducats short and the app forgave it.
    */
    useStore.getState().buyToStash(WB, item({ cost: 150 }));
    expect(stash()).toEqual([]);
    expect(ducats()).toBe(100);
  });

  it('allows a purchase that exactly empties it', () => {
    // Refusing what the player CAN afford would be the opposite error.
    useStore.getState().buyToStash(WB, item({ cost: 100 }));
    expect(stash()).toHaveLength(1);
    expect(ducats()).toBe(0);
  });

  it('refuses the second of two purchases the balance covers only once', () => {
    useStore.getState().buyToStash(WB, item({ cost: 60 }));
    expect(ducats()).toBe(40);
    useStore.getState().buyToStash(WB, item({ id: 'sword', name: 'Sword', cost: 60 }));
    expect(ducats()).toBe(40);
    expect(stash().map((i) => i.id)).toEqual(['flail']);
  });
});

describe('selling Battlekit back', () => {
  it('rounds the half UP, which is what the book says', () => {
    /*
      "You receive half the Cost of the item you were selling, rounding any
      fractions up." A 45-Ducat item is 23, not 22.
    */
    useStore.setState({ warbands: [seed({
      armoryStash: [{ id: 'jezzail', name: 'Jezzail', type: 'Weapon', cost: 45, quantity: 1 }],
      treasuryDucats: 0,
    })], activeWarbandId: WB });

    useStore.getState().sellFromStash(WB, 'jezzail');
    expect(ducats()).toBe(23);
  });

  it('pays the exact half where the price is even', () => {
    useStore.setState({ warbands: [seed({
      armoryStash: [{ id: 'flail', name: 'Flail', type: 'Weapon', cost: 40, quantity: 1 }],
      treasuryDucats: 0,
    })], activeWarbandId: WB });

    useStore.getState().sellFromStash(WB, 'flail');
    expect(ducats()).toBe(20);
  });

  it('takes one off a stack rather than the whole stack', () => {
    useStore.setState({ warbands: [seed({
      armoryStash: [{ id: 'flail', name: 'Flail', type: 'Weapon', cost: 40, quantity: 3 }],
      treasuryDucats: 0,
    })], activeWarbandId: WB });

    useStore.getState().sellFromStash(WB, 'flail');
    expect(stash()[0].quantity).toBe(2);
    expect(ducats()).toBe(20);
  });
});

describe('an item priced in Glory', () => {
  it('is bought with Glory, and leaves the Ducats alone', () => {
    useStore.getState().buyToStash(WB, item({ id: 'relic', name: 'Relic', cost: 4, currency: 'glory' }));
    expect(glory()).toBe(6);
    expect(ducats()).toBe(100);
  });

  it('records the price, so a sale months later still knows', () => {
    useStore.getState().buyToStash(WB, item({ id: 'relic', name: 'Relic', cost: 4, currency: 'glory' }));
    expect(stash()[0].price).toEqual({ ducats: 0, glory: 4 });
    // And `cost` stays the Ducat number, which is what it has always meant.
    expect(stash()[0].cost).toBe(0);
  });

  it('is refused against the GLORY balance, not the Ducats', () => {
    // 10 Glory held, 100 Ducats. A 40-Glory item is unaffordable even though
    // the Ducats would cover the number.
    useStore.getState().buyToStash(WB, item({ id: 'relic', name: 'Relic', cost: 40, currency: 'glory' }));
    expect(stash()).toEqual([]);
    expect(glory()).toBe(10);
    expect(ducats()).toBe(100);
  });

  it('pays back in Glory when sold, rounded up', () => {
    useStore.setState({ warbands: [seed({
      armoryStash: [{ id: 'relic', name: 'Relic', type: 'Equipment', cost: 5, currency: 'glory', quantity: 1 }],
      gloryPoints: 0,
      treasuryDucats: 100,
    })], activeWarbandId: WB });

    useStore.getState().sellFromStash(WB, 'relic');
    expect(glory()).toBe(3);
    expect(ducats()).toBe(100);
  });

  it('leaves an unlabelled item as Ducats, which is what an old stash means', () => {
    /*
      Every item in a stash written before `currency` existed was bought with
      Ducats, because Ducats is all the Quartermaster could spend. Reading the
      absence as Ducats is not a guess — it is the only thing it can be.
    */
    useStore.setState({ warbands: [seed({
      armoryStash: [{ id: 'old', name: 'Old Kit', type: 'Weapon', cost: 30, quantity: 1 }],
      treasuryDucats: 0,
      gloryPoints: 0,
    })], activeWarbandId: WB });

    useStore.getState().sellFromStash(WB, 'old');
    expect(ducats()).toBe(15);
    expect(glory()).toBe(0);
  });
});

/**
 * FD-05f. `currency` is one discriminator and an Armoury Table row is not: a
 * row carries a Ducat number and a Glory number, and can carry both at once.
 * No row in the shipped dataset does today — all 32 Glory-priced offers are
 * zero Ducats — but the shape the Arsenal buys from has two fields, so a price
 * the app cannot represent is a price it will get wrong the day one appears.
 */
describe('a price given as the row\u2019s own Cost', () => {
  const priced = (glory: number, ducats: number) =>
    ({ id: 'relic', name: 'Relic', type: 'Weapon' as const, cost: ducats, price: { ducats, glory } });

  it('debits the Glory and no Ducats', () => {
    useStore.getState().buyToStash(WB, priced(4, 0));
    expect(glory()).toBe(6);
    expect(ducats()).toBe(100);
  });

  it('debits the Ducats and no Glory', () => {
    useStore.getState().buyToStash(WB, priced(0, 30));
    expect(ducats()).toBe(70);
    expect(glory()).toBe(10);
  });

  it('debits both where the row prices both', () => {
    useStore.getState().buyToStash(WB, priced(4, 30));
    expect(ducats()).toBe(70);
    expect(glory()).toBe(6);
    expect(stash()[0].price).toEqual({ ducats: 30, glory: 4 });
  });

  it('is refused when either Strongbox is short, and half-buys nothing', () => {
    // 100 Ducats and 10 Glory held. The Ducats cover it; the Glory does not.
    useStore.getState().buyToStash(WB, priced(40, 30));
    expect(stash()).toEqual([]);
    expect(ducats()).toBe(100);
    expect(glory()).toBe(10);
  });

  it('sells back half of each side, each rounded up', () => {
    useStore.setState({ warbands: [seed({
      armoryStash: [{
        id: 'relic', name: 'Relic', type: 'Equipment',
        cost: 45, price: { ducats: 45, glory: 5 }, quantity: 1,
      }],
      treasuryDucats: 0,
      gloryPoints: 0,
    })], activeWarbandId: WB });

    useStore.getState().sellFromStash(WB, 'relic');
    expect(ducats()).toBe(23);
    expect(glory()).toBe(3);
  });

  it('reads an older stash marked `glory` as zero Ducats and its cost in Glory', () => {
    useStore.setState({ warbands: [seed({
      armoryStash: [{
        id: 'old', name: 'Old Relic', type: 'Equipment',
        cost: 5, currency: 'glory', quantity: 1,
      }],
      treasuryDucats: 0,
      gloryPoints: 0,
    })], activeWarbandId: WB });

    useStore.getState().sellFromStash(WB, 'old');
    expect(glory()).toBe(3);
    expect(ducats()).toBe(0);
  });
});

/**
 * FD-05e-3. Moving an item from the Arsenal onto a model is not a purchase.
 *
 * FD-05e-2 gave `equipWeapon`, `equipArmour` and `equipEquipment` a charge
 * against the Strongbox, because equipping added the cost to the model and
 * charged nobody. `assignStashToUnit` calls all three — and it is the one
 * caller where the Warband ALREADY OWNS the item, having bought it into the
 * Arsenal. So a 40-Ducat weapon bought for 40 cost another 40 the moment it
 * was handed to a model, out of a Strongbox that had already paid.
 *
 * And the second charge carried the instance's `ref`, so taking the item off
 * in the same game reversed THAT charge and returned early — skipping the
 * branch that puts the item back in the Arsenal. The item vanished, and the
 * first payment stood: the Warband was out the price and had nothing.
 */
describe('equipping an item out of the Arsenal', () => {
  const FLAIL = { id: 'flail', name: 'Flail', cost: 40, type: 'Melee', range: 'Melee', damage: '1', keywords: [] };

  const withUnit = () => {
    useStore.setState({
      warbands: [seed({
        forceMode: 'campaign',
        treasuryDucats: 100,
        armoryStash: [{
          id: 'flail', name: 'Flail', type: 'Weapon',
          cost: 40, price: { ducats: 40, glory: 0 }, quantity: 1,
        }],
        units: [{
          id: 'u1', customName: 'Bob', totalCost: 50,
          equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
          profileSnapshot: { category: 'Trooper', stats: {} },
        }],
      } as unknown as Partial<Warband>)],
      activeWarbandId: WB,
      weapons: [FLAIL] as never,
    });
  };

  it('does not charge the Strongbox a second time', () => {
    withUnit();
    useStore.getState().assignStashToUnit(WB, 'flail', 'u1');
    expect(ducats()).toBe(100);
  });

  it('still moves the item onto the model, and out of the Arsenal', () => {
    withUnit();
    useStore.getState().assignStashToUnit(WB, 'flail', 'u1');
    expect(warband().units[0].equippedWeapons.map((w) => w.name)).toEqual(['Flail']);
    expect(stash()).toEqual([]);
  });

  it('leaves the ledger with the one purchase the Arsenal made', () => {
    withUnit();
    // The fixture arrives with no ledger, so `book` opens the account: one
    // reconciliation entry and nothing else should follow the assignment.
    useStore.getState().assignStashToUnit(WB, 'flail', 'u1');
    expect((warband().ledger ?? []).filter((e) => e.reason === 'quartermaster')).toEqual([]);
  });

  it('sends it back to the Arsenal when it comes off, rather than refunding it', () => {
    withUnit();
    useStore.getState().assignStashToUnit(WB, 'flail', 'u1');
    const instanceId = warband().units[0].equippedWeapons[0].instanceId;
    useStore.getState().removeWeapon(WB, 'u1', instanceId);

    // Nothing to undo — the Arsenal bought it, not this equip — so the item
    // returns to the Arsenal, which is where it came from.
    expect(ducats()).toBe(100);
    expect(stash().map((i) => [i.name, i.quantity])).toEqual([['Flail', 1]]);
  });

  it('still charges for a piece of Battlekit bought straight onto a model', () => {
    withUnit();
    useStore.getState().equipWeapon(WB, 'u1', 'flail');
    expect(ducats()).toBe(60);
  });

  it('and refunds that one, without stashing it, when it comes off the same game', () => {
    /*
      The other half of the pair, and the reason the two cannot be told apart
      by the removal: a purchase made in this muster is undone in full — "users
      can make any variations from the end of one game to the start of the
      next" — and there is nothing to put in the Arsenal, because the Arsenal
      never owned it. Which is exactly NOT what should happen to the item
      above, bought by the Arsenal.
    */
    withUnit();
    useStore.getState().equipWeapon(WB, 'u1', 'flail');
    const instanceId = warband().units[0].equippedWeapons[0].instanceId;
    useStore.getState().removeWeapon(WB, 'u1', instanceId);

    expect(ducats()).toBe(100);
    // The Arsenal still holds only the one it bought.
    expect(stash().map((i) => [i.name, i.quantity])).toEqual([['Flail', 1]]);
  });
});
