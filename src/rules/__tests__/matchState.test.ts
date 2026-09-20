/**
 * A match in progress, read back from storage.
 *
 * Everything here is about a scorecard. Play Mode held VP, claimed Glorious
 * Deeds and the list of who was in the match in `useState` and nowhere else,
 * so a reload — or a phone evicting a backgrounded tab, which they do
 * routinely — lost the lot. Over a three-hour game that is the whole record.
 *
 * The reason these tests are mostly about MALFORMED input is that the input is
 * `localStorage`: a user can edit it, an extension can corrupt it, and a write
 * interrupted by the tab closing can truncate it. A match that restores with
 * `undefined` VP scores the rest of the game wrong and looks fine doing it,
 * which is worse than refusing to restore.
 */
import { describe, it, expect } from 'vitest';

import {
  parseSavedMatch, isRestorable, savedAgo, MATCH_VERSION, type SavedMatch,
} from '../matchState';

const EVENT = { roll: 7, name: 'Grim and Indifferent', flavour: 'f', effect: 'No effect.' };

const whole = (over: Record<string, unknown> = {}) => ({
  version: MATCH_VERSION,
  savedAt: '2026-09-19T18:00:00.000Z',
  isMatchActive: true,
  matchMode: 'single-device',
  matchWarbandIds: ['wb-1', 'opp-1'],
  activePlayerIndex: 0,
  selectedScenarioId: 'brothers-in-arms',
  playTurn: 3,
  scores: {
    'wb-1': { vp: 6, completedDeeds: { 'First Blood': { unitId: 'u1', unitName: 'Brother Aldric' } }, turnScores: { 1: 2, 2: 4 } },
    'opp-1': { vp: 4, completedDeeds: {}, turnScores: { 2: 4 } },
  },
  deployedUnitIds: { 'wb-1': ['u1', 'u2'] },
  environmentalHazard: 'Unexploded ordnance',
  weatherRolls: [{ player: 0, dice: [3, 4], total: 7, event: EVENT }],
  activeWeather: EVENT,
  ...over,
});

describe('restoring a match', () => {
  it('reads back everything the scorecard needs', () => {
    const m = parseSavedMatch(whole())!;
    expect(m.matchWarbandIds).toEqual(['wb-1', 'opp-1']);
    expect(m.playTurn).toBe(3);
    expect(m.scores['wb-1'].vp).toBe(6);
    expect(m.scores['wb-1'].completedDeeds).toEqual({
      'First Blood': { unitId: 'u1', unitName: 'Brother Aldric' },
    });
    expect(m.scores['wb-1'].turnScores).toEqual({ 1: 2, 2: 4 });
    expect(m.deployedUnitIds['wb-1']).toEqual(['u1', 'u2']);
    expect(m.weatherRolls[0].dice).toEqual([3, 4]);
    expect(m.activeWeather?.name).toBe('Grim and Indifferent');
  });

  it('carries a placeholder opponent like any other side', () => {
    // A side with no roster in the app still scores, so it still persists.
    const m = parseSavedMatch(whole())!;
    expect(m.scores['opp-1'].vp).toBe(4);
  });
});

describe('refusing what it cannot trust', () => {
  it('rejects a version it does not know', () => {
    /*
      Not "read what you can". A future shape read as this one is a scorecard
      that is quietly the wrong game, and the whole point of a version field is
      to make that impossible rather than unlikely.
    */
    expect(parseSavedMatch(whole({ version: 2 }))).toBeNull();
    expect(parseSavedMatch(whole({ version: undefined }))).toBeNull();
  });

  it('rejects anything that is not an object', () => {
    for (const bad of [null, undefined, 'a string', 42, ['an', 'array']]) {
      expect(parseSavedMatch(bad)).toBeNull();
    }
  });

  it('never restores a score as undefined', () => {
    // The failure that matters: silent wrong arithmetic for the rest of the
    // game. A missing or non-numeric vp becomes 0, which is at least a number
    // the player can see is wrong.
    const m = parseSavedMatch(whole({
      scores: { 'wb-1': { completedDeeds: {} }, 'wb-2': { vp: 'lots' }, 'wb-3': null },
    }))!;
    expect(m.scores['wb-1'].vp).toBe(0);
    expect(m.scores['wb-2'].vp).toBe(0);
    expect(m.scores['wb-3'].vp).toBe(0);
    for (const s of Object.values(m.scores)) {
      expect(Number.isFinite(s.vp)).toBe(true);
      expect(s.completedDeeds).toBeTypeOf('object');
      expect(s.turnScores).toBeTypeOf('object');
    }
  });

  it('clamps an active player index into the list it indexes', () => {
    // A truncated write, or a side removed elsewhere. An index past the end
    // leaves the match with no viewable player at all.
    expect(parseSavedMatch(whole({ activePlayerIndex: 9 }))!.activePlayerIndex).toBe(1);
    expect(parseSavedMatch(whole({ activePlayerIndex: -3 }))!.activePlayerIndex).toBe(0);
    expect(parseSavedMatch(whole({ matchWarbandIds: [], activePlayerIndex: 4 }))!
      .activePlayerIndex).toBe(0);
  });

  it('drops a weather roll that lost its dice', () => {
    /*
      A roll rendered without what was rolled for it is a number the app is
      asserting rather than reporting — the same class as the invented
      statline `AUDIT.md` records.
    */
    const m = parseSavedMatch(whole({
      weatherRolls: [
        { player: 0, dice: [3, 4], total: 7, event: EVENT },
        { player: 1, total: 9, event: EVENT },
        { player: 2, dice: [1, 1], total: 2, event: { name: 'half an event' } },
      ],
    }))!;
    expect(m.weatherRolls).toHaveLength(1);
    expect(m.weatherRolls[0].player).toBe(0);
  });

  it('drops an active weather event that is not one', () => {
    expect(parseSavedMatch(whole({ activeWeather: { name: 'no roll, no effect' } }))!
      .activeWeather).toBeNull();
  });

  it('keeps only string ids', () => {
    const m = parseSavedMatch(whole({ matchWarbandIds: ['wb-1', 42, null, 'opp-1'] }))!;
    expect(m.matchWarbandIds).toEqual(['wb-1', 'opp-1']);
  });

  it('never restores a turn below 1', () => {
    expect(parseSavedMatch(whole({ playTurn: 0 }))!.playTurn).toBe(1);
    expect(parseSavedMatch(whole({ playTurn: -5 }))!.playTurn).toBe(1);
    expect(parseSavedMatch(whole({ playTurn: 'three' }))!.playTurn).toBe(1);
  });
});

