/**
 * The two battle marker pools.
 *
 * Play Mode capped BLOOD MARKERS with a literal `Math.min(6, …)` in the store,
 * under a comment reading "Official Rulebook Cap", and had no BLESSING MARKERS
 * at all — a number and an absence, each decided by a person reading a book
 * rather than by the pipeline reading it.
 *
 * They are not mirror images, and this is what the book says:
 *
 *   BLOOD     "A model cannot have more than 6 BLOOD MARKERS at any one time."
 *             "your opponent may choose to spend one or more BLOOD MARKERS"
 *   BLESSING   no cap is stated
 *             "you may choose to spend one or more BLESSING MARKERS"
 */
import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import type { Dataset } from '@/types/catalogue';

const d = DATASET as unknown as Dataset;
const marker = (id: string) => (d.markers ?? []).find((m) => m.id === id)!;

describe('the marker pools, as the rulebook states them', () => {
  it('reads both pools out of the book', () => {
    expect((d.markers ?? []).map((m) => m.name).sort())
      .toEqual(['BLESSING MARKERS', 'BLOOD MARKERS']);
  });

  it('caps Blood at the printed six', () => {
    expect(marker('blood-markers').cap).toBe(6);
  });

  it('gives Blessing no cap, because the book prints none', () => {
    /*
      `null`, not a large number and not six. A model that has been blessed
      seven times is a legal board state; the book limits only Blood.
    */
    expect(marker('blessing-markers').cap).toBeNull();
  });

  it('records who spends each, which is where the two differ', () => {
    expect(marker('blood-markers').spentBy).toBe('opponent');
    expect(marker('blessing-markers').spentBy).toBe('controller');
  });

  it('quotes the published section rather than paraphrasing it', () => {
    expect(marker('blood-markers').rules).toMatch(/cannot have more than 6 BLOOD MARKERS/);
    expect(marker('blessing-markers').rules).toMatch(/add \+1 DICE/);
    // And says nothing about a cap, which is what makes `cap: null` a reading.
    expect(marker('blessing-markers').rules).not.toMatch(/cannot have more than/);
  });
});
