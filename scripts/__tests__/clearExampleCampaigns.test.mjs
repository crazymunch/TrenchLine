/**
 * Which campaigns the discard script is allowed to delete.
 *
 * The old `POST /api/campaigns` gave every campaign the same four fixed
 * territories, while the app creates twelve world theatres or thirty-two
 * Carcass Front zones — so a campaign in the app was never the campaign in the
 * database (docs/CAMPAIGN-SYNC.md). The maintainer confirmed the rows in
 * production today are example data and can go.
 *
 * "The maintainer said so" is a fact about one database at one moment, and
 * this script will outlive it. So the rule is written down and tested: the
 * example SHAPE is necessary but not sufficient, and a campaign that has been
 * played is kept whatever its territories look like.
 */
import { describe, it, expect } from 'vitest';
import { classifyCampaigns } from '../clear-example-campaigns.mjs';

const EXAMPLE = [
  'North Trench Sector A-1',
  'Shrine of the Weeping Martyr',
  'The Iron Foundry Bunker',
  "Dead Man's Crater (Center)",
];

const campaign = (name, territoryNames, matches = 0) => ({
  id: name, name,
  territories: territoryNames.map((n) => ({ name: n })),
  _count: { matches, members: 1 },
});

describe('choosing which campaigns may be discarded', () => {
  it('offers an unplayed campaign with exactly the example four', () => {
    const { disposable, keep } = classifyCampaigns([campaign('example', EXAMPLE)]);
    expect(disposable.map((c) => c.id)).toEqual(['example']);
    expect(keep).toEqual([]);
  });

  it('keeps a campaign that has been played, even with the example four', () => {
    /*
      The case the shape test alone gets wrong. A match record means someone
      used it; the territories it happens to carry are then beside the point.
    */
    const { disposable, keep } = classifyCampaigns([campaign('played', EXAMPLE, 3)]);
    expect(disposable).toEqual([]);
    expect(keep[0].why).toMatch(/3 match record/);
  });

  it('keeps a campaign the app created, which has twelve theatres', () => {
    const twelve = Array.from({ length: 12 }, (_, i) => `World Theatre ${i + 1}`);
    const { disposable, keep } = classifyCampaigns([campaign('real', twelve)]);
    expect(disposable).toEqual([]);
    expect(keep[0].why).toMatch(/12 territories/);
  });

  it('keeps a campaign with only some of the example four', () => {
    // A partial match is not the shape — something edited it.
    const { disposable } = classifyCampaigns([campaign('partial', EXAMPLE.slice(0, 2))]);
    expect(disposable).toEqual([]);
  });

  it('keeps a campaign with the example four plus one more', () => {
    const { disposable } = classifyCampaigns([
      campaign('extra', [...EXAMPLE, 'Somewhere Else']),
    ]);
    expect(disposable).toEqual([]);
  });

  it('keeps a campaign with no territories at all', () => {
    // Not the shape, and an empty campaign is not evidence of anything.
    const { disposable } = classifyCampaigns([campaign('empty', [])]);
    expect(disposable).toEqual([]);
  });

  it('sorts a mixed database correctly', () => {
    const { disposable, keep } = classifyCampaigns([
      campaign('a', EXAMPLE),
      campaign('b', EXAMPLE, 1),
      campaign('c', ['Kurd Dagh']),
    ]);
    expect(disposable.map((c) => c.id)).toEqual(['a']);
    expect(keep.map((k) => k.campaign.id)).toEqual(['b', 'c']);
  });
});
