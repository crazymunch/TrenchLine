/**
 * The wizard opens on the game it follows.
 *
 * RR-22. `handleEndMatch` writes a full `BattleRecord` and then opens the
 * post-battle wizard, which read none of it: the scenario defaulted to the
 * first in the list, the result to Victory whatever the score, and "did not
 * take part" was unticked for every model although Play Mode knew who had been
 * deployed. A model left in the Arsenal earned Experience unless the player
 * remembered to untick it by hand.
 */
import { describe, it, expect } from 'vitest';

import type { BattleRecord, BattleSide, DeedClaim } from '@/types/battle';
import { matchHandover } from '../matchHandover';

const side = (over: Partial<BattleSide> & { id: string }): BattleSide => ({
  name: over.id, factionId: 'f', wasPlaceholder: false, vp: 0, turnScores: {}, ...over,
});

const battle = (over: Partial<BattleRecord> = {}): BattleRecord => ({
  version: 1,
  id: 'battle-1',
  endedAt: '2026-09-19T21:00:00.000Z',
  scenarioId: 'scen-7',
  scenarioName: 'The Breach',
  turns: 4,
  sides: [side({ id: 'mine', name: 'The Faithful', vp: 5 }), side({ id: 'theirs', name: 'The Fallen', vp: 3 })],
  deeds: [],
  ...over,
});

const opts = (over: Partial<Parameters<typeof matchHandover>[1]> = {}) => ({
  ownSideId: 'mine',
  rosterUnitIds: ['u1', 'u2', 'u3'],
  deployedUnitIds: ['u1', 'u2'],
  ...over,
});

describe('the scenario and the score', () => {
  it('carries the scenario that was actually played', () => {
    // The dropdown defaulted to the first entry in the list.
    const h = matchHandover(battle(), opts())!;
    expect(h.scenarioId).toBe('scen-7');
    expect(h.scenarioName).toBe('The Breach');
  });

  it('reads the result off the Victory Points rather than defaulting to Victory', () => {
    expect(matchHandover(battle(), opts())!.result).toBe('Victory');

    const lost = battle({
      sides: [side({ id: 'mine', vp: 2 }), side({ id: 'theirs', vp: 6 })],
    });
    expect(matchHandover(lost, opts())!.result).toBe('Defeat');

    const level = battle({
      sides: [side({ id: 'mine', vp: 4 }), side({ id: 'theirs', vp: 4 })],
    });
    expect(matchHandover(level, opts())!.result).toBe('Draw');
  });

  it('reports both scores, so a screen can show its working', () => {
    const h = matchHandover(battle(), opts())!;
    expect(h.ownPoints).toBe(5);
    expect(h.bestOpponentPoints).toBe(3);
  });

  it('takes the best opponent in a three-way, not the last one', () => {
    const three = battle({
      sides: [
        side({ id: 'mine', vp: 5 }),
        side({ id: 'a', vp: 9 }),
        side({ id: 'b', vp: 1 }),
      ],
    });
    const h = matchHandover(three, opts())!;
    expect(h.bestOpponentPoints).toBe(9);
    expect(h.result).toBe('Defeat');
  });
});

describe('coalitions', () => {
  const coalition = (over: Partial<BattleRecord> = {}) => battle({
    sides: [
      side({ id: 'mine', name: 'The Faithful', coalition: 'A', vp: 2 }),
      side({ id: 'ally', name: 'The Devout', coalition: 'A', vp: 7 }),
      side({ id: 'foe', name: 'The Fallen', coalition: 'B', vp: 6 }),
    ],
    coalitionTotals: { A: 9, B: 6 },
    ...over,
  });

  it('scores a coalition game by the coalition total', () => {
    /*
      This side scored 2 of its coalition's 9. Judged on its own points it
      lost to a 6; judged as the book judges it, its side won.
    */
    const h = matchHandover(coalition(), opts())!;
    expect(h.ownPoints).toBe(9);
    expect(h.bestOpponentPoints).toBe(6);
    expect(h.result).toBe('Victory');
  });

  it('never counts an ally as an opponent', () => {
    // An ally's points are already inside this side's total, so counting them
    // again would make a coalition lose to itself.
    const h = matchHandover(coalition(), opts())!;
    expect(h.opponentName).toBe('The Fallen');
  });
});

describe('who was on the table', () => {
  it('marks the models Play Mode did not deploy', () => {
    // The defect this exists for: unticked for everyone, so a model left in
    // the Arsenal earned Experience.
    expect(matchHandover(battle(), opts())!.satOutUnitIds).toEqual(['u3']);
  });

  it('marks nobody when the whole roster was deployed', () => {
    const h = matchHandover(battle(), opts({ deployedUnitIds: ['u1', 'u2', 'u3'] }))!;
    expect(h.satOutUnitIds).toEqual([]);
  });

  it('ignores a deployed id that is no longer on the roster', () => {
    // A model removed between the match and the wizard is not resurrected.
    const h = matchHandover(battle(), opts({ deployedUnitIds: ['u1', 'gone'] }))!;
    expect(h.satOutUnitIds).toEqual(['u2', 'u3']);
  });
});

describe('the Glorious Deeds', () => {
  const deed = (sideId: string, title: string): DeedClaim =>
    ({ title, description: '', sideId, sideName: sideId });

  it('counts only this side’s', () => {
    /*
      One Glory per Deed is what the book pays between games, so this is the
      number the payout should be derived from (RR-02). Counted here; wiring it
      to the Glory field is that finding's job.
    */
    const b = battle({
      deeds: [deed('mine', 'Hold the Line'), deed('theirs', 'Break Them'), deed('mine', 'First Blood')],
    });
    expect(matchHandover(b, opts())!.deedsClaimed).toBe(2);
  });
});

describe('what it refuses to invent', () => {
  it('returns null with no battle record', () => {
    // Rule 2. The caller opens the wizard as it always did rather than being
    // handed a fabricated scenario and result.
    expect(matchHandover(null, opts())).toBeNull();
    expect(matchHandover(undefined, opts())).toBeNull();
  });

  it('returns null when this warband was not in the battle', () => {
    expect(matchHandover(battle(), opts({ ownSideId: 'someone-else' }))).toBeNull();
  });

  it('does not call a one-sided record a victory', () => {
    /*
      The Chronicle allows a record with a single side. There is nobody to have
      beaten, so it is not a win — and the player can still say otherwise,
      because the handover seeds the wizard rather than locking it.
    */
    const solo = battle({ sides: [side({ id: 'mine', vp: 5 })] });
    const h = matchHandover(solo, opts())!;
    expect(h.result).toBe('Draw');
    expect(h.opponentName).toBe('');
    expect(h.bestOpponentPoints).toBe(0);
  });

  it('carries the battle id, so the two records of one game can be linked', () => {
    // RR-23: `BattleRecord.campaignMatchId` existed, was plumbed through the
    // type, the sync and the API, and nothing ever set it.
    expect(matchHandover(battle(), opts())!.battleId).toBe('battle-1');
  });
});
