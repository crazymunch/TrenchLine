import { describe, it, expect } from 'vitest';
import { importNewRecruitRoster } from '../newRecruitImporter';
import type { UnitProfile } from '../../types/rules';

const KNOWN: UnitProfile[] = [{
  id: 'u-kavass',
  name: 'Kavass',
  factionId: 'iron-sultanate',
  category: 'Trooper',
  baseCost: 30,
  stats: { movement: '6"/Infantry', ranged: '+0 DICE', melee: '-1 DICE', armour: '0', keywords: [] },
  innateAbilities: [],
} as UnitProfile];

const xml = (names: string[]) => `<roster name="Test"><forces><force><selections>${
  names.map((n) => `<selection name="${n}" type="model"></selection>`).join('')
}</selections></force></forces></roster>`;

/**
 * The import must never invent a profile.
 *
 * It used to: a roster line the catalogues had no entry for became a Trooper
 * costing 35 Ducats with the statline `6" / +0 DICE / +1 DICE / -1`, numbers
 * that came from nowhere. The import always appeared to succeed, and the
 * player's roster total was wrong from that line on — the same failure as the
 * fabricated GitHub commit deleted in Phase 0.
 */
describe('importNewRecruitRoster', () => {
  it('imports a line it can match', () => {
    const { warband, unmatched } = importNewRecruitRoster(xml(['Kavass']), KNOWN);
    expect(warband.units).toHaveLength(1);
    expect(warband.units[0].profileSnapshot.name).toBe('Kavass');
    expect(unmatched).toEqual([]);
  });

  it('reports a line it cannot match, and does not invent one', () => {
    const { warband, unmatched } = importNewRecruitRoster(
      xml(['Kavass', 'Grand Vizier of Nowhere']), KNOWN);

    expect(unmatched).toEqual(['Grand Vizier of Nowhere']);
    expect(warband.units).toHaveLength(1);
    expect(warband.units.map((u) => u.profileSnapshot.name))
      .not.toContain('Grand Vizier of Nowhere');
  });

  it('never produces the invented 35-Ducat Trooper', () => {
    // The exact shape of the old fallback. If any of this comes back, the
    // import is guessing again.
    const { warband } = importNewRecruitRoster(xml(['Something Unknown']), KNOWN);
    for (const u of warband.units) {
      expect(u.profileSnapshot.baseCost).not.toBe(35);
      expect(u.profileSnapshot.stats.melee).not.toBe('+1 DICE');
    }
    expect(warband.units).toHaveLength(0);
  });

  it('leaves the roster total honest when a line is dropped', () => {
    // The point of not inventing: a total that omits an entry is visibly
    // short, and a total padded with a guessed cost is invisibly wrong.
    const { warband } = importNewRecruitRoster(xml(['Kavass', 'Unknown A', 'Unknown B']), KNOWN);
    const total = warband.units.reduce((n, u) => n + u.totalCost, 0);
    expect(warband.units).toHaveLength(1);
    expect(total).toBe(warband.units[0].totalCost);
  });

  it('reads a plaintext roster without guessing either', () => {
    const { warband, unmatched } = importNewRecruitRoster(
      'Warband: Test\nKavass\nNot A Real Unit', KNOWN);
    expect(warband.units.map((u) => u.profileSnapshot.name)).toEqual(['Kavass']);
    // The text parser creates nothing for a line it cannot resolve, so there
    // is nothing to report — it never had the invented-profile fallback.
    expect(unmatched).toEqual([]);
  });
});
