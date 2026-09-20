/**
 * The Campaign Victory Points scale, read from the rulebook.
 *
 * RR-02, second half. Three bullets under `Winning the Campaign` on page 95,
 * and the whole of how a season is decided rests on them.
 */
import { describe, it, expect } from 'vitest';

import { parseCampaignVictoryPoints } from '../lib/parse-campaign.mjs';

const scale = parseCampaignVictoryPoints();

describe('reading the three bullets', () => {
  it('reads all three, and keeps them apart', () => {
    /*
      Pinned against the printed page. Three adjacent bullets of the same shape
      are exactly what a parser crosses, and crossed values look entirely
      plausible — 7 for a win and 15 for a loss is a working scale that decides
      every campaign backwards.
    */
    expect(scale).toEqual({ win: 15, loss: 7, draw: 10 });
  });

  it('reads a draw as one player’s score, not the pair’s', () => {
    // "In a draw, both players score +10" — ten each, not ten between them.
    expect(scale.draw).toBe(10);
  });
});
