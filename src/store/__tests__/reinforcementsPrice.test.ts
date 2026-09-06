/**
 * The post-battle write, and what Calling for Reinforcements takes.
 *
 * `docs/RULES-COVERAGE-AUDIT.md` RC-09. The rulebook's Reinforcements Sequence
 * is six steps. This slice applied one of them — step 6, forfeiting Exploration
 * and the Quartermaster, enforced by the wizard hiding those controls — and
 * charged nothing for the rest:
 *
 *   step 1  "Discard any Battlekit that you have in the Arsenal"   kept it
 *   step 2  "Reduce the number of Ducats in your Strongbox to zero" kept them
 *   step 5  "Any Ducats you do not spend … are lost"                kept those too
 *
 * A bail-out that costs nothing is not a bail-out. Taking it left the player
 * strictly better off than not taking it, which inverts the whole point of the
 * step.
 *
 * These tests are the ones that would have caught it: they assert on what is
 * GONE afterwards. The rules-layer tests in `rules/__tests__/reinforcements.ts`
 * assert what the sequence says; this asserts that the store does it.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import type { Warband } from '@/types/warband';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

const WB = 'wb-reinforce';

/** A warband mid-campaign: a full Strongbox and a stocked Arsenal. */
const seed = (): Warband => ({
  id: WB,
  name: 'The Tested',
  factionId: 'new-antioch',
  ducatLimit: 1000,
  treasuryDucats: 420,
  gloryPoints: 3,
  armoryStash: [
    { id: 's1', name: 'Gas Mask', cost: 5, category: 'equipment' },
    { id: 's2', name: 'Medi-kit', cost: 10, category: 'equipment' },
  ],
  units: [],
  snapshots: [],
} as unknown as Warband);

const apply = (tookReinforcements: boolean) =>
  useStore.getState().applyPostBattleResults(
    'sc-1', 'Bridgehead', 'Victory',
    /* glory */ 2,
    /* ducats */ 100,
    /* casualties */ [],
    /* advancements */ [],
    /* experience */ [],
    tookReinforcements,
    'narrative',
  );

const after = () => useStore.getState().warbands.find((w) => w.id === WB)!;

describe('a post-battle submission WITHOUT Reinforcements', () => {
  beforeEach(() => {
    useStore.setState({ warbands: [seed()], activeWarbandId: WB });
  });

  it('adds the loot to the Strongbox and leaves the Arsenal alone', () => {
    apply(false);
    expect(after().treasuryDucats).toBe(520);
    expect(after().armoryStash.map((i) => i.name)).toEqual(['Gas Mask', 'Medi-kit']);
  });
});

describe('a post-battle submission WITH Reinforcements', () => {
  beforeEach(() => {
    useStore.setState({ warbands: [seed()], activeWarbandId: WB });
  });

  it('empties the Strongbox — step 2, and step 5 for what is unspent', () => {
    // Not "420 minus what was spent", and emphatically not 520. Zero.
    apply(true);
    expect(after().treasuryDucats).toBe(0);
  });

  it('discards the Arsenal — step 1, "abandoned when you fall back"', () => {
    apply(true);
    expect(after().armoryStash).toEqual([]);
  });

  it('still pays the Glory, which the step does not take', () => {
    // Only the two clauses that name a thing are applied. Glory is not one of
    // them, and helping itself to more than the rule says would be the same
    // class of error in the other direction.
    apply(true);
    expect(after().gloryPoints).toBe(5);
  });

  it('says in the chronicle what was given up, with the numbers', () => {
    apply(true);
    const summary = after().snapshots.at(-1)!.changesSummary.join(' | ');
    expect(summary).toContain('Called for Reinforcements');
    expect(summary).toContain('2 item(s)');
    expect(summary).toContain('420 Ducats');
  });

  it('snapshots the warband as it is AFTER the step, not before', () => {
    /*
      The snapshot is what a player reads back in their history. Recording the
      pre-step Arsenal there would show them gear they no longer own — the same
      lie as not charging for it, moved one screen along.
    */
    apply(true);
    const snap = after().snapshots.at(-1)!;
    expect(snap.treasuryDucats).toBe(0);
    expect(snap.armoryStash).toEqual([]);
  });
});
