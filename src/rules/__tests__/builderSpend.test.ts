/**
 * Everything the builder spends, and everything it gives back.
 *
 * FD-05e made the builder's remaining figure the Strongbox. That is only half
 * a pot: the things that SPEND it have to spend it too, and under FD-05e alone
 * they did not. `equipWeapon`, `equipArmour` and `equipEquipment` added the
 * item's cost to the model's `totalCost` and booked nothing, so a campaign
 * Warband could equip its whole Armoury for free; `duplicateUnit` was a free
 * hire for the same reason.
 *
 * Giving it back is the other half. "Users can make any variations from the
 * end of one game to the start of the next" — so a model recruited and removed
 * in the same muster costs nothing, and the entry that paid for it is removed
 * rather than answered with a credit, which would read as a sale. Once the
 * game has been played the purchase is settled: a removed model refunds
 * nothing (the book sells Battlekit, never models) and removed Battlekit goes
 * to the Arsenal, where selling it gives half back.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { strongbox, reconciled } from '../ledger';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return {
    ...actual,
    storage: { ...actual.storage, saveWarbands: vi.fn(), setActiveWarbandId: vi.fn() },
  };
});

const store = async () => (await import('@/store/useStore')).useStore;

const profile = (id: string, baseCost: number) => ({
  id, name: `Model ${id}`, factionId: 'new-antioch', category: 'Trooper' as const,
  baseCost, stats: { movement: '6"', ranged: '+0', melee: '+0', armour: '0' },
});
const weapon = (id: string, cost: number) => ({
  id, name: `Weapon ${id}`, type: 'Ranged', range: '12"', cost, keywords: [],
});

const held = (s: Awaited<ReturnType<typeof store>>, id: string) =>
  strongbox(s.getState().warbands.find((w) => w.id === id)!).ducats;
const at = (s: Awaited<ReturnType<typeof store>>, id: string) =>
  s.getState().warbands.find((w) => w.id === id)!;

beforeEach(async () => {
  const s = await store();
  s.setState({
    warbands: [], activeWarbandId: null,
    units: [profile('p-100', 100)] as never,
    weapons: [weapon('w-25', 25)] as never,
    armour: [], equipment: [],
  });
});

describe('Battlekit is paid for', () => {
  it('equipping a 25-Ducat weapon at the muster holds 25 less', async () => {
    const s = await store();
    const w = s.getState().createWarband('Muster', 'new-antioch', 700, 'campaign');
    s.getState().addUnitToWarband(w.id, 'p-100', 'Trooper');
    const before = held(s, w.id);

    const unit = at(s, w.id).units[0];
    s.getState().equipWeapon(w.id, unit.id, 'w-25');

    expect(held(s, w.id)).toBe(before - 25);
    expect(reconciled(at(s, w.id))).toBe(true);
  });

  it('and unequipping it the same game holds it back, with no entry left behind', async () => {
    const s = await store();
    const w = s.getState().createWarband('Muster', 'new-antioch', 700, 'campaign');
    s.getState().addUnitToWarband(w.id, 'p-100', 'Trooper');
    const unit = at(s, w.id).units[0];
    const before = held(s, w.id);

    s.getState().equipWeapon(w.id, unit.id, 'w-25');
    const instanceId = at(s, w.id).units[0].equippedWeapons[0].instanceId;
    s.getState().removeWeapon(w.id, unit.id, instanceId);

    expect(held(s, w.id)).toBe(before);
    const refs = (at(s, w.id).ledger ?? []).map((e) => e.ref);
    expect(refs).not.toContain(instanceId);
    /* Undone, not refunded: no sale was made, so no entry claims one. */
    expect(at(s, w.id).armoryStash).toHaveLength(0);
  });

  it('a campaign Warband equips nothing for free', async () => {
    const s = await store();
    const w = s.getState().createWarband('Muster', 'new-antioch', 700, 'campaign');
    s.getState().addUnitToWarband(w.id, 'p-100', 'Trooper');
    const unit = at(s, w.id).units[0];
    const before = held(s, w.id);
    s.getState().equipWeapon(w.id, unit.id, 'w-25');
    expect(held(s, w.id)).toBeLessThan(before);
  });

  it('an unrestricted list is charged nothing, as its Ducats are the player’s', async () => {
    const s = await store();
    const w = s.getState().createWarband('One-off', 'new-antioch', 700, 'unrestricted');
    s.getState().addUnitToWarband(w.id, 'p-100', 'Trooper');
    const unit = at(s, w.id).units[0];
    s.getState().equipWeapon(w.id, unit.id, 'w-25');
    expect(held(s, w.id)).toBe(0);
  });
});

