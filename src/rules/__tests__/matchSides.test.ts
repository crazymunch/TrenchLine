/**
 * A match has sides. Some of them are rosters this app holds; one may not be.
 *
 * The invariant that matters most here is negative: a placeholder must never
 * become something the app treats as the player's own warband. It is kept out
 * of `warbands` entirely, which is what makes that true in the roster picker,
 * the dashboard count, the legality engine and cloud sync at once — none of
 * which needs to know placeholders exist.
 */
import { describe, it, expect } from 'vitest';

import { matchSides, isControllable, firstControllableId } from '../matchSides';
import { opponentLabel, isPlaceholderId, type PlaceholderOpponent } from '@/types/opponent';
import type { Warband, ActiveUnit } from '@/types/warband';

const unit = (id: string): ActiveUnit => ({
  id,
  customName: id,
  baseProfileId: 'p',
  profileSnapshot: {
    id: 'p', name: 'Kavass', factionId: 'iron-sultanate', category: 'Trooper',
    baseCost: 30,
    stats: { movement: '6"', ranged: '+0', melee: '-1', armour: '0', keywords: [] },
    innateAbilities: [],
  },
  equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
  specialUpgrades: [], xp: 0, advancements: [], injuries: [],
  isDead: false, totalCost: 30, currentWounds: 1, maxWounds: 1,
  bloodMarkers: 0, status: 'Active', hasActedThisTurn: false,
} as unknown as ActiveUnit);

const warband = (id: string, name: string, units: ActiveUnit[]): Warband => ({
  id, name, factionId: 'iron-sultanate', units,
} as unknown as Warband);

const opponent = (over: Partial<PlaceholderOpponent> = {}): PlaceholderOpponent => ({
  id: 'opp-1', name: 'Dave', factionId: 'heretic-legions',
  createdAt: '2026-09-19T00:00:00.000Z', ...over,
});

const FACTION_NAMES: Record<string, string> = {
  'iron-sultanate': 'Iron Sultanate',
  'heretic-legions': 'Heretic Legion',
};
const factionName = (id: string) => FACTION_NAMES[id];

describe('resolving the sides in a match', () => {
  const mine = warband('wb-1', 'Al-Qarn Rihla', [unit('u1'), unit('u2')]);
  const side = matchSides([mine], [opponent()], factionName);

  it('resolves a warband the app holds', () => {
    const s = side('wb-1')!;
    expect(s.name).toBe('Al-Qarn Rihla');
    expect(s.isPlaceholder).toBe(false);
    expect(s.units).toHaveLength(2);
    expect(s.fieldStrength).toBe(2);
  });

  it('resolves a placeholder as a side with no models', () => {
    const s = side('opp-1')!;
    expect(s.name).toBe('Dave');
    expect(s.factionId).toBe('heretic-legions');
    expect(s.isPlaceholder).toBe(true);
    expect(s.units).toEqual([]);
  });

  it('leaves field strength unset when nobody stated it', () => {
    /*
      Not zero. A scenario rule keying off warband size has to be able to tell
      "they did not say" from "they field nothing", and `0` reads as the
      second while meaning the first.
    */
    expect(side('opp-1')!.fieldStrength).toBeUndefined();

    const stated = matchSides([], [opponent({ fieldStrength: 9 })], factionName);
    expect(stated('opp-1')!.fieldStrength).toBe(9);
  });

  it('answers undefined for an id neither list has', () => {
    // A warband deleted while still named in a saved match. Callers guard it;
    // a made-up side would put a nameless player in the score bar.
    expect(side('wb-gone')).toBeUndefined();
  });
});

describe('what a placeholder may and may not do', () => {
  const mine = warband('wb-1', 'Mine', [unit('u1')]);
  const side = matchSides([mine], [opponent()], factionName);

  it('is scored but never controlled', () => {
    expect(isControllable(side('wb-1'))).toBe(true);
    expect(isControllable(side('opp-1'))).toBe(false);
    expect(isControllable(undefined)).toBe(false);
  });

  it('is skipped when choosing which side to run', () => {
    // Placeholder first in the list: the viewer must still land on the one
    // with models, not on an empty activation tracker.
    expect(firstControllableId(['opp-1', 'wb-1'], side)).toBe('wb-1');
  });

  it('gives no side to run when every side is a placeholder', () => {
    const allPlaceholders = matchSides([], [opponent()], factionName);
    // Deliberately undefined rather than index 0 — "no match to run" is a real
    // answer and a caller must handle it rather than be handed a broken side.
    expect(firstControllableId(['opp-1'], allPlaceholders)).toBeUndefined();
  });
});

describe('what an opponent is called', () => {
  it('uses the name where there is one', () => {
    expect(opponentLabel(opponent({ name: 'Dave' }), factionName)).toBe('Dave');
  });

  it('falls back to the faction rather than rendering blank', () => {
    // At a table you often have a faction and nothing else.
    expect(opponentLabel(opponent({ name: '   ' }), factionName)).toBe('Heretic Legion');
  });

  it('says so when it has neither', () => {
    expect(opponentLabel(opponent({ name: '', factionId: 'nope' }), factionName))
      .toBe('Unnamed opponent');
  });
});

describe('a placeholder is not a warband', () => {
  it('is told apart by its id alone', () => {
    // The id prefix is the whole mechanism: a match stores ids, and this is
    // what decides which list an id is looked up in.
    expect(isPlaceholderId('opp-1')).toBe(true);
    expect(isPlaceholderId('wb-1')).toBe(false);
  });

  it('never appears among the warbands it is resolved alongside', () => {
    /*
      The invariant, stated where it can fail. `matchSides` takes the two
      lists separately and merges them into a lookup — it must never be
      tempting to merge them into `warbands` instead, because everything that
      asks "what are the player's warbands" reads that list.
    */
    const warbands = [warband('wb-1', 'Mine', [])];
    matchSides(warbands, [opponent()], factionName);
    expect(warbands).toHaveLength(1);
    expect(warbands.map((w) => w.id)).toEqual(['wb-1']);
  });
});
