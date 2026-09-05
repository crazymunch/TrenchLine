/**
 * The marker steppers, and the cap that is not typed into them.
 *
 * `updateUnitBloodMarkers` clamped with a literal `Math.min(6, …)` under a
 * comment reading "Official Rulebook Cap", and there was no Blessing pool at
 * all. Both caps now come from `dataset.markers`, which the pipeline reads out
 * of the rulebook — so the number in the app is the number in the book, and
 * where the book prints no number the app enforces none.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useStore } from '../useStore';
import { hasRosterChange } from '@/services/sync';
import DATASET from '@/data/generated/trenchline.generated';
import type { Dataset } from '@/types/catalogue';
import type { ActiveUnit, Warband } from '@/types/warband';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveWarband: vi.fn(), syncWarbandToCloud: vi.fn() } };
});

const d = DATASET as unknown as Dataset;

const unit = (): ActiveUnit =>
  useStore.getState().warbands.find((w) => w.id === 'wb')!.units[0];

const step = (pool: 'blood' | 'blessing', times: number) => {
  const fn = pool === 'blood'
    ? useStore.getState().updateUnitBloodMarkers
    : useStore.getState().updateUnitBlessingMarkers;
  for (let i = 0; i < Math.abs(times); i++) fn('wb', 'u1', Math.sign(times));
};

describe('the battle marker pools', () => {
  beforeEach(() => {
    useStore.setState({
      markers: d.markers ?? [],
      warbands: [{
        id: 'wb',
        units: [{
          id: 'u1', customName: 'Brother Anselm',
          currentWounds: 3, maxWounds: 3,
          bloodMarkers: 0, blessingMarkers: 0,
          status: 'Active', hasActedThisTurn: false,
        } as unknown as ActiveUnit],
      } as unknown as Warband],
    });
  });

  it('stops Blood at the six the book prints', () => {
    step('blood', 10);
    expect(unit().bloodMarkers).toBe(6);
  });

  it('does not stop Blessing at six, because the book does not', () => {
    /*
      The failure this test exists for: a Blessing pool written as a copy of
      the Blood pool caps at 6, and then a model blessed a seventh time cannot
      be recorded. The book caps only Blood.
    */
    step('blessing', 10);
    expect(unit().blessingMarkers).toBe(10);
  });

  it('floors both at zero', () => {
    step('blood', -3);
    step('blessing', -3);
    expect(unit().bloodMarkers).toBe(0);
    expect(unit().blessingMarkers).toBe(0);
  });

  it('enforces no cap at all before the dataset has loaded', () => {
    /*
      Empty `markers` means "not loaded", not "no limits ever". The honest
      behaviour is to stop clamping rather than to fall back to a number the
      code remembers — the same rule as the empty catalogs.
    */
    useStore.setState({ markers: [] });
    step('blood', 8);
    expect(unit().bloodMarkers).toBe(8);
  });

  it('treats a blessing as match state, so it starts no cloud push', () => {
    /*
      Markers change constantly during a game. `bloodMarkers` was already in
      the set of transient fields that keeps a wound from marking the roster
      dirty; a pool added without joining it would push the whole warband to
      the cloud on every blessing, mid-game, from a phone at a table.

      Asserted through `hasRosterChange` rather than by reading the private
      set, so it is the behaviour that is pinned.
    */
    const before = useStore.getState().warbands[0];
    step('blessing', 3);
    const after = useStore.getState().warbands[0];

    expect(after.units[0].blessingMarkers, 'the pool did change').toBe(3);
    expect(hasRosterChange(before, after), 'a blessing is not a roster edit').toBe(false);
  });

  it('still notices a real roster edit', () => {
    // The other half: the comparison above must not be blind to everything.
    const before = useStore.getState().warbands[0];
    const after = { ...before, name: 'Renamed' } as Warband;
    expect(hasRosterChange(before, after)).toBe(true);
  });
});
