import { describe, it, expect } from 'vitest';
import { parseCarcassFrontExploration, RESOURCES } from '../parse-cf-exploration.mjs';

/**
 * Every assertion is a row printed in the Carcass Front book, pp. 91-95.
 */
const tables = parseCarcassFrontExploration();
const rows = (r) => tables[r].locations;
const at = (r, n) => rows(r).find((l) => l.roll.from <= n && (l.roll.to === null || n <= l.roll.to));

describe('the four Resource tables', () => {
  it('reads one table per Resource, with the glyph the Campaign Tracker prints', () => {
    expect(Object.keys(tables)).toEqual(RESOURCES);
    expect(tables.favour.glyph).toBe('👁');
    expect(tables.relic.glyph).toBe('🏺');
    expect(tables.supplies.glyph).toBe('📦');
    expect(tables.territories.glyph).toBe('🌍');
  });

  it('reads all 51 Locations', () => {
    // Not equal lengths: Favour prints `6-9` where the others print `6-8` and
    // `9-11`, so it has twelve rows and the rest have thirteen.
    expect(rows('favour')).toHaveLength(12);
    expect(rows('relic')).toHaveLength(13);
    expect(rows('supplies')).toHaveLength(13);
    expect(rows('territories')).toHaveLength(13);
  });
});

/*
  The check that matters, and the one that caught the bug below.

  "A Location is discovered if the Exploration Roll corresponds to any number
  in the range" — so every roll from 1 upwards must land on exactly one row. A
  gap is a roll that silently finds nothing on a table where the book says
  something is always found, and that reads as bad luck rather than as a bug.
*/
describe('contiguity', () => {
  it('covers every roll from 1 upwards, once, on every table', () => {
    for (const r of RESOURCES) {
      for (let n = 1; n <= 60; n++) {
        const hits = rows(r).filter((l) => l.roll.from <= n && (l.roll.to === null || n <= l.roll.to));
        expect(hits.length, `${r} on a roll of ${n}`).toBe(1);
      }
    }
  });

  it('ends every table on an open range, because the dice pool grows all campaign', () => {
    for (const r of RESOURCES) {
      const last = rows(r)[rows(r).length - 1];
      expect(last.roll, r).toEqual({ from: 34, to: null });
    }
    expect(at('favour', 99).name).toBe('Chosen Blessing');
    expect(at('territories', 99).name).toBe('The Knife of God');
  });
});

/*
  `cf-prose`'s shared `CHART_ROW` was written for the Random Scenario
  Generator's charts, and matches a single number or a closed band only. All
  four `34+` rows failed it and were read as wrapped continuations of the row
  above — so each table stopped at 33, and `Patron's Visit` carried `Chosen
  Blessing`'s rules on the end of its own. Nothing about the output looked
  wrong; the contiguity check is what said so.
*/
describe('the open-ended last row', () => {
  it('is its own row, not the tail of the one above it', () => {
    const visit = at('favour', 31);
    expect(visit.name).toBe('Patron’s Visit');
    expect(visit.description).not.toMatch(/Chosen Blessing/);
    expect(visit.description).toBe(
      'Your Patron or their representative makes a surprise visit to your '
      + 'Warband. If you wish, you can immediately exchange up to 10 ☼ for an '
      + 'equal number of 🏅.');
  });

  it('reads the last row’s own rules', () => {
    expect(at('favour', 34).description).toMatch(
      /Pick the model with the most Experience in your Warband/);
  });
});

describe('a Location’s rules', () => {
  it('keeps the reward amounts and their glyphs', () => {
    expect(at('supplies', 1).name).toBe('Pillaged');
    expect(at('territories', 30).description).toMatch(/you gain\s+10 🏅/);
    expect(at('relic', 1).description).toMatch(/lose 20 👑\s+from your Strongbox/);
  });

  it('keeps a row’s printed options rather than cutting the row short', () => {
    const shrine = at('favour', 4);
    expect(shrine.name).toBe('Trench Shrine');
    expect(shrine.description).toMatch(/Choose one of the following options:/);
    expect(shrine.description).toMatch(/Standard: Add a Troop Flag/);
    expect(shrine.description).toMatch(/Shrine: Add a Field Shrine/);
    expect(shrine.description).toMatch(/Return: Your Warband gains \+2 ☼\.$/);
  });

  it('carries no heading from the table printed after it', () => {
    for (const r of RESOURCES) {
      for (const l of rows(r)) {
        expect(l.description, `${r}/${l.name}`).not.toMatch(/EXPLORATION TABLE/);
        expect(l.name, `${r}/${l.name}`).not.toMatch(/EXPLORATION TABLE/);
      }
    }
  });

  it('rejoins a word the column broke, and leaves a real hyphen alone', () => {
    expect(at('territories', 23).name).toBe('High-Ranking Captive');
    expect(at('territories', 34).description).toMatch(/a smaller re-creation of the Sword of God/);
  });
});
