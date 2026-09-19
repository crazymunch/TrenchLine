/**
 * What a finished match leaves behind.
 *
 * All of this already existed in Play Mode's state and was discarded when the
 * match ended. The campaign's `MatchRecord` kept a date, a scenario, a
 * narrative and exactly ONE participant — the player's own warband — so in a
 * four-side game three of them left no trace at all.
 */
import { describe, it, expect } from 'vitest';

import { battleFromMatch, type SideInfo } from '../battleFromMatch';
import { victors, parseBattle, BATTLE_VERSION } from '@/types/battle';
import type { SideScore } from '../matchState';
import type { CoalitionMap } from '../coalitions';

const NOW = new Date('2026-09-19T21:30:00.000Z');

const INFO: Record<string, SideInfo> = {
  'wb-sultanate': { id: 'wb-sultanate', name: 'Bayt al-Nahas', factionId: 'iron-sultanate', isPlaceholder: false },
  'opp-crusade': { id: 'opp-crusade', name: 'Iron Crusade of St Lazarus', factionId: 'new-antioch', isPlaceholder: true },
  'opp-zortan': { id: 'opp-zortan', name: "Zortan's Court", factionId: 'court-seven-serpents', isPlaceholder: true },
  'opp-heretic': { id: 'opp-heretic', name: 'Black Procession', factionId: 'heretic-legions', isPlaceholder: true },
};
const IDS = Object.keys(INFO);
const PAIRED: CoalitionMap = {
  'wb-sultanate': 'A', 'opp-crusade': 'A', 'opp-zortan': 'B', 'opp-heretic': 'B',
};
const score = (vp: number, deeds: Record<string, string> = {}, turns = {}): SideScore =>
  ({ vp, completedDeeds: deeds, turnScores: turns });

const DEEDS = [
  { title: 'First Blood', description: 'Take the first model out of action.' },
  { title: 'Hold the Line', description: 'End a turn holding three objectives.' },
];

const build = (over: Partial<Parameters<typeof battleFromMatch>[0]> = {}) => battleFromMatch({
  matchWarbandIds: IDS,
  sideInfo: (id) => INFO[id],
  scores: {
    'wb-sultanate': score(6, { 'First Blood': '2' }, { 1: 2, 2: 4 }),
    'opp-crusade': score(4),
    'opp-zortan': score(5, { 'Hold the Line': '3' }),
    'opp-heretic': score(2),
  },
  coalitions: PAIRED,
  scenarioId: 'brothers-in-arms',
  scenarioName: 'Brothers in Arms',
  scenarioDeeds: DEEDS,
  playTurn: 4,
  weather: { name: 'Grim and Indifferent', effect: 'No effect.' },
  now: NOW,
  id: 'btl-fixed',
  ...over,
});

