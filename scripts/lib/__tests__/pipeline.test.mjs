import { describe, it, expect } from 'vitest';
import fs from 'node:fs';

import { parseCatalogues, splitMovement } from '../parse-battlescribe.mjs';
import { parseWarbandEntries, parseVariants } from '../parse-warbands.mjs';
import { createProvenance, applyLayer, applyLayers, stampBase } from '../layers.mjs';
import { normaliseStat, normaliseBase, nameKey, verify } from '../verify.mjs';
import { RULESETS, DEFAULT_RULESET } from '../rulesets.mjs';

const CAT_DIR = 'data-sources/battlescribe';
const hasCatalogues = fs.existsSync(`${CAT_DIR}/MANIFEST.json`);
const hasBook = fs.existsSync('data-sources/rulebook/extracted/warbands-of-trench-crusade.txt');

/* ------------------------------------------------------------ normalisation */

describe('stat normalisation', () => {
  it('treats every "no value" spelling alike', () => {
    for (const v of ['-', '–', 'N/A', 'n/a', '']) expect(normaliseStat(v)).toBe('-');
  });

  it('treats +0 and 0 as the same modifier', () => {
    expect(normaliseStat('0')).toBe(normaliseStat('+0'));
  });

  // Regression: the "prefix bare numbers with +" rule used to turn 0 into +0,
  // undoing the rule above and inventing a conflict on every Armour of 0.
  it('does not prefix zero with a sign', () => {
    expect(normaliseStat('0')).toBe('0');
  });

  it('treats a bare number as a positive modifier', () => {
    expect(normaliseStat('1')).toBe(normaliseStat('+1'));
  });

  it('ignores the DICE suffix and curly quotes', () => {
    expect(normaliseStat('+2 DICE')).toBe(normaliseStat('+2'));
  });

  it('reconciles base-size spellings', () => {
    expect(normaliseBase('30 by 60mm')).toBe(normaliseBase('30x60mm'));
    expect(normaliseBase('25 mm')).toBe(normaliseBase('25mm'));
  });

  it('matches the book plural against the catalogue singular', () => {
    expect(nameKey('Sniper Priests')).toBe(nameKey('Sniper Priest'));
    expect(nameKey('Yüzbaşı')).toBe(nameKey('Yüzbaşı Captain'));
  });
});

describe('splitMovement', () => {
  it('separates inches from movement type', () => {
    expect(splitMovement('6"/Infantry')).toMatchObject({ movementInches: 6, movementType: 'Infantry' });
    expect(splitMovement('6”/Flying')).toMatchObject({ movementInches: 6, movementType: 'Flying' });
  });
  it('survives a value it cannot parse', () => {
    expect(splitMovement('-').movementInches).toBeNull();
  });
});

/* ------------------------------------------------------------- layer engine */

const unit = (over = {}) => ({
  id: 'u1', name: 'Test Unit', keywords: ['A'], abilities: [],
  cost: { ducats: 10, glory: 0 }, stats: { melee: '+0', armour: '0' }, ...over,
});

const emptyDataset = (units = [unit()]) => ({ units, weapons: [], factions: [], keywords: [] });
const layer = (ops) => ({ id: 'test-layer', name: 'Test', sourceRef: 't', status: 'official', ops });

