import { describe, it, expect } from 'vitest';
import DATASET from '@/data/generated/trenchline.generated';
import { recruitable } from '../recruitable';
import type { Dataset } from '@/types/catalogue';

/**
 * Wargear published in a supplement keeps its rules text.
 *
 * `recruitable` reads an Equipment row's rules from `dataset.battlekit` — the
 * rulebook's Battlekit chapter. An item that appears only in a supplement has
 * no entry there and carries its rules on the catalogue profile instead, so
 * every piece of Carcass Front wargear rendered with a name, a cost, its
 * keywords, and a blank where the rule should be.
 */
const d = DATASET as unknown as Dataset;

const equipmentOf = (factionId: string) =>
  new Map(recruitable(d, factionId, [factionId]).equipment.map((e) => [e.name, e.effect ?? '']));

describe('Carcass Front wargear', () => {
  const kit = equipmentOf('procession-of-the-sacred-affliction');

  it('carries the rule that is the whole of what the item does', () => {
    expect(kit.get('Bells of Warding')).toMatch(/Gathering Call/);
    expect(kit.get('Blessed Millstone')).toMatch(/Weighted with Sin/);
    expect(kit.get('Field Shrine')).toMatch(/Site of Worship/);
  });

  it('leaves no Equipment row with an empty body', () => {
    const blank = [...kit.entries()].filter(([, effect]) => !effect.trim()).map(([name]) => name);
    expect(blank, 'these render as a name over a gap').toEqual([]);
  });

  /*
    The control. The rulebook's own kit is described by the Battlekit chapter
    and must keep reading from there — a fix that preferred the catalogue
    profile everywhere would quietly reword the published items.
  */
  it('does not disturb the rulebook items, which the Battlekit chapter describes', () => {
    const antioch = equipmentOf('new-antioch');
    expect(antioch.get('Gas Mask')).toMatch(/NEGATE GAS/);
    expect(antioch.get('Medi-kit')).toMatch(/Treat ACTION/);
  });
});
