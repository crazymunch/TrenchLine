/**
 * Claiming *Curse on Creation*, and what it takes.
 *
 * `docs/RULES-COVERAGE-AUDIT.md` RC-08. The rules layer decides eligibility;
 * this asserts that the store then does the trade — six Grail Thralls leave the
 * roster, the entitlement is recorded, and the Amalgam the rule gives arrives
 * costing nothing.
 *
 * The conditions are checked HERE and never again, because the claim is a
 * historical fact: a Warband that shrinks next game has still paid.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import { DATASET } from '@/data/generated/trenchline.generated';
import { toRoster } from '@/rules/fromWarband';
import { rosterCost } from '@/rules/costs';
import type { Warband, ActiveUnit } from '@/types/warband';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveWarband: vi.fn() } };
});

const WB = 'wb-grail';
const AMALGAM = DATASET.units.find((u) => u.name === 'Amalgam')!;
const THRALL = DATASET.units.find((u) => u.name === 'Thrall')!;

const unit = (profile: typeof AMALGAM, i: number, totalCost: number): ActiveUnit => ({
  id: `u-${profile.name}-${i}`,
  customName: `${profile.name} ${i}`,
  baseProfileId: profile.id,
  profileSnapshot: { ...profile, category: 'Trooper' },
  equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
  xp: 0, advancements: [], injuries: [], isDead: false, totalCost,
  currentWounds: 1, maxWounds: 1, bloodMarkers: 0,
  status: 'Active', hasActedThisTurn: false,
} as unknown as ActiveUnit);

const seed = (thralls: number, richModelCost: number): Warband => ({
  id: WB, name: 'The Rot', factionId: 'Black Grail',
  ducatLimit: 5000, treasuryDucats: 0, gloryPoints: 0,
  armoryStash: [],
  units: [
    ...Array.from({ length: thralls }, (_, i) => unit(THRALL, i, 15)),
    unit(AMALGAM, 99, richModelCost),
  ],
  snapshots: [],
} as unknown as Warband);

const after = () => useStore.getState().warbands.find((w) => w.id === WB)!;
const claim = () => useStore.getState()
  .claimEarnedRecruitment(WB, AMALGAM.id, DATASET);

beforeEach(() => {
  useStore.setState({ warbands: [seed(6, 1000)], activeWarbandId: WB });
  /* `addUnitToWarband` recruits out of the hydrated catalogue, which is empty
     in a bare store. This is the app's own hydration path. */
  useStore.getState().hydrateCatalogs(DATASET, 'Black Grail');
});

describe('a Warband that qualifies', () => {
  it('records the entitlement, naming the rule that granted it', () => {
    expect(claim().ok).toBe(true);
    const [claimed] = after().earnedRecruitment!;
    expect(claimed.profileId).toBe(AMALGAM.id);
    expect(claimed.grantedBy).toBe('Curse on Creation');
    expect(claimed.spent).toHaveLength(6);
  });

  it('removes six Thralls from the Roster, not six of anything else', () => {
    claim();
    expect(after().units.filter((u) => u.baseProfileId === THRALL.id)).toHaveLength(0);
    expect(after().units.filter((u) => u.baseProfileId === AMALGAM.id).length)
      .toBeGreaterThan(0);
  });

  it('removes them rather than marking them dead', () => {
    // The rule gives them up; it does not kill them, and a dead model is still
    // on the sheet.
    claim();
    expect(after().units.some((u) => u.isDead)).toBe(false);
  });

  it('recruits the Amalgam the rule gives, at no cost', () => {
    const result = claim();
    expect(result).toMatchObject({ ok: true, freeRecruit: 'added' });
    const free = after().units.find((u) => u.grantedFree);
    expect(free).toBeDefined();
    expect(free!.grantedFree).toBe('Curse on Creation');
    expect(free!.totalCost).toBe(0);
  });

  it('does not charge the roster for it', () => {
    /*
      `toRoster` prices every model at its catalogue cost, so without
      `grantedFree` the free model is billed and the entitlement is worth
      nothing.
    */
    const before = rosterCost(toRoster(after(), DATASET).roster).ducats;
    claim();
    const now = rosterCost(toRoster(after(), DATASET).roster).ducats;
    /* Six Thralls left; the Amalgam that arrived adds nothing. */
    expect(now).toBeLessThan(before);
    const free = after().units.find((u) => u.grantedFree)!;
    const priced = toRoster(after(), DATASET).roster.units.find((u) => u.id === free.id)!;
    expect(priced.cost).toEqual({ ducats: 0, glory: 0 });
  });

  it('cannot be claimed a second time', () => {
    claim();
    const again = claim();
    expect(again.ok).toBe(false);
    expect((again as { blockers: string[] }).blockers.join(' '))
      .toContain('already been claimed');
  });
});

describe('a Warband that does not qualify', () => {
  it('is refused, and told what is missing, and loses nothing', () => {
    useStore.setState({ warbands: [seed(5, 1000)], activeWarbandId: WB });
    const result = claim();
    expect(result.ok).toBe(false);
    expect((result as { blockers: string[] }).blockers.join(' ')).toContain('has 5');
    expect(after().units.filter((u) => u.baseProfileId === THRALL.id)).toHaveLength(5);
    expect(after().earnedRecruitment).toBeUndefined();
  });

  it('is refused when the rest of the Warband is not worth enough', () => {
    useStore.setState({ warbands: [seed(6, 100)], activeWarbandId: WB });
    const result = claim();
    expect(result.ok).toBe(false);
    expect(after().units).toHaveLength(7);
  });
});
