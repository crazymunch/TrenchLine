import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { recruitable } from '../recruitable';
import type { Dataset } from '@/types/catalogue';

/**
 * A Variant that replaces an entry shows the replacement IN ITS PLACE.
 *
 * The Knights of Saint Lazarus is the case the book states most plainly:
 *
 *   Sacred Code:    …it cannot include Lazarist Communicants or Lazarist
 *                   Castigators…
 *   Knightly Order: A Knights of Saint Lazarus Warband must include 1-3
 *                   Leper-Knights. The Leper-Knights use the Lazarist
 *                   Castigator Warband entry…
 *
 * Read naively those contradict: the first bans the entry the second requires.
 * They do not. The entry has not been forbidden, it has been RENAMED — you
 * cannot field a Castigator as a Castigator, and in this Warband that entry is
 * the Leper-Knight. Applying the ban before the rename produces a Warband that
 * cannot take the model the book says it must have 1-3 of, which is exactly
 * what the app did.
 */
const d = DATASET as unknown as Dataset;
const F = 'procession-of-the-sacred-affliction';

const list = (variantId?: string) =>
  recruitable(d, F, [F], variantId).units
    .filter((u) => String(u.factionId).toLowerCase().includes('procession'));

const names = (variantId?: string) => list(variantId).map((u) => u.name);

describe('the Knights of Saint Lazarus recruit list', () => {
  it('offers a Leper-Knight', () => {
    expect(names('Knights of Saint Lazarus')).toContain('Leper-Knight');
  });

  it('offers it in the Castigator’s place, not beside it', () => {
    const n = names('Knights of Saint Lazarus');
    expect(n).not.toContain('Lazarist Castigator');
    // One row, not two: the Leper-Knight IS that entry.
    expect(n.filter((x) => x === 'Leper-Knight')).toHaveLength(1);
  });

  it('lets the Warband take the 1-3 the book requires', () => {
    const knight = list('Knights of Saint Lazarus').find((u) => u.name === 'Leper-Knight');
    expect(knight?.maxCount, 'still capped at the Castigator’s own limit of 1').toBe(3);
  });

  it('does not offer the Lazarist Communicant its Sacred Code forbids', () => {
    expect(names('Knights of Saint Lazarus')).not.toContain('Lazarist Communicant');
  });

  /*
    The control. Without the Variant the standard Procession list is unchanged
    — a rename that leaked into every list would pass the assertions above and
    be a worse bug than the one being fixed.
  */
  it('leaves the standard Procession list alone', () => {
    const n = names();
    expect(n).toContain('Lazarist Castigator');
    expect(n).toContain('Lazarist Communicant');
    expect(n).not.toContain('Leper-Knight');
  });
});

describe('the other Carcass Front Variants', () => {
  it('Procession of the Blessed Flock bans what it bans and caps what it caps', () => {
    const n = names('Procession of the Blessed Flock');
    expect(n).not.toContain('Anchorite Shrine');
    expect(n).not.toContain('Leper-Pilgrim');
    // "may include 1-3 Lazarist Castigators and 1-6 Lazarist Communicants"
    const cast = list('Procession of the Blessed Flock').find((u) => u.name === 'Lazarist Castigator');
    expect(cast?.maxCount).toBe(3);
  });

  it('the Drowned Choir bans the Heretic Captain the book names', () => {
    const raiders = recruitable(d, 'heretic-naval-raiders', ['heretic-naval-raiders'], 'Drowned Choir')
      .units.filter((u) => String(u.factionId).toLowerCase().includes('naval'))
      .map((u) => u.name);
    // "cannot include any of the following models: Heretic Captain, Abyssal
    // Commando, Sea Hag, Anointed Heretic Raiders."
    for (const banned of ['Heretic Captain', 'Abyssal Commando', 'Sea Hag']) {
      expect(raiders, `${banned} is still offered`).not.toContain(banned);
    }
    expect(raiders).toContain('Drowned Chorister');
  });
});

/*
  The same mechanism, from the other source. The Knights of Saint Lazarus'
  rename is derived from a supplement's PROSE; the House of Wisdom's comes from
  a BattleScribe modifier. Both end up as the same op, and the recruit list
  should not be able to tell them apart.
*/
describe('a rename that came from the catalogues rather than the books', () => {
  const sultanate = (variantId?: string) =>
    recruitable(d, 'iron-sultanate', ['iron-sultanate'], variantId).units
      .filter((u) => String(u.factionId).toLowerCase().includes('sultanate'))
      .map((u) => u.name);

  it('The House of Wisdom fields Fāris, not Janissaries', () => {
    const n = sultanate('The House of Wisdom');
    expect(n).toContain('Fāris');
    expect(n).not.toContain('Janissary');
  });

  it('and the standard Iron Sultanate list still has its Janissary', () => {
    expect(sultanate()).toContain('Janissary');
  });
});
