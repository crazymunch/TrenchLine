import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { toRoster } from '../fromWarband';
import { validateRoster } from '../validate';
import type { Warband } from '@/types/warband';
import type { Dataset } from '@/types/catalogue';

/**
 * A House of Wisdom warband, reported as illegal because the cloud lost its
 * Variant.
 *
 * The book states both rules this covers:
 *
 *   Alchemists: A House of Wisdom Warband must include 1-2 Jabirean Alchemists.
 *   Private Venture: A House of Wisdom Warband cannot include a Yüzbaşı,
 *   Janissaries, or Sultanate Assassins.
 *
 * The engine already had both — `variantLimits` raises the Alchemist's max to
 * 2 and `variantForbids` hides the Yüzbaşı — and neither ran, because
 * `POST /api/warbands` never persisted `variantId`. A sync round trip dropped
 * it, the roster came back with no Variant, and it was then validated against
 * the Iron Sultanate's standard list.
 */
const d = DATASET as unknown as Dataset;

const model = (profileName: string, customName: string) => ({
  id: `u-${customName}`,
  customName,
  profileSnapshot: { name: profileName },
  equippedWeapons: [], equippedArmour: [], equippedEquipment: [],
  xp: 0, advancements: [], injuries: [], isDead: false, totalCost: 0,
});

const warband = (variantId: string | undefined): Warband => ({
  id: 'w1',
  name: 'Al-Qarn Rihla',
  factionId: 'iron-sultanate',
  variantId,
  ducatLimit: 1320,
  units: [
    model('Jabirean Alchemist', 'Kasim bin Malik'),
    model('Jabirean Alchemist', 'Zayd bin Tariq al-Nahas'),
    model('Kavass', 'Nasir'),
  ],
} as unknown as Warband);

const codesFor = (variantId: string | undefined) => {
  const { roster } = toRoster(warband(variantId), d);
  return validateRoster(roster, d).violations.map((v) => v.code);
};

describe('a House of Wisdom warband', () => {
  it('may field two Jabirean Alchemists', () => {
    expect(codesFor('The House of Wisdom')).not.toContain('unit-max');
  });

  it('is not told to include the Yüzbaşı its Variant forbids', () => {
    expect(codesFor('The House of Wisdom')).not.toContain('unit-min');
  });

  it('is matched by the Variant id as well as its printed name', () => {
    expect(codesFor('houseofwisdom')).not.toContain('unit-max');
    expect(codesFor('houseofwisdom')).not.toContain('unit-min');
  });

  /*
    The bug, stated as a test. With the Variant lost — which is what a sync
    used to do to it — both errors come back. This is the state the user's
    roster was in, and it is what the fix in `api/warbands/route.ts` prevents.
  */
  it('reports both errors when the Variant is missing, which is why losing it mattered', () => {
    const codes = codesFor(undefined);
    expect(codes).toContain('unit-max');
    expect(codes).toContain('unit-min');
  });
});