describe('whether a saved match is worth restoring', () => {
  it('refuses an empty one', () => {
    /*
      Two reasons, and the second is the dangerous one. It would put a player
      in a lobby they never set up — and a save written before a restore had
      run would overwrite a real match with nothing, so the restore would find
      exactly what it had just destroyed.
    */
    expect(isRestorable(parseSavedMatch(whole({ matchWarbandIds: [] })))).toBe(false);
    expect(isRestorable(null)).toBe(false);
    expect(isRestorable(parseSavedMatch(whole()))).toBe(true);
  });
});

describe('saying how old a resumed match is', () => {
  const at = (iso: string) => ({ savedAt: iso } as SavedMatch);
  const now = new Date('2026-09-19T18:00:00.000Z');

  it('reads in the units a person would use', () => {
    expect(savedAgo(at('2026-09-19T17:59:30.000Z'), now)).toBe('just now');
    expect(savedAgo(at('2026-09-19T17:59:00.000Z'), now)).toBe('1 minute ago');
    expect(savedAgo(at('2026-09-19T17:30:00.000Z'), now)).toBe('30 minutes ago');
    expect(savedAgo(at('2026-09-19T15:00:00.000Z'), now)).toBe('3 hours ago');
    expect(savedAgo(at('2026-09-17T18:00:00.000Z'), now)).toBe('2 days ago');
  });

  it('does not report a negative age', () => {
    // A clock that moved, or a file copied between devices.
    expect(savedAgo(at('2026-09-20T18:00:00.000Z'), now)).toBe('just now');
    expect(savedAgo(at('not a date'), now)).toBe('just now');
  });
});

/*
  A save written before a Deed's claim became a `DeedMark`.

  Those hold a bare string, and the string is the PERFORMER'S NAME — that is
  what Play Mode's picker wrote, whatever `SideScore`'s comment claimed it
  was. Restoring one must not throw the name away, and must not pretend to
  know an id it was never given.
*/
describe('a match saved before a Deed carried its model', () => {
  const legacy = (v: unknown) => parseSavedMatch(whole({
    scores: { 'wb-1': { vp: 3, completedDeeds: { 'First Blood': v }, turnScores: {} } },
  }))!.scores['wb-1'].completedDeeds['First Blood'];

  it('reads the bare string back as the performer, not as a turn', () => {
    expect(legacy('Brother Aldric')).toEqual({ unitName: 'Brother Aldric' });
  });

  it('invents no unit id from the name', () => {
    expect(legacy('Brother Aldric').unitId).toBeUndefined();
  });

  it('reads the side-wide claim the picker wrote as a name', () => {
    // `Entire Warband` was a performer option, so it arrives as one.
    expect(legacy('Entire Warband')).toEqual({ unitName: 'Entire Warband' });
  });

  it('reads an empty string as a claim with nothing known about it', () => {
    expect(legacy('')).toEqual({});
  });

  it('still reads the shape written today', () => {
    expect(legacy({ unitId: 'u1', unitName: 'Kadir', turn: '2' }))
      .toEqual({ unitId: 'u1', unitName: 'Kadir', turn: '2' });
  });

  it('drops a field of the wrong type rather than carrying it', () => {
    expect(legacy({ unitId: 7, unitName: null, turn: '2' })).toEqual({ turn: '2' });
  });
});
