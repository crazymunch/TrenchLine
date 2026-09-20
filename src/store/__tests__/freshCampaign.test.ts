/**
 * A device with no campaign has no campaign, and a stored one keeps its map.
 *
 * `defaultFreshCampaign` was every new device's campaign: a crusade named
 * "Crusade for the Lands of the Great Powers", invite code `TRENCH-1099`,
 * admin "Commander", seated on the app's twelve world theatres. None of it was
 * the player's, and the invite code was a real code shape for a campaign that
 * does not exist, printed in the hub with a copy button.
 *
 * `readInitialState` then went further. It did not merely supply a map when
 * there was none — it REPLACED the stored campaign's map whenever the stored
 * one failed a shape test:
 *
 *   territories.length >= 6 && territories[0].x !== undefined
 *
 * Carcass Front zones carry no `x` (`carcassFrontTerritories` builds them from
 * the published map, which has no pin coordinates), so a Carcass Front
 * campaign — 32 zones, the Outpost Bonuses the book prints — failed the test
 * on every reload and was reseated on the twelve classic theatres. A small
 * classic campaign failed it too, on the row count alone.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Campaign, TerritoryNode } from '../../types/campaign';

const store = new Map<string, string>();
vi.mock('../../services/storage', () => ({
  storage: {
    getCampaign: () => (store.has('campaign') ? JSON.parse(store.get('campaign')!) : null),
    getWarbands: () => [],
    getActiveWarbandId: () => null,
    getCustomUnits: () => [],
    getCustomWeapons: () => [],
    getOpponents: () => [],
    getTheme: () => 'iron-sanctum',
    getRulesetVersion: () => '1.0.2',
  },
}));

const { readInitialState, emptyInitialState } = await import('../init');

/** A Carcass Front zone as `carcassFrontTerritories` builds one: no `x`/`y`. */
const zone = (name: string): TerritoryNode => ({
  id: `cf-${name}`, name, type: 'Special Zone',
  perk: 'A Warband holding this Zone may re-roll one Promotion roll.',
  description: 'Scenario played here: Trench Raid.',
});

const campaignOf = (territories: TerritoryNode[]): Campaign => ({
  id: 'camp-1700000000000',
  name: 'The Bleeding Fields',
  inviteCode: 'TRENCH-ABC123',
  adminName: 'Commander',
  status: 'active',
  currentTurn: 4,
  maxWarbandDucats: 700,
  gloryVictoryThreshold: 25,
  members: [],
  territories,
  matches: [],
  chronicleLogs: [],
});

beforeEach(() => store.clear());

describe('a device with no stored campaign', () => {
  it('starts with no campaign, not with someone else\'s', () => {
    const { campaign } = readInitialState();
    expect(campaign.id).toBe('');
    expect(campaign.name).toBe('');
    expect(campaign.territories).toEqual([]);
  });

  it('is given no invite code for a campaign that does not exist', () => {
    expect(readInitialState().campaign.inviteCode).toBe('');
    expect(emptyInitialState().campaign.inviteCode).toBe('');
  });

  it('and the pre-hydration state matches it, so there is no flash of a map', () => {
    expect(emptyInitialState().campaign.territories).toEqual([]);
  });
});

describe('a stored campaign keeps the map it has', () => {
  it('a Carcass Front campaign is not reseated on the classic theatres', () => {
    const zones = ['Ash Wastes', 'Kurd Dagh', 'The Sunken Road'].map(zone);
    store.set('campaign', JSON.stringify(campaignOf(zones)));
    const { campaign } = readInitialState();
    expect(campaign.territories.map((t) => t.name)).toEqual(zones.map((z) => z.name));
    // The published Outpost Bonus survives the read.
    expect(campaign.territories[1].perk).toContain('re-roll one Promotion roll');
  });

  it('a campaign with two territories keeps its two', () => {
    const own: TerritoryNode[] = [
      { id: 't1', name: 'Contested Ridge', type: "No Man's Land", perk: '', description: '' },
      { id: 't2', name: 'Kurd Dagh', type: 'Special Zone', perk: 'House rule.', description: '' },
    ];
    store.set('campaign', JSON.stringify(campaignOf(own)));
    const { campaign } = readInitialState();
    expect(campaign.territories.map((t) => t.name)).toEqual(['Contested Ridge', 'Kurd Dagh']);
    expect(campaign.territories[1].perk).toBe('House rule.');
  });

  it('and one with no territories at all is not given twelve', () => {
    store.set('campaign', JSON.stringify(campaignOf([])));
    expect(readInitialState().campaign.territories).toEqual([]);
  });
});
