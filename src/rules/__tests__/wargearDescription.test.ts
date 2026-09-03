import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { recruitable } from '../recruitable';
import type { Dataset } from '@/types/catalogue';

/**
 * Wargear from a supplement carries its description on the catalogue entry.
 *
 * The same shape as the Battlekit fix: `b` is the core rulebook's Battlekit
 * chapter, and an item published in a supplement has no entry there at all. The
 * `effect` field was taught to fall back to the catalogue profile; `description`
 * was not, so every Carcass Front item rendered with its name, cost, keywords
 * and modifier, and a blank where the prose should be.
 *
 * Holy Icon Armour and Ragged Vestments sat beside Trench Shield and Reinforced
 * Armour — which the rulebook chapter does carry — with nothing under them.
 */
const d = DATASET as unknown as Dataset;
const kit = (factionId: string) => recruitable(d, factionId, [factionId]);

describe('a supplement item’s description', () => {
  const armour = () => kit('procession-of-the-sacred-affliction').armour;
  const named = (n: string) => armour().find((a) => a.name === n);

  it('comes through for Holy Icon Armour', () => {
    expect(named('Holy Icon Armour')?.description)
      .toMatch(/blessed icons and scripture text/);
  });

  it('comes through for Ragged Vestments', () => {
    expect(named('Ragged Vestments')?.description)
      .toMatch(/ragged clothes of penitents/);
  });

  /*
    The control. Core wargear takes its description from the rulebook's
    Battlekit chapter, and must keep doing so — the catalogue's own text for
    these is empty, so a fallback that overrode rather than filled in would
    blank the items that already worked.
  */
  it('and the rulebook’s own text still wins for core wargear', () => {
    expect(named('Trench Shield')?.description).toMatch(/orichalcum/);
    expect(named('Reinforced Armour')?.description).toMatch(/master-crafted/);
  });

  it('is never invented for an item neither source describes', () => {
    // Absent stays absent. A plausible sentence here would be indistinguishable
    // from a real one on the card.
    for (const a of armour()) {
      if (a.description !== undefined) expect(a.description.length).toBeGreaterThan(0);
    }
  });
});