describe('layer engine', () => {
  it('sets a cost and stamps provenance for it', () => {
    const ds = emptyDataset(); const p = createProvenance();
    applyLayer(ds, layer([{ op: 'setCost', target: { kind: 'unit', id: 'u1' }, currency: 'ducats', value: 99 }]), p);
    expect(ds.units[0].cost.ducats).toBe(99);
    expect(p.get('unit', 'u1', 'cost.ducats').layer).toBe('test-layer');
  });

  it('addresses an entity by name as well as by id', () => {
    const ds = emptyDataset(); const p = createProvenance();
    applyLayer(ds, layer([{ op: 'setCost', target: { kind: 'unit', id: 'Test Unit' }, currency: 'glory', value: 4 }]), p);
    expect(ds.units[0].cost.glory).toBe(4);
  });

  it('writes nested fields by dotted path', () => {
    const ds = emptyDataset(); const p = createProvenance();
    applyLayer(ds, layer([{ op: 'set', target: { kind: 'unit', id: 'u1' }, field: 'stats.melee', value: '+2 DICE' }]), p);
    expect(ds.units[0].stats.melee).toBe('+2 DICE');
  });

  it('adds a keyword without duplicating it', () => {
    const ds = emptyDataset(); const p = createProvenance();
    const op = { op: 'addKeyword', target: { kind: 'unit', id: 'u1' }, keyword: 'FUMBLE' };
    applyLayer(ds, layer([op, op]), p);
    expect(ds.units[0].keywords.filter((k) => k === 'FUMBLE')).toHaveLength(1);
  });

  // The failure mode this guards against is an errata transcription silently
  // rotting when an entry is renamed upstream.
  it('reports an op whose target does not exist rather than dropping it', () => {
    const ds = emptyDataset(); const p = createProvenance();
    const un = applyLayer(ds, layer([{ op: 'setCost', target: { kind: 'unit', id: 'nope' }, currency: 'ducats', value: 1 }]), p);
    expect(un).toHaveLength(1);
    expect(un[0].why).toMatch(/not found/);
  });

  it('reports replaceAbility when no such ability exists', () => {
    const ds = emptyDataset(); const p = createProvenance();
    const un = applyLayer(ds, layer([{ op: 'replaceAbility', target: { kind: 'unit', id: 'u1' }, name: 'Ghost', ability: { id: 'x', name: 'X', description: '' } }]), p);
    expect(un[0].why).toMatch(/no ability/);
  });

  it('never applies a speculative layer to a normal ruleset', () => {
    const ds = emptyDataset(); const p = createProvenance();
    const rep = applyLayers(ds, [{ ...layer([{ op: 'setCost', target: { kind: 'unit', id: 'u1' }, currency: 'ducats', value: 999 }]), status: 'speculative' }], p);
    expect(ds.units[0].cost.ducats).toBe(10);
    expect(rep[0].skipped).toMatch(/speculative/);
  });

  it('honours a ruleset that excludes public-beta layers', () => {
    const ds = emptyDataset(); const p = createProvenance();
    applyLayers(ds, [{ ...layer([{ op: 'setCost', target: { kind: 'unit', id: 'u1' }, currency: 'ducats', value: 55 }]), status: 'public-beta' }], p, { includeBeta: false });
    expect(ds.units[0].cost.ducats).toBe(10);
  });
});

describe('verification', () => {
  it('does not flag a conflict when a layer supersedes the rulebook', () => {
    const ds = emptyDataset([unit({ name: 'Brazen Bull', cost: { ducats: 115, glory: 0 }, stats: {} })]);
    const p = createProvenance();
    p.stamp('unit', 'u1', 'cost.ducats', { layer: 'base', source: 'battlescribe' });
    p.stamp('unit', 'Brazen Bull', 'cost.ducats', { layer: 'dispatch-01', source: 'dispatch' });
    const r = verify(ds, [{ name: 'Brazen Bull', ducats: 100, glory: 0, stats: { armour: '0' } }], p, {});
    expect(r.conflicts).toHaveLength(0);
    expect(r.resolved.some((x) => x.chose === 'dispatch-01')).toBe(true);
  });

  it('flags a genuine disagreement between sources', () => {
    const ds = emptyDataset([unit({ name: 'Thing', cost: { ducats: 10, glory: 0 }, stats: { armour: '0' } })]);
    const p = createProvenance();
    p.stamp('unit', 'u1', 'cost.ducats', { layer: 'base', source: 'battlescribe' });
    const r = verify(ds, [{ name: 'Thing', ducats: 42, glory: 0, stats: { armour: '0' } }], p, {});
    expect(r.conflicts.map((c) => c.field)).toContain('cost.ducats');
  });

  // Two catalogue entries can share a name (Combat Medic exists as both New
  // Antioch and Mercenary) while the book has one. Comparing both invents a
  // conflict.
  it('skips a name that matches more than one catalogue entry', () => {
    const ds = emptyDataset([
      unit({ id: 'a', name: 'Combat Medic', factionId: 'New Antioch', cost: { ducats: 40, glory: 0 }, stats: {} }),
      unit({ id: 'b', name: 'Combat Medic', factionId: 'Mercenaries', cost: { ducats: 0, glory: 2 }, stats: {} }),
    ]);
    const r = verify(ds, [{ name: 'Combat Medic', ducats: 65, glory: 0, stats: { armour: '0' } }], createProvenance(), {});
    expect(r.conflicts).toHaveLength(0);
    expect(r.ambiguous.length).toBe(2);
  });
});

