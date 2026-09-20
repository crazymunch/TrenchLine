/**
 * A game has as many post-battles as it has rosters.
 *
 * FD-09b / RR-27. `handleEndMatch` built the handover for the active warband
 * and opened one wizard, and `BattleRecord.campaignMatchId` was **one id for
 * the whole battle**. So a second side — the player's own other warband, or
 * another user's in a hosted match — got no Trauma, no Experience and no
 * Exploration, and the record had nowhere to say whether it ever would: the
 * Chronicle had the game and the campaign did not.
 *
 * The link moved onto the SIDE rather than into a map on the battle, which is
 * where FD-09 put it. `Battle.sides` is a `Json` column, so a per-side fact
 * reaches the cloud with the record it belongs to and needs no migration —
 * and a per-side link that did not sync would have another device offering a
 * post-battle already run here, and counting it twice.
 */
import { describe, it, expect } from 'vitest';

import {
  matchIdsOf, unresolvedSides, parseBattle, BATTLE_VERSION,
  type BattleRecord, type BattleSide,
} from '@/types/battle';

const side = (over: Partial<BattleSide> = {}): BattleSide => ({
  id: 'wb1', name: 'Warband One', factionId: 'new-antioch',
  wasPlaceholder: false, vp: 3, turnScores: {},
  ...over,
});

const battle = (sides: BattleSide[], over: Partial<BattleRecord> = {}): BattleRecord => ({
  version: BATTLE_VERSION,
  id: 'b1',
  endedAt: '2026-01-01T00:00:00Z',
  scenarioId: 'sc-1',
  scenarioName: 'Bridgehead',
  turns: 4,
  sides,
  deeds: [],
  ...over,
});

describe('which sides still owe a post-battle', () => {
  it('is all of them on a record nobody has resolved', () => {
    const b = battle([side(), side({ id: 'wb2', name: 'Warband Two' })]);
    expect(unresolvedSides(b).map((s) => s.id)).toEqual(['wb1', 'wb2']);
  });

  it('drops a side once its own post-battle is linked', () => {
    const b = battle([
      side({ campaignMatchId: 'match-1' }),
      side({ id: 'wb2', name: 'Warband Two' }),
    ]);
    expect(unresolvedSides(b).map((s) => s.id)).toEqual(['wb2']);
    expect(matchIdsOf(b)).toEqual({ wb1: 'match-1' });
  });

  it('is empty once every side is linked', () => {
    const b = battle([
      side({ campaignMatchId: 'match-1' }),
      side({ id: 'wb2', campaignMatchId: 'match-2' }),
    ]);
    expect(unresolvedSides(b)).toEqual([]);
  });

  it('never lists a placeholder — it has no roster to resolve', () => {
    /*
      A placeholder opponent has no models, no Strongbox and no Experience to
      award. Offering a post-battle for one would be offering to roll Trauma
      for a name somebody typed.
    */
    const b = battle([side(), side({ id: 'ph1', name: 'Some Heretics', wasPlaceholder: true })]);
    expect(unresolvedSides(b).map((s) => s.id)).toEqual(['wb1']);
  });
});

describe('a record written before the link moved onto the side', () => {
  it('reads its one id as the PRIMARY side’s, so it is not offered again', () => {
    /*
      `campaignMatchId` was the whole battle's, written by the one wizard that
      ran — which was always the first side's. Reading it as unresolved would
      offer a post-battle that has already been committed, and commit it twice.
    */
    const b = battle(
      [side(), side({ id: 'wb2', name: 'Warband Two' })],
      { campaignMatchId: 'legacy-match' },
    );
    expect(matchIdsOf(b)).toEqual({ wb1: 'legacy-match' });
    expect(unresolvedSides(b).map((s) => s.id)).toEqual(['wb2']);
  });

  it('does not let the legacy id override a side’s own', () => {
    const b = battle(
      [side({ campaignMatchId: 'match-1' })],
      { campaignMatchId: 'legacy-match' },
    );
    expect(matchIdsOf(b)).toEqual({ wb1: 'match-1' });
  });
});

describe('the record round-trips both new fields', () => {
  it('keeps the side’s match id and its deployment', () => {
    const b = battle([side({
      campaignMatchId: 'match-1',
      deployedUnitIds: ['u1', 'u2'],
    })]);
    const read = parseBattle(JSON.parse(JSON.stringify(b)))!;
    expect(read.sides[0].campaignMatchId).toBe('match-1');
    expect(read.sides[0].deployedUnitIds).toEqual(['u1', 'u2']);
  });

  it('reads a side that has neither, because most records have neither', () => {
    const read = parseBattle(JSON.parse(JSON.stringify(battle([side()]))))!;
    expect(read.sides[0].campaignMatchId).toBeUndefined();
    expect(read.sides[0].deployedUnitIds).toBeUndefined();
  });

  it('drops a deployment entry that is not an id', () => {
    const raw = JSON.parse(JSON.stringify(battle([side()])));
    raw.sides[0].deployedUnitIds = ['u1', 7, null, 'u2'];
    expect(parseBattle(raw)!.sides[0].deployedUnitIds).toEqual(['u1', 'u2']);
  });
});
