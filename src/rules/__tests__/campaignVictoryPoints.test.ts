/**
 * The scale a campaign is actually won on.
 *
 * RR-02, second half. Page 95: *"The winner of the game scores +15 Campaign
 * Victory Points… The loser of the game scores +7… In a draw, both players
 * score +10… At the end of the campaign, the player with the most Campaign
 * Victory Points is the winner."*
 *
 * The app recorded none of it. The Campaign Hub ranked members on `glory` — a
 * currency they spend in the Quartermaster Step, so a player who banked theirs
 * led a table they were losing — and showed a `rating` that is in no rulebook.
 * The standings answered a question the game does not ask, and the one it does
 * ask had no answer anywhere.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { campaignVictoryPoints, byCampaignVictoryPoints, victoryPointScale } from '../campaign';

const scale = victoryPointScale(DATASET)!;

describe('the derived scale', () => {
  it('ships, and is the book’s', () => {
    // Pinned: a change here changes who wins every campaign in the app.
    expect(scale).toEqual({ win: 15, loss: 7, draw: 10 });
  });

  it('scores a loss, and orders win > draw > loss', () => {
    /*
      Seven of fifteen is a lot. A scale read as winner-takes-all would decide
      seasons differently, and the three bullets are the sort of list an
      extraction crosses without looking wrong.
    */
    expect(scale.loss).toBeGreaterThan(0);
    expect(scale.win).toBeGreaterThan(scale.draw);
    expect(scale.draw).toBeGreaterThan(scale.loss);
  });

  it('is three positive integers', () => {
    for (const [k, v] of Object.entries(scale)) {
      expect(Number.isInteger(v), k).toBe(true);
      expect(v, k).toBeGreaterThan(0);
    }
  });
});

describe('a member’s total', () => {
  it('is the record against the scale, computed from the dataset', () => {
    const member = { wins: 2, losses: 1, draws: 1 };
    expect(campaignVictoryPoints(DATASET, member))
      .toBe(2 * scale.win + 1 * scale.loss + 1 * scale.draw);
  });

  it('counts a loss rather than ignoring it', () => {
    // The defect this guards: a player with three losses is not on nothing.
    expect(campaignVictoryPoints(DATASET, { wins: 0, losses: 3, draws: 0 }))
      .toBe(3 * scale.loss);
  });

  it('is nought for a member who has played nothing', () => {
    expect(campaignVictoryPoints(DATASET, { wins: 0, losses: 0, draws: 0 })).toBe(0);
    expect(campaignVictoryPoints(DATASET, {})).toBe(0);
  });

  it('treats a missing or nonsense count as none, never as negative', () => {
    expect(campaignVictoryPoints(DATASET, { wins: -4, losses: NaN, draws: undefined })).toBe(0);
  });

  it('returns null rather than nought where the ruleset has no scale', () => {
    /*
      Rule 2. A standings table that cannot be computed must not render as
      everyone level on nothing, which reads as a real result.
    */
    expect(campaignVictoryPoints(null, { wins: 5 })).toBeNull();
    expect(campaignVictoryPoints(DATASET, null)).toBeNull();
  });

  it('does not count what it cannot derive', () => {
    /*
      Two Exploration results move Campaign Victory Points outside the per-game
      scale: `16 Treasure of the Holies` scores D3, and `23 Patron's Visit`
      exchanges up to 10 Glory for the same number of points. Neither is a
      function of a win/loss/draw record — one is a die roll and the other a
      decision — so this is the per-game total and nothing else. Asserted so
      that a later adjustments ledger has to change this test deliberately.
    */
    const member = { wins: 1, losses: 0, draws: 0, glory: 10 };
    expect(campaignVictoryPoints(DATASET, member)).toBe(scale.win);
  });
});

describe('the standings order', () => {
  const m = (name: string, wins: number, losses: number, draws: number, glory = 0) =>
    ({ name, wins, losses, draws, glory });

  it('ranks on points, not on Glory', () => {
    /*
      The whole defect in one case: the hoarder has banked Glory and lost every
      game; the winner has spent theirs. The old sort put the hoarder top.
    */
    const hoarder = m('Hoarder', 0, 4, 0, 99);
    const winner = m('Winner', 4, 0, 0, 0);
    expect(byCampaignVictoryPoints(DATASET, [hoarder, winner]).map((x) => x.name))
      .toEqual(['Winner', 'Hoarder']);
  });

  it('puts the most points first', () => {
    const rows = [m('A', 1, 2, 0), m('B', 3, 0, 0), m('C', 2, 1, 0)];
    expect(byCampaignVictoryPoints(DATASET, rows).map((x) => x.name)).toEqual(['B', 'C', 'A']);
  });

  it('leaves members tied on points tied, breaking only the display order', () => {
    /*
      "In the case of a tie, all tied players are joint winners." Glory decides
      which is printed first and nothing else — the totals stay equal, and a
      caller that needs to know who won must read them rather than take
      position 0.
    */
    const a = m('A', 2, 1, 0, 5);
    const b = m('B', 2, 1, 0, 50);
    const order = byCampaignVictoryPoints(DATASET, [a, b]);
    expect(order.map((x) => x.name)).toEqual(['B', 'A']);
    expect(campaignVictoryPoints(DATASET, order[0]))
      .toBe(campaignVictoryPoints(DATASET, order[1]));
  });

  it('does not mutate what it is given', () => {
    const rows = [m('A', 0, 1, 0), m('B', 1, 0, 0)];
    byCampaignVictoryPoints(DATASET, rows);
    expect(rows.map((x) => x.name)).toEqual(['A', 'B']);
  });

  it('still returns every member where the ruleset has no scale', () => {
    // Unsorted is honest; dropping rows is not.
    expect(byCampaignVictoryPoints(null, [m('A', 1, 0, 0), m('B', 0, 1, 0)])).toHaveLength(2);
  });
});
