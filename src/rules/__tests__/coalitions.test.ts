/**
 * Sides that fight together, and what their combined score is.
 *
 * The structural decision under all of this: **each side still scores
 * individually**, and a coalition total is their sum. A model storing points
 * per TEAM could not answer "how did my warband do" — the number a campaign
 * record wants, and the one a player asks about after the game.
 */
import { describe, it, expect } from 'vitest';

import {
  COALITION_NAME, coalitionScore, hasCoalitions, leader, pruneCoalitions,
  sidesIn, suggestCoalitions, type CoalitionMap,
} from '../coalitions';

/** Tonight's game: two pairs, four sides. */
const IDS = ['wb-sultanate', 'opp-zortan', 'wb-crusade', 'opp-heretic'];
const PAIRED: CoalitionMap = {
  'wb-sultanate': 'A', 'wb-crusade': 'A',
  'opp-zortan': 'B', 'opp-heretic': 'B',
};
const vp = (scores: Record<string, number>) => (id: string) => scores[id] ?? 0;

describe('whether a match is being played as coalitions', () => {
  it('needs both sides to have somebody in them', () => {
    /*
      One tagged side is somebody who started assigning teams and stopped.
      Showing a "total" of one warband's points beside that same warband's
      points is noise, so the scoreboard stays off until it means something.
    */
    expect(hasCoalitions(IDS, {})).toBe(false);
    expect(hasCoalitions(IDS, { 'wb-sultanate': 'A' })).toBe(false);
    expect(hasCoalitions(IDS, { 'wb-sultanate': 'A', 'wb-crusade': 'A' })).toBe(false);
    expect(hasCoalitions(IDS, { 'wb-sultanate': 'A', 'opp-zortan': 'B' })).toBe(true);
    expect(hasCoalitions(IDS, PAIRED)).toBe(true);
  });
});

describe('a coalition total', () => {
  it('is the sum of its sides, and nothing else', () => {
    const score = vp({
      'wb-sultanate': 6, 'wb-crusade': 4, 'opp-zortan': 5, 'opp-heretic': 2,
    });
    expect(coalitionScore(IDS, PAIRED, 'A', score)).toBe(10);
    expect(coalitionScore(IDS, PAIRED, 'B', score)).toBe(7);
  });

  it('counts a side that has not scored as zero, not as absent', () => {
    // A total of 0 is a real answer; skipping the side would make a coalition
    // of two look like a coalition of one.
    const score = vp({ 'wb-sultanate': 6 });
    expect(coalitionScore(IDS, PAIRED, 'A', score)).toBe(6);
    expect(coalitionScore(IDS, PAIRED, 'B', score)).toBe(0);
  });

  it('ignores a side that is no longer in the match', () => {
    // The tag map can outlive the side list for a render; the ids are the
    // authority on who is playing.
    const score = vp({ 'wb-sultanate': 6, 'wb-gone': 99 });
    const withGhost = { ...PAIRED, 'wb-gone': 'A' as const };
    expect(coalitionScore(IDS, withGhost, 'A', score)).toBe(6);
  });

  it('lists its sides in match order', () => {
    // The order the scoreboard reads them out in, so it matches the lobby.
    expect(sidesIn(IDS, PAIRED, 'A')).toEqual(['wb-sultanate', 'wb-crusade']);
    expect(sidesIn(IDS, PAIRED, 'B')).toEqual(['opp-zortan', 'opp-heretic']);
  });
});

describe('who is ahead', () => {
  it('names the coalition with more points', () => {
    expect(leader(IDS, PAIRED, vp({ 'wb-sultanate': 8, 'opp-zortan': 2 }))).toBe('A');
    expect(leader(IDS, PAIRED, vp({ 'wb-sultanate': 2, 'opp-zortan': 8 }))).toBe('B');
  });

  it('answers null on a draw rather than inventing a winner', () => {
    expect(leader(IDS, PAIRED, vp({ 'wb-sultanate': 5, 'opp-zortan': 5 }))).toBeNull();
    // Including nil-nil, which is every match before the first point.
    expect(leader(IDS, PAIRED, vp({}))).toBeNull();
  });
});

describe('suggesting a pairing', () => {
  it('alternates, because that is how players sit down', () => {
    // You and your ally on one side of the table, opponents on the other, and
    // the list is built by adding them in turn.
    expect(suggestCoalitions(IDS)).toEqual({
      'wb-sultanate': 'A', 'opp-zortan': 'B', 'wb-crusade': 'A', 'opp-heretic': 'B',
    });
  });

  it('is only ever a starting point', () => {
    // Nothing here locks it: the caller writes it into editable state.
    const suggested = suggestCoalitions(IDS);
    const edited = { ...suggested, 'opp-zortan': 'A' as const };
    expect(sidesIn(IDS, edited, 'A')).toEqual(['wb-sultanate', 'opp-zortan', 'wb-crusade']);
  });
});

describe('a side leaving the match', () => {
  it('takes its tag with it', () => {
    /*
      Otherwise a side removed and re-added inherits a team it was never
      assigned to this game — a stale tag that silently changes who a
      coalition total is counting.
    */
    const remaining = IDS.filter((id) => id !== 'opp-zortan');
    const pruned = pruneCoalitions(remaining, PAIRED);
    expect(pruned['opp-zortan']).toBeUndefined();
    expect(pruned['wb-sultanate']).toBe('A');
    expect(Object.keys(pruned).sort()).toEqual(remaining.filter((id) => PAIRED[id]).sort());
  });
});

describe('what a coalition is called', () => {
  it('is not named for a faction', () => {
    /*
      A coalition is whoever agreed to fight together tonight, and the pairs
      change between games. Faction naming would be wrong the first time
      somebody allies across the divide, which the campaign rules allow.
    */
    expect(COALITION_NAME.A).toBe('First Coalition');
    expect(COALITION_NAME.B).toBe('Second Coalition');
  });
});
