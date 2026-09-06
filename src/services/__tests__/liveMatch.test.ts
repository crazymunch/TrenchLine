import { describe, it, expect } from 'vitest';
import { boardFrom, parseBoard, boardChanged } from '../liveMatch';
import type { ActiveUnit } from '@/types/warband';

/**
 * The live board contract.
 *
 * Pure, so the part worth exhausting — what crosses the wire and what does not
 * — is tested without a browser, a fetch or a store. The sharpest assertion is
 * the one about the roster: a mirror is a channel to people who are not on
 * this device, and it must carry a board rather than somebody's warband.
 */

const unit = (over: Partial<ActiveUnit> = {}): ActiveUnit => ({
  id: 'u1',
  customName: 'Brother Anselm',
  profileSnapshot: { id: 'p1', name: 'Trench Pilgrim' },
  currentWounds: 2,
  maxWounds: 2,
  status: 'Active',
  bloodMarkers: 0,
  blessingMarkers: 0,
  hasActedThisTurn: false,
  totalCost: 120,
  equippedWeapons: [{ id: 'w1', name: 'Sword', cost: 15 }],
  equippedArmour: [],
  equippedEquipment: [],
  advancements: ['Tough'],
  injuries: ['Old wound'],
  xp: 7,
  ...over,
} as unknown as ActiveUnit);

describe('boardFrom', () => {
  it('carries the five live fields and the turn', () => {
    const b = boardFrom(3, 'The Iron Choir', [unit({
      currentWounds: 1, status: 'Downed', bloodMarkers: 2,
      blessingMarkers: 7, hasActedThisTurn: true,
    })]);

    expect(b.turn).toBe(3);
    expect(b.warbandName).toBe('The Iron Choir');
    expect(b.units[0]).toEqual({
      id: 'u1', name: 'Brother Anselm', wounds: 1, maxWounds: 2,
      status: 'Downed', blood: 2, blessing: 7, acted: true,
    });
  });

  it('does NOT carry the roster', () => {
    /*
      The assertion this module exists for. Sending the ActiveUnit array as it
      stands would need no mapping and would put every weapon, advancement,
      injury, note and cost on a channel to people who are not on this device.
    */
    const json = JSON.stringify(boardFrom(1, 'W', [unit()]));
    for (const leaked of ['Sword', 'Tough', 'Old wound', 'totalCost', 'equippedWeapons', 'xp']) {
      expect(json, `the board carries ${leaked}`).not.toContain(leaked);
    }
  });

  it('falls back to the profile name, then to something printable', () => {
    expect(boardFrom(1, 'W', [unit({ customName: '' })]).units[0].name)
      .toBe('Trench Pilgrim');
    expect(boardFrom(1, 'W', [unit({ customName: '', profileSnapshot: undefined })]).units[0].name)
      .toBe('Unnamed');
  });

  it('treats a missing Blessing pool as none, not as an error', () => {
    // A roster saved before the pool existed has none. That is not a fault.
    expect(boardFrom(1, 'W', [unit({ blessingMarkers: undefined })]).units[0].blessing).toBe(0);
  });

  it('does not cap Blessing', () => {
    // The book prints a cap for Blood and none for Blessing; a board that
    // clamped at six could not show a legal seventh.
    expect(boardFrom(1, 'W', [unit({ blessingMarkers: 9 })]).units[0].blessing).toBe(9);
  });
});

describe('parseBoard', () => {
  const good = { turn: 2, warbandName: 'W', units: [{ id: 'u1', name: 'A', wounds: 1, maxWounds: 2, status: 'Downed', blood: 1, blessing: 0, acted: true }] };

  it('reads a board back', () => {
    expect(parseBoard(good).units[0]).toEqual({
      id: 'u1', name: 'A', wounds: 1, maxWounds: 2,
      status: 'Downed', blood: 1, blessing: 0, acted: true,
    });
  });

  it('refuses a payload with no models', () => {
    // A watcher shown "no models" cannot tell that from a wipe.
    expect(() => parseBoard({ turn: 1 })).toThrow();
    expect(() => parseBoard(null)).toThrow();
    expect(() => parseBoard({ units: 'none' })).toThrow();
  });

  it('refuses a model with no id', () => {
    expect(() => parseBoard({ ...good, units: [{ name: 'A' }] })).toThrow();
  });

  it('falls back rather than throwing on a field it can default', () => {
    // A missing marker count is a zero; a missing id is not an anything.
    const b = parseBoard({ units: [{ id: 'u1' }] });
    expect(b.units[0]).toEqual({
      id: 'u1', name: 'Unnamed', wounds: 0, maxWounds: 1,
      status: 'Active', blood: 0, blessing: 0, acted: false,
    });
  });

  it('does not trust an unrecognised status', () => {
    expect(parseBoard({ units: [{ id: 'u1', status: 'Exploded' }] }).units[0].status)
      .toBe('Active');
  });

  it('round-trips what boardFrom produces', () => {
    const built = boardFrom(4, 'The Iron Choir', [unit({ blessingMarkers: 3 })]);
    expect(parseBoard(JSON.parse(JSON.stringify(built)))).toEqual(built);
  });
});

describe('boardChanged', () => {
  const b = () => boardFrom(1, 'W', [unit()]);

  it('is true when there is nothing to compare against', () => {
    expect(boardChanged(null, b())).toBe(true);
  });

  it('is false for an identical board', () => {
    // What stops a write per render. Play Mode re-renders for reasons that
    // never reach the board — a popover, a keyword lookup, a dice roll.
    expect(boardChanged(b(), b())).toBe(false);
  });

  it('is true for every field a watcher can see', () => {
    const cases: Partial<ActiveUnit>[] = [
      { currentWounds: 1 },
      { status: 'Out of Action' },
      { bloodMarkers: 1 },
      { blessingMarkers: 1 },
      { hasActedThisTurn: true },
      { customName: 'Someone Else' },
    ];
    for (const over of cases) {
      expect(boardChanged(b(), boardFrom(1, 'W', [unit(over)])), JSON.stringify(over)).toBe(true);
    }
    expect(boardChanged(b(), boardFrom(2, 'W', [unit()])), 'the turn').toBe(true);
  });

  it('is false for roster changes a watcher cannot see', () => {
    // Buying a weapon mid-game is not a board change, and pushing for it would
    // spend a write on something nobody watching can observe.
    expect(boardChanged(b(), boardFrom(1, 'W', [unit({ xp: 99, totalCost: 999 } as Partial<ActiveUnit>)])))
      .toBe(false);
  });
});
