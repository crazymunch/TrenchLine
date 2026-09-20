/**
 * What the Exploration Step leaves on the Roster.
 *
 * FD-07 / RR-10. `warband.explorationDiscoveries` was read by the post-battle
 * step itself — to decide whether a roll was a Pillaged result, because "You
 * can discover a Location only once during the campaign" — and **written by
 * nothing anywhere in the app**. The list was therefore always empty: the rule
 * never once fired, and every Location any player had found went unrecorded.
 *
 * These are the writer's tests. What the roll does with the list is
 * `resolveExploration`'s, and what a Location grants is
 * `explorationSkills.test.ts`.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import type { Warband } from '@/types/warband';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

const WB = 'wb-explore';

const seed = (over: Partial<Warband> = {}): Warband => ({
  id: WB,
  name: 'The Wayfarers',
  factionId: 'new-antioch',
  ducatLimit: 1000,
  treasuryDucats: 0,
  gloryPoints: 0,
  armoryStash: [],
  units: [],
  snapshots: [],
  ...over,
} as unknown as Warband);

const apply = (exploration?: Parameters<
  ReturnType<typeof useStore.getState>['applyPostBattleResults']>[16]) =>
  useStore.getState().applyPostBattleResults(
    'sc-1', 'Bridgehead', 'Victory', 0, 90,
    [], [], { unitIds: [], misses: 0 }, [], false, 'narrative',
    undefined, undefined, undefined, undefined, undefined, exploration,
  );

const warband = () => useStore.getState().warbands.find((w) => w.id === WB)!;

beforeEach(() => {
  useStore.setState({ warbands: [seed()], activeWarbandId: WB });
});

describe('a Location discovered', () => {
  it('is written to the Roster, where nothing wrote one before', () => {
    apply({ discovered: 'Pot of Manna', effects: [] });
    expect(warband().explorationDiscoveries).toEqual(['Pot of Manna']);
  });

  it('joins the ones already found rather than replacing them', () => {
    useStore.setState({
      warbands: [seed({ explorationDiscoveries: ['Map & Document Bag'] })],
      activeWarbandId: WB,
    });
    apply({ discovered: 'Hidden Passages', effects: [] });
    expect(warband().explorationDiscoveries).toEqual(['Map & Document Bag', 'Hidden Passages']);
  });

  it('is not written twice, whatever case it arrives in', () => {
    // The once-per-campaign rule is checked against this list, so a duplicate
    // entry is a Location that could be "discovered" a third time.
    useStore.setState({
      warbands: [seed({ explorationDiscoveries: ['Pot of Manna'] })],
      activeWarbandId: WB,
    });
    apply({ discovered: 'POT OF MANNA', effects: [] });
    expect(warband().explorationDiscoveries).toEqual(['Pot of Manna']);
  });

  it('says so in the snapshot’s summary, so the history reads it back', () => {
    apply({ discovered: 'Hidden Passages', effects: [] });
    const summary = warband().snapshots?.at(-1)?.changesSummary ?? [];
    expect(summary.join('\n')).toContain('discovered Hidden Passages');
  });
});

describe('a Skill a Location granted', () => {
  const skill = (name: string, source: string) => ({ name, source, sinceGame: 2 });

  it('lands on the Roster with what granted it', () => {
    apply({ discovered: 'Map & Document Bag', effects: [skill('Re-roll', 'Map & Document Bag')] });
    expect(warband().explorationEffects).toEqual([
      { name: 'Re-roll', source: 'Map & Document Bag', sinceGame: 2 },
    ]);
  });

  it('is kept a second time, because the book allows multiples', () => {
    /*
      Page 115: "You can have multiples of any of the Exploration Skills on
      this list." Two Map & Document Bags is two Re-rolls, so this list is not
      de-duplicated — unlike `explorationDiscoveries` above, which is.
    */
    useStore.setState({
      warbands: [seed({ explorationEffects: [skill('Re-roll', 'an ally')] })],
      activeWarbandId: WB,
    });
    apply({ discovered: 'Map & Document Bag', effects: [skill('Re-roll', 'Map & Document Bag')] });
    expect(warband().explorationEffects).toHaveLength(2);
    expect(warband().explorationEffects!.map((e) => e.source))
      .toEqual(['an ally', 'Map & Document Bag']);
  });

  it('records the Pot of Manna’s standing loot as what it is', () => {
    apply({
      discovered: 'Pot of Manna',
      effects: [{ name: 'Pot of Manna', source: 'Pot of Manna', sinceGame: 2, lootBonus: 10 }],
    });
    expect(warband().explorationEffects?.[0].lootBonus).toBe(10);
    expect((warband().snapshots?.at(-1)?.changesSummary ?? []).join('\n'))
      .toContain('adds 10 Ducats to every Exploration Step');
  });
});

describe('a step that found nothing', () => {
  it('leaves the Roster’s lists alone', () => {
    useStore.setState({
      warbands: [seed({ explorationDiscoveries: ['Pot of Manna'] })],
      activeWarbandId: WB,
    });
    apply({ effects: [] });
    expect(warband().explorationDiscoveries).toEqual(['Pot of Manna']);
    expect(warband().explorationEffects).toBeUndefined();
  });

  it('is what a caller passing nothing at all gets', () => {
    // Every existing caller of this action passes 17 arguments and no more.
    apply();
    expect(warband().explorationDiscoveries).toEqual([]);
    expect(warband().explorationEffects).toBeUndefined();
  });
});
