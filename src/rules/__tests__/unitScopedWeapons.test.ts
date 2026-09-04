import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import type { Dataset } from '@/types/catalogue';

/**
 * A weapon defined on a unit entry is still a weapon.
 *
 * The Mamluk Faris carries its Alchemical Jezzail as a Weapon profile on its
 * own selectionEntry rather than as an armoury entry of its own. The parser
 * emitted the unit and returned, so every such profile was dropped — and a
 * roster holding one matched nothing and was reported as "not in this
 * ruleset", which excludes the item from every legality check while telling
 * the player their list is only provisional.
 */
const d = DATASET as unknown as Dataset;
const named = (n: string) => d.weapons.filter((w) => w.name === n);

describe('weapons defined on a unit entry', () => {
  it('reaches the dataset', () => {
    expect(named('Alchemical Jezzail')).toHaveLength(1);
  });

  it('carries the profile the catalogue states, not a placeholder', () => {
    const [w] = named('Alchemical Jezzail');
    expect(w.type).toBe('2-Handed');
    expect(w.range).toBe('18"');
    expect(w.keywords).toEqual(expect.arrayContaining(['ASSAULT']));
  });

  /*
    The control. Emitting these must not disturb the entries that already
    worked, and must not turn a unit into a weapon.
  */
  it('leaves ordinary armoury weapons alone', () => {
    expect(named('Siege Jezzail')).toHaveLength(1);
    expect(named('Jezzail')).toHaveLength(1);
  });

  it('and does not emit the model itself as wargear', () => {
    expect(named('Mamluk Faris')).toHaveLength(0);
    expect(d.units.some((u) => u.name === 'Mamluk Faris')).toBe(true);
  });
});
