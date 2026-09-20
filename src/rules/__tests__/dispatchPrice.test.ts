/**
 * The Dispatch's Incendiary Grenades price, as the app actually charges it.
 *
 * DA-07 / FD-02, against the shipped dataset rather than a fixture — because
 * the whole defect was that the layer engine reported success while the price
 * a player pays never moved.
 *
 * The Dispatch (p.2): *"Change the Cost of Incendiary Grenades to 10 in the
 * following Armoury Tables: New Antioch, Trench Pilgrims, Iron Sultanate,
 * Heretic Legions, The Court"*. Five tables, named. `priceOf` reads the
 * armoury ROW, and every row said 15 while one weapon profile said 10.
 */
import { describe, it, expect } from 'vitest';

import { DATASET } from '@/data/generated/trenchline.generated';
import { armouryFor, priceOf } from '../armoury';

/** The five the Dispatch names. */
const CHANGED = [
  'new-antioch',
  'trench-pilgrims',
  'iron-sultanate',
  'heretic-legions',
  'court-of-the-seven-headed-serpent',
];

/** Stocks it, and is not named, so it keeps the catalogue price. */
const UNCHANGED = [
  'procession-of-the-sacred-affliction',
  'heretic-naval-raiders',
];

const ducats = (factionId: string) => {
  const armoury = armouryFor(DATASET, factionId);
  expect(armoury, `no armoury for ${factionId}`).toBeTruthy();
  return priceOf(armoury!, { name: 'Incendiary Grenades' } as never)?.ducats;
};

describe('the five Armoury Tables the Dispatch names', () => {
  it('each charges 10', () => {
    for (const factionId of CHANGED) {
      expect(ducats(factionId), factionId).toBe(10);
    }
  });

  it('says the price came from the layer, not the catalogue', () => {
    /*
      Armoury rows carry no provenance of their own — `findMissingProvenance`
      does not walk them — so without this the audit reads a row at 10 against
      a catalogue at 15 and reports drift.
    */
    for (const factionId of CHANGED) {
      const row = (armouryFor(DATASET, factionId)?.rows ?? [])
        .find((r) => r.name === 'Incendiary Grenades') as { source?: string } | undefined;
      expect(row?.source, factionId).toBe('dispatch-01');
    }
  });
});

describe('the tables it does not name', () => {
  it('keep the catalogue price of 15', () => {
    /*
      The half that makes this a faction-scoped change rather than a global
      one. Both of these stock Incendiary Grenades and are absent from the
      Dispatch's list.
    */
    for (const factionId of UNCHANGED) {
      expect(ducats(factionId), factionId).toBe(15);
    }
  });
});

describe('the weapon profile agrees with the row', () => {
  it('carries 10 wherever it is scoped to a named faction', () => {
    /*
      The second price authority. Four readers add `weapon.cost` directly
      rather than calling `priceOf`, so a profile that disagrees with its row
      is the "which screen asked?" half of this finding. Those readers should
      become `priceOf` calls; that is its own change, and until then the two
      numbers at least match.

      Only one profile is faction-scoped — most share a generic entry — so
      this asserts agreement where a scope exists rather than a count.
    */
    const scoped = (DATASET.weapons ?? []).filter((w) =>
      w.name === 'Incendiary Grenades'
      && CHANGED.some((f) => f === String((w as { factionId?: string }).factionId ?? '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-')));

    expect(scoped.length).toBeGreaterThan(0);
    for (const w of scoped) {
      expect(w.cost?.ducats, String((w as { factionId?: string }).factionId)).toBe(10);
    }
  });
});
