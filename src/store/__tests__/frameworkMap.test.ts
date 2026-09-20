/**
 * The map a new campaign is given comes from its framework, and nowhere else.
 *
 * `createCampaign` fell back to the app's twelve world theatres whenever the
 * caller passed no territories, on the reasoning that a Carcass Front campaign
 * with no map is worse than one with the wrong map. It is not: the theatres
 * are the `classic` map and mean nothing under Carcass Front rules, so seating
 * a Carcass Front campaign on them is the app inventing part of someone's
 * campaign. Nothing reaches it through the hub either — the form refuses to
 * submit while `cfTerritories` is empty — so the fallback could only ever fire
 * on the way to a wrong answer.
 *
 * Driven through the store rather than asserted on a constant, because that is
 * where the choice is made.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../useStore';
import type { TerritoryNode } from '@/types/campaign';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

/** A published zone as `carcassFrontTerritories` builds one: no `x`/`y`. */
const zone = (name: string): TerritoryNode => ({
  id: `cf-${name}`, name, type: 'Special Zone',
  perk: 'A Warband holding this Zone may re-roll one Promotion roll.',
  description: 'Scenario played here: Trench Raid.',
});

const territories = () => useStore.getState().campaign.territories;

beforeEach(() => {
  useStore.setState({ warbands: [], activeWarbandId: null });
});

describe('the map createCampaign supplies', () => {
  it('is the twelve world theatres for a classic campaign', () => {
    useStore.getState().createCampaign('Test Crusade', 700, 25, 'classic');
    expect(territories()).toHaveLength(12);
    // The classic map is pinned; that is what makes it the classic map.
    expect(territories()[0].x).toBeDefined();
  });

  it('is the published zones for a Carcass Front campaign', () => {
    const zones = ['Ash Wastes', 'Kurd Dagh'].map(zone);
    useStore.getState().createCampaign('Test Crusade', 700, 25, 'carcass-front', zones);
    expect(territories().map((t) => t.name)).toEqual(['Ash Wastes', 'Kurd Dagh']);
    // And the Outpost Bonus the book prints survives.
    expect(territories()[1].perk).toContain('re-roll one Promotion roll');
  });

  it('and is empty, not the classic theatres, for Carcass Front with no zones', () => {
    useStore.getState().createCampaign('Test Crusade', 700, 25, 'carcass-front');
    expect(territories()).toEqual([]);
  });
});
