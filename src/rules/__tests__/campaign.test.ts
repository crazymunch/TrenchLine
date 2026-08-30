/**
 * The campaign economy.
 *
 * These numbers persist and compound: a wrong Threshold means a player fields an
 * illegal Force, and a wrong Strongbox is carried for the rest of the campaign
 * and spent from. So the table is tested against the real dataset, not a
 * fixture — a parser change that silently emptied it would otherwise look like
 * "no limit" rather than like a failure.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import {
  forceLimits, startingBudget, reinforcementAllowance,
  strongboxOf, reversible, type LedgerEntry,
} from '../campaign';
import { checkForceLimits } from '../validate';

describe('the Warband Threshold Table', () => {
  it('is derived from the rulebook, not typed in', () => {
    const rows = DATASET.campaign.thresholds;
    expect(rows.length).toBeGreaterThanOrEqual(12);
    // The published values. If the parser drifts, these are what it broke.
    expect(rows[0]).toEqual({ game: 1, threshold: 700, fieldStrength: 10 });
    expect(rows[3]).toEqual({ game: 4, threshold: 1000, fieldStrength: 13 });
    expect(rows[11]).toEqual({ game: 12, threshold: 1800, fieldStrength: 22 });
  });

  it('ascends without gaps', () => {
    const rows = DATASET.campaign.thresholds;
    rows.forEach((r, i) => {
      expect(r.game).toBe(i + 1);
      if (i) {
        expect(r.threshold).toBeGreaterThan(rows[i - 1].threshold);
        expect(r.fieldStrength).toBeGreaterThanOrEqual(rows[i - 1].fieldStrength);
      }
    });
  });

  it('starts every warband on the book’s 700 Ducats', () => {
    expect(startingBudget(DATASET)).toBe(700);
  });
});

describe('forceLimits', () => {
  it('gives the published row for a published game', () => {
    expect(forceLimits(DATASET, 1)).toMatchObject({ threshold: 700, fieldStrength: 10, extrapolated: false });
    expect(forceLimits(DATASET, 4)).toMatchObject({ threshold: 1000, fieldStrength: 13 });
  });

  it('holds at the last row past game 12, and says so', () => {
    // The book stops at 12 and gives no rule beyond it. Extrapolating +100
    // would be inventing game data; holding and flagging lets the UI offer the
    // campaign its own override instead.
    const l = forceLimits(DATASET, 20)!;
    expect(l.threshold).toBe(1800);
    expect(l.fieldStrength).toBe(22);
    expect(l.extrapolated).toBe(true);
  });

  it('treats a nonsense game number as game 1 rather than failing open', () => {
    // The dangerous direction is a missing limit reading as "unlimited".
    expect(forceLimits(DATASET, 0)?.threshold).toBe(700);
    expect(forceLimits(DATASET, -3)?.threshold).toBe(700);
    expect(forceLimits(DATASET, NaN)?.threshold).toBe(700);
  });
});

describe('reinforcementAllowance', () => {
  it('is the Threshold of the next game minus the warband’s total cost', () => {
    // The book's own worked example: total 635, next Threshold 1,000 -> 365.
    expect(reinforcementAllowance(DATASET, 4, 635)).toBe(365);
  });

  it('never goes negative when the warband already exceeds the Threshold', () => {
    expect(reinforcementAllowance(DATASET, 1, 900)).toBe(0);
  });
});

describe('the ledger', () => {
  const e = (p: Partial<LedgerEntry>): LedgerEntry => ({
    id: Math.random().toString(36).slice(2), at: '2026-01-01T00:00:00Z',
    reason: 'quartermaster', ducats: 0, glory: 0, ...p,
  });

  it('is the Strongbox, rather than a stored total', () => {
    const ledger = [
      e({ reason: 'founding', ducats: 700, game: 1 }),
      e({ reason: 'quartermaster', ducats: -635, game: 1 }),
      e({ reason: 'exploration', ducats: 120, game: 2 }),
    ];
    expect(strongboxOf(ledger)).toEqual({ ducats: 185, glory: 0 });
  });

  it('tracks Ducats and Glory apart', () => {
    const ledger = [e({ ducats: 100, glory: 3 }), e({ ducats: -40, glory: -1 })];
    expect(strongboxOf(ledger)).toEqual({ ducats: 60, glory: 2 });
  });

  it('is empty rather than throwing for a warband with no history', () => {
    expect(strongboxOf([])).toEqual({ ducats: 0, glory: 0 });
    expect(strongboxOf(undefined as unknown as LedgerEntry[])).toEqual({ ducats: 0, glory: 0 });
  });

  it('lets a player reverse this game’s purchases but not last game’s', () => {
    const ledger = [
      e({ reason: 'quartermaster', ducats: -50, game: 2 }),
      e({ reason: 'quartermaster', ducats: -30, game: 3 }),
    ];
    const r = reversible(ledger, 3);
    expect(r).toHaveLength(1);
    expect(r[0].ducats).toBe(-30);
  });

  it('never lets a player reverse an admin entry', () => {
    // A catch-up allotment is the group's decision, recorded by whoever runs the
    // campaign. A player undoing it would be editing their own budget, which is
    // the thing the campaign mode exists to prevent.
    const ledger = [
      e({ reason: 'admin-grant', ducats: 300, game: 3, byName: 'Nick' }),
      e({ reason: 'admin-adjust', ducats: -10, game: 3, byName: 'Nick' }),
      e({ reason: 'quartermaster', ducats: -30, game: 3 }),
    ];
    const r = reversible(ledger, 3);
    expect(r).toHaveLength(1);
    expect(r[0].reason).toBe('quartermaster');
  });
});

describe('checkForceLimits', () => {
  const at = (game: number) => forceLimits(DATASET, game)!;

  it('passes a Force inside both caps', () => {
    expect(checkForceLimits(680, 9, at(1))).toEqual([]);
  });

  it('says how much has to sit out, and never calls the roster illegal', () => {
    // The roster is allowed to exceed the Threshold; the Force is not. So this
    // is a warning that names the surplus, not an error telling a player to
    // delete a model they are entitled to own.
    const v = checkForceLimits(820, 9, at(1));
    expect(v).toHaveLength(1);
    expect(v[0].code).toBe('force-over-threshold');
    expect(v[0].severity).toBe('warning');
    expect(v[0].message).toContain('120 Ducats');
  });

  it('counts models against Field Strength separately from cost', () => {
    const v = checkForceLimits(600, 13, at(1));
    expect(v.map((x) => x.code)).toEqual(['force-over-field-strength']);
    expect(v[0].message).toContain('3 must sit');
  });

  it('reports both when both are exceeded', () => {
    const v = checkForceLimits(900, 14, at(1));
    expect(v.map((x) => x.code).sort())
      .toEqual(['force-over-field-strength', 'force-over-threshold']);
  });

  it('says the table ran out rather than pretending game 20 is published', () => {
    const v = checkForceLimits(2000, 9, at(20));
    expect(v[0].rule).toContain('stops at game 12');
  });

  it('cites Field Strength’s two exclusions, which are easy to get wrong', () => {
    const v = checkForceLimits(600, 13, at(1));
    expect(v[0].rule).toContain('Battlekit and Glory Items do not count');
    expect(v[0].rule).toContain('scenario limit');
  });
});
