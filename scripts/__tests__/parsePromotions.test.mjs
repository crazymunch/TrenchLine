/**
 * The Promotions tables, read from the rulebook.
 *
 * RR-05 / FD-06a. Both tables are a faction heading followed by a line of
 * model names, and everything about that is harder than it reads: the two
 * preambles wrap differently, the faction headings are spelled three ways
 * across three sources, and the model names are the BOOK'S, which are not
 * always the dataset's.
 *
 * These run against the real rulebook and the real catalogues — the point is
 * what the shipped pages say, and a fixture would only assert that the fixture
 * was written to match the parser.
 */
import { describe, it, expect } from 'vitest';

import { parsePromotions, promotionKeywordDrift } from '../lib/parse-campaign.mjs';
import { DATASET } from '../../src/data/generated/trenchline.generated';

const FACTIONS = DATASET.factions.map((f) => ({ id: f.id, name: f.name }));
const promotions = parsePromotions(FACTIONS, DATASET.units);

const rowFor = (table, id) => table.find((f) => f.factionId === id);
const namesIn = (table, id) => rowFor(table, id).models.map((m) => m.name);

describe('the numbers', () => {
  it('reads Maximum Elites from its sentence', () => {
    expect(promotions.maxElites).toBe(6);
  });

  it('reads the Limited Potential cap, whose sentence breaks across a line', () => {
    /*
      p.111 runs its last sentence on from the one before and breaks in the
      middle of it: `…cannot have more than` / `7 Experience Points.` A
      line-by-line read finds the words and not the number.
    */
    expect(promotions.limitedPotential.maxXp).toBe(7);
  });
});

describe('the faction headings', () => {
  it('resolves all six, in the book’s order', () => {
    expect(promotions.cannotPromote.map((f) => f.factionId)).toEqual([
      'new-antioch',
      'trench-pilgrims',
      'iron-sultanate',
      'heretic-legions',
      'cult-of-the-black-grail',
      'court-of-the-seven-headed-serpent',
    ]);
  });

  it('resolves the two the book names differently from the dataset', () => {
    /*
      `The Sultanate of the Iron Wall` is `iron-sultanate`, and `The
      Principality of New Antioch` is `new-antioch`. Neither is a substring of
      the other in either direction, which is why the match is on significant
      words rather than on the string.
    */
    expect(rowFor(promotions.cannotPromote, 'iron-sultanate').faction)
      .toBe('The Sultanate of the Iron Wall');
    expect(rowFor(promotions.cannotPromote, 'new-antioch').faction)
      .toBe('The Principality of New Antioch');
  });

  it('keeps the book’s own heading beside the id', () => {
    // So a failure downstream names the words printed on the page.
    for (const row of promotions.cannotPromote) expect(row.faction).toBeTruthy();
  });
});

describe('Models That Cannot Be Promoted', () => {
  it('reads a bare `-` as no models, not as a missing row', () => {
    expect(namesIn(promotions.cannotPromote, 'new-antioch')).toEqual([]);
    expect(namesIn(promotions.cannotPromote, 'iron-sultanate')).toEqual([]);
  });

  it('reads the comma-separated names of a row that has them', () => {
    expect(namesIn(promotions.cannotPromote, 'cult-of-the-black-grail'))
      .toEqual(['Grail Thralls', 'Fly Thralls', 'Hounds of the Black Grail', 'Amalgam']);
  });

  it('stops at the page mark rather than reading the sidebar', () => {
    /*
      The table ends `MG`, then the chapter sidebar: Introduction, The World in
      Flames, Core Rules… A scan that ran on would take those for factions.
    */
    const all = promotions.cannotPromote.map((f) => f.faction);
    expect(all).toHaveLength(6);
    expect(all.some((f) => /Introduction|Core Rules|Keywords/i.test(f))).toBe(false);
  });
});

