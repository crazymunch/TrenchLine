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

  it('records the currency, so a sale months later still knows', () => {
    useStore.getState().buyToStash(WB, item({ id: 'relic', name: 'Relic', cost: 4, currency: 'glory' }));
    expect(stash()[0].currency).toBe('glory');
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
