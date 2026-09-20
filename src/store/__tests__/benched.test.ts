/**
 * The bench: which models are in the Force, and which sit the game out.
 *
 * RR-11 / FD-05b. The Threshold Value caps the Ducats a Force may field and
 * Field Strength caps its models (p.97), and both rise after every game. The
 * builder resolved them a hundred lines above the place it measured, used them
 * for a badge, and then measured against `warband.ducatLimit` — the FOUNDING
 * allowance, which never changes.
 *
 * `checkForceLimits` was written with both warnings, in the book's own words,
 * and had no caller anywhere in the app.
 *
 * The book is explicit that the roster may exceed both bounds:
 *
 * > Your Warband's Threshold Value and/or its Field Strength may mean that you
 * > cannot take all of the models that are on your Warband Roster. When this
 * > is the case any models you do not use will have to sit the game out; they
 * > will not earn any experience and cannot influence the game in any way.
 *
 * So benching is a choice a player makes, never a correction the app applies.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

import { useStore } from '../useStore';
import type { Warband } from '@/types/warband';

vi.mock('@/services/storage', async (orig) => {
  const actual = await orig<typeof import('@/services/storage')>();
  return { ...actual, storage: { ...actual.storage, saveCampaign: vi.fn() } };
});

const WB = 'wb-bench';

const seed = (): Warband => ({
  id: WB,
  name: 'The Overstrength',
  factionId: 'new-antioch',
  ducatLimit: 700,
  treasuryDucats: 0,
  gloryPoints: 0,
  armoryStash: [],
  units: [
    { id: 'u1', customName: 'Anselm', totalCost: 100, isDead: false, profileSnapshot: { name: 'Pilgrim' }, injuries: [], xp: 0 },
    { id: 'u2', customName: 'Mercy', totalCost: 80, isDead: false, profileSnapshot: { name: 'Pilgrim' }, injuries: [], xp: 0 },
  ],
  snapshots: [],
} as unknown as Warband);

const warband = () => useStore.getState().warbands.find((w) => w.id === WB)!;
const unit = (id: string) => warband().units.find((u) => u.id === id)!;

beforeEach(() => {
  useStore.setState({ warbands: [seed()], activeWarbandId: WB });
});

describe('benching a model', () => {
  it('marks it without removing it from the Roster', () => {
    /*
      The Roster is what you OWN and it has no cap. Removing the model would
      be the wrong instruction entirely — the player is entitled to it, and
      will field it next game when the Threshold has risen.
    */
    useStore.getState().setUnitBenched(WB, 'u2', true);
    expect(warband().units).toHaveLength(2);
    expect(unit('u2').benched).toBe(true);
    expect(unit('u1').benched).toBeUndefined();
  });

  it('brings it back', () => {
    useStore.getState().setUnitBenched(WB, 'u2', true);
    useStore.getState().setUnitBenched(WB, 'u2', false);
    expect(unit('u2').benched).toBeUndefined();
  });

  it('leaves no false flag behind, so a file cannot tell the two apart', () => {
    /*
      Omitted rather than stored `false`. An un-benched model must look in a
      roster file exactly like one that was never benched, or every roster
      grows a field per model that says nothing.
    */
    useStore.getState().setUnitBenched(WB, 'u1', true);
    useStore.getState().setUnitBenched(WB, 'u1', false);
    expect('benched' in unit('u1')).toBe(false);
  });

  it('touches nobody else', () => {
    useStore.getState().setUnitBenched(WB, 'u1', true);
    expect(unit('u2').benched).toBeUndefined();
    expect(unit('u1').totalCost).toBe(100);
    expect(unit('u1').customName).toBe('Anselm');
  });
});
