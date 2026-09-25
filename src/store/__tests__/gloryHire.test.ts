/**
 * A model hired for Glory, charged for in Glory.
 *
 * FD-05h, the last piece of FD-05e's "everything that spends the Strongbox
 * spends it". `addUnitToWarband` and `duplicateUnit` passed
 * `{ ducats: totalCost, glory: 0 }`, behind a comment saying the Glory was
 * deliberately deferred until `strongbox-overdrawn` could check it.
 *
 * What that deferral actually shipped is worse than an undercharge. **All 17
 * unit entries in the dataset that carry a Glory cost are priced ZERO
 * Ducats** — every one a Mercenary, from a 1 Glory Guard Dog to a 7 Glory
 * Pairika. So `totalCost` was `0`, `charge` short-circuited on `isZero`, and
 * hiring one booked **no ledger entry at all**: a free model, with no record
 * in the Strongbox's own account of where the money went.
 *
 * Driven with the SHIPPED entry, like FD-05g before it. The Pairika is the
 * case the owner will hit: it is the one Glory-priced recruit on the Iron
 * Sultanate's own list, and they play Iron Sultanate.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import { DATASET } from '@/data/generated/trenchline.generated';
import { recruitable } from '@/rules/recruitable';
import { toRoster } from '@/rules/fromWarband';
import { validateRoster } from '@/rules/validate';
import type { Warband } from '@/types/warband';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

const WB = 'wb-glory-hire';

const SULTANATE = recruitable(DATASET, 'iron-sultanate',
  (DATASET.armouries ?? []).map((a) => a.factionId));

/** The shipped entry: 0 Ducats, 7 Glory, the Sultanate's own Mercenary. */
const PAIRIKA = SULTANATE.units.find((u) => u.name === 'Pairika')!;
/** A Ducat-priced entry from the same list, as the control. */
const JANISSARY = SULTANATE.units.find((u) => u.name === 'Janissary')!;

const seed = (over: Partial<Warband> = {}): Warband => ({
  id: WB,
  name: 'The Brazen',
  factionId: 'iron-sultanate',
  campaignId: 'c1',
  ducatLimit: 1000,
  treasuryDucats: 200,
  gloryPoints: 10,
  forceMode: 'campaign',
  armoryStash: [],
  units: [],
  snapshots: [],
  ...over,
} as unknown as Warband);

const warband = () => useStore.getState().warbands.find((w) => w.id === WB)!;
const ducats = () => warband().treasuryDucats;
const glory = () => warband().gloryPoints;
const units = () => warband().units;
const hires = () => (warband().ledger ?? []).filter((e) => e.reason === 'quartermaster');

const hire = (profile: { id: string }, name?: string) =>
  useStore.getState().addUnitToWarband(WB, profile.id, name);

/**
 * Play the game the hire was made in.
 *
 * `reversible` keys off the ledger entry's GAME NUMBER, not a snapshot —
 * "users can make any variations from the end of one game to the start of the
 * next" — so a purchase settles when the campaign moves on.
 */
const advanceGame = () => useStore.setState({
  campaign: { id: 'c1', currentTurn: 2 } as never,
});

beforeEach(() => {
  useStore.setState({
    warbands: [seed()],
    activeWarbandId: WB,
    units: SULTANATE.units as never,
    weapons: SULTANATE.weapons as never,
    armour: SULTANATE.armour as never,
    equipment: SULTANATE.equipment as never,
    campaign: { id: 'c1', currentTurn: 1 } as never,
  });
});

describe('the shipped entries this is about', () => {
  /*
    Thirteen, where this said seventeen. The four that left are the Mercenaries'
    dog specializations — Guard Dog, Mercy Dog, Martyrdom Dog and Hellhound, one
    Glory apiece — which DA-02 established are not recruits at all. Page 121:
    "When you give a Trench Dog to a model, you can give the Trench Dog one of
    the following special abilities at a Cost of +1 ☼." They are the Trench
    Dog's own upgrade, and `recruitable` no longer offers them as models.

    The thing this test is actually about is unchanged: every entry priced in
    Glory is priced at zero Ducats, which is why a Glory hire used to cost
    nothing at all.
  */
  it('price every Glory recruit at zero Ducats, which is why nothing was charged', () => {
    const priced = SULTANATE.units.filter((u) => (u.gloryCost ?? 0) > 0);
    expect(priced).toHaveLength(13);
    expect(priced.every((u) => u.baseCost === 0)).toBe(true);
  });

  it('include the Pairika at 0 Ducats and 7 Glory', () => {
    expect(PAIRIKA.baseCost).toBe(0);
    expect(PAIRIKA.gloryCost).toBe(7);
    expect(PAIRIKA.factionId).toBe('iron-sultanate');
  });
});

