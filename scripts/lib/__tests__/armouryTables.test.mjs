/**
 * The Armoury Tables, including the rows the PDF wraps.
 *
 * Three tables in the book were truncated in the shipped dataset and nothing
 * said so. New Antioch stocked no Shields at all and one of the four rows of
 * its Armour table; the Cult of the Black Grail stocked one of the seven rows
 * of its Equipment table. Machine Armour, Reinforced Armour, Standard Armour,
 * Trench Shield and Heavy Ballistic Shield were all absent from a faction the
 * book prints them under.
 *
 * The mechanism was one line. A row long enough to wrap loses its tabs, so
 * its continuation looks like the prose that follows a table —
 *
 *     • Machine Armour ELITE & Mechanized Heavy Infantry only, Limit: 1
 *     excluding Mechanized Heavy Infantry 50 👑
 *
 * — and the parser ended the table on it, skipping every properly-tabbed row
 * below. Standard Armour, which has no restrictions and wraps nothing, was
 * lost to a wrap two lines above it.
 *
 * These tests pin both halves: that a wrapped row no longer ends its table,
 * and that its columns are split where the book says they split rather than
 * where a regex guesses. The survey at the end is the one that would catch a
 * future edition truncating a different table — a count that drops is a table
 * that stopped being stocked.
 */
import { describe, it, expect, afterAll } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { parseArmouryTables } from '../parse-warbands.mjs';

const BOOK = 'data-sources/rulebook/extracted/warbands-of-trench-crusade.txt';
const hasBook = fs.existsSync(BOOK);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'armoury-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

let n = 0;
/** Write a fixture and parse it, so a test can state the exact lines it means. */
const parse = (text) => {
  const file = path.join(tmp, `book-${n++}.txt`);
  fs.writeFileSync(file, text, 'utf8');
  return parseArmouryTables(file);
};

/**
 * The shape every fixture needs: the sentence that names the faction, and the
 * Battlekit heading that a bulleted row is recoverable from.
 */
const book = (...body) => [
  'New Antioch Warbands can have the following Battlekit. Battlekit with a bullet',
  'point [•] is unique to New Antioch Warbands, and its rules can be found in the',
  'New Antioch Battlekit section after the Armoury.',
  ...body,
].join('\n');

const HEADINGS = [
  'Machine Armour | 50 👑  | ELITE & Mechanized Heavy Infantry only, Limit:',
  '1 excluding Mechanized Heavy Infantry',
  'Heavy Ballistic Shield | 15 👑  | Models wearing Machine Armour',
  'only, Shield Combo',
];

describe('a row the PDF wrapped', () => {
  it('does not end the table it is in', () => {
    const { rows } = parse(book(
      'Armour',
      'Engineer Body Armour \t Combat Engineer only \t 45 👑 ',
      '• Machine Armour ELITE & Mechanized Heavy Infantry only,',
      'Limit: 1 excluding Mechanized Heavy Infantry 50 👑 ',
      '• Reinforced Armour \t ELITE & Mechanized Heavy Infantry only \t 40 👑 ',
      'Standard Armour \t 15 👑 ',
      ...HEADINGS,
    ));

    expect(rows.map((r) => r.name)).toEqual([
      'Engineer Body Armour', 'Machine Armour', 'Reinforced Armour', 'Standard Armour',
    ]);
  });

  it('splits name from restrictions where the Battlekit heading says they split', () => {
    const { rows } = parse(book(
      'Armour',
      '• Machine Armour ELITE & Mechanized Heavy Infantry only,',
      'Limit: 1 excluding Mechanized Heavy Infantry 50 👑 ',
      ...HEADINGS,
    ));

    expect(rows[0]).toMatchObject({
      name: 'Machine Armour',
      section: 'Armour',
      faction: 'New Antioch',
      restrictions: 'ELITE & Mechanized Heavy Infantry only, Limit: 1 excluding Mechanized Heavy Infantry',
      ducats: 50,
      glory: 0,
    });
  });

  it('reads a name that would otherwise look like a restriction', () => {
    // "Models wearing Machine Armour" is as plausible a name as "Heavy
    // Ballistic Shield" is a restriction. Only the heading settles it.
    const { rows } = parse(book(
      'Shields',
      '• Heavy Ballistic Shield Models wearing Machine Armour',
      'only, Shield Combo 15 👑 ',
      'Trench Shield \t Shield Combo \t 10 👑 ',
      ...HEADINGS,
    ));

    expect(rows.map((r) => [r.name, r.restrictions])).toEqual([
      ['Heavy Ballistic Shield', 'Models wearing Machine Armour only, Shield Combo'],
      ['Trench Shield', 'Shield Combo'],
    ]);
  });

  it('throws rather than guess when no Battlekit heading claims it', () => {
    expect(() => parse(book(
      'Armour',
      '• Ablative Plate Some Unit only, Limit: 4',
      'and something else 30 👑 ',
    ))).toThrow(/no Battlekit heading in the book claims it/);
  });
});

