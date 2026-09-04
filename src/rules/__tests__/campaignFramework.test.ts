/**
 * The two campaign frameworks.
 *
 * Carcass Front publishes a complete campaign of its own, and it is a
 * different game from the one the app has always had — not a variation on it.
 * So it is a choice made at creation and never afterwards: the two do not
 * agree on what a territory is, what a turn is or how the campaign is won, and
 * a switch mid-campaign would leave every game already logged meaning
 * something other than what it meant when it was played.
 */
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import type { Dataset } from '@/types/catalogue';
import { carcassFrontTerritories, frameworkOf, FRAMEWORKS } from '../campaignFramework';

const d = DATASET as unknown as Dataset;
const zones = carcassFrontTerritories(d.carcassFrontMap);

describe('the framework of a campaign', () => {
  it('is classic for every campaign saved before the choice existed', () => {
    // No migration: the field is absent on those, and all of them are classic.
    expect(frameworkOf(undefined)).toBe('classic');
    expect(frameworkOf({})).toBe('classic');
    expect(frameworkOf({ framework: 'carcass-front' })).toBe('carcass-front');
  });

  it('offers exactly the two the app can actually run', () => {
    expect(FRAMEWORKS.map((f) => f.id)).toEqual(['classic', 'carcass-front']);
  });
});

describe('a Carcass Front campaign’s territories', () => {
  it('are the 32 published zones, not the app’s twelve theatres', () => {
    expect(zones).toHaveLength(32);
    expect(zones.map((z) => z.name)).toContain('The Vivarium');
  });

  it('carry the Resources and the scenario the map prints', () => {
    const vivarium = zones.find((z) => z.name === 'The Vivarium');
    expect(vivarium?.resources).toEqual(['Favour', 'Relics', 'Supplies']);
    expect(vivarium?.scenario).toBe('Dragon Hunt');
    expect(vivarium?.description).toContain('Dragon Hunt');
  });

  it('give the ten Special Zones their PUBLISHED Outpost Bonus as the perk', () => {
    /*
      The point of the whole exercise. The app's own theatres carried invented
      perks and now carry none, because no published rule attaches an effect to
      holding one. These do: the book states an Outpost Bonus for ten zones,
      and this is it, verbatim.
    */
    const special = zones.filter((z) => z.perk);
    expect(special).toHaveLength(10);
    expect(special.every((z) => z.type === 'Special Zone')).toBe(true);
    expect(zones.find((z) => z.name === 'Kurd Dagh')?.perk)
      .toMatch(/^You can re-roll one Promotion roll/);
  });

  it('leaves the other 22 with no perk rather than inventing one', () => {
    const plain = zones.filter((z) => !z.perk);
    expect(plain).toHaveLength(22);
    expect(plain.every((z) => z.type === 'Zone')).toBe(true);
  });

  it('has no map pins, because the app does not have the zone board', () => {
    // Which zone borders which is a graphic on the fold-out sheet. Scattering
    // thirty-two markers over a map of Europe would invent a geography.
    for (const z of zones) {
      expect(z.x, z.name).toBeUndefined();
      expect(z.y, z.name).toBeUndefined();
    }
  });

  it('is empty, not partial, when the dataset has no map', () => {
    // A campaign created with a half-built map is worse than one that reports
    // the ruleset did not load, which is what the picker does.
    expect(carcassFrontTerritories(undefined)).toEqual([]);
  });
});