describe('hiring a Glory-priced model', () => {
  it('debits the Glory, and no Ducats', () => {
    hire(PAIRIKA);
    expect(glory()).toBe(3);
    expect(ducats()).toBe(200);
  });

  it('books it as ONE purchase — where before it booked none at all', () => {
    hire(PAIRIKA);
    expect(hires()).toHaveLength(1);
    expect(hires()[0].glory).toBe(-7);
    expect(hires()[0].ducats ?? 0).toBe(0);
    expect(hires()[0].ref).toBe(units()[0].id);
    expect(hires()[0].note).toContain('Pairika');
  });

  it('hands the Glory back when the model leaves in the same muster', () => {
    hire(PAIRIKA);
    useStore.getState().removeUnitFromWarband(WB, units()[0].id);
    expect(glory()).toBe(10);
    expect(ducats()).toBe(200);
    expect(hires()).toEqual([]);
  });

  it('keeps the Glory once the game it was hired in has been played', () => {
    hire(PAIRIKA);
    advanceGame();
    useStore.getState().removeUnitFromWarband(WB, units()[0].id);
    // Settled. The book sells Battlekit, never models.
    expect(glory()).toBe(3);
    expect(hires()).toHaveLength(1);
  });

  it('is not refused when the Warband cannot afford it', () => {
    useStore.setState({ warbands: [seed({ gloryPoints: 2 })], activeWarbandId: WB });
    hire(PAIRIKA);
    // A muster may run negative while the player rearranges; the refusal is
    // `strongbox-overdrawn` at the roster door, not a button that will not
    // press. The model IS on the roster, and the debit IS booked.
    expect(units()).toHaveLength(1);
    expect(glory()).toBe(-5);
    expect(hires()).toHaveLength(1);
  });
});

describe('a copy of a Glory-priced model', () => {
  it('is a second hire and costs the Glory again', () => {
    hire(PAIRIKA);
    useStore.getState().duplicateUnit(WB, units()[0].id);
    expect(units()).toHaveLength(2);
    expect(glory()).toBe(10 - 7 - 7);
    expect(hires()).toHaveLength(2);
  });
});

describe('a Ducat-priced model', () => {
  it('is unchanged, in both directions', () => {
    expect(JANISSARY.gloryCost ?? 0).toBe(0);

    hire(JANISSARY);
    expect(ducats()).toBe(200 - JANISSARY.baseCost);
    expect(glory()).toBe(10);
    expect(hires()[0].glory ?? 0).toBe(0);

    useStore.getState().removeUnitFromWarband(WB, units()[0].id);
    expect(ducats()).toBe(200);
    expect(glory()).toBe(10);
  });
});

describe('an unrestricted Force', () => {
  it('is charged nothing, in either currency', () => {
    useStore.setState({
      warbands: [seed({ forceMode: 'unrestricted' })], activeWarbandId: WB,
    });
    hire(PAIRIKA);
    expect(units()).toHaveLength(1);
    expect(glory()).toBe(10);
    expect(ducats()).toBe(200);
    expect(warband().ledger ?? []).toEqual([]);
  });
});

/**
 * And the door that catches what the charge is allowed to do.
 *
 * Driven down the real path — store, `toRoster`, `validateRoster` —
 * because the point of FD-05h is that the charge and the check are two halves
 * of one decision: charging Glory is only safe because an overdrawn Glory
 * balance is now refused at the roster door instead of at the keyboard.
 */
const overdrawn = () => {
  const { roster } = toRoster(warband(), DATASET);
  return validateRoster(roster, DATASET).violations
    .filter((v) => v.code === 'strongbox-overdrawn');
};

describe('an overdrawn Glory balance, end to end', () => {
  it('reaches the validator and is refused there, naming Glory', () => {
    useStore.setState({ warbands: [seed({ gloryPoints: 2 })], activeWarbandId: WB });
    hire(PAIRIKA);
    expect(glory()).toBe(-5);

    const v = overdrawn();
    expect(v).toHaveLength(1);
    expect(v[0].severity).toBe('error');
    expect(v[0].message).toBe('Strongbox overdrawn by 5 Glory.');
  });

  it('and letting the model go clears it', () => {
    useStore.setState({ warbands: [seed({ gloryPoints: 2 })], activeWarbandId: WB });
    hire(PAIRIKA);
    useStore.getState().removeUnitFromWarband(WB, units()[0].id);
    expect(glory()).toBe(2);
    expect(overdrawn()).toEqual([]);
  });

  it('says nothing while the Warband can afford what it hired', () => {
    hire(PAIRIKA);
    expect(glory()).toBe(3);
    expect(overdrawn()).toEqual([]);
  });
});