describe('a row priced as a choice of currency', () => {
  // `{ducats, glory}` means "and" — formatCost renders it "15 Ducats + 2
  // Glory" — so "15 👑 or 2 ☼" cannot be recorded in it. Reported, not
  // guessed at, and not silently dropped either.
  const fixture = book(
    'Equipment',
    'Combat Helmet \t Headgear \t 5 👑 ',
    '• Grail Devotee \t ELITE only, Limit: 2 15 👑 ',
    'or 2 ☼',
    'Field Shrine \t 2 ☼',
    'Grail Devotee | 15 👑  or 2 ☼ | ELITE only, Limit: 2',
  );

  it('is reported as unreadable rather than priced', () => {
    const { rows, unreadable } = parse(fixture);

    expect(rows.map((r) => r.name)).toEqual(['Combat Helmet', 'Field Shrine']);
    expect(unreadable).toHaveLength(1);
    expect(unreadable[0]).toMatchObject({ name: 'Grail Devotee', section: 'Equipment' });
    expect(unreadable[0].reason).toMatch(/one price, not a choice/);
  });

  it('does not end the table it is in', () => {
    // The alternative price sits on its own line with no tab. Reading that as
    // the end of the table cost the Black Grail four more Equipment rows.
    expect(parse(fixture).rows.map((r) => r.name)).toContain('Field Shrine');
  });
});

describe('the book as shipped', () => {
  it.runIf(hasBook)('stocks New Antioch with all four rows of its Armour table', () => {
    const { rows } = parseArmouryTables(BOOK);
    const armour = rows.filter((r) => r.faction === 'New Antioch' && r.section === 'Armour');

    // Warbands of Trench Crusade, L1348-L1354.
    expect(armour.map((r) => [r.name, r.ducats])).toEqual([
      ['Engineer Body Armour', 45],
      ['Machine Armour', 50],
      ['Reinforced Armour', 40],
      ['Standard Armour', 15],
    ]);
  });

  it.runIf(hasBook)('stocks New Antioch with both of its Shields', () => {
    const { rows } = parseArmouryTables(BOOK);
    const shields = rows.filter((r) => r.faction === 'New Antioch' && r.section === 'Shields');

    // L1344-L1347.
    expect(shields.map((r) => [r.name, r.ducats])).toEqual([
      ['Heavy Ballistic Shield', 15],
      ['Trench Shield', 10],
    ]);
  });

  it.runIf(hasBook)('stocks the Black Grail with six of the seven Equipment rows', () => {
    const { rows, unreadable } = parseArmouryTables(BOOK);
    const kit = rows.filter((r) => r.faction === 'Cult of the Black Grail' && r.section === 'Equipment');

    // L7421-L7429. Grail Devotee is the seventh, and the one priced as a choice.
    expect(kit.map((r) => r.name)).toEqual([
      'Combat Helmet', 'Compound Eyes Helmet', 'Field Shrine',
      'Musical Instrument', 'Troop Flag', 'Unholy Trinket',
    ]);
    expect(unreadable.map((u) => u.name)).toEqual(['Grail Devotee']);
  });

  it.runIf(hasBook)('reads every faction table without losing one to a wrap', () => {
    const { rows, unreadable } = parseArmouryTables(BOOK);

    // A count, not an assertion about any one row: a table that stops being
    // stocked shows up here as a drop, which is the only way the three
    // truncated tables would have been noticed.
    expect(rows).toHaveLength(223);
    expect(unreadable).toHaveLength(1);

    // Every faction stocks every section the book gives it a heading for.
    const bySection = new Map();
    for (const r of rows) {
      const k = `${r.faction} / ${r.section}`;
      bySection.set(k, (bySection.get(k) ?? 0) + 1);
    }
    expect([...bySection.values()].filter((n) => n === 0)).toEqual([]);
    expect(bySection.get('New Antioch / Armour')).toBe(4);
    expect(bySection.get('New Antioch / Shields')).toBe(2);
  });
});