describe('recording a battle', () => {
  it('keeps every side, not just the player’s own', () => {
    // The defect this exists for: three of four sides left no trace.
    const b = build()!;
    expect(b.sides).toHaveLength(4);
    expect(b.sides.map((s) => s.name)).toEqual([
      'Bayt al-Nahas', 'Iron Crusade of St Lazarus', "Zortan's Court", 'Black Procession',
    ]);
  });

  it('records a side by the name it had, not a reference to it', () => {
    /*
      Deleting a warband, or forgetting a placeholder opponent months later,
      must not rewrite a battle it fought. The same rule the campaign record
      already follows for `opponentWarbandName`.
    */
    const b = build()!;
    const side = b.sides[0];
    expect(side.name).toBe('Bayt al-Nahas');
    // Resolved at record time; a later lookup failure cannot change it.
    const orphan = build({ sideInfo: () => undefined })!;
    expect(orphan.sides[0].name).toBe('wb-sultanate');
  });

  it('marks which sides had no roster in the app', () => {
    const b = build()!;
    expect(b.sides.find((s) => s.id === 'wb-sultanate')!.wasPlaceholder).toBe(false);
    expect(b.sides.filter((s) => s.wasPlaceholder)).toHaveLength(3);
  });

  it('keeps the per-turn history, not just the total', () => {
    const b = build()!;
    expect(b.sides[0].vp).toBe(6);
    expect(b.sides[0].turnScores).toEqual({ 1: 2, 2: 4 });
  });

  it('attributes each Glorious Deed, with the text as printed on the night', () => {
    /*
      The description is COPIED rather than referenced. A Deed's text comes
      from the scenario in the generated dataset, and that is rebuilt from
      upstream catalogues — so a record holding only a title would silently
      re-describe a past battle whenever the wording changed upstream.
    */
    const b = build()!;
    expect(b.deeds).toHaveLength(2);
    const first = b.deeds.find((d) => d.title === 'First Blood')!;
    expect(first.sideName).toBe('Bayt al-Nahas');
    expect(first.description).toBe('Take the first model out of action.');
    expect(first.turn).toBe('2');

    const held = b.deeds.find((d) => d.title === 'Hold the Line')!;
    expect(held.sideName).toBe("Zortan's Court");
  });

  it('records a Deed the scenario no longer prints, without inventing text', () => {
    // A scenario edited between the game and the write. An empty description
    // is honest; a made-up one is the failure AUDIT.md records.
    const b = build({ scenarioDeeds: [] })!;
    expect(b.deeds).toHaveLength(2);
    expect(b.deeds.every((d) => d.description === '')).toBe(true);
  });

  it('totals the coalitions only where it was played as coalitions', () => {
    const b = build()!;
    expect(b.coalitionTotals).toEqual({ A: 10, B: 7 });
    // A free-for-all gets none: two sums of arbitrary groupings say nothing.
    expect(build({ coalitions: {} })!.coalitionTotals).toBeUndefined();
  });

  it('records nothing for a match with no sides', () => {
    // Worse than a missing record: it looks like a game that went nowhere.
    expect(build({ matchWarbandIds: [] })).toBeNull();
  });

  it('survives the round trip through storage', () => {
    const b = build()!;
    const back = parseBattle(JSON.parse(JSON.stringify(b)));
    expect(back).toEqual(b);
    expect(back!.version).toBe(BATTLE_VERSION);
  });
});

describe('who won', () => {
  it('is derived, never stored', () => {
    /*
      A record that stored "win" would assert an outcome the table may have
      reached on other grounds, and would be wrong forever once written.
    */
    const b = build()!;
    expect('result' in b).toBe(false);
    expect(victors(b).map((s) => s.name)).toEqual(['Bayt al-Nahas', 'Iron Crusade of St Lazarus']);
  });

  it('is both members of the winning coalition', () => {
    expect(victors(build()!)).toHaveLength(2);
  });

  it('is nobody on a draw', () => {
    const drawn = build({
      scores: {
        'wb-sultanate': score(5), 'opp-crusade': score(5),
        'opp-zortan': score(5), 'opp-heretic': score(5),
      },
    })!;
    expect(victors(drawn)).toEqual([]);
  });

  it('is the top scorer in a free-for-all', () => {
    const solo = build({ coalitions: {} })!;
    expect(victors(solo).map((s) => s.name)).toEqual(['Bayt al-Nahas']);
  });

  it('is nobody when every side is level in a free-for-all', () => {
    const level = build({
      coalitions: {},
      scores: {
        'wb-sultanate': score(3), 'opp-crusade': score(3),
        'opp-zortan': score(3), 'opp-heretic': score(3),
      },
    })!;
    expect(victors(level)).toEqual([]);
  });
});

describe('reading a damaged record', () => {
  it('drops a battle with no usable sides rather than showing an empty one', () => {
    expect(parseBattle({ version: 1, id: 'b', sides: [] })).toBeNull();
    expect(parseBattle({ version: 1, id: 'b', sides: [{ noId: true }] })).toBeNull();
  });

  it('refuses a version it does not know', () => {
    expect(parseBattle({ ...build()!, version: 99 })).toBeNull();
  });

  it('keeps a partial record of a game that did happen', () => {
    // A battle that lost its weather is still a battle. Only the sides are
    // load bearing.
    const b = parseBattle({ ...build()!, weather: 'not an object', deeds: 'nope' })!;
    expect(b.sides).toHaveLength(4);
    expect(b.weather).toBeUndefined();
    expect(b.deeds).toEqual([]);
  });
});