describe('Limited Potential', () => {
  it('reads its six rows too, past a preamble that wraps mid-sentence', () => {
    expect(promotions.limitedPotential.factions).toHaveLength(6);
    expect(namesIn(promotions.limitedPotential.factions, 'trench-pilgrims')).toEqual(['Communicant']);
  });

  it('reads the Sultanate’s three, parenthetical and all', () => {
    expect(namesIn(promotions.limitedPotential.factions, 'iron-sultanate'))
      .toEqual(['Lion of Jabir', 'Brazen Bull', 'Homunculi (House of Wisdom)']);
  });
});

describe('resolving the book’s names to units', () => {
  const resolved = (table, id, bookName) =>
    rowFor(table, id).models.find((m) => m.name === bookName);

  it('resolves every name in both tables', () => {
    const all = [
      ...promotions.cannotPromote.flatMap((f) => f.models),
      ...promotions.limitedPotential.factions.flatMap((f) => f.models),
    ];
    expect(all.filter((m) => !m.unitId)).toEqual([]);
  });

  it('matches the catalogue ENTRY name, which is the one the books print', () => {
    expect(resolved(promotions.cannotPromote, 'trench-pilgrims', 'Anchorite Shrine').unitName)
      .toBe('Anchorite');
    expect(resolved(promotions.cannotPromote, 'heretic-legions', 'War Wolf Assault Beast').unitName)
      .toBe('War Wolf');
  });

  it('reduces a plural, including one in the middle of a name', () => {
    expect(resolved(promotions.cannotPromote, 'cult-of-the-black-grail', 'Hounds of the Black Grail').unitName)
      .toBe('Hound of the Black Grail');
    expect(resolved(promotions.cannotPromote, 'court-of-the-seven-headed-serpent', 'Yoke Fiends').unitName)
      .toBe('Yoke Fiend');
  });

  it('reduces a Latin plural and drops a parenthetical', () => {
    expect(resolved(promotions.limitedPotential.factions, 'iron-sultanate', 'Homunculi (House of Wisdom)').unitName)
      .toBe('Homunculus');
  });

  it('uses the cited equivalence for the one genuine rename', () => {
    // `Fly Thralls` is the catalogue's `Winged Thrall`. No spelling rule gets
    // there, and one loose enough to try would mismatch the rest.
    expect(resolved(promotions.cannotPromote, 'cult-of-the-black-grail', 'Fly Thralls').unitName)
      .toBe('Winged Thrall');
  });

  it('scopes the match to the faction the book listed it under', () => {
    /*
      Seven units are called `Homunculus` and the book caps one of them. A
      name match across the whole dataset would cap the other six as well.
    */
    const sultanate = resolved(promotions.limitedPotential.factions, 'iron-sultanate', 'Homunculi (House of Wisdom)');
    const hit = DATASET.units.find((u) => u.id === sultanate.unitId);
    expect(hit.factionId).toBe('Iron Sultanate');
    expect(DATASET.units.filter((u) => u.name === 'Homunculus').length).toBeGreaterThan(1);
  });
});

describe('where the rulebook and the shipped keywords disagree', () => {
  it('reports the Brazen Bull, and only the Brazen Bull', () => {
    /*
      The rulebook's table and the catalogue agree on all seven models. Then
      `dispatch-01` replaces the Brazen Bull's whole Warband Entry with a
      keyword row (p.10) that has no LIMITED POTENTIAL in it. That is
      precedence working, so it is reported and left standing.
    */
    const drift = promotionKeywordDrift(promotions, DATASET.units);
    expect(drift).toHaveLength(1);
    expect(drift[0]).toContain('Brazen Bull');
  });

  it('reports nothing when compared against the units the book agrees with', () => {
    // Give the Bull its catalogue keyword back and the disagreement goes away,
    // which is what says the report is measuring the Dispatch and not a bug.
    const named = promotions.limitedPotential.factions
      .flatMap((f) => f.models).find((m) => m.name === 'Brazen Bull');
    const patched = DATASET.units.map((u) => (u.id === named.unitId
      ? { ...u, keywords: [...u.keywords, 'LIMITED POTENTIAL'] } : u));
    expect(promotionKeywordDrift(promotions, patched)).toEqual([]);
  });
});