describe('generated output', () => {
  const file = 'src/data/generated/trenchline.generated.ts';

  it.skipIf(!fs.existsSync(file))('carries no build timestamp', () => {
    // CI proves the committed data still matches data-sources/ by rebuilding
    // and diffing. A timestamp would make that check fail on every run.
    expect(fs.readFileSync(file, 'utf8')).not.toMatch(/builtAt/);
  });

  it.skipIf(!fs.existsSync(file))('records the base commit and layers it was built from', () => {
    const src = fs.readFileSync(file, 'utf8');
    expect(src).toMatch(/"baseCommit": "[0-9a-f]{40}"/);
    expect(src).toMatch(/"layers": \[\s*"dispatch-01"/);
  });
});

describe('rulesets', () => {
  it('ships the two documented rulesets with TrenchLine as default', () => {
    expect(RULESETS.map((r) => r.id)).toEqual(['github-latest', 'trenchline']);
    expect(DEFAULT_RULESET).toBe('trenchline');
  });
  it('keeps the GitHub ruleset free of layers so it matches NewRecruit', () => {
    expect(RULESETS.find((r) => r.id === 'github-latest').layers).toEqual([]);
  });
});

/* ------------------------------------------------- real data (needs sources) */

describe.skipIf(!hasCatalogues)('catalogue data', () => {
  const parsed = hasCatalogues ? parseCatalogues(CAT_DIR) : { units: [], weapons: [] };

  // The acceptance test from docs/RESTRUCTURE-PLAN.md Phase 1.
  it('parses the Lieutenant exactly as the sources state it', () => {
    const l = parsed.units.find((u) => u.name === 'Lieutenant');
    expect(l).toBeDefined();
    expect(l.stats).toMatchObject({
      movement: '6"/Infantry', movementInches: 6, movementType: 'Infantry',
      armour: '0', base: '32mm',
    });
    expect(normaliseStat(l.stats.ranged)).toBe('+2');
    expect(normaliseStat(l.stats.melee)).toBe('+2');
    expect(l.cost.ducats).toBe(70);
  });

  it('reads recruitment limits, which the old data could not express', () => {
    expect(parsed.units.find((u) => u.name === 'Lieutenant')).toMatchObject({ min: 1, max: 1 });
    expect(parsed.units.find((u) => u.name === 'Sniper Priest')).toMatchObject({ max: 2 });
  });

  it('reads Glory as a cost distinct from Ducats', () => {
    expect(parsed.units.filter((u) => u.cost.glory > 0).length).toBeGreaterThan(0);
  });

  it('gives every unit a base size', () => {
    expect(parsed.units.every((u) => u.stats.base)).toBe(true);
  });

  it('stamps provenance on every base field', () => {
    const ds = { units: parsed.units.slice(0, 5), weapons: [], factions: [], keywords: [] };
    const p = createProvenance();
    stampBase(ds, p, { commit: 'abc1234', fileOf: (e) => e.sourceFile });
    const u = ds.units[0];
    expect(p.get('unit', u.id, 'stats.armour').layer).toBe('base');
    expect(p.get('unit', u.id, 'stats.armour').source).toMatch(/^battlescribe:/);
  });
});

describe.skipIf(!hasBook)('rulebook extraction', () => {
  it('parses the warband entries with their limits', () => {
    const e = parseWarbandEntries();
    expect(e.length).toBeGreaterThanOrEqual(48);
    expect(e.find((x) => x.name === 'Lieutenant')).toMatchObject({ min: 1, max: 1, ducats: 70 });
    expect(e.find((x) => x.name === 'Sniper Priests')).toMatchObject({ max: 2, ducats: 50 });
  });

  // Ten Mercenary entries are priced in Glory (☼), not Ducats (👑). Reading the
  // glyph wrong made every one of them look like a conflict.
  it('reads the Glory currency glyph', () => {
    const e = parseWarbandEntries();
    const glory = e.filter((x) => x.currency === 'glory');
    expect(glory.length).toBe(10);
    expect(glory.find((x) => x.name === 'Goetic Warlock')).toMatchObject({ glory: 4, ducats: 0 });
  });

  it('finds all 14 official warband variants', () => {
    const v = parseVariants();
    expect(v.length).toBe(14);
    expect(v.map((x) => x.name)).toContain('HOUSE OF WISDOM');
    expect(v.find((x) => x.name === 'HOUSE OF WISDOM').specialRules.length).toBeGreaterThan(0);
  });
});

/* ---------------------------------------------------------------- modifiers */

// The catalogues state every conditional rule as a modifier. Discarding them
// was why the generated data had no Kavass, no derived armour, and no way to
// express a Warband Variant changing a recruitment limit.
describe('catalogue modifiers', () => {
  const ds = parseCatalogues('data-sources/battlescribe');
  const unit = (name) => ds.units.find((u) => u.name === name);

  it('reads modifiers off real catalogue entries', () => {
    const n = [...ds.units, ...ds.weapons].reduce((a, e) => a + e.modifiers.length, 0);
    expect(n).toBeGreaterThan(500);
  });

  it('resolves a condition to the entry it names, not a bare UUID', () => {
    const azeb = unit('Azeb');
    const rename = azeb.modifiers.find((m) => m.field === 'name' && m.value === 'Kavass');
    expect(rename).toBeTruthy();
    expect(rename.when.childName).toBe('The House of Wisdom');
    expect(rename.when.scope).toBe('roster');
  });

  it('maps characteristic ids to field paths', () => {
    const azeb = unit('Azeb');
    const armour = azeb.modifiers.filter((m) => m.field === 'stats.armour');
    expect(armour.length).toBeGreaterThan(2);
    // Armour is derived from the armour you equipped, not a fixed number.
    expect(armour.some((m) => m.when?.childName === 'Standard Armour')).toBe(true);
  });

  it('carries the author\'s own label for a modifier group', () => {
    const azeb = unit('Azeb');
    expect(azeb.modifiers.some((m) => m.comment === 'armour adjustments')).toBe(true);
  });

  // "Pride of Jabir: a House of Wisdom Warband can include 0-3 Lions of Jabir"
  // is a +1 on the Lion's roster max, not prose. Deriving it beats transcribing it.
  it('recognises a modifier that changes a recruitment limit', () => {
    const lion = unit('Lion of Jabir');
    expect(lion.max).toBe(2);
    const bump = lion.modifiers.find(
      (m) => m.field.startsWith('constraint:') && m.when?.childName === 'The House of Wisdom');
    expect(bump).toBeTruthy();
    expect(bump.op).toBe('increment');
    expect(bump.value).toBe('1');
  });

  it('nests a group condition above the modifier\'s own', () => {
    const withBoth = [...ds.units, ...ds.weapons]
      .flatMap((e) => e.modifiers)
      .find((m) => m.when && 'all' in m.when && m.comment);
    // Not every catalogue has one; assert the shape only when it does.
    if (withBoth) expect(Array.isArray(withBoth.when.all)).toBe(true);
  });

  it('flags an unmappable field rather than mislabelling it', () => {
    const unmapped = [...ds.units, ...ds.weapons]
      .flatMap((e) => e.modifiers).filter((m) => m.rawField);
    // A handful are expected; a spike means the field maps went stale.
    expect(unmapped.length).toBeLessThan(20);
    for (const m of unmapped) expect(m.field).toBe(m.rawField);
  });

  it('records the containing entry id, which is what rosters address', () => {
    const azeb = unit('Azeb');
    expect(azeb.entryId).toBeTruthy();
    expect(azeb.entryId).not.toBe(azeb.id);
  });
});
