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
import { parseCatalogues } from '../parse-battlescribe.mjs';

const BOOK = 'data-sources/rulebook/extracted/warbands-of-trench-crusade.txt';
const CATALOGUES = 'data-sources/battlescribe';
const hasBook = fs.existsSync(BOOK);
const hasSources = hasBook && fs.existsSync(CATALOGUES);

/**
 * The catalogue's Battlekit names, as `rules-build` passes them.
 *
 * Needed for exactly one row: the Heretic Legions' Hellbound Soul Contract
 * wraps with no bullet, so it has no Battlekit heading, and the book states
 * its name in no other column. Everything else parses from the book alone.
 */
let names = null;
const catalogueNames = () => {
  if (names) return names;
  const cat = parseCatalogues(CATALOGUES);
  names = [...new Set([
    ...cat.weapons.map((w) => w.name),
    ...(cat.battlekit ?? []).map((b) => b.name),
  ].filter(Boolean))];
  return names;
};

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'armoury-'));
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

let n = 0;
/** Write a fixture and parse it, so a test can state the exact lines it means. */
const parse = (text, knownNames = []) => {
  const file = path.join(tmp, `book-${n++}.txt`);
  fs.writeFileSync(file, text, 'utf8');
  return parseArmouryTables(file, knownNames);
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

  it('throws rather than guess when a BULLETED row has no heading', () => {
    // The bullet is the book's promise that the item is reprinted under a
    // heading. Its absence means the book or the extraction changed.
    expect(() => parse(book(
      'Armour',
      '• Ablative Plate Some Unit only, Limit: 4',
      'and something else 30 👑 ',
    ))).toThrow(/no Battlekit heading in the book claims it/);
  });

  it('keeps the table open when an UNBULLETED row cannot be split', () => {
    /*
      The Heretic Legions' Hellbound Soul Contract (L6068) wraps with no
      bullet, so no heading claims it and the book states its name nowhere
      else. Keying the whole branch on the bullet is what let this one close
      its table and take nine properly-tabbed Equipment rows with it.
    */
    const { rows, unreadable } = parse(book(
      'Equipment',
      'Gas Mask \t 5 👑 ',
      'Ablative Plate Some Troopers &',
      'Other Troopers only, Limit: 3 5 👑 ',
      'Shovel \t 5 👑 ',
      'Troop Flag \t Limit: 1 \t 1 ☼',
    ));

    expect(rows.map((r) => r.name)).toEqual(['Gas Mask', 'Shovel', 'Troop Flag']);
    expect(unreadable).toHaveLength(1);
    expect(unreadable[0].reason).toMatch(/no bullet, so no Battlekit heading/);
  });

  it('splits an unbulleted row when another source states the name', () => {
    // The catalogue holds Hellbound Soul Contract as a selectionEntry of its
    // own (Equipment.cat L193). The name comes from there; the stipulations
    // and the price stay the Armoury Table's.
    const { rows, unreadable } = parse(book(
      'Equipment',
      'Ablative Plate Some Troopers &',
      'Other Troopers only, Limit: 3 5 👑 ',
    ), ['Ablative Plate']);

    expect(unreadable).toEqual([]);
    expect(rows[0]).toMatchObject({
      name: 'Ablative Plate',
      restrictions: 'Some Troopers & Other Troopers only, Limit: 3',
      ducats: 5,
    });
  });

  it('does not mistake the Battlekit chapter that follows a table for a row', () => {
    /*
      The Court's Equipment table is followed by "(▶ see Battlekit …)." and
      then the chapter's first heading, "Arquebus | 8 👑" (L8576-L8577). A
      buffer that collected tab-less lines until a cost swallowed both and
      reported a row that does not exist. A pipe is the chapter, never a table.
    */
    const { rows, unreadable } = parse(book(
      'Equipment',
      'Gas Mask \t 5 👑 ',
      '(▶ see Battlekit in the Trench Crusade Digital Rulebook).',
      'Arquebus | 8 👑  | Limit: 2',
    ));

    expect(rows.map((r) => r.name)).toEqual(['Gas Mask']);
    expect(unreadable).toEqual([]);
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
    const { rows, unreadable } = parseArmouryTables(BOOK, catalogueNames());
    const kit = rows.filter((r) => r.faction === 'Cult of the Black Grail' && r.section === 'Equipment');

    // L7421-L7429. Grail Devotee is the seventh, and the one priced as a choice.
    expect(kit.map((r) => r.name)).toEqual([
      'Combat Helmet', 'Compound Eyes Helmet', 'Field Shrine',
      'Musical Instrument', 'Troop Flag', 'Unholy Trinket',
    ]);
    expect(unreadable.map((u) => u.name)).toEqual(['Grail Devotee']);
  });

  it.runIf(hasSources)('stocks the Heretic Legions with all twelve Equipment rows', () => {
    const { rows } = parseArmouryTables(BOOK, catalogueNames());
    const kit = rows.filter((r) => r.faction === 'Heretic Legions' && r.section === 'Equipment');

    // L6065-L6077. Hellbound Soul Contract is the unbulleted wrap that closed
    // this table; the nine rows beneath it went with it.
    expect(kit.map((r) => r.name)).toEqual([
      'Binoculars', 'Combat Helmet', 'Gas Mask', 'Hellbound Soul Contract',
      'Incendiary Ammunition', 'Infernal Brand', 'Mountaineer Kit',
      'Musical Instrument', 'Shovel', 'Troop Flag', 'Unholy Relic', 'Unholy Trinket',
    ]);
    expect(kit.find((r) => r.name === 'Hellbound Soul Contract')).toMatchObject({
      restrictions: 'Heretic Troopers & Legionnaires only, Limit: 3',
      ducats: 5,
    });
  });

  it.runIf(hasSources)('reads every faction table without losing one to a wrap', () => {
    const { rows, unreadable } = parseArmouryTables(BOOK, catalogueNames());

    // A count, not an assertion about any one row: a table that stops being
    // stocked shows up here as a drop, which is the only way the four
    // truncated tables would have been noticed.
    expect(rows).toHaveLength(232);
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