describe('a copy is a hire', () => {
  it('duplicating a 100-Ducat model holds 100 less', async () => {
    const s = await store();
    const w = s.getState().createWarband('Muster', 'new-antioch', 700, 'campaign');
    s.getState().addUnitToWarband(w.id, 'p-100', 'Trooper');
    const before = held(s, w.id);

    s.getState().duplicateUnit(w.id, at(s, w.id).units[0].id);

    expect(at(s, w.id).units).toHaveLength(2);
    expect(held(s, w.id)).toBe(before - 100);
  });
});

describe('removing a model', () => {
  it('the same game holds its price back', async () => {
    const s = await store();
    const w = s.getState().createWarband('Muster', 'new-antioch', 700, 'campaign');
    const before = held(s, w.id);
    s.getState().addUnitToWarband(w.id, 'p-100', 'Trooper');
    expect(held(s, w.id)).toBe(before - 100);

    s.getState().removeUnitFromWarband(w.id, at(s, w.id).units[0].id);
    expect(held(s, w.id)).toBe(before);
  });

  it('takes its Battlekit back with it', async () => {
    const s = await store();
    const w = s.getState().createWarband('Muster', 'new-antioch', 700, 'campaign');
    const before = held(s, w.id);
    s.getState().addUnitToWarband(w.id, 'p-100', 'Trooper');
    const unit = at(s, w.id).units[0];
    s.getState().equipWeapon(w.id, unit.id, 'w-25');
    expect(held(s, w.id)).toBe(before - 125);

    s.getState().removeUnitFromWarband(w.id, unit.id);
    expect(held(s, w.id)).toBe(before);
  });

  /*
    After the game it was bought in, the purchase is settled. The book sells
    Battlekit and never models, so a removed model refunds nothing.
  */
  it('after a game refunds nothing', async () => {
    const s = await store();
    const w = s.getState().createWarband('Muster', 'new-antioch', 700, 'campaign');
    s.getState().addUnitToWarband(w.id, 'p-100', 'Trooper');
    const spent = held(s, w.id);

    /* The purchase now belongs to a game that has been played. */
    s.setState({
      warbands: s.getState().warbands.map((x) => (x.id === w.id
        ? { ...x, ledger: (x.ledger ?? []).map((e) => (e.reason === 'quartermaster' ? { ...e, game: 0 } : e)) }
        : x)),
    });

    s.getState().removeUnitFromWarband(w.id, at(s, w.id).units[0].id);
    expect(held(s, w.id)).toBe(spent);
  });

  it('and settled Battlekit goes to the Arsenal rather than vanishing', async () => {
    const s = await store();
    const w = s.getState().createWarband('Muster', 'new-antioch', 700, 'campaign');
    s.getState().addUnitToWarband(w.id, 'p-100', 'Trooper');
    const unit = at(s, w.id).units[0];
    s.getState().equipWeapon(w.id, unit.id, 'w-25');
    const instanceId = at(s, w.id).units[0].equippedWeapons[0].instanceId;
    const spent = held(s, w.id);

    s.setState({
      warbands: s.getState().warbands.map((x) => (x.id === w.id
        ? { ...x, ledger: (x.ledger ?? []).map((e) => ({ ...e, game: 0 })) }
        : x)),
    });

    s.getState().removeWeapon(w.id, unit.id, instanceId);
    expect(held(s, w.id)).toBe(spent);
    expect(at(s, w.id).armoryStash).toHaveLength(1);
    expect(at(s, w.id).armoryStash[0].cost).toBe(25);
  });
});
